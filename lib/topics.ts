/**
 * Unified Topics System
 * 
 * Single source of truth for all learning content.
 * Replaces the separate lesson/conversation approach.
 */

// ============================================
// CORE TYPES
// ============================================

export type Difficulty = 1 | 2 | 3 | 4 | 5
export type TopicType = 'vocab' | 'grammar' | 'situational' | 'conversation' | 'debate'

export type InteractiveElementType =
  | 'role-play'
  | 'fill-in-blank'
  | 'multiple-choice'
  | 'translation'
  | 'spot-the-mistake'
  | 'rapid-fire'

export interface InteractiveElement {
  type: InteractiveElementType
  prompt: string
  hint?: string
  expectedResponse?: string[]
  reaction?: string
}

export interface Scenario {
  context: string
  vocabulary?: string[]
  notes?: string[]
}

export interface VocabItem {
  term: string
  context?: string
  culturalNote?: string
  commonPairings?: string[]
  example?: string
}

export interface UserPreferences {
  personalityMode?: 'hype-coach' | 'chill-friend' | 'strict-tutor'
  interests?: string[]
}

// ============================================
// TOPIC DEFINITION (Content Template)
// ============================================

export interface Objective {
  id: string
  complete: boolean
}

export interface VocabProgress {
  term: string
  complete: boolean
}

export interface Topic {
  id: string
  type: TopicType
  title: string
  emoji: string
  description: string
  difficulty: Difficulty
  order?: number
  
  // What's covered?
  coreObjectives: Objective[]
  focusAreas: string[]
  
  // Language mix target
  targetRatio: {
    english: number
    target: number
  }
  
  // Content
  scenarios?: Scenario[]
  grammarConcepts?: string[]
  interactiveElements?: InteractiveElement[]
  
  // How long to master?
  estimatedSessions?: number
  
  // For conversation types: additional instructions
  conversationInstructions?: string
}

// Topic with language-specific vocabulary attached
export interface TopicWithVocab extends Topic {
  requiredVocab?: VocabProgress[]
  vocabDetails?: VocabItem[]
}

// ============================================
// TOPIC STATE (Per-User Progress)
// ============================================

export interface TopicProgressMetrics {
  objectives: Objective[]
  vocab: VocabProgress[]
  sessionsCompleted: number
}

export interface TopicState {
  topicId: string
  isActive: boolean
  
  /** AI writes this after each session */
  aiNotes: string
  
  progressMetrics: TopicProgressMetrics
  
  /** 0=not started, 1-2=beginner, 3=intermediate, 4-5=mastered */
  masteryLevel: 0 | 1 | 2 | 3 | 4 | 5
  
  lastPracticed: Date | null
  nextReviewDue?: Date | null
}

export type TopicStateEvent = 
  | 'objective_completed' 
  | 'vocab_mastered' 
  | 'progress_made'
  | 'session_end'

/** AI response for updating topic state */
export interface TopicStateUpdate {
  topicId: string
  /** What triggered this update */
  event: TopicStateEvent
  /** User-visible summary (e.g., "Mastered greeting phrase こんにちは") */
  summary: string
  /** AI notes for next session */
  aiNotes: string
  progressMetrics: TopicProgressMetrics
  masteryLevel: 0 | 1 | 2 | 3 | 4 | 5
}

export function createDefaultTopicState(topicId: string, topic?: Topic, topicWithVocab?: TopicWithVocab): TopicState {
  const objectives = topic?.coreObjectives?.map(obj => 
    typeof obj === 'string' 
      ? { id: obj, complete: false }
      : obj
  ) || []
  
  const vocab = topicWithVocab?.requiredVocab?.map(v => 
    typeof v === 'string'
      ? { term: v, complete: false }
      : v
  ) || []

  return {
    topicId,
    isActive: false,
    aiNotes: '',
    progressMetrics: {
      objectives,
      vocab,
      sessionsCompleted: 0,
    },
    masteryLevel: 0,
    lastPracticed: null,
    nextReviewDue: null,
  }
}

// ============================================
// TOPIC DEFINITIONS
// ============================================

export const topics: Record<string, Topic> = {
  // ========================================
  // LEVEL 1: BEGINNER FUNDAMENTALS
  // ========================================
  
  'l1-introductions': {
    id: 'l1-introductions',
    type: 'situational',
    order: 1,
    emoji: '👋',
    title: 'Introductions',
    difficulty: 1,
    description: 'Learn basic greetings and how to introduce yourself.',
    focusAreas: ['Greetings', 'Self-introduction', 'Basic courtesy'],
    targetRatio: { english: 85, target: 15 },
    estimatedSessions: 2,
    coreObjectives: [
      { id: 'Say hello, goodbye, nice to meet you', complete: false },
      { id: 'Introduce yourself by stating your name, and ask someone their name', complete: false },
      { id: 'Role-play a basic introduction dialogue: exchange greetings, share your name, and ask for theirs', complete: false }
    ],
    scenarios: [
      {
        context: 'You walk into a language exchange meetup and see a friendly face',
        vocabulary: ['hello', 'my name is…', "what's your name?"],
        notes: ['Start with a smile—model warmth and openness', 'Keep it natural, like meeting a friend at a party']
      }
    ],
    interactiveElements: [
      {
        type: 'role-play',
        prompt: 'I just walked into the room. Greet me and introduce yourself!',
        hint: 'Start with hello, then tell me your name',
        expectedResponse: ['a greeting', 'my name is…'],
        reaction: 'Perfect! Now I\'ll tell you my name and we can practice asking each other'
      }
    ]
  },

  'l1-addressing-people': {
    id: 'l1-addressing-people',
    type: 'vocab',
    order: 2,
    emoji: '🤝',
    title: 'Addressing People',
    difficulty: 1,
    description: 'Learn common ways to address people in various roles.',
    focusAreas: ['Titles', 'Social roles', 'Formal vs informal'],
    targetRatio: { english: 85, target: 15 },
    estimatedSessions: 2,
    coreObjectives: [
      { id: 'Learn how to address teachers, friends, waiters/waitresses, and neighbors', complete: false },
      { id: 'Understand formal and informal ways to address people', complete: false }
    ],
    scenarios: [
      {
        context: 'You\'re at a restaurant and need to get the waiter\'s attention',
        vocabulary: ['polite way to address service staff'],
        notes: ['Show the polite way to call service staff', 'Contrast with how you\'d call a friend']
      },
      {
        context: 'You meet your friend\'s teacher at a school event',
        vocabulary: ['teacher/professor title (polite)'],
        notes: ['Emphasize respect and formality', 'This is a BIG cultural thing—teachers get serious respect']
      }
    ],
    interactiveElements: [
      {
        type: 'multiple-choice',
        prompt: 'Quick quiz: You need to call your waiter over. Which sounds more natural?',
        hint: 'Think about what you learned for service staff'
      },
      {
        type: 'role-play',
        prompt: 'You\'re introducing me to your teacher. How do you address them politely in the target language?',
        expectedResponse: ['teacher/professor title'],
        reaction: 'Exactly! Very respectful. Now try with a casual friend.'
      }
    ]
  },

  'l1-family': {
    id: 'l1-family',
    type: 'vocab',
    order: 3,
    emoji: '👨‍👩‍👧‍👦',
    title: 'Family',
    difficulty: 1,
    description: 'Talk about your family and ask about someone else\'s.',
    focusAreas: ['Family members', 'Relationships', 'Descriptions'],
    targetRatio: { english: 85, target: 15 },
    estimatedSessions: 2,
    coreObjectives: [
      { id: 'Learn vocabulary for family members: mother, father, brother, sister, grandparents', complete: false },
      { id: 'Describe family relationships, like "this is my mom" and "my dad is a business owner"', complete: false },
      { id: 'Practice asking about someone else\'s family, e.g., "Do you have siblings?"', complete: false }
    ],
    scenarios: [
      {
        context: 'You\'re showing a new friend photos on your phone',
        vocabulary: ['mom', 'dad', 'older/younger brother', 'older/younger sister'],
        notes: ['Build vocabulary through showing/pointing at imaginary photos', 'Make it visual and personal']
      }
    ],
    interactiveElements: [
      {
        type: 'fill-in-blank',
        prompt: 'Your friend asks: "Do you have siblings?" How would you answer in the target language?',
        hint: 'Use the pattern for "have/don\'t have" + the family word (in the target language)',
        reaction: 'Nice! Now let\'s build on that—tell me about one of them!'
      },
      {
        type: 'translation',
        prompt: 'Say this in the target language: "I have a younger sister and an older brother"',
        hint: 'Use the words for older/younger + sister/brother in the target language',
      }
    ]
  },

  'l1-personal-info': {
    id: 'l1-personal-info',
    type: 'situational',
    order: 4,
    emoji: '🎓',
    title: 'Personal Information',
    difficulty: 1,
    description: 'Learn basic details about yourself in a conversation.',
    focusAreas: ['Age', 'Location', 'Occupation', 'Q&A patterns'],
    targetRatio: { english: 85, target: 15 },
    estimatedSessions: 2,
    coreObjectives: [
      { id: 'Learn how to describe where you\'re from, your age, and occupation', complete: false },
      { id: 'Practice answering questions on your personal info', complete: false },
      { id: 'Learn how to ask others about their background, age, or occupation', complete: false }
    ],
    scenarios: [
      {
        context: 'You\'re at a language exchange—someone asks where you\'re from',
        vocabulary: ['I\'m from…', 'Where are you from?'],
        notes: ['Keep it conversational—like you\'re making a new friend', 'Build up from simple answer to asking back']
      },
      {
        context: 'A classmate is curious about what you do',
        vocabulary: ['I\'m a student / I work as…', 'What do you do for work?'],
        notes: ['Teach the question-answer pair together']
      }
    ],
    interactiveElements: [
      {
        type: 'role-play',
        prompt: 'I just asked: "Where are you from?" Answer me, then ask me the same question back (in the target language)!',
        expectedResponse: ['I\'m from…', 'and you?', 'Where are you from?'],
        reaction: 'Perfect back-and-forth! This is exactly how real conversations flow.'
      },
      {
        type: 'rapid-fire',
        prompt: 'Speed round! Answer these 3 quick questions about yourself: Where are you from? What do you do? How old are you?',
        hint: 'Don\'t overthink—just use the patterns we learned!'
      }
    ]
  },

  'l1-common-phrases': {
    id: 'l1-common-phrases',
    type: 'situational',
    order: 5,
    emoji: '💬',
    title: 'Common Phrases',
    difficulty: 1,
    description: 'Master essential everyday phrases through mini real-life situations.',
    focusAreas: ['Politeness', 'Basic responses', 'Daily expressions'],
    targetRatio: { english: 85, target: 15 },
    estimatedSessions: 3,
    coreObjectives: [
      { id: 'Learn phrases like thank you, please, and sorry, yes and no', complete: false },
      { id: 'Discuss how to ask and answer "How are you?" and respond with "I\'m doing good"', complete: false }
    ],
    scenarios: [
      {
        context: 'You bump into someone in a busy coffee shop',
        vocabulary: ['sorry / excuse me', 'no worries / it\'s okay'],
        notes: ['Keep it light and quick; model a natural two-line exchange.'],
      },
      {
        context: 'A friend helps you carry heavy bags',
        vocabulary: ['thank you', 'you\'re welcome / no problem'],
        notes: ['Teach the pair together as a mini conversation.'],
      },
      {
        context: 'Someone greets you with "How are you?" on a Monday morning',
        vocabulary: ['How are you?', 'I\'m good / I\'m doing well'],
        notes: ['Show how this greeting flows naturally', 'Emphasize how the language forms questions (if applicable)']
      }
    ],
    interactiveElements: [
      {
        type: 'role-play',
        prompt: 'Role-play: You bumped into me. What do you say?',
        expectedResponse: ['sorry / excuse me'],
        reaction: 'Nice—then I can reply with a natural "no worries / it\'s okay."',
      },
      {
        type: 'fill-in-blank',
        prompt: 'Fill in the blank: Your friend helped you. You say: ___',
        hint: "It's the \"thank you\" phrase from earlier.",
        expectedResponse: ['thank you'],
      },
      {
        type: 'rapid-fire',
        prompt: 'I\'ll give you situations—you respond with the right phrase! Ready?',
        hint: 'Think: thank you, sorry, you\'re welcome, or no problem',
        reaction: 'Great reflexes! These will become automatic soon.'
      }
    ],
  },

  'l1-likes-dislikes': {
    id: 'l1-likes-dislikes',
    type: 'situational',
    order: 6,
    emoji: '⚽',
    title: 'Likes & Dislikes',
    difficulty: 1,
    description: 'Express your preferences and learn how to give examples of what you like.',
    focusAreas: ['Preferences', 'Common interests', 'Question patterns'],
    targetRatio: { english: 85, target: 15 },
    estimatedSessions: 2,
    coreObjectives: [
      { id: 'Learn to say "I like" and "I don\'t like"', complete: false },
      { id: 'Practice discussing common things people like', complete: false },
      { id: 'Learn to ask "What about you?"', complete: false }
    ],
    scenarios: [
      {
        context: 'You\'re getting to know a new friend—talking about hobbies and interests',
        vocabulary: ['I like…', 'I don\'t like…', 'what about you?'],
        notes: ['Make it personal—ask about THEIR real interests', 'Use specific examples: music, sports, food']
      }
    ],
    interactiveElements: [
      {
        type: 'fill-in-blank',
        prompt: 'Tell me something you like in the target language: "I like ___"',
        hint: 'Use the target-language pattern for "I like" + a thing (soccer, music, movies, etc.)',
        expectedResponse: ['I like'],
        reaction: 'Awesome! Now flip it—tell me something you DON\'T like.'
      },
      {
        type: 'role-play',
        prompt: 'I just said (in the target language): "I like soccer!" Now ask me "What about you?" and tell me your own preference.',
        expectedResponse: ['what about you?', 'I like…', 'I don\'t like…'],
        reaction: 'Perfect conversational flow! See how naturally that bounces back and forth?'
      },
      {
        type: 'translation',
        prompt: 'Challenge: String together a full sentence: "I like music, but I don\'t like soccer"',
        hint: 'Use the target-language word for "but" to connect the two parts',
      }
    ]
  },

  // ========================================
  // CONVERSATION TOPICS
  // ========================================

  'conv-free-chat': {
    id: 'conv-free-chat',
    type: 'conversation',
    order: 1,
    emoji: '💬',
    title: 'Free Chat',
    difficulty: 2,
    description: 'Open-ended conversation, adaptive to your level.',
    focusAreas: ['Conversation', 'Fluency', 'Natural speech'],
    targetRatio: { english: 50, target: 50 },
    estimatedSessions: 0, // Ongoing
    coreObjectives: [
      { id: 'Practice natural conversation flow', complete: false },
      { id: 'Build confidence speaking', complete: false },
      { id: 'Learn contextual vocabulary', complete: false }
    ],
    conversationInstructions: `
CONVERSATION MODE:
- Have a natural conversation on any topic the user brings up.
- Ask follow-up questions and keep it flowing.
- Gently correct only when helpful (don't over-correct).
`.trim(),
  },

  'conv-travel-roleplay': {
    id: 'conv-travel-roleplay',
    type: 'conversation',
    order: 2,
    emoji: '✈️',
    title: 'Travel Roleplay',
    difficulty: 2,
    description: 'Practice real travel situations (hotel, directions, tickets).',
    focusAreas: ['Travel', 'Practical situations', 'Service interactions'],
    targetRatio: { english: 40, target: 60 },
    estimatedSessions: 0,
    coreObjectives: [
      { id: 'Navigate hotel check-in scenarios', complete: false },
      { id: 'Ask for directions confidently', complete: false },
      { id: 'Handle restaurant and shopping situations', complete: false }
    ],
    conversationInstructions: `
CONVERSATION MODE (ROLEPLAY): Travel
- You are a helpful local and occasional service staff (hotel clerk, ticket agent).
- Keep scenarios practical and realistic.
- Ask short, actionable questions and prompt the user to respond.
`.trim(),
  },

  'conv-job-interview': {
    id: 'conv-job-interview',
    type: 'conversation',
    order: 3,
    emoji: '💼',
    title: 'Job Interview',
    difficulty: 3,
    description: 'Practice answering common interview questions.',
    focusAreas: ['Professional', 'Formal speech', 'Interview skills'],
    targetRatio: { english: 30, target: 70 },
    estimatedSessions: 0,
    coreObjectives: [
      { id: 'Answer common interview questions', complete: false },
      { id: 'Practice professional vocabulary', complete: false },
      { id: 'Improve formal speech patterns', complete: false }
    ],
    conversationInstructions: `
CONVERSATION MODE (ROLEPLAY): Job interview
- You are an interviewer. Ask one question at a time.
- After each answer: give one short piece of feedback + a better rephrase.
- Gradually increase difficulty if the user is comfortable.
`.trim(),
  },

  'conv-grammar-drill': {
    id: 'conv-grammar-drill',
    type: 'grammar',
    order: 4,
    emoji: '📝',
    title: 'Grammar Drill',
    difficulty: 3,
    description: 'Short drills with quick corrections and micro-explanations.',
    focusAreas: ['Grammar', 'Structure', 'Accuracy'],
    targetRatio: { english: 40, target: 60 },
    estimatedSessions: 0,
    coreObjectives: [
      { id: 'Reinforce grammar patterns through practice', complete: false },
      { id: 'Build quick recall of structures', complete: false },
      { id: 'Identify and correct common errors', complete: false }
    ],
    conversationInstructions: `
CONVERSATION MODE (DRILL):
- Run short drills: prompt → user answer → quick correction → one-line tip → next prompt.
- Keep responses concise and structured.
`.trim(),
  },

  // ========================================
  // LEVEL 5: ADVANCED IDIOMS & EXPRESSIONS
  // ========================================

  'l5-business-idioms': {
    id: 'l5-business-idioms',
    type: 'situational',
    order: 1,
    emoji: '💼',
    title: 'Business Idioms',
    difficulty: 5,
    description: 'Master idiomatic expressions used in professional settings.',
    focusAreas: ['Workplace idioms', 'Business metaphors', 'Professional slang'],
    targetRatio: { english: 10, target: 90 },
    estimatedSessions: 4,
    coreObjectives: [
      { id: 'Learn common business idioms and their cultural context', complete: false },
      { id: 'Understand metaphorical expressions in professional settings', complete: false },
      { id: 'Practice using idioms naturally in appropriate situations', complete: false }
    ],
    scenarios: [
      {
        context: 'You\'re in a tense meeting where stakeholders are talking past each other—it\'s time to speak frankly and reset the tone',
        vocabulary: ['an idiom meaning "speak frankly"', 'an idiom meaning "lay the groundwork"'],
        notes: ['Use real corporate tension—make them feel the weight', 'Push them to USE it, not just translate it']
      },
      {
        context: 'A junior teammate keeps focusing on tiny details while missing the strategic picture',
        vocabulary: ['an idiom meaning "can\'t see the forest for the trees"'],
        notes: ['This is THE classic "can\'t see the forest for the trees"', 'Have them explain when to deploy this diplomatically']
      },
      {
        context: 'Your boss asks if you\'re confident in a risky proposal. You say you\'ll proceed cautiously',
        vocabulary: ['an idiom meaning "proceed cautiously"'],
        notes: ['Compare across languages—some metaphors are more vivid than others', 'Discuss risk tolerance in different cultures']
      }
    ],
    interactiveElements: [
      {
        type: 'spot-the-mistake',
        prompt: 'I\'m about to use the "speak frankly" idiom in a totally wrong context. Catch me and fix it!',
        reaction: 'Exactly! You\'d never say that in a casual chat—it\'s for serious professional moments.'
      },
      {
        type: 'rapid-fire',
        prompt: 'Speed round: I describe a workplace situation, you fire back the perfect idiom. Ready?',
        hint: 'Trust your gut—think about the vibe of each phrase',
        reaction: 'Your instincts are sharp! That\'s how native speakers do it—feel, don\'t translate.'
      },
      {
        type: 'role-play',
        prompt: 'You\'re advising me (your colleague) who\'s obsessing over formatting in a presentation due tomorrow. Use the "forest/trees" idiom to snap me out of it.',
        expectedResponse: ['forest/trees idiom', 'big picture'],
        reaction: 'Perfect delivery! That would absolutely land in a real meeting.'
      },
      {
        type: 'translation',
        prompt: 'Translate this corporate-speak into an idiom: "We need to lay the groundwork before launching."',
        hint: 'Think about building foundations...',
        expectedResponse: ['lay the groundwork idiom'],
        reaction: 'Nailed it! Much more natural than literal translation.'
      }
    ]
  },

  'l5-cultural-expressions': {
    id: 'l5-cultural-expressions',
    type: 'situational',
    order: 2,
    emoji: '🎎',
    title: 'Cultural Expressions',
    difficulty: 5,
    description: 'Deep dive into culturally-specific phrases and their origins.',
    focusAreas: ['Cultural context', 'Historical expressions', 'Regional variations'],
    targetRatio: { english: 10, target: 90 },
    estimatedSessions: 4,
    coreObjectives: [
      { id: 'Learn expressions rooted in cultural traditions', complete: false },
      { id: 'Understand when and how to use culturally-specific phrases', complete: false },
      { id: 'Recognize regional variations and nuances', complete: false }
    ],
    scenarios: [
      {
        context: 'You meet someone and immediately click—you want to describe it as a meaningful, "meant to be" kind of connection',
        vocabulary: ['a cultural term for a meaningful coincidence / destined connection'],
        notes: ['Explore the concept, don\'t just translate', 'Ask: Do they believe in this? How does it shape relationships?']
      },
      {
        context: 'You want to respond politely after someone helps you—many cultures have a "set phrase" for this moment',
        vocabulary: ['a culturally natural expression of appreciation'],
        notes: ['Discuss when it sounds natural vs awkwardly forced', 'Talk about formality and tone']
      },
      {
        context: 'You\'re about to eat—many languages have a phrase people naturally say before starting a meal',
        vocabulary: ['a phrase said before eating (if applicable)'],
        notes: ['Discuss what it signals culturally (gratitude, politeness, togetherness)', 'Note when it\'s used and with whom']
      },
      {
        context: 'Someone asks how you\'re doing, and you want a culturally natural response that carries humility or gratitude',
        vocabulary: ['a culturally natural polite response'],
        notes: ['Explore what the phrase implies beyond the literal words', 'Compare how people respond in different cultures']
      }
    ],
    interactiveElements: [
      {
        type: 'role-play',
        prompt: 'Role-play: I did you a favor. Respond naturally using an appropriate cultural expression in the target language.',
        hint: 'Keep it natural—don\'t over-translate; use the phrase a native would actually say',
        expectedResponse: ['a culturally natural expression of appreciation'],
        reaction: 'Perfect—that felt natural, not textbooky.'
      },
      {
        type: 'translation',
        prompt: 'Explain one of today\'s cultural expressions to someone who has zero cultural context. Give the essence, not just a dictionary translation.',
        reaction: 'Beautiful—you\'re capturing the cultural meaning, not just the literal words.'
      },
      {
        type: 'spot-the-mistake',
        prompt: 'I\'m about to use one of today\'s cultural expressions like it has a simple, literal meaning. Stop me and explain the nuance.',
        reaction: 'Yes! That nuance is the whole point—this is why it\'s culturally specific.'
      },
      {
        type: 'multiple-choice',
        prompt: 'Scenario: Someone says a cultural expression to you. Which response sounds most natural?',
        hint: 'Think about tone, formality, and what people actually say back',
        reaction: 'Exactly—being "correct" is not enough; it has to sound socially natural.'
      },
      {
        type: 'rapid-fire',
        prompt: 'I\'ll describe situations—you tell me which of today\'s cultural expressions fits best, and why. Quick!',
        reaction: 'Your cultural radar is ON POINT—you\'re thinking like an insider now.'
      }
    ]
  },

  'l5-advanced-slang': {
    id: 'l5-advanced-slang',
    type: 'vocab',
    order: 3,
    emoji: '🔥',
    title: 'Contemporary Slang',
    difficulty: 5,
    description: 'Learn modern slang and informal expressions used by native speakers.',
    focusAreas: ['Modern slang', 'Youth culture', 'Internet language', 'Casual speech'],
    targetRatio: { english: 5, target: 95 },
    estimatedSessions: 4,
    coreObjectives: [
      { id: 'Master current slang expressions and their proper usage', complete: false },
      { id: 'Understand generational and subcultural language differences', complete: false },
      { id: 'Practice switching between formal and casual registers', complete: false },
      { id: 'Learn internet/text slang and common abbreviations', complete: false }
    ],
    scenarios: [
      {
        context: 'Your friend just pulled off something incredible—you react with strong slang',
        vocabulary: ['strong praise slang', 'short hype shorthand'],
        notes: ['Explain when it\'s appropriate vs too casual', 'Compare to the closest English vibe ("that\'s sick!" / "that\'s fire!")']
      },
      {
        context: 'You see drama unfolding online and decide you\'re just here to watch',
        vocabulary: ['spectator / watching-drama slang'],
        notes: ['Explain the lurker/spectator mentality', 'Discuss "involved vs just observing" vibe']
      },
      {
        context: 'Someone asks if you want to join the rat race—you respond with a "chill / not stressing" vibe',
        vocabulary: ['chill / not caring slang', 'opting-out slang'],
        notes: ['This is often tied to youth culture and burnout', 'Contrast passive acceptance vs actively opting out (if your language has both vibes)']
      },
      {
        context: 'Everyone at work/school is grinding harder and harder—an arms race of effort',
        vocabulary: ['over-competition / rat-race slang'],
        notes: ['Discuss the arms race dynamic and collective exhaustion', 'When it sounds funny vs bitter']
      },
      {
        context: 'You visit a hyped new café and post about it—classic "check-in / flex" energy',
        vocabulary: ['check-in / posting slang'],
        notes: ['Discuss performative experiences and social media culture', 'When it sounds playful vs braggy']
      }
    ],
    interactiveElements: [
      {
        type: 'rapid-fire',
        prompt: 'I\'ll drop slang in random sentences—you catch it and tell me what vibe it gives. Speed round!',
        reaction: 'Your slang radar is SHARP. You\'re picking up on tone and context like a native.'
      },
      {
        type: 'spot-the-mistake',
        prompt: 'I\'m about to use super-casual slang in a formal setting. Save me before I embarrass myself!',
        reaction: 'THANK YOU. Yeah, that would NOT go well. Know your audience!'
      },
      {
        type: 'role-play',
        prompt: 'Your friend is stressing about competition. Describe the situation using one of today\'s slang terms, then offer a "chill" perspective.',
        expectedResponse: ['over-competition slang', 'chill / not stressing slang'],
        reaction: 'Perfect! You just captured the entire Gen Z existential crisis in two words.'
      },
      {
        type: 'translation',
        prompt: 'Translate this internet vibe into natural slang: "I\'m just here for the drama, not getting involved."',
        hint: 'Think about passive observation...',
        expectedResponse: ['just watching', 'spectator', 'here for the drama'],
        reaction: 'Yes! That\'s the perfect "I\'m just here for the drama" energy.'
      },
      {
        type: 'multiple-choice',
        prompt: 'Your friend replies with a short hype shorthand/slang after you finish something impressive. What vibe are they expressing?',
        hint: 'Think: praise + hype + approval',
        reaction: 'Exactly—it\'s pure hype and approval.'
      },
      {
        type: 'role-play',
        prompt: 'You just visited a hyped new café. Describe your "check-in" experience with appropriate slang.',
        hint: 'Keep it casual and modern—one or two slangy words is enough',
        reaction: 'PERFECT—that\'s exactly the right flex energy.'
      },
      {
        type: 'translation',
        prompt: 'How would you explain one of today\'s slang terms to a confused friend? Capture the vibe, not just the literal meaning.',
        reaction: 'YES. You\'re explaining the vibe, not just the dictionary meaning. That\'s how you really understand slang.'
      }
    ]
  }
}

// ============================================
// LANGUAGE-SPECIFIC VOCABULARY
// ============================================

export const topicVocabulary: Record<string, Record<string, Array<string | VocabItem>>> = {
  'l1-introductions': {
    'Japanese': ['こんにちは', 'さようなら', 'はじめまして', '私の名前は...です', 'お名前は何ですか？'],
    'French': ['Bonjour', 'Au revoir', 'Enchanté(e)', 'Je m\'appelle...', 'Comment tu t\'appelles?'],
    'Spanish': ['¡Hola!', 'Adiós', 'Mucho gusto', 'Me llamo...', '¿Cómo te llamas?'],
    'Chinese': ['你好', '再见', '很高兴认识你', '我叫...', '你叫什么名字？']
  },

  'l1-addressing-people': {
    'Japanese': ['先生', '友達', '店員さん', 'ウェイター/ウェイトレス', '隣人', 'さん'],
    'French': ['Professeur', 'Ami(e)', 'Monsieur/Madame', 'Serveur/Serveuse', 'Voisin(e)'],
    'Spanish': ['Profesor(a)', 'Amigo(a)', 'Señor/Señora', 'Mesero(a)', 'Vecino(a)'],
    'Chinese': ['老师', '朋友', '先生/女士', '服务员', '邻居']
  },

  'l1-family': {
    'Japanese': ['母', '父', '兄/弟', '姉/妹', '祖父母', '兄弟姉妹がいますか？'],
    'French': ['Mère', 'Père', 'Frère', 'Sœur', 'Grands-parents', 'Tu as des frères et sœurs?'],
    'Spanish': ['Madre', 'Padre', 'Hermano', 'Hermana', 'Abuelos', '¿Tienes hermanos?'],
    'Chinese': ['妈妈', '爸爸', '哥哥/弟弟', '姐姐/妹妹', '祖父母', '你有兄弟姐妹吗？']
  },

  'l1-personal-info': {
    'Japanese': ['私は...出身です', '...歳です', '私は学生です', 'どこから来ましたか？', '何歳ですか？', 'お仕事は何ですか？'],
    'French': ['Je viens de...', 'J\'ai ... ans', 'Je suis étudiant(e)', 'D\'où viens-tu?', 'Quel âge as-tu?', 'Qu\'est-ce que tu fais?'],
    'Spanish': ['Soy de...', 'Tengo ... años', 'Soy estudiante', '¿De dónde eres?', '¿Cuántos años tienes?', '¿A qué te dedicas?'],
    'Chinese': ['我来自...', '我...岁', '我是学生', '你从哪里来？', '你几岁？', '你做什么工作？']
  },

  'l1-common-phrases': {
    'Japanese': ['ありがとう', 'どういたしまして', 'すみません', 'お願いします', 'はい/いいえ', 'お元気ですか？', '元気です'],
    'French': ['Merci', 'De rien', 'Pardon', 'S\'il vous plaît', 'Oui/Non', 'Comment ça va?', 'Ça va bien'],
    'Spanish': ['Gracias', 'De nada', 'Lo siento', 'Por favor', 'Sí/No', '¿Cómo estás?', 'Estoy bien'],
    'Chinese': [
      {
        term: '谢谢',
        context: 'When someone helps you or gives you something',
        culturalNote: "Often repeated for emphasis when you're very grateful.",
        commonPairings: ['不客气'],
      },
      {
        term: '不客气',
        context: "Responding to thanks (\"you're welcome / no problem\")",
        commonPairings: ['谢谢'],
      },
      {
        term: '对不起',
        context: 'When you bump into someone or make a small mistake',
        culturalNote: "More \"I'm sorry\" than \"excuse me.\"",
        commonPairings: ['没关系'],
      },
      {
        term: '没关系',
        context: "Responding to an apology (\"it's okay / no worries\")",
        commonPairings: ['对不起'],
      },
      { term: '请', context: '"Please" (also used to politely invite/offer)', example: '请进' },
      { term: '是/不是', context: 'Yes/No (basic confirmations)' },
      { term: '你好吗？', context: '"How are you?" (friendly check-in)' },
      { term: '我很好', context: "\"I'm good / I'm doing well\"" },
    ],
  },

  'l1-likes-dislikes': {
    'Japanese': ['好きです', '好きではありません', 'サッカーが好きです', '音楽が好きです', 'あなたは？'],
    'French': ['J\'aime', 'Je n\'aime pas', 'J\'aime le football', 'J\'aime la musique', 'Et toi?'],
    'Spanish': ['Me gusta', 'No me gusta', 'Me gusta el fútbol', 'Me gusta la música', '¿Y tú?'],
    'Chinese': ['我喜欢', '我不喜欢', '我喜欢足球', '我喜欢音乐', '你呢？']
  },

  'l5-business-idioms': {
    'Japanese': ['根回し', '袖の下', '腹を割って話す', '木を見て森を見ず', '石橋を叩いて渡る'],
    'French': ['Mettre les points sur les i', 'Faire le pont', 'Jeter l\'éponge', 'Avoir le vent en poupe', 'Décrocher la lune'],
    'Spanish': ['Echar agua al mar', 'Estar en la luna', 'Mover cielo y tierra', 'Ser pan comido', 'Costar un ojo de la cara'],
    'Chinese': ['打基础', '走后门', '开诚布公', '只见树木不见森林', '小心谨慎']
  },

  'l5-cultural-expressions': {
    'Japanese': ['一期一会', 'もったいない', 'お疲れ様', 'いただきます', 'お陰様で'],
    'French': ['C\'est la vie', 'Joie de vivre', 'Savoir-faire', 'Bon appétit', 'Rendez-vous'],
    'Spanish': ['Sobremesa', 'Puente', 'Estrenar', 'Consuegro', 'Madrugada'],
    'Chinese': ['缘分', '面子', '关系', '孝顺', '中庸']
  },

  'l5-advanced-slang': {
    'Japanese': ['ヤバい', 'エモい', 'バズる', 'ガチ', 'チルする', '推し'],
    'French': ['Kiffer', 'Chelou', 'Ouf', 'Taffer', 'Boloss', 'Péter un câble'],
    'Spanish': ['Chido', 'Ñoño', 'Bacán', 'Chamba', 'Fresa', 'Pachanga'],
    'Chinese': ['牛逼', '666', '打卡', '佛系', '吃瓜', '内卷']
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/** Get topic with language-specific vocabulary */
export function getTopicWithVocab(topicId: string, language: string): TopicWithVocab | undefined {
  const topic = topics[topicId]
  if (!topic) return undefined

  const raw = topicVocabulary[topicId]?.[language]
  const requiredVocab: VocabProgress[] | undefined = Array.isArray(raw)
    ? raw
        .map((v: any) => {
          const term = typeof v === 'string' ? v : (v?.term as string)
          return term && typeof term === 'string' && term.trim().length > 0
            ? { term: term.trim(), complete: false }
            : null
        })
        .filter((v): v is VocabProgress => v !== null)
    : undefined

  const vocabDetails =
    Array.isArray(raw) && raw.some((v: any) => v && typeof v === 'object' && typeof v.term === 'string')
      ? (raw as any[]).filter((v) => v && typeof v === 'object' && typeof v.term === 'string')
      : undefined

  return {
    ...topic,
    requiredVocab,
    vocabDetails,
  }
}

/** Get all topics as array, sorted by difficulty then order */
export function getAllTopics(): Topic[] {
  return Object.values(topics).sort((a, b) => {
    if (a.difficulty !== b.difficulty) return a.difficulty - b.difficulty
    const ao = a.order ?? null
    const bo = b.order ?? null
    if (ao !== null && bo !== null) return ao - bo
    if (ao !== null && bo === null) return -1
    if (ao === null && bo !== null) return 1
    return a.title.localeCompare(b.title)
  })
}

/** Get topics by type */
export function getTopicsByType(type: TopicType): Topic[] {
  return getAllTopics().filter((t) => t.type === type)
}

/** Get topics by difficulty */
export function getTopicsByDifficulty(difficulty: Difficulty): Topic[] {
  return getAllTopics().filter((t) => t.difficulty === difficulty)
}

/** Check if topic is conversation-based (no structured objectives) */
export function isConversationTopic(topic: Topic): boolean {
  return topic.type === 'conversation' || topic.type === 'debate'
}

/** Check if topic is structured (has clear objectives to complete) */
export function isStructuredTopic(topic: Topic): boolean {
  return topic.type === 'vocab' || topic.type === 'grammar' || topic.type === 'situational'
}

// ============================================
// TOPIC GROUPING (for UI)
// ============================================

export interface TopicGroup {
  title: string
  emoji: string
  topics: Topic[]
}

export function groupTopicsByDifficulty(): TopicGroup[] {
  const groups: TopicGroup[] = [
    { title: 'Beginner', emoji: '🌱', topics: [] },
    { title: 'Elementary', emoji: '📚', topics: [] },
    { title: 'Intermediate', emoji: '🎯', topics: [] },
    { title: 'Advanced', emoji: '🚀', topics: [] },
    { title: 'Expert', emoji: '⭐', topics: [] },
  ]
  
  for (const topic of getAllTopics()) {
    const groupIndex = topic.difficulty - 1
    if (groupIndex >= 0 && groupIndex < groups.length) {
      groups[groupIndex].topics.push(topic)
    }
  }
  
  return groups.filter((g) => g.topics.length > 0)
}

export function groupTopicsByType(): TopicGroup[] {
  return [
    { 
      title: 'Vocabulary', 
      emoji: '📖', 
      topics: getTopicsByType('vocab') 
    },
    { 
      title: 'Grammar', 
      emoji: '📝', 
      topics: getTopicsByType('grammar') 
    },
    { 
      title: 'Situational', 
      emoji: '🎭', 
      topics: getTopicsByType('situational') 
    },
    { 
      title: 'Conversation', 
      emoji: '💬', 
      topics: getTopicsByType('conversation') 
    },
    { 
      title: 'Debate', 
      emoji: '🎤', 
      topics: getTopicsByType('debate') 
    },
  ].filter((g) => g.topics.length > 0)
}
