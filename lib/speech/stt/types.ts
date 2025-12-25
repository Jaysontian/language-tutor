/**
 * STT (Speech-to-Text) specific types
 */

import type { LearningLanguage, InputLanguage, SttProvider } from '../types'

/**
 * STT session state
 */
export type SttState = 'idle' | 'listening' | 'processing'

/**
 * Callback fired when a transcript update occurs (interim or final)
 */
export type OnTranscriptCallback = (transcript: string, isFinal: boolean) => void

/**
 * Callback fired when STT session starts
 */
export type OnStartCallback = (messageId: string, inputLanguage: InputLanguage) => void

/**
 * Callback fired when STT session ends
 */
export type OnStopCallback = (transcript: string, messageId: string, inputLanguage: InputLanguage, wasUserActivated: boolean) => void

/**
 * Callback fired on STT error
 */
export type OnErrorCallback = (error: Error, messageId?: string) => void

/**
 * STT hook configuration
 */
export type SttConfig = {
  learningLanguage: LearningLanguage
  autoTurnDetection?: boolean
  onStart?: OnStartCallback
  onTranscript?: OnTranscriptCallback
  onStop?: OnStopCallback
  onError?: OnErrorCallback
}

/**
 * Common interface for all STT implementations
 */
export type SttHookResult = {
  /** Current state of the STT session */
  state: SttState
  /** Whether STT is currently listening */
  isListening: boolean
  /** Current transcript (interim or final) */
  transcript: string
  /** Current message ID being transcribed */
  messageId: string | null
  /** Input language being used */
  inputLanguage: InputLanguage | null
  /** Audio chunks recorded during session */
  audioChunks: Blob[]
  /** Start listening for speech */
  start: (inputLanguage?: InputLanguage) => void
  /** Stop listening and process final transcript */
  stop: (triggerCallback?: boolean) => void
  /** Whether this provider supports auto turn detection */
  supportsAutoTurnDetection: boolean
  /** Whether this provider is multilingual */
  isMultilingual: boolean
}

/**
 * STT Router hook result - extends base with provider switching
 */
export type SttRouterResult = SttHookResult & {
  provider: SttProvider
  setProvider: (provider: SttProvider) => void
  autoTurnDetection: boolean
  setAutoTurnDetection: (enabled: boolean) => void
}


