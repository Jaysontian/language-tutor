import { LessonConfig, UserPreferences } from './lessons'

interface PromptConfig {
  targetLanguage: string
  targetLanguageCode: string
  lesson?: LessonConfig
  userPreferences?: UserPreferences
  inputLanguage?: 'english' | 'learning'
  conversationPreset?: {
    title: string
    systemInstructions: string
  }
}

export function buildSystemPrompt(config: PromptConfig): string {
  const { targetLanguage, targetLanguageCode, lesson, userPreferences, inputLanguage, conversationPreset } = config
  const isBeginner = !!lesson && lesson.difficulty <= 2

  // === LAYER 1: Core Response Format (non-negotiable) ===
  const responseFormat = `
OUTPUT FORMAT (strict):
Respond ONLY with a valid JSON object: {"response": [...], "vocab": [...]}
Each response item: {"text": "...", "language": "EN" or "${targetLanguageCode}"}
- 1-3 chunks maximum
- Never mix languages within a single chunk
- Do not use long paragraphs; keep each chunk short for TTS
${isBeginner ? `- For beginners: Target language chunks must be SINGLE words or SHORT phrases only (max ~5-10 words)` : ''}
- No markdown, no extra text outside the JSON

VOCAB (always present):
- Always include top-level "vocab": array (it may be empty: [])
- Each vocab item MUST be: {"term": "...", "translation": "...", "pronunciation": "..."}
- Only add items when you explicitly taught or highlighted NEW ${targetLanguage} words/phrases in THIS response (e.g., you explained meaning/usage/translation).
- If you are not teaching new vocab (especially at advanced levels or when responding naturally in ${targetLanguage}), set "vocab": [].
${isBeginner ? `- Beginner rule: If you include ANY ${targetLanguage} phrase in the response, you MUST be teaching it (explicit meaning + pronunciation) and include it in "vocab" (usually exactly 1 item).` : ''}
- Requirements:
  - "term" must be the exact ${targetLanguage} word/phrase as shown in your response text (no English here)
  - "translation" must be the English meaning/translation
  - "pronunciation" guidelines:
    - French: simple phonetics (English-friendly or IPA-like, e.g., "uhn kah-FAY")
    - Chinese: pinyin with tone marks or numbers (e.g., "kāfēi" or "ka1 fei1")
    - Japanese: romaji (anglicized/romanized) (e.g., "ohayou gozaimasu")
    - Other languages: simple English-friendly phonetics
  - 0-5 items, unique by "term".`

  // === LAYER 2: Base Tutor Personality ===
  const baseBehavior = `
ROLE: You are a warm, encouraging language tutor for ${targetLanguage}.
- Be conversational, not robotic or listy
- Ask follow-up questions to keep dialogue flowing
- When correcting, sandwich feedback: acknowledge effort → gentle correction → encouragement
- Match the user's energy (casual if they're casual, focused if they're focused)`

  // === LAYER 3: Difficulty & Language Ratio ===
  let difficultyGuidance: string
  if (lesson) {
    const { targetRatio, difficulty } = lesson
    const difficultyLabel = `LEVEL ${difficulty}/5`
    difficultyGuidance = `
DIFFICULTY: ${difficultyLabel}
Language mix target: ~${targetRatio.english}% English, ~${targetRatio.target}% ${targetLanguage}

${difficulty <= 2 ? `
    BEGINNER TEACHING PROTOCOL (STRICT):
    - Lead with English explanation
    - Introduce ONE new word/phrase at a time
    - NEVER ask the user to say something you haven't taught yet
    - Teaching sequence: (1) Teach the phrase with translation/pronunciation, (2) Ask them to try it
    - Format: "In ${targetLanguage}, we say [phrase] ([pronunciation]). This means [translation]. Can you try saying it?"
    - Wait for user response before introducing more
    - If user tries to use the phrase, celebrate and gently correct pronunciation
    - NEVER dump multiple new phrases in one response
    - NEVER assume they know basic grammar structures
    - Keep your target language chunks to SINGLE words or SHORT phrases only
    - If you want them to practice something, you MUST teach it first in the SAME response

Implementation rules:
- Usually produce 2 chunks: one EN chunk + one ${targetLanguageCode} chunk (optional third EN chunk for a short question)
- Do NOT put translations in the ${targetLanguageCode} chunk; keep translations/explanations in English chunks
- For LEVEL 1-2, your default move is: teach 1 phrase → ask user to repeat/use it` : ''}
${difficulty === 3 ? `
- Mix languages naturally based on user's comfort
- If user speaks in ${targetLanguage}, respond in ${targetLanguage}
- If user asks for help in English, explain in English, then invite back to ${targetLanguage}
- Gently correct errors without interrupting flow` : ''}
${difficulty >= 4 ? `
- Default to ${targetLanguage} for everything
- Only use English if user explicitly asks or is visibly struggling
- Push the user with follow-up questions, varied vocabulary
- Correct errors inline in ${targetLanguage}
- Use more complex sentence structures and idiomatic expressions` : ''}`
  } else {
    // Default intermediate behavior when no lesson selected
    difficultyGuidance = `
DIFFICULTY: LEVEL 3/5 (default - adaptive mode)
- If user speaks in ${targetLanguage}, respond primarily in ${targetLanguage}
- If user speaks English or asks for help, respond in English
- Be adaptive to their apparent comfort level
- Gently introduce new vocabulary when appropriate`
  }

  // === LAYER 4: Input Language Context ===
  let inputContext = ''
  if (inputLanguage) {
    inputContext = `
CURRENT INPUT: User is speaking in ${inputLanguage === 'english' ? 'English' : targetLanguage}.
${inputLanguage === 'english' 
  ? 'This is likely a command, question, or help request. Respond helpfully in English unless they\'re clearly practicing.'
  : `They are practicing ${targetLanguage}. Keep the conversation going naturally in ${targetLanguage} unless they seem stuck.`}`
  }

  // === LAYER 5: Lesson/Scenario Context ===
  let lessonContext = ''
  if (lesson) {
    lessonContext = `
CURRENT LESSON: "${lesson.title}"
${lesson.scenario ? `SCENARIO: ${lesson.scenario}` : ''}
${lesson.objectives?.length ? `
OBJECTIVES (guide conversation toward these):
${lesson.objectives.map(o => `- ${o}`).join('\n')}` : ''}
LESSON FLOW (important):
- Keep the user on track: if they go off-topic, briefly acknowledge/answer, then gently steer back to the next objective.

- When ALL objectives are complete, CONCLUDE the lesson:
  - Say clearly that the lesson is complete
  - Give a very short recap (1–2 short lines)
  - Offer what to do next (repeat, or choose the next lesson)
  - Do NOT ask another practice question after concluding
${lesson.examplePhrases?.length ? `
KEY PHRASES TO TEACH:
${lesson.examplePhrases.join(', ')}` : ''}`
  }

  // === LAYER 5b: Conversation Preset Context (when not in a lesson) ===
  let conversationContext = ''
  if (!lesson && conversationPreset?.systemInstructions) {
    conversationContext = `
CONVERSATION PRESET: "${conversationPreset.title}"
${conversationPreset.systemInstructions}`.trim()
  }

  // === LAYER 6: User Preferences ===
  let preferencesContext = ''
  if (userPreferences) {
    const parts: string[] = []
    if (userPreferences.correctionStyle) {
      const styleMap: Record<string, string> = {
        gentle: 'Be very gentle with corrections, focus on encouragement',
        direct: 'Give clear, direct corrections without excessive softening',
        minimal: 'Only correct major errors that impede understanding'
      }
      parts.push(styleMap[userPreferences.correctionStyle])
    }
    if (userPreferences.interests?.length) {
      parts.push(`User interests (weave into examples when natural): ${userPreferences.interests.join(', ')}`)
    }
    if (parts.length) {
      preferencesContext = `
USER PREFERENCES:
${parts.join('\n')}`
    }
  }

  // === Assemble Final Prompt ===
  return `${responseFormat}

${baseBehavior}
${difficultyGuidance}
${inputContext}
${lessonContext}
${conversationContext ? `\n\n${conversationContext}` : ''}
${preferencesContext}

Remember: Stay in character. Keep responses concise (this goes to TTS). JSON only.`.trim()
}

// Language code mapping
export const languageCodeMap: Record<string, string> = {
  'French': 'FR',
  'Spanish': 'ES',
  'Chinese': 'ZH',
  'Japanese': 'JA',
}

