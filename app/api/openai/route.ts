import { NextRequest, NextResponse } from 'next/server'
import { buildSystemPrompt, languageCodeMap } from '@/lib/prompt-builder'
import { getLessonWithPhrases, UserPreferences } from '@/lib/lessons'
import { getConversationPreset } from '@/lib/conversation-presets'

type VocabItem = {
  term: string
  translation: string
  pronunciation: string
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

    // Get lesson config if provided (with language-specific phrases)
    const lesson = lessonId ? getLessonWithPhrases(lessonId, targetLanguage) : undefined
    const conversationPreset = getConversationPreset(conversationPresetId)

    // Build the layered system prompt
    const systemPrompt = buildSystemPrompt({
      targetLanguage,
      targetLanguageCode,
      lesson,
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

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini', // Upgraded from gpt-3.5-turbo for better instruction following
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          ...historyMessages,
          { role: 'user', content: message },
        ],
        max_tokens: 300,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('OpenAI API error:', error)
      return NextResponse.json(
        { error: 'Failed to get response from OpenAI' },
        { status: response.status }
      )
    }

    const data = await response.json()
    const responseContent = data.choices[0]?.message?.content || '{"response": [], "vocab": []}'
    
    // Parse JSON response - support legacy "chunks" and new "response"
    let responseItems: Array<{ text: string; language: string }> = []
    let vocab: VocabItem[] = []
    try {
      const parsed = JSON.parse(responseContent)
      
      // If it's an object with "response" property, extract it (preferred)
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
      }
      // Otherwise, wrap as single chunk
      else {
        throw new Error('Unexpected response format')
      }

      // Vocab: normalize to array of objects (possibly empty)
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
      
      // Validate response structure
      if (!Array.isArray(responseItems) || responseItems.length === 0) {
        throw new Error('No valid response items found')
      }
    } catch (error) {
      console.error('Failed to parse OpenAI response:', error, responseContent)
      // Fallback: wrap as a single chunk in an array
      responseItems = [{ text: typeof responseContent === 'string' ? responseContent : 'No response', language: 'EN' }]
      vocab = []
    }

    console.log(responseItems)

    return NextResponse.json({ response: responseItems, vocab })
  } catch (error) {
    console.error('Error in OpenAI API route:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
