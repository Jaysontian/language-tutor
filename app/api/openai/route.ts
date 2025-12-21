import { NextRequest, NextResponse } from 'next/server'
import { buildConversationSystemPrompt, buildLessonSystemPrompt, languageCodeMap } from '@/lib/prompt-builder'
import { getLessonWithVocabulary, UserPreferences } from '@/lib/lessons'
import { getConversationPreset } from '@/lib/conversation-presets'

type VocabItem = {
  term: string
  translation: string
  pronunciation: string
}

function parseTutorJsonResponse(args: {
  responseContent: unknown
}) {
  const responseContent =
    typeof args.responseContent === 'string' ? args.responseContent : JSON.stringify(args.responseContent ?? '')

  const parsed = JSON.parse(responseContent)

  // If it's an object with "response" property, extract it (preferred)
  let responseItems: Array<{ text: string; language: string }> = []
  if (parsed && typeof parsed === 'object' && 'response' in parsed) {
    responseItems = Array.isArray((parsed as any).response) ? (parsed as any).response : []
  }
  // Legacy: object with "chunks"
  else if (parsed && typeof parsed === 'object' && 'chunks' in parsed) {
    responseItems = Array.isArray((parsed as any).chunks) ? (parsed as any).chunks : []
  }
  // If it's directly an array, use it
  else if (Array.isArray(parsed)) {
    responseItems = parsed
  } else {
    throw new Error('Unexpected response format')
  }

  // Vocab: normalize to array of objects (possibly empty)
  let vocab: VocabItem[] = []
  if (parsed && typeof parsed === 'object' && 'vocab' in parsed && Array.isArray((parsed as any).vocab)) {
    const raw = (parsed as any).vocab as unknown[]

    // Preferred: array of objects
    const objItems: VocabItem[] = raw
      .filter((v): v is Record<string, unknown> => !!v && typeof v === 'object')
      .map((v) => ({
        term: typeof v.term === 'string' ? v.term.trim() : '',
        translation: typeof v.translation === 'string' ? v.translation.trim() : '',
        pronunciation: typeof v.pronunciation === 'string' ? v.pronunciation.trim() : '',
      }))
      .filter((v) => v.term.length > 0)

    // Legacy: array of strings -> objects (translation/pronunciation blank)
    const stringItems: VocabItem[] = raw
      .filter((v): v is string => typeof v === 'string')
      .map((term) => term.trim())
      .filter((term) => term.length > 0)
      .map((term) => ({ term, translation: '', pronunciation: '' }))

    const combined = (objItems.length ? objItems : stringItems)
    const deduped = Array.from(new Map(combined.map((i) => [i.term, i])).values()).slice(0, 5)
    vocab = deduped
  } else {
    vocab = []
  }

  // Normalize + drop empty chunks (prevents blank TTS)
  const normalized = responseItems
    .map((item: any) => ({
      text: typeof item?.text === 'string' ? item.text.trim() : '',
      language: typeof item?.language === 'string' ? item.language.trim().toUpperCase() : 'EN',
    }))
    .filter((item) => item.text.length > 0)

  if (normalized.length === 0) {
    throw new Error('No valid response items found')
  }

  return { responseItems: normalized, vocab }
}

export async function POST(request: NextRequest) {
  try {
    const { 
      message, 
      learningLanguage, 
      conversationHistory, 
      inputLanguage,
      lessonId,
      conversationPresetId,
      userPreferences 
    } = await request.json()

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      )
    }

    const targetLanguage = learningLanguage || 'French'
    const targetLanguageCode = languageCodeMap[targetLanguage] || 'FR'

    // Get lesson config if provided (with language-specific vocabulary list when available)
    const lesson = lessonId ? getLessonWithVocabulary(lessonId, targetLanguage) : undefined
    const conversationPreset = getConversationPreset(conversationPresetId)

    // Build the layered system prompt
    const systemPrompt = lesson
      ? buildLessonSystemPrompt({
          targetLanguage,
          targetLanguageCode,
          lesson,
          userPreferences: userPreferences as UserPreferences | undefined,
          inputLanguage,
        })
      : buildConversationSystemPrompt({
          targetLanguage,
          targetLanguageCode,
          userPreferences: userPreferences as UserPreferences | undefined,
          inputLanguage,
          conversationPreset: conversationPreset
            ? { title: conversationPreset.title, systemInstructions: conversationPreset.systemInstructions }
            : undefined,
        })

    // Process conversation history - get last 3 conversation pairs
    const historyMessages: Array<{ role: 'user' | 'assistant', content: string }> = []
    
    if (conversationHistory && Array.isArray(conversationHistory)) {
      // Filter to get only sent and received messages with content
      const validMessages = conversationHistory
        .filter((msg: any) => 
          (msg.type === 'sent' && msg.transcript) || 
          (msg.type === 'received' && msg.text)
        )
        .slice(-6) // Get last 6 messages (3 pairs)
      
      // Build conversation pairs
      for (let i = 0; i < validMessages.length; i++) {
        const msg = validMessages[i]
        if (msg.type === 'sent' && msg.transcript) {
          historyMessages.push({
            role: 'user',
            content: msg.transcript
          })
        } else if (msg.type === 'received' && msg.text) {
          historyMessages.push({
            role: 'assistant',
            content: msg.text
          })
        }
      }
    }

    const MAX_ATTEMPTS = 2

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const retryReminder =
        attempt > 1
          ? `Your previous response was invalid or empty JSON. Regenerate now.
Return ONLY a valid JSON object with keys "response" and "vocab". Do not include markdown or any extra text.`
          : null

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: systemPrompt },
            ...historyMessages,
            { role: 'user', content: message },
            ...(retryReminder ? [{ role: 'user' as const, content: retryReminder }] : []),
          ],
          max_tokens: 450,
        }),
      })

      if (!response.ok) {
        const error = await response.text()
        console.error('OpenAI API error:', error)
        return NextResponse.json({ error: 'Failed to get response from OpenAI' }, { status: response.status })
      }

      const data = await response.json()
      const responseContent = data.choices[0]?.message?.content || ''

      try {
        const { responseItems, vocab } = parseTutorJsonResponse({ responseContent })
        return NextResponse.json({ response: responseItems, vocab })
      } catch (error) {
        console.error('Failed to parse OpenAI response (attempt ' + attempt + '):', error, responseContent)
        // Try again (loop). If this was the last attempt, fall through and return retryable error.
      }
    }

    return NextResponse.json(
      { error: 'Model returned invalid JSON. Please retry.', retryable: true },
      { status: 502 }
    )
  } catch (error) {
    console.error('Error in OpenAI API route:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
