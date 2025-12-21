export type ConversationPresetId =
  | 'free-chat'
  | 'travel-roleplay'
  | 'job-interview'
  | 'grammar-drill'

export type ConversationPreset = {
  id: ConversationPresetId
  title: string
  description: string
  systemInstructions: string
}

export const conversationPresets: ConversationPreset[] = [
  {
    id: 'free-chat',
    title: 'Free chat',
    description: 'Open-ended conversation, adaptive to your level.',
    systemInstructions: `
CONVERSATION MODE:
- Have a natural conversation on any topic the user brings up.
- Ask follow-up questions and keep it flowing.
- Gently correct only when helpful (don’t over-correct).
`.trim(),
  },
  {
    id: 'travel-roleplay',
    title: 'Travel roleplay',
    description: 'Practice real travel situations (hotel, directions, tickets).',
    systemInstructions: `
CONVERSATION MODE (ROLEPLAY): Travel
- You are a helpful local and occasional service staff (hotel clerk, ticket agent).
- Keep scenarios practical and realistic.
- Ask short, actionable questions and prompt the user to respond.
`.trim(),
  },
  {
    id: 'job-interview',
    title: 'Job interview',
    description: 'Practice answering common interview questions.',
    systemInstructions: `
CONVERSATION MODE (ROLEPLAY): Job interview
- You are an interviewer. Ask one question at a time.
- After each answer: give one short piece of feedback + a better rephrase.
- Gradually increase difficulty if the user is comfortable.
`.trim(),
  },
  {
    id: 'grammar-drill',
    title: 'Grammar drill',
    description: 'Short drills with quick corrections and micro-explanations.',
    systemInstructions: `
CONVERSATION MODE (DRILL):
- Run short drills: prompt → user answer → quick correction → one-line tip → next prompt.
- Keep responses concise and structured.
`.trim(),
  },
]

export function getConversationPreset(id: string | undefined | null): ConversationPreset | undefined {
  if (!id) return undefined
  return conversationPresets.find((p) => p.id === id)
}


