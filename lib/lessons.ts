// Lesson configuration types and definitions
export type Difficulty = 1 | 2 | 3 | 4 | 5
export type CorrectionStyle = 'gentle' | 'direct' | 'minimal'

export interface LessonConfig {
  id: string
  emoji: string
  title: string
  difficulty: Difficulty
  description: string // short 1-line blurb for UI
  scenario?: string // roleplay context
  focusAreas?: string[] // grammar points, vocab themes, etc.
  targetRatio: {
    english: number // percentage 0-100
    target: number
  }
  objectives: string[]
  examplePhrases?: string[]
}

export interface UserPreferences {
  correctionStyle?: CorrectionStyle
  interests?: string[]
}

// Example lessons - language agnostic, phrases are added dynamically
export const lessons: Record<string, LessonConfig> = {
  'intro-easy': {
    id: 'intro-easy',
    emoji: '👋',
    title: 'Introductions',
    difficulty: 1,
    description: 'Practice greetings and simple introductions in a friendly first-chat scenario.',
    scenario: 'You are a friendly student the user just met at a café. You speak mostly English but sprinkle in simple phrases from the target language.',
    targetRatio: { english: 80, target: 20 },
    objectives: [
      'Learn basic greetings',
      'Practice introducing yourself',
      'Ask and answer "How are you?"'
    ],
  },
  'intro-hard': {
    id: 'intro-hard',
    emoji: '🌍',
    title: 'Introductions',
    difficulty: 5,
    description: 'Do full introductions mostly in the target language with minimal English support.',
    scenario: 'You are a native speaker who speaks very little English. Stay in the target language unless the user is truly stuck.',
    targetRatio: { english: 10, target: 90 },
    objectives: [
      'Conduct full introductions in the target language',
      'Discuss where you\'re from, what you do',
      'Use formal vs informal register appropriately'
    ]
  },
  'coffee-easy': {
    id: 'coffee-easy',
    emoji: '☕️',
    title: 'Ordering Coffee',
    difficulty: 2,
    description: 'Learn core café vocabulary, then roleplay ordering a drink politely.',
    scenario: 'You are a friendly barista at a café. First, teach the user key vocabulary words for ordering coffee (size, type, milk options, etc.). After they learn the vocabulary, transition into a roleplay where they practice ordering coffee from you.',
    targetRatio: { english: 70, target: 30 },
    focusAreas: ['Food & drink vocabulary', 'Polite requests', 'Numbers and sizes'],
    objectives: [
      'Learn coffee-related vocabulary (sizes, types, milk options)',
      'Practice polite ordering phrases',
      'Roleplay ordering coffee in a café setting'
    ],
  },
  'coffee-hard': {
    id: 'coffee-hard',
    emoji: '☕',
    title: 'Flirty Café Banter',
    difficulty: 4,
    description: 'Turn your coffee order into a fun, flirtatious exchange! Practice advanced coffee vocab and charming chit-chat with a playful barista.',
    scenario: `You're not just any barista — you're the charming, slightly flirty star of the café. Review advanced coffee vocabulary and show off your coffee knowledge, but also throw in a playful joke or a lighthearted compliment now and then. Make the conversation fun! The user should handle special requests and real café scenarios, all while enjoying a little fun back-and-forth. Keep things friendly, witty, but never awkward.`,
    targetRatio: { english: 20, target: 80 },
    focusAreas: ['Advanced food vocabulary', 'Special requests', 'Cultural context', 'Playful conversation'],
    objectives: [
      'Confidently order coffee with detailed, specific requests',
      'Navigate real-world café scenarios and hidden menu items',
      'Engage in fun, natural (and slightly flirty!) small talk with the barista',
      'Understand cultural nuances of café socializing'
    ]
  }
}

// Language-specific example phrases for lessons
export const lessonPhrases: Record<string, Record<string, string[]>> = {
  'intro-easy': {
    'French': ['Bonjour!', 'Je m\'appelle...', 'Enchanté(e)', 'Comment ça va?', 'Ça va bien, merci'],
    'Spanish': ['¡Hola!', 'Me llamo...', 'Mucho gusto', '¿Cómo estás?', 'Estoy bien, gracias'],
    'Chinese': ['你好!', '我叫...', '很高兴认识你', '你好吗?', '我很好，谢谢'],
    'Japanese': ['こんにちは!', '私は...です', 'よろしくお願いします', 'お元気ですか?', '元気です、ありがとう']
  },
  'intro-hard': {
    'French': ['D\'où venez-vous?', 'Qu\'est-ce que vous faites dans la vie?', 'Je travaille comme...', 'Je suis originaire de...'],
    'Spanish': ['¿De dónde eres?', '¿A qué te dedicas?', 'Trabajo como...', 'Soy de...'],
    'Chinese': ['你从哪里来?', '你做什么工作?', '我是...', '我来自...'],
    'Japanese': ['どこから来ましたか?', 'お仕事は何ですか?', '私は...として働いています', '私は...出身です']
  },
  'coffee-easy': {
    'French': ['Un café, s\'il vous plaît', 'Petit / Moyen / Grand', 'Un cappuccino', 'Avec du lait', 'Sans sucre', 'Combien ça coûte?'],
    'Spanish': ['Un café, por favor', 'Pequeño / Mediano / Grande', 'Un cappuccino', 'Con leche', 'Sin azúcar', '¿Cuánto cuesta?'],
    'Chinese': ['一杯咖啡，谢谢', '小杯 / 中杯 / 大杯', '一杯卡布奇诺', '加牛奶', '不加糖', '多少钱?'],
    'Japanese': ['コーヒーをください', 'S / M / L', 'カプチーノ', 'ミルク入り', '砂糖なし', 'いくらですか?']
  },
  'coffee-hard': {
    'French': ['Un double espresso avec un nuage de lait', 'Sans lactose, s\'il vous plaît', 'Pour emporter', 'Sur place', 'Un shot supplémentaire', 'Avez-vous des options végétaliennes?'],
    'Spanish': ['Un doble espresso con un poco de leche', 'Sin lactosa, por favor', 'Para llevar', 'Para aquí', 'Un shot extra', '¿Tienen opciones veganas?'],
    'Chinese': ['一杯双份浓缩咖啡加一点牛奶', '不要乳糖，谢谢', '外带', '内用', '加一份浓缩', '有素食选项吗?'],
    'Japanese': ['ダブルエスプレッソにミルクを少し', '乳糖なしでお願いします', 'テイクアウト', '店内で', 'エクストラショット', 'ヴィーガンオプションはありますか?']
  }
}

// Get lesson with language-specific phrases
export function getLessonWithPhrases(lessonId: string, language: string): LessonConfig | undefined {
  const lesson = lessons[lessonId]
  if (!lesson) return undefined

  const phrases = lessonPhrases[lessonId]?.[language]
  return {
    ...lesson,
    examplePhrases: phrases
  }
}

// Get all lessons as array for UI
export function getAllLessons(): LessonConfig[] {
  return Object.values(lessons)
}

