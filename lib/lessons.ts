// Lesson configuration types and definitions
export type Difficulty = 1 | 2 | 3 | 4 | 5
export type CorrectionStyle = 'gentle' | 'direct' | 'minimal'

export interface LessonConfig {
  id: string
  emoji: string
  title: string
  difficulty: Difficulty
  order?: number // optional ordering within same difficulty (lower comes first)
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
  // === Level 1: Foundation Series (bite-sized & sequential) ===
  'l1-hello-goodbye': {
    id: 'l1-hello-goodbye',
    order: 1,
    emoji: '👋',
    title: 'Hello & Goodbye',
    difficulty: 1,
    description: 'Master 4 essentials: hello, goodbye, thank you, you’re welcome.',
    scenario: 'You just met someone briefly. Teach 1 phrase at a time, then do a short greeting + goodbye exchange.',
    targetRatio: { english: 85, target: 15 },
    focusAreas: ['Greetings', 'Politeness', 'Short exchanges'],
    objectives: [
      'Say hello and goodbye politely (one phrase at a time)',
      'Use “thank you” and “you’re welcome” naturally in short exchanges',
      'Complete a mini-dialogue: greet, thank, say goodbye'
    ],
  },
  'l1-how-are-you': {
    id: 'l1-how-are-you',
    order: 2,
    emoji: '😊',
    title: 'How Are You?',
    difficulty: 1,
    description: 'Understand “How are you?” and reply with 3 simple answers.',
    scenario: 'A friendly check-in chat. Teach the question, then teach 1 response at a time and practice responding (no need to ask it back yet).',
    targetRatio: { english: 85, target: 15 },
    focusAreas: ['Simple questions', 'Feelings', 'Short replies'],
    objectives: [
      'Understand “How are you?”',
      'Respond with 3 options (good, tired, excited)',
      'Answer naturally when asked (no need to ask back yet)'
    ],
  },
  'l1-my-name-is': {
    id: 'l1-my-name-is',
    order: 3,
    emoji: '🙋',
    title: 'My Name Is...',
    difficulty: 1,
    description: 'Do a simple introduction: name + where you’re from.',
    scenario: 'You meet someone new. Teach 1 phrase at a time, then guide a simple introduction exchange.',
    targetRatio: { english: 85, target: 15 },
    focusAreas: ['Introductions', 'Name', 'Where you’re from'],
    objectives: [
      'Say “My name is…” and “Nice to meet you”',
      'Ask “What’s your name?”',
      'Say “I’m from…” and understand “Where are you from?”'
    ],
  },
  'l1-numbers-1-10': {
    id: 'l1-numbers-1-10',
    order: 4,
    emoji: '🔢',
    title: 'Numbers 1–10',
    difficulty: 1,
    description: 'Learn numbers 1–10 with pronunciation and quick drills.',
    scenario: 'Quick number drills. Teach in small chunks and have the user repeat; then do a simple counting mini-game.',
    targetRatio: { english: 85, target: 15 },
    focusAreas: ['Numbers', 'Pronunciation', 'Counting'],
    objectives: [
      'Recognize and say numbers 1–10',
      'Count a few objects out loud',
      'Say your age (simple number practice)'
    ],
  },
  'l1-days-of-week': {
    id: 'l1-days-of-week',
    order: 5,
    emoji: '📅',
    title: 'Days of the Week',
    difficulty: 1,
    description: 'Learn the 7 days + “today” and “tomorrow”.',
    scenario: 'Calendar basics. Teach days in small groups, then practice answering “What day is today?”',
    targetRatio: { english: 85, target: 15 },
    focusAreas: ['Days', 'Calendar words', 'Simple Q&A'],
    objectives: [
      'Learn the 7 days + “today” and “tomorrow”',
      'Answer “What day is today?”',
      'Say a simple sentence about today/tomorrow'
    ],
  },
  'l1-telling-time-hours': {
    id: 'l1-telling-time-hours',
    order: 6,
    emoji: '🕐',
    title: 'Telling Time (Hours Only)',
    difficulty: 1,
    description: 'Ask “What time is it?” and answer with hours (1 o’clock, 2 o’clock…).',
    scenario: 'Time check roleplay. Teach the question, then practice hours only (no minutes yet).',
    targetRatio: { english: 85, target: 15 },
    focusAreas: ['Time', 'Hours', 'Simple Q&A'],
    objectives: [
      'Understand and say “What time is it?”',
      'Answer with hours only (1 o’clock, 2 o’clock, etc.)',
      'Handle 3 quick time-check questions in a row'
    ],
  },

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
  'friends-easy': {
    id: 'friends-easy',
    emoji: '🤝',
    title: 'Making Friends',
    difficulty: 1,
    description: 'Start a friendly conversation, find common interests, and make plans to hang out.',
    scenario: 'You are a friendly peer at a community event. Help the user start a natural conversation, ask about hobbies, and suggest a simple plan to meet up again.',
    targetRatio: { english: 75, target: 25 },
    focusAreas: ['Small talk', 'Hobbies & interests', 'Invitations', 'Simple follow-up questions'],
    objectives: [
      'Ask and answer questions about hobbies and interests',
      'Use friendly conversation starters and follow-ups',
      'Make and accept/decline a simple plan'
    ],
  },
  'emotions-easy': {
    id: 'emotions-easy',
    emoji: '💬',
    title: 'Expressing Emotions',
    difficulty: 2,
    description: 'Learn to say how you feel (happy, stressed, excited) and respond supportively.',
    scenario: 'You are a supportive friend. Teach the user simple emotion words and short phrases, then prompt them to share how they feel today and why.',
    targetRatio: { english: 70, target: 30 },
    focusAreas: ['Emotion vocabulary', 'Simple reasons (because...)', 'Supportive responses'],
    objectives: [
      'Name common emotions in the target language',
      'Say simple reasons for feelings',
      'Respond with empathy and encouragement'
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
  'school-medium': {
    id: 'school-medium',
    emoji: '🎒',
    title: 'First Day of School',
    difficulty: 3,
    description: 'Navigate introductions, classroom phrases, and asking for help on your first day.',
    scenario: 'You are a classmate showing the user around on the first day. Practice asking where things are, understanding basic class instructions, and making a good first impression.',
    targetRatio: { english: 50, target: 50 },
    focusAreas: ['School vocabulary', 'Directions & locations', 'Classroom requests', 'Polite phrases'],
    objectives: [
      'Ask and answer where places are (classroom, office, cafeteria)',
      'Use common classroom phrases (I don’t understand, can you repeat?)',
      'Introduce yourself and ask about schedules'
    ],
  },
  'food-medium': {
    id: 'food-medium',
    emoji: '🍽️',
    title: 'Ordering Food',
    difficulty: 3,
    description: 'Order at a restaurant, ask about ingredients, and handle common dining situations.',
    scenario: 'You are a friendly server at a restaurant. Teach key menu vocabulary, then roleplay ordering a meal, making a small modification, and asking for the bill.',
    targetRatio: { english: 45, target: 55 },
    focusAreas: ['Restaurant vocabulary', 'Preferences & allergies', 'Polite requests', 'Numbers & prices'],
    objectives: [
      'Order a main dish and drink politely',
      'Ask about ingredients and make a simple modification',
      'Request the bill and respond to common server questions'
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
  },
  'cute-stranger-hard': {
    id: 'cute-stranger-hard',
    emoji: '✨',
    title: 'Cute Stranger',
    difficulty: 4,
    description: 'Start a playful conversation with a stranger—confident, respectful, and natural.',
    scenario: 'You are a cute stranger the user sees in a bookstore or on the subway. Keep it light and friendly. Encourage confident openers, polite compliments, and smooth exits if the other person isn’t interested.',
    targetRatio: { english: 20, target: 80 },
    focusAreas: ['Compliments', 'Light small talk', 'Social boundaries', 'Polite exits'],
    objectives: [
      'Open a conversation naturally in a public setting',
      'Give and respond to a respectful compliment',
      'End the interaction politely (or exchange contact info) based on signals'
    ]
  },
  'local-cuisine-hard': {
    id: 'local-cuisine-hard',
    emoji: '🥘',
    title: 'Local Cuisine',
    difficulty: 4,
    description: 'Talk about regional dishes, ask for recommendations, and describe tastes and textures.',
    scenario: 'You are a local foodie helping the user explore regional cuisine. Recommend dishes, explain ingredients, and ask the user to describe what they like (spicy, sweet, crispy, rich).',
    targetRatio: { english: 15, target: 85 },
    focusAreas: ['Food adjectives', 'Recommendations', 'Ingredients', 'Cultural context'],
    objectives: [
      'Ask for and give recommendations',
      'Describe flavors, textures, and preferences',
      'Discuss local specialties and dining customs'
    ]
  }
}

// Language-specific example phrases for lessons
export const lessonPhrases: Record<string, Record<string, string[]>> = {
  'l1-hello-goodbye': {
    'French': ['Bonjour', 'Au revoir', 'Merci', 'De rien'],
    'Spanish': ['Hola', 'Adiós', 'Gracias', 'De nada'],
    'Chinese': ['你好', '再见', '谢谢', '不客气'],
    'Japanese': ['こんにちは', 'さようなら', 'ありがとう', 'どういたしまして']
  },
  'l1-how-are-you': {
    'French': ['Comment ça va ?', 'Ça va bien', 'Je suis fatigué(e)', 'Je suis enthousiaste'],
    'Spanish': ['¿Cómo estás?', 'Bien', 'Estoy cansado(a)', 'Estoy emocionado(a)'],
    'Chinese': ['你好吗？', '我很好', '我很累', '我很兴奋'],
    'Japanese': ['お元気ですか？', '元気です', '疲れています', 'ワクワクしています']
  },
  'l1-my-name-is': {
    'French': ['Je m’appelle…', 'Enchanté(e)', 'Comment tu t’appelles ?', 'Je viens de…', 'Tu viens d’où ?'],
    'Spanish': ['Me llamo…', 'Mucho gusto', '¿Cómo te llamas?', 'Soy de…', '¿De dónde eres?'],
    'Chinese': ['我叫…', '很高兴认识你', '你叫什么名字？', '我来自…', '你从哪里来？'],
    'Japanese': ['私の名前は…です', 'はじめまして', 'お名前は何ですか？', '私は…出身です', 'どこから来ましたか？']
  },
  'l1-numbers-1-10': {
    'French': ['un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix'],
    'Spanish': ['uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez'],
    'Chinese': ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十'],
    'Japanese': ['いち', 'に', 'さん', 'よん', 'ご', 'ろく', 'なな', 'はち', 'きゅう', 'じゅう']
  },
  'l1-days-of-week': {
    'French': ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche', 'aujourd’hui', 'demain'],
    'Spanish': ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo', 'hoy', 'mañana'],
    'Chinese': ['星期一', '星期二', '星期三', '星期四', '星期五', '星期六', '星期日', '今天', '明天'],
    'Japanese': ['月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日', '日曜日', '今日', '明日']
  },
  'l1-telling-time-hours': {
    'French': ['Quelle heure est-il ?', 'Il est une heure', 'Il est deux heures', 'Il est trois heures'],
    'Spanish': ['¿Qué hora es?', 'Es la una', 'Son las dos', 'Son las tres'],
    'Chinese': ['现在几点？', '现在一点', '现在两点', '现在三点'],
    'Japanese': ['何時ですか？', '1時です', '2時です', '3時です']
  },
  'intro-easy': {
    'French': ['Bonjour!', 'Je m\'appelle...', 'Enchanté(e)', 'Comment ça va?', 'Ça va bien, merci'],
    'Spanish': ['¡Hola!', 'Me llamo...', 'Mucho gusto', '¿Cómo estás?', 'Estoy bien, gracias'],
    'Chinese': ['你好!', '我叫...', '很高兴认识你', '你好吗?', '我很好，谢谢'],
    'Japanese': ['こんにちは!', '私は...です', 'よろしくお願いします', 'お元気ですか?', '元気です、ありがとう']
  },
  'friends-easy': {
    'French': ['Salut, ça va?', 'Tu aimes quoi comme musique?', 'On se revoit bientôt?', 'Ça te dit de prendre un café?', 'J\'adore ça aussi!'],
    'Spanish': ['Hola, ¿qué tal?', '¿Qué música te gusta?', '¿Quieres quedar otro día?', '¿Te apetece tomar un café?', '¡A mí también me encanta!'],
    'Chinese': ['你好，最近怎么样？', '你喜欢什么音乐？', '我们改天再见吧？', '要不要一起喝杯咖啡？', '我也很喜欢！'],
    'Japanese': ['こんにちは、元気？', 'どんな音楽が好き？', 'また今度会わない？', '一緒にカフェ行かない？', '私も大好き！']
  },
  'emotions-easy': {
    'French': ['Je suis content(e)', 'Je suis stressé(e)', 'Je suis fatigué(e)', 'Je suis enthousiaste', 'Ça va aller'],
    'Spanish': ['Estoy contento(a)', 'Estoy estresado(a)', 'Estoy cansado(a)', 'Estoy emocionado(a)', 'Todo va a estar bien'],
    'Chinese': ['我很开心', '我有点压力', '我很累', '我很兴奋', '会没事的'],
    'Japanese': ['うれしいです', 'ストレスがあります', '疲れています', 'ワクワクしています', '大丈夫だよ']
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
  'school-medium': {
    'French': ['C\'est où la salle de classe?', 'Je ne comprends pas', 'Vous pouvez répéter?', 'J\'ai besoin d\'aide', 'On a cours à quelle heure?'],
    'Spanish': ['¿Dónde está el aula?', 'No entiendo', '¿Puedes repetir?', 'Necesito ayuda', '¿A qué hora es la clase?'],
    'Chinese': ['教室在哪里？', '我不明白', '你可以再说一遍吗？', '我需要帮助', '几点上课？'],
    'Japanese': ['教室はどこですか？', 'わかりません', 'もう一度言ってください', '助けてください', '授業は何時ですか？']
  },
  'food-medium': {
    'French': ['Je voudrais...', 'Qu\'est-ce que vous recommandez?', 'Je suis allergique à...', 'Sans oignons, s\'il vous plaît', 'L\'addition, s\'il vous plaît'],
    'Spanish': ['Quisiera...', '¿Qué recomienda?', 'Soy alérgico(a) a...', 'Sin cebolla, por favor', 'La cuenta, por favor'],
    'Chinese': ['我想要...', '你推荐什么？', '我对...过敏', '不要洋葱，谢谢', '买单，谢谢'],
    'Japanese': ['〜をお願いします', 'おすすめは何ですか？', '〜のアレルギーがあります', '玉ねぎ抜きでお願いします', 'お会計お願いします']
  },
  'coffee-hard': {
    'French': ['Un double espresso avec un nuage de lait', 'Sans lactose, s\'il vous plaît', 'Pour emporter', 'Sur place', 'Un shot supplémentaire', 'Avez-vous des options végétaliennes?'],
    'Spanish': ['Un doble espresso con un poco de leche', 'Sin lactosa, por favor', 'Para llevar', 'Para aquí', 'Un shot extra', '¿Tienen opciones veganas?'],
    'Chinese': ['一杯双份浓缩咖啡加一点牛奶', '不要乳糖，谢谢', '外带', '内用', '加一份浓缩', '有素食选项吗?'],
    'Japanese': ['ダブルエスプレッソにミルクを少し', '乳糖なしでお願いします', 'テイクアウト', '店内で', 'エクストラショット', 'ヴィーガンオプションはありますか?']
  },
  'cute-stranger-hard': {
    'French': ['Salut, je te trouve sympa', 'Tu lis quoi en ce moment?', 'Tu viens souvent ici?', 'Ça te dirait de continuer cette conversation?', 'Bonne journée!'],
    'Spanish': ['Hola, me pareces muy simpático(a)', '¿Qué estás leyendo ahora?', '¿Vienes aquí a menudo?', '¿Te gustaría seguir hablando?', '¡Que tengas buen día!'],
    'Chinese': ['你好，我觉得你很可爱', '你在看什么书？', '你经常来这里吗？', '要不要继续聊聊？', '祝你今天愉快！'],
    'Japanese': ['こんにちは、素敵だと思って', '今何を読んでるんですか？', 'ここによく来ますか？', 'よかったらもう少し話しませんか？', 'よい一日を！']
  },
  'local-cuisine-hard': {
    'French': ['C\'est une spécialité locale', 'C\'est épicé / doux / riche', 'Quels ingrédients y a-t-il?', 'Je vous conseille...', 'J\'adore la texture'],
    'Spanish': ['Es una especialidad local', 'Es picante / dulce / contundente', '¿Qué ingredientes lleva?', 'Te recomiendo...', 'Me encanta la textura'],
    'Chinese': ['这是本地特色', '很辣 / 很甜 / 很浓郁', '里面有什么食材？', '我推荐...', '我喜欢这个口感'],
    'Japanese': ['これは名物です', '辛い／甘い／こってりしている', '材料は何ですか？', 'おすすめは〜です', '食感が好きです']
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
  return Object.values(lessons).sort((a, b) => {
    if (a.difficulty !== b.difficulty) return a.difficulty - b.difficulty
    const ao = a.order ?? null
    const bo = b.order ?? null
    if (ao !== null && bo !== null) return ao - bo
    if (ao !== null && bo === null) return -1
    if (ao === null && bo !== null) return 1
    return a.title.localeCompare(b.title)
  })
}

