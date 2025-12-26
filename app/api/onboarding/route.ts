import { NextRequest, NextResponse } from 'next/server'
import { buildOnboardingPrompt } from '@/lib/prompt-builder'
import type { UserProfile } from '@/lib/user-profile'

interface OnboardingMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
}

interface OnboardingResponse {
  response: string
  userProfileUpdate?: {
    name?: string
    whyLearning?: string
    targetCountry?: string
    priorExperience?: 'none' | 'some' | 'intermediate' | 'advanced'
    interests?: string[]
    favoriteFood?: string
    musicTaste?: string
    notes?: string
  }
  onboardingComplete?: boolean
}

function parseOnboardingResponse(content: string, isFinish: boolean): OnboardingResponse {
  // Handle empty or whitespace-only content
  const trimmed = content?.trim() || ''
  if (!trimmed) {
    console.error('Empty response from OpenAI')
    return {
      response: "hey! let's try that again. what's your name?",
      onboardingComplete: false,
    }
  }

  try {
    // Try to extract JSON from markdown code blocks if present
    let jsonContent = trimmed
    const jsonMatch = trimmed.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/)
    if (jsonMatch) {
      jsonContent = jsonMatch[1]
    }

    const parsed = JSON.parse(jsonContent)
    
    const result: OnboardingResponse = {
      response: typeof parsed.response === 'string' 
        ? parsed.response.trim() 
        : "hey! i'm gian. what's your name?",
      onboardingComplete: parsed.onboardingComplete === true,
    }

    // Only parse userProfileUpdate on FINISH
    if (isFinish && parsed.userProfileUpdate) {
      result.userProfileUpdate = parsed.userProfileUpdate
    }
    
    return result
  } catch (error) {
    console.error('Failed to parse onboarding response:', error)
    console.error('Response content (first 500 chars):', trimmed.slice(0, 500))
    
    // Handle incomplete JSON (truncated responses)
    // Try to extract partial content from incomplete JSON
    if (trimmed.startsWith('{')) {
      // Try to extract response field even if JSON is incomplete
      // Look for "response": "..." pattern, handling incomplete strings
      const responseMatch = trimmed.match(/"response"\s*:\s*"([^"]*(?:\\.[^"]*)*)"/)
      if (responseMatch) {
        return {
          response: responseMatch[1].replace(/\\"/g, '"').replace(/\\n/g, '\n').trim(),
          onboardingComplete: false,
        }
      }
      
      // Try to extract even if string is incomplete (no closing quote)
      const incompleteMatch = trimmed.match(/"response"\s*:\s*"([^"]*(?:\\.[^"]*)*)/)
      if (incompleteMatch) {
        return {
          response: incompleteMatch[1].replace(/\\"/g, '"').replace(/\\n/g, '\n').trim(),
          onboardingComplete: false,
        }
      }
    }
    
    // Try to extract any text that might be a response using regex
    const textMatch = trimmed.match(/"response"\s*:\s*"((?:[^"\\]|\\.)*)"/)
    if (textMatch) {
      return {
        response: textMatch[1].replace(/\\"/g, '"').replace(/\\n/g, '\n'),
        onboardingComplete: false,
      }
    }
    
    // If it looks like plain text (not JSON), use it directly
    if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
      return {
        response: trimmed.slice(0, 200) || "hey! let's try that again. what's your name?",
        onboardingComplete: false,
      }
    }
    
    return {
      response: "hey! let's try that again. what's your name?",
      onboardingComplete: false,
    }
  }
}

function buildExistingProfileContext(profile: UserProfile): string {
  const parts: string[] = []
  
  if (profile.name) parts.push(`name: ${profile.name}`)
  if (profile.whyLearning) parts.push(`learning for: ${profile.whyLearning}`)
  if (profile.targetCountry) parts.push(`wants to visit: ${profile.targetCountry}`)
  if (profile.priorExperience) parts.push(`experience level: ${profile.priorExperience}`)
  if (profile.interests?.length) parts.push(`interests: ${profile.interests.join(', ')}`)
  if (profile.favoriteFood) parts.push(`favorite food: ${profile.favoriteFood}`)
  if (profile.musicTaste) parts.push(`music taste: ${profile.musicTaste}`)
  if (profile.notes) parts.push(`notes: ${profile.notes}`)
  
  return parts.join('\n')
}

export async function POST(request: NextRequest) {
  try {
    const { 
      message, 
      learningLanguage, 
      conversationHistory,
      existingProfile,
      isUpdate 
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
    const isStart = message === '__START__'
    const isFinish = message === '__FINISH__'

    // Build the system prompt
    let systemPrompt = buildOnboardingPrompt({ targetLanguage })

    // If this is an update session, add context about what we already know
    // This should be included in ALL messages, not just the first one
    if (isUpdate && existingProfile) {
      const profileContext = buildExistingProfileContext(existingProfile)
      systemPrompt += `

---
THIS IS AN UPDATE SESSION. you already know this person:
${profileContext}

remember their name and details throughout the conversation. greet them warmly by name if you know it. ask if anything has changed or if there's something new they want to share. keep it brief—they're returning, not new.

⚠️ REMINDER: This is STILL just a context-gathering session, NOT a teaching session. Do NOT start teaching, even if they ask. Say "we'll cover that in our lesson! anything new going on with you?"
`
    }

    // If finishing, request a comprehensive profile summary
    if (isFinish) {
      const baseFinishPrompt = `you are gian. the user is done chatting. review the ENTIRE conversation and generate a comprehensive profile summary.

You must respond in valid JSON format. Your response must be a JSON object:

{
  "response": "a warm 1-2 sentence summary like: 'alright [name], i got you—[brief summary of what you learned]. let's make this happen!'",
  "userProfileUpdate": {
    "name": "their name if mentioned",
    "whyLearning": "travel|family|work|culture|fun (if mentioned)",
    "targetCountry": "specific country/place if mentioned",
    "priorExperience": "none|some|intermediate|advanced (based on what they said)",
    "interests": ["any interests, hobbies, or things they're into"],
    "notes": "comprehensive summary: everything interesting they mentioned, their goals, timeline, any personal details, context about their trip/plans, etc."
  },
  "onboardingComplete": true
}

IMPORTANT: Extract ALL information from the conversation. Be thorough:
- Name (if mentioned)
- Why they're learning (trip details, family, work, etc.)
- Where they're going/planning to visit
- Experience level (what they said about prior learning)
- Interests, hobbies, food preferences, music, anything personal
- Timeline (when they're traveling, etc.)
- Any other context that would be useful

Be warm and reference specific things they mentioned. Make them feel known.`

      // If update session, include profile context in finish prompt too
      if (isUpdate && existingProfile) {
        const profileContext = buildExistingProfileContext(existingProfile)
        systemPrompt = `${baseFinishPrompt}

---
remember: you already knew this about them:
${profileContext}

update the summary with any NEW information from this conversation.`
      } else {
        systemPrompt = baseFinishPrompt
      }
    }

    // Build conversation history for context - only send role and content
    const historyMessages: Array<{ role: 'user' | 'assistant', content: string }> = []
    
    if (conversationHistory && Array.isArray(conversationHistory)) {
      for (const msg of conversationHistory) {
        // Only extract role and content, ignore id and any other fields
        const role = msg.role
        const content = msg.content
        if (role && content && typeof content === 'string') {
          historyMessages.push({
            role: role as 'user' | 'assistant',
            content: content,
          })
        }
      }
    }

    const messages: Array<{ role: 'system' | 'user' | 'assistant', content: string }> = [
      { role: 'system', content: systemPrompt },
      ...historyMessages,
    ]
    
    // Log what we're actually sending
    console.log('🎯 Sending to OpenAI:', {
      systemPromptLength: systemPrompt.length,
      historyMessageCount: historyMessages.length,
      lastHistoryMessage: historyMessages[historyMessages.length - 1]?.content?.slice(0, 50),
      currentUserMessage: message.slice(0, 50),
    })

    // Handle different message types
    if (isStart) {
      messages.push({
        role: 'user',
        content: isUpdate 
          ? '[User opened the update profile chat. Greet them warmly and ask if anything has changed.]'
          : '[User just opened the onboarding. Start the conversation with your intro.]'
      })
    } else if (isFinish) {
      messages.push({
        role: 'user',
        content: '[User clicked FINISH. Generate a summary of what you learned about them.]'
      })
    } else {
      messages.push({ role: 'user', content: message })
    }

    const requestBody = {
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages,
      // Keep completions tight to avoid length truncation
      max_tokens: isFinish ? 500 : 300,
      temperature: 0.9,
    }
    
    // Log message lengths for debugging
    const totalMessageLength = messages.reduce((sum, msg) => sum + (msg.content?.length || 0), 0)
    console.log('🎯 Message Stats:', {
      messageCount: messages.length,
      totalChars: totalMessageLength,
      lastUserMessage: messages[messages.length - 1]?.content?.slice(0, 100),
    })

    console.log('🎯 Onboarding Request:', {
      isStart,
      isFinish,
      isUpdate,
      historyLength: historyMessages.length,
      hasExistingProfile: !!existingProfile,
    })

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
      return NextResponse.json(
        { error: 'Failed to get response from OpenAI' },
        { status: response.status }
      )
    }

    const data = await response.json()
    
    // Log usage info for debugging
    if (data.usage) {
      console.log('🎯 Token Usage:', {
        prompt: data.usage.prompt_tokens,
        completion: data.usage.completion_tokens,
        total: data.usage.total_tokens,
      })
    }
    
    // Better error handling for empty or malformed responses
    if (!data.choices || !data.choices[0]) {
      console.error('🎯 No choices in OpenAI response:', JSON.stringify(data, null, 2))
      return NextResponse.json({
        response: "hey! let's try that again. what's your name?",
        onboardingComplete: false,
      })
    }

    const choice = data.choices[0]
    const responseContent = choice.message?.content?.trim() || ''
    const finishReason = choice.finish_reason

    console.log('🎯 Onboarding Raw Response:', responseContent ? `${responseContent.slice(0, 200)}... (${responseContent.length} chars)` : '(empty)')
    console.log('🎯 Finish Reason:', finishReason)
    console.log('🎯 Response Length:', responseContent.length, 'chars')
    
    // Log if response was truncated
    if (finishReason === 'length') {
      console.warn('🎯 Response was truncated due to token limit!')
      console.warn('🎯 Truncated response preview:', responseContent.slice(0, 500))
    }

    // Handle cases where response was stopped or filtered
    if (!responseContent && finishReason !== 'stop') {
      console.error('🎯 Response stopped early. Finish reason:', finishReason)
      return NextResponse.json({
        response: "hey! let's try that again. what's your name?",
        onboardingComplete: false,
      })
    }

    const parsed = parseOnboardingResponse(responseContent, isFinish)

    console.log('🎯 Onboarding Parsed:', {
      response: parsed.response,
      userProfileUpdate: parsed.userProfileUpdate,
      onboardingComplete: parsed.onboardingComplete,
    })

    return NextResponse.json(parsed)
  } catch (error) {
    console.error('Error in onboarding API route:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
