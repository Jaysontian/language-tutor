'use client'

import { useState, useCallback, useMemo, useRef } from 'react'
import type { LearningLanguage, SttProvider, TtsProvider, SpeechChunk, InputLanguage } from './types'
import { useSttRouter, type SttRouterResult } from './stt'
import { useTtsRouter, type TtsRouterResult } from './tts'
import { useGeminiAudio } from './gemini/use-gemini-audio'

// Re-export types
export * from './types'
export { useSttRouter } from './stt'
export { useTtsRouter } from './tts'

/**
 * Speech session state
 */
export type SpeechState = 'idle' | 'listening' | 'processing' | 'speaking'

/**
 * Callback when user finishes speaking and transcript is ready
 */
export type OnUserSpeakCompleteCallback = (
  transcript: string,
  messageId: string,
  inputLanguage: InputLanguage,
  audioChunks: Blob[]
) => void | Promise<void>

/**
 * Main speech hook configuration
 */
export type UseSpeechConfig = {
  learningLanguage: LearningLanguage
  initialSttProvider?: SttProvider
  initialTtsProvider?: TtsProvider
  initialAutoTurnDetection?: boolean
  /** Called when user starts speaking */
  onUserSpeakStart?: (messageId: string, inputLanguage: InputLanguage) => void
  /** Called with interim and final transcripts during speech */
  onUserTranscript?: (transcript: string, isFinal: boolean) => void
  /** Called when user finishes speaking */
  onUserSpeakComplete?: OnUserSpeakCompleteCallback
  /** Called when agent starts speaking a message */
  onAgentSpeakStart?: (messageId: string) => void
  /** Called when agent finishes speaking a message */
  onAgentSpeakEnd?: (messageId: string) => void
  /** Called when agent finishes all speech */
  onAgentSpeakComplete?: () => void
  /** Called on any speech error */
  onError?: (error: Error, context?: string) => void
}

/**
 * Main speech hook result
 */
export type UseSpeechResult = {
  /** Current overall state */
  state: SpeechState
  /** Is user currently speaking */
  isListening: boolean
  /** Is agent currently speaking */
  isSpeaking: boolean
  /** Is system processing */
  isProcessing: boolean
  /** Current user transcript */
  transcript: string
  /** Current STT message ID */
  sttMessageId: string | null
  /** Current TTS message ID */
  ttsMessageId: string | null
  /** Input language being used for STT */
  inputLanguage: InputLanguage | null
  /** Audio chunks from user speech */
  audioChunks: Blob[]
  
  // STT controls
  /** STT provider */
  sttProvider: SttProvider
  /** Set STT provider */
  setSttProvider: (provider: SttProvider) => void
  /** Auto turn detection enabled */
  autoTurnDetection: boolean
  /** Set auto turn detection */
  setAutoTurnDetection: (enabled: boolean) => void
  /** Whether current STT supports auto turn detection */
  supportsAutoTurnDetection: boolean
  /** Whether current STT is multilingual */
  isMultilingual: boolean
  /** Start listening for user speech */
  startListening: (inputLanguage?: InputLanguage) => void
  /** Stop listening */
  stopListening: (triggerCallback?: boolean) => void
  
  // TTS controls
  /** TTS provider */
  ttsProvider: TtsProvider
  /** Set TTS provider */
  setTtsProvider: (provider: TtsProvider) => void
  /** Speak chunks sequentially */
  speak: (chunks: SpeechChunk[]) => Promise<void>
  /** Stop current speech */
  stopSpeaking: () => void
  /** Cancel all pending speech */
  cancelSpeaking: () => void
  
  // Processing state (for custom loading states)
  /** Set processing state manually */
  setProcessing: (isProcessing: boolean) => void
}

/**
 * Main speech hook - combines STT and TTS with unified state management
 */
export function useSpeech(config: UseSpeechConfig): UseSpeechResult {
  const {
    learningLanguage,
    initialSttProvider = 'manual',
    initialTtsProvider = 'browser',
    initialAutoTurnDetection = true,
    onUserSpeakStart,
    onUserTranscript,
    onUserSpeakComplete,
    onAgentSpeakStart,
    onAgentSpeakEnd,
    onAgentSpeakComplete,
    onError,
  } = config

  const [isProcessing, setIsProcessing] = useState(false)
  const audioChunksRef = useRef<Blob[]>([])

  // STT callbacks
  const handleSttStart = useCallback((messageId: string, inputLanguage: InputLanguage) => {
    // Unlock audio for autoplay when user starts speaking (user interaction)
    // This allows TTS to play automatically after STT completes
    // Do this immediately and don't await to avoid blocking
    if (typeof window !== 'undefined') {
      try {
        const silentAudio = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=')
        silentAudio.volume = 0
        // Fire and forget - don't await to avoid delay
        silentAudio.play().catch(() => {})
      } catch (e) {
        // Ignore errors
      }
    }
    onUserSpeakStart?.(messageId, inputLanguage)
  }, [onUserSpeakStart])

  const handleSttTranscript = useCallback((transcript: string, isFinal: boolean) => {
    onUserTranscript?.(transcript, isFinal)
  }, [onUserTranscript])

  const handleSttStop = useCallback((
    transcript: string,
    messageId: string,
    inputLanguage: InputLanguage,
    _wasUserActivated: boolean
  ) => {
    onUserSpeakComplete?.(transcript, messageId, inputLanguage, audioChunksRef.current)
  }, [onUserSpeakComplete])

  const handleSttError = useCallback((error: Error, messageId?: string) => {
    onError?.(error, messageId ? `STT error for message ${messageId}` : 'STT error')
  }, [onError])

  // TTS callbacks
  const handleTtsSpeakStart = useCallback((messageId: string) => {
    onAgentSpeakStart?.(messageId)
  }, [onAgentSpeakStart])

  const handleTtsSpeakEnd = useCallback((messageId: string) => {
    onAgentSpeakEnd?.(messageId)
  }, [onAgentSpeakEnd])

  const handleTtsComplete = useCallback(() => {
    onAgentSpeakComplete?.()
  }, [onAgentSpeakComplete])

  const handleTtsError = useCallback((error: Error, messageId?: string) => {
    onError?.(error, messageId ? `TTS error for message ${messageId}` : 'TTS error')
  }, [onError])

  // Track provider state
  const [sttProvider, setSttProviderState] = useState<SttProvider>(initialSttProvider)
  const [ttsProvider, setTtsProviderState] = useState<TtsProvider>(initialTtsProvider)

  // Check if both STT and TTS are using Gemini (audio-to-audio mode)
  const useGeminiMode = sttProvider === 'gemini-live' && ttsProvider === 'gemini-live'

  // Initialize Gemini audio-to-audio hook (always initialized, but only used when both are Gemini)
  const geminiAudio = useGeminiAudio(
    {
      learningLanguage,
      autoTurnDetection: initialAutoTurnDetection,
      onStart: handleSttStart,
      onTranscript: handleSttTranscript,
      onStop: handleSttStop,
      onError: handleSttError,
    },
    {
      learningLanguage,
      onSpeakStart: handleTtsSpeakStart,
      onSpeakEnd: handleTtsSpeakEnd,
      onComplete: handleTtsComplete,
      onError: handleTtsError,
    },
    learningLanguage,
    'gemini-2.5-flash-native-audio-preview-12-2025'
  )

  // Initialize separate routers (always initialized)
  const sttRouter = useSttRouter({
    learningLanguage,
    initialProvider: initialSttProvider,
    initialAutoTurnDetection,
    onStart: handleSttStart,
    onTranscript: handleSttTranscript,
    onStop: handleSttStop,
    onError: handleSttError,
  })

  const ttsRouter = useTtsRouter({
    learningLanguage,
    initialProvider: initialTtsProvider,
    onSpeakStart: handleTtsSpeakStart,
    onSpeakEnd: handleTtsSpeakEnd,
    onComplete: handleTtsComplete,
    onError: handleTtsError,
  })

  // Use Gemini audio-to-audio if both providers are Gemini, otherwise use separate routers
  const stt = useGeminiMode ? geminiAudio.stt : sttRouter
  const tts = useGeminiMode ? geminiAudio.tts : ttsRouter

  // Keep audio chunks ref in sync
  audioChunksRef.current = stt.audioChunks

  // Compute overall state
  const state = useMemo((): SpeechState => {
    if (stt.isListening) return 'listening'
    if (isProcessing) return 'processing'
    if (tts.isSpeaking) return 'speaking'
    return 'idle'
  }, [stt.isListening, isProcessing, tts.isSpeaking])

  // Wrapper for setSttProvider that syncs TTS if needed
  const setSttProvider = useCallback((provider: SttProvider) => {
    setSttProviderState(provider)
    // If setting to Gemini, also set TTS to Gemini for audio-to-audio mode
    if (provider === 'gemini-live') {
      setTtsProviderState('gemini-live')
    }
    // Always update router for state consistency
    sttRouter.setProvider(provider)
  }, [sttRouter])

  // Wrapper for setTtsProvider that syncs STT if needed
  const setTtsProvider = useCallback((provider: TtsProvider) => {
    setTtsProviderState(provider)
    // If setting to Gemini, also set STT to Gemini for audio-to-audio mode
    if (provider === 'gemini-live') {
      setSttProviderState('gemini-live')
    }
    // Always update router for state consistency
    ttsRouter.setProvider(provider)
  }, [ttsRouter])

  return {
    // Overall state
    state,
    isListening: stt.isListening,
    isSpeaking: tts.isSpeaking,
    isProcessing,
    transcript: stt.transcript,
    sttMessageId: stt.messageId,
    ttsMessageId: tts.currentMessageId,
    inputLanguage: stt.inputLanguage,
    audioChunks: stt.audioChunks,
    
    // STT controls
    sttProvider: sttProvider,
    setSttProvider,
    autoTurnDetection: useGeminiMode ? initialAutoTurnDetection : sttRouter.autoTurnDetection,
    setAutoTurnDetection: useGeminiMode 
      ? () => {} // Gemini handles this internally
      : sttRouter.setAutoTurnDetection,
    supportsAutoTurnDetection: stt.supportsAutoTurnDetection,
    isMultilingual: stt.isMultilingual,
    startListening: stt.start,
    stopListening: stt.stop,
    
    // TTS controls
    ttsProvider: ttsProvider,
    setTtsProvider,
    speak: tts.speak,
    stopSpeaking: tts.stop,
    cancelSpeaking: tts.cancel,
    
    // Processing state
    setProcessing: setIsProcessing,
  }
}

