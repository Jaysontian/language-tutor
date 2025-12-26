import { NextRequest, NextResponse } from 'next/server'
import { buildSessionSystemPrompt, languageCodeMap } from '@/lib/prompt-builder'
import { 
  TopicStateUpdate, 
  TopicProgressMetrics,
  TopicStateEvent,
  TopicWithVocab,
  getTopicWithVocab,
  UserPreferences,
  TopicState,
  createDefaultTopicState,
  Objective,
  VocabProgress
} from '@/lib/topics'

type VocabItem = {
  term: string
  translation: string
  pronunciation: string
}

const VALID_EVENTS: TopicStateEvent[] = ['objective_completed', 'vocab_mastered', 'progress_made', 'session_end']

/** Validate and parse topicStateUpdate from AI response */
function parseTopicStateUpdate(raw: unknown): TopicStateUpdate | null {
  if (!raw || typeof raw !== 'object') return null
  
  const obj = raw as Record<string, unknown>
  
  // Validate required fields
  if (typeof obj.topicId !== 'string' || !obj.topicId) return null
  if (typeof obj.event !== 'string' || !VALID_EVENTS.includes(obj.event as TopicStateEvent)) return null
  if (typeof obj.summary !== 'string' || !obj.summary) return null
  if (typeof obj.aiNotes !== 'string') return null
  if (typeof obj.masteryLevel !== 'number' || obj.masteryLevel < 0 || obj.masteryLevel > 5) return null
  
  // Validate progressMetrics
  const metrics = obj.progressMetrics
  if (!metrics || typeof metrics !== 'object') return null
  
  const m = metrics as Record<string, unknown>
  
  // Parse objectives array
  const objectives: Objective[] = Array.isArray(m.objectives)
    ? m.objectives
        .map((obj: any) => {
          if (obj && typeof obj === 'object' && typeof obj.id === 'string' && typeof obj.complete === 'boolean') {
            return { id: obj.id, complete: obj.complete }
          }
          return null
        })
        .filter((obj): obj is Objective => obj !== null)
    : []
  
  // Parse vocab array
  const vocab: VocabProgress[] = Array.isArray(m.vocab)
    ? m.vocab
        .map((v: any) => {
          if (v && typeof v === 'object' && typeof v.term === 'string' && typeof v.complete === 'boolean') {
            return { term: v.term, complete: v.complete }
          }
          return null
        })
        .filter((v): v is VocabProgress => v !== null)
    : []
  
  const progressMetrics: TopicProgressMetrics = {
    objectives,
    vocab,
    sessionsCompleted: typeof m.sessionsCompleted === 'number' ? m.sessionsCompleted : 0,
  }
  
  return {
    topicId: obj.topicId,
    event: obj.event as TopicStateEvent,
    summary: obj.summary,
    aiNotes: obj.aiNotes,
    progressMetrics,
    masteryLevel: obj.masteryLevel as 0 | 1 | 2 | 3 | 4 | 5,
  }
}

function parseTutorJsonResponse(args: {
  responseContent: unknown
  targetLanguageCode: string
}) {
  const responseContent =
    typeof args.responseContent === 'string' ? args.responseContent : JSON.stringify(args.responseContent ?? '')

  const parsed = JSON.parse(responseContent)

  // New format: single string response
  let responseText: string = ''
  if (parsed && typeof parsed === 'object' && 'response' in parsed) {
    if (typeof parsed.response === 'string') {
      responseText = parsed.response.trim()
    } else if (Array.isArray(parsed.response)) {
      // Legacy array format: join chunks
      responseText = parsed.response
        .map((chunk: any) => typeof chunk?.text === 'string' ? chunk.text : '')
        .filter((text: string) => text.length > 0)
        .join(' ')
    }
  }
  
  if (!responseText) {
    throw new Error('No valid response text found')
  }
  
  // Convert single string to chunk format for compatibility
  // Determine language based on content (simple heuristic: if contains target language code, assume mixed)
  const responseItems: Array<{ text: string; language: string }> = [{
    text: responseText,
    language: 'EN' // Default to EN, TTS will handle language detection
  }]

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

  // Parse topic state update (optional, may be null or absent)
  let topicStateUpdate: TopicStateUpdate | null = null
  if (parsed && typeof parsed === 'object' && 'topicStateUpdate' in parsed) {
    topicStateUpdate = parseTopicStateUpdate((parsed as any).topicStateUpdate)
  }
  
  // Parse sessionEnd (optional)
  let sessionEnd: boolean = false
  if (parsed && typeof parsed === 'object' && 'sessionEnd' in parsed) {
    sessionEnd = parsed.sessionEnd === true
  }

  // Normalize response items
  const normalized = responseItems
    .map((item: any) => ({
      text: typeof item?.text === 'string' ? item.text.trim() : '',
      language: typeof item?.language === 'string' ? item.language.trim().toUpperCase() : 'EN',
    }))
    .filter((item) => item.text.length > 0)

  if (normalized.length === 0) {
    throw new Error('No valid response items found')
  }

  return { responseItems: normalized, vocab, topicStateUpdate, sessionEnd }
}

export async function POST(request: NextRequest) {
  try {
    const { 
      message, 
      learningLanguage, 
      conversationHistory, 
      inputLanguage,
      topicIds,
      userPreferences,
      sessionContext,
      topicStates,
      userProfile
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

    // Get topics with vocabulary
    const topicIdsArray = Array.isArray(topicIds) ? topicIds : (topicIds ? [topicIds] : [])
    
    if (topicIdsArray.length === 0) {
      return NextResponse.json(
        { error: 'No topic IDs provided. Please select at least one topic.' },
        { status: 400 }
      )
    }
    
    const topics = topicIdsArray
      .map(id => getTopicWithVocab(id, targetLanguage))
      .filter((t): t is TopicWithVocab => t !== undefined)
    
    if (topics.length === 0) {
      const invalidIds = topicIdsArray.filter(id => !getTopicWithVocab(id, targetLanguage))
      console.error('No valid topics found:', {
        topicIdsArray,
        targetLanguage,
        invalidIds,
        validIds: topicIdsArray.filter(id => getTopicWithVocab(id, targetLanguage))
      })
      return NextResponse.json(
        { 
          error: 'No valid topics found',
          details: {
            providedTopicIds: topicIdsArray,
            targetLanguage,
            invalidTopicIds: invalidIds
          }
        },
        { status: 400 }
      )
    }

    // Build topic states map (default if not provided)
    const topicStatesMap: { [topicId: string]: TopicState } = {}
    if (topicStates && typeof topicStates === 'object') {
      for (const topic of topics) {
        const state = topicStates[topic.id]
        if (state) {
          topicStatesMap[topic.id] = state as TopicState
        } else {
          // topic is already TopicWithVocab, so we can use it directly
          topicStatesMap[topic.id] = createDefaultTopicState(topic.id, topic, topic)
        }
      }
    } else {
      for (const topic of topics) {
        // topic is already TopicWithVocab, so we can use it directly
        topicStatesMap[topic.id] = createDefaultTopicState(topic.id, topic, topic)
      }
    }

    // Log topic states being used in prompt
    console.log('📋 API Route - Topic States in Prompt:', 
      Object.fromEntries(
        Object.entries(topicStatesMap).map(([topicId, state]) => [
          topicId,
          {
            objectives: state.progressMetrics.objectives,
            vocab: state.progressMetrics.vocab,
            masteryLevel: state.masteryLevel,
            aiNotes: state.aiNotes
          }
        ])
      )
    )

    // Build session context (default if not provided)
    const sessionCtx = sessionContext && typeof sessionContext === 'object' ? {
      startTime: sessionContext.startTime ? new Date(sessionContext.startTime) : new Date(),
      durationMinutes: typeof sessionContext.durationMinutes === 'number' ? sessionContext.durationMinutes : 15,
      elapsedMinutes: typeof sessionContext.elapsedMinutes === 'number' ? sessionContext.elapsedMinutes : 0,
      remainingMinutes: typeof sessionContext.remainingMinutes === 'number' ? sessionContext.remainingMinutes : 15,
    } : {
      startTime: new Date(),
      durationMinutes: 15,
      elapsedMinutes: 0,
      remainingMinutes: 15,
    }

    // Build the system prompt
    const systemPrompt = buildSessionSystemPrompt({
      activeTopics: topics,
      topicStates: topicStatesMap,
      targetLanguage,
      targetLanguageCode,
      sessionContext: sessionCtx,
      userPreferences: userPreferences as UserPreferences | undefined,
      inputLanguage,
      userProfile: userProfile || null,
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

      const messages = [
        { role: 'system', content: systemPrompt },
        ...historyMessages,
        { role: 'user', content: message },
        ...(retryReminder ? [{ role: 'user' as const, content: retryReminder }] : []),
      ]

      const requestBody = {
        model: 'gpt-4o-mini',
        response_format: { type: 'json_object' },
        messages,
        max_tokens: 450,
      }

      // Log the complete LLM input
      console.log('🤖 COMPLETE LLM INPUT:', JSON.stringify({
        messages: messages.map((msg, idx) => ({
          index: idx,
          role: msg.role,
          contentLength: msg.content.length,
          contentPreview: msg.content.substring(0, 200) + (msg.content.length > 200 ? '...' : ''),
          fullContent: msg.content
        })),
        requestBody
      }, null, 2))

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        const error = await response.text()
        console.error('OpenAI API error:', error)
        return NextResponse.json({ error: 'Failed to get response from OpenAI' }, { status: response.status })
      }

      const data = await response.json()
      const responseContent = data.choices[0]?.message?.content || ''

      // Log raw LLM response for debugging
      console.log('🤖 Raw LLM Response:', responseContent)

      try {
        const { responseItems, vocab, topicStateUpdate, sessionEnd } = parseTutorJsonResponse({ 
          responseContent,
          targetLanguageCode
        })
        
        // Log parsed response
        console.log('📦 Parsed Response:', {
          responseItems: responseItems.map((item: any) => item?.text || item),
          vocab,
          topicStateUpdate: topicStateUpdate ? {
            topicId: topicStateUpdate.topicId,
            event: topicStateUpdate.event,
            objectives: topicStateUpdate.progressMetrics.objectives,
            vocab: topicStateUpdate.progressMetrics.vocab
          } : null,
          sessionEnd
        })
        
        // TODO: When database is set up, save topicStateUpdate here:
        // if (topicStateUpdate) {
        //   await db.upsertTopicState({
        //     userId: user.id,
        //     topicId: topicStateUpdate.topicId,
        //     aiNotes: topicStateUpdate.aiNotes,
        //     progressMetrics: topicStateUpdate.progressMetrics,
        //     masteryLevel: topicStateUpdate.masteryLevel,
        //     lastPracticed: new Date()
        //   })
        // }
        
        return NextResponse.json({ 
          response: responseItems, 
          vocab,
          topicStateUpdate: topicStateUpdate || undefined,
          sessionEnd: sessionEnd || false,
        })
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

