'use client'

import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import type { TtsRouterResult, TtsConfig, OnSpeakStartCallback, OnSpeakEndCallback, OnCompleteCallback, OnTtsErrorCallback } from './types'
import type { TtsProvider, LearningLanguage, SpeechChunk } from '../types'
import { useBrowserTts } from './use-browser-tts'
import { useApiTts } from './use-api-tts'

export type { TtsRouterResult, TtsConfig, TtsHookResult } from './types'
export { useBrowserTts } from './use-browser-tts'
export { useApiTts } from './use-api-tts'

type UseTtsRouterConfig = {
  learningLanguage: LearningLanguage
  initialProvider?: TtsProvider
  onSpeakStart?: OnSpeakStartCallback
  onSpeakEnd?: OnSpeakEndCallback
  onComplete?: OnCompleteCallback
  onError?: OnTtsErrorCallback
}

/**
 * TTS Router - manages switching between TTS providers
 * Routes calls to the appropriate TTS implementation based on selected provider
 */
export function useTtsRouter(config: UseTtsRouterConfig): TtsRouterResult {
  const {
    learningLanguage,
    initialProvider = 'browser',
    onSpeakStart,
    onSpeakEnd,
    onComplete,
    onError,
  } = config

  const [provider, setProviderState] = useState<TtsProvider>(initialProvider)
  // Use a ref to always have the current provider value in callbacks
  const providerRef = useRef(provider)
  
  useEffect(() => {
    providerRef.current = provider
    console.log('[TTS Router] Provider state updated to:', provider)
  }, [provider])

  const ttsConfig: TtsConfig = useMemo(() => ({
    learningLanguage,
    onSpeakStart,
    onSpeakEnd,
    onComplete,
    onError,
  }), [learningLanguage, onSpeakStart, onSpeakEnd, onComplete, onError])

  // Initialize all TTS hooks
  const browserTts = useBrowserTts(ttsConfig)
  const openaiTts = useApiTts(ttsConfig, 'openai')
  const elevenlabsTts = useApiTts(ttsConfig, 'elevenlabs')

  // Get the active TTS implementation
  const activeTts = useMemo(() => {
    switch (provider) {
      case 'browser':
        return browserTts
      case 'openai':
        return openaiTts
      case 'elevenlabs':
        return elevenlabsTts
      default:
        return browserTts
    }
  }, [provider, browserTts, openaiTts, elevenlabsTts])

  const setProvider = useCallback((newProvider: TtsProvider) => {
    // Cancel any active playback before switching
    if (activeTts.isSpeaking) {
      activeTts.cancel()
    }
    console.log('[TTS Router] Setting provider to:', newProvider)
    setProviderState(newProvider)
  }, [activeTts])

  const speak = useCallback(async (chunks: SpeechChunk[]) => {
    // Get current provider from ref to avoid stale closures
    const currentProvider = providerRef.current
    // Verify activeTts matches current provider
    const expectedTts = currentProvider === 'openai' ? openaiTts : currentProvider === 'elevenlabs' ? elevenlabsTts : browserTts
    const isCorrectTts = activeTts === expectedTts
    
    console.log('[TTS Router] Speaking - Current provider:', currentProvider, 'State provider:', provider, 'activeTts correct:', isCorrectTts)
    
    if (!isCorrectTts) {
      console.warn('[TTS Router] WARNING: activeTts does not match current provider! Using expected TTS instead.')
      await expectedTts.speak(chunks)
    } else {
      await activeTts.speak(chunks)
    }
  }, [activeTts, provider, browserTts, openaiTts, elevenlabsTts])

  const stop = useCallback(() => {
    activeTts.stop()
  }, [activeTts])

  const cancel = useCallback(() => {
    activeTts.cancel()
  }, [activeTts])

  return {
    // Provider management
    provider,
    setProvider,
    
    // Passthrough from active TTS
    state: activeTts.state,
    isSpeaking: activeTts.isSpeaking,
    currentMessageId: activeTts.currentMessageId,
    speak,
    stop,
    cancel,
  }
}

