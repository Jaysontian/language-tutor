/**
 * TTS (Text-to-Speech) specific types
 */

import type { LearningLanguage, TtsProvider, SpeechChunk } from '../types'

/**
 * TTS playback state
 */
export type TtsState = 'idle' | 'loading' | 'speaking'

/**
 * Callback fired when TTS starts speaking a chunk
 */
export type OnSpeakStartCallback = (messageId: string) => void

/**
 * Callback fired when TTS finishes speaking a chunk
 */
export type OnSpeakEndCallback = (messageId: string) => void

/**
 * Callback fired when all TTS chunks are complete
 */
export type OnCompleteCallback = () => void

/**
 * Callback fired on TTS error
 */
export type OnTtsErrorCallback = (error: Error, messageId?: string) => void

/**
 * TTS hook configuration
 */
export type TtsConfig = {
  learningLanguage: LearningLanguage
  onSpeakStart?: OnSpeakStartCallback
  onSpeakEnd?: OnSpeakEndCallback
  onComplete?: OnCompleteCallback
  onError?: OnTtsErrorCallback
}

/**
 * Common interface for all TTS implementations
 */
export type TtsHookResult = {
  /** Current state of the TTS playback */
  state: TtsState
  /** Whether TTS is currently speaking */
  isSpeaking: boolean
  /** Currently speaking message ID */
  currentMessageId: string | null
  /** Speak a sequence of chunks */
  speak: (chunks: SpeechChunk[]) => Promise<void>
  /** Stop current playback */
  stop: () => void
  /** Cancel all pending playback */
  cancel: () => void
}

/**
 * TTS Router hook result - extends base with provider switching
 */
export type TtsRouterResult = TtsHookResult & {
  provider: TtsProvider
  setProvider: (provider: TtsProvider) => void
}



