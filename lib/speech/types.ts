/**
 * Common types for the speech system (STT + TTS)
 */

export type LearningLanguage = 'French' | 'Spanish' | 'Chinese' | 'Japanese'

export type LanguageCode = 'en-US' | 'fr-FR' | 'es-ES' | 'zh-CN' | 'ja-JP'

export const LANGUAGE_CODES: Record<LearningLanguage, LanguageCode> = {
  'French': 'fr-FR',
  'Spanish': 'es-ES',
  'Chinese': 'zh-CN',
  'Japanese': 'ja-JP'
}

export const LANGUAGE_CODE_MAP: Record<string, LanguageCode> = {
  'FR': 'fr-FR',
  'ES': 'es-ES',
  'ZH': 'zh-CN',
  'JA': 'ja-JP',
  'EN': 'en-US'
}

/**
 * STT Provider types
 */
export type SttProvider = 'manual' | 'deepgram-nova' | 'gemini-live'

export type SttProviderConfig = {
  id: SttProvider
  name: string
  description: string
  isMultilingual: boolean
  hasAutoTurnDetection: boolean
  requiresApiKey: boolean
}

export const STT_PROVIDERS: Record<SttProvider, SttProviderConfig> = {
  'manual': {
    id: 'manual',
    name: 'Manual',
    description: 'Uses built-in speech recognition with dual-language buttons',
    isMultilingual: false,
    hasAutoTurnDetection: false,
    requiresApiKey: false,
  },
  'deepgram-nova': {
    id: 'deepgram-nova',
    name: 'Deepgram Nova-3',
    description: 'Real-time STT with multilingual understanding + turn detection',
    isMultilingual: true,
    hasAutoTurnDetection: true,
    requiresApiKey: true,
  },
  'gemini-live': {
    id: 'gemini-live',
    name: 'Gemini Live 2.5 Flash (Audio-to-Audio)',
    description: 'Native audio conversation with enhanced quality, proactive audio, and affective dialog - handles both STT and TTS',
    isMultilingual: true,
    hasAutoTurnDetection: true,
    requiresApiKey: true,
  },
}

/**
 * TTS Provider types
 */
export type TtsProvider = 'browser' | 'openai' | 'elevenlabs' | 'gemini-live'

export type TtsProviderConfig = {
  id: TtsProvider
  name: string
  description: string
  quality: 'low' | 'medium' | 'high'
  isAvailable: boolean
  requiresApiKey: boolean
}

export const TTS_PROVIDERS: Record<TtsProvider, TtsProviderConfig> = {
  'browser': {
    id: 'browser',
    name: 'Browser',
    description: "Use your device's built-in voice (lowest quality)",
    quality: 'low',
    isAvailable: true,
    requiresApiKey: false,
  },
  'openai': {
    id: 'openai',
    name: 'GPT-4o',
    description: 'Latest OpenAI speech - natural, expressive (medium quality)',
    quality: 'medium',
    isAvailable: true,
    requiresApiKey: true,
  },
  'elevenlabs': {
    id: 'elevenlabs',
    name: 'Eleven Labs',
    description: 'Neural voices for multiple languages (highest quality)',
    quality: 'high',
    isAvailable: false, // Coming soon
    requiresApiKey: true,
  },
  'gemini-live': {
    id: 'gemini-live',
    name: 'Gemini Live 2.5 Flash (Audio-to-Audio)',
    description: 'Enhanced native audio with 30 HD voices, proactive audio, and affective dialog - automatically handles both input and output',
    quality: 'high',
    isAvailable: true,
    requiresApiKey: true,
  },
}

/**
 * Speech chunk for TTS playback
 */
export type SpeechChunk = {
  text: string
  language?: string
  messageId: string
}

/**
 * Input language for STT
 */
export type InputLanguage = 'english' | 'learning'

