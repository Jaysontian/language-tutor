'use client'

import { useState, useCallback, useMemo } from 'react'
import type { SttRouterResult, SttConfig, OnStartCallback, OnStopCallback, OnTranscriptCallback, OnErrorCallback } from './types'
import type { SttProvider, InputLanguage, LearningLanguage } from '../types'
import { useManualStt } from './use-manual-stt'
import { useDeepgramStt } from './use-deepgram-stt'

export type { SttRouterResult, SttConfig, SttHookResult } from './types'
export { useManualStt } from './use-manual-stt'
export { useDeepgramStt } from './use-deepgram-stt'

type UseSttRouterConfig = {
  learningLanguage: LearningLanguage
  initialProvider?: SttProvider
  initialAutoTurnDetection?: boolean
  onStart?: OnStartCallback
  onTranscript?: OnTranscriptCallback
  onStop?: OnStopCallback
  onError?: OnErrorCallback
}

/**
 * STT Router - manages switching between STT providers
 * Routes calls to the appropriate STT implementation based on selected provider
 */
export function useSttRouter(config: UseSttRouterConfig): SttRouterResult {
  const {
    learningLanguage,
    initialProvider = 'manual',
    initialAutoTurnDetection = true,
    onStart,
    onTranscript,
    onStop,
    onError,
  } = config

  const [provider, setProviderState] = useState<SttProvider>(initialProvider)
  const [autoTurnDetection, setAutoTurnDetection] = useState(initialAutoTurnDetection)

  const sttConfig: SttConfig = useMemo(() => ({
    learningLanguage,
    autoTurnDetection,
    onStart,
    onTranscript,
    onStop,
    onError,
  }), [learningLanguage, autoTurnDetection, onStart, onTranscript, onStop, onError])

  // Initialize all STT hooks (they're lightweight when not in use)
  const manualStt = useManualStt(sttConfig)
  const deepgramNovaStt = useDeepgramStt(sttConfig, 'nova-3')

  // Get the active STT implementation
  const activeStt = useMemo(() => {
    switch (provider) {
      case 'manual':
        return manualStt
      case 'deepgram-nova':
        return deepgramNovaStt
      default:
        return manualStt
    }
  }, [provider, manualStt, deepgramNovaStt])

  const setProvider = useCallback((newProvider: SttProvider) => {
    // Stop any active session before switching
    if (activeStt.isListening) {
      activeStt.stop(false)
    }
    setProviderState(newProvider)
  }, [activeStt])

  const start = useCallback((inputLanguage?: InputLanguage) => {
    activeStt.start(inputLanguage)
  }, [activeStt])

  const stop = useCallback((triggerCallback = true) => {
    activeStt.stop(triggerCallback)
  }, [activeStt])

  return {
    // Provider management
    provider,
    setProvider,
    autoTurnDetection,
    setAutoTurnDetection,
    
    // Passthrough from active STT
    state: activeStt.state,
    isListening: activeStt.isListening,
    transcript: activeStt.transcript,
    messageId: activeStt.messageId,
    inputLanguage: activeStt.inputLanguage,
    audioChunks: activeStt.audioChunks,
    start,
    stop,
    supportsAutoTurnDetection: activeStt.supportsAutoTurnDetection,
    isMultilingual: activeStt.isMultilingual,
  }
}

