'use client'

import { useState, useRef, useCallback } from 'react'
import type { TtsHookResult, TtsConfig } from './types'
import type { SpeechChunk, TtsProvider } from '../types'

/**
 * Unlock audio playback by playing a silent audio
 * This must be called during a user interaction to unlock autoplay
 * Returns immediately if already unlocked to avoid delays
 */
const unlockAudio = (() => {
  let unlocked = false
  let unlockPromise: Promise<void> | null = null
  
  return () => {
    // Return immediately if already unlocked
    if (unlocked) return Promise.resolve()
    
    // Return existing promise if unlock is in progress
    if (unlockPromise) return unlockPromise
    
    // Start unlock process
    unlockPromise = (async () => {
      try {
        // Use HTMLAudioElement - faster and simpler
        const silentAudio = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=')
        silentAudio.volume = 0
        // Don't await - fire and forget to avoid blocking
        silentAudio.play().catch(() => {})
        
        unlocked = true
        console.log('[TTS] Audio unlocked for autoplay')
      } catch (error) {
        console.warn('[TTS] Failed to unlock audio:', error)
      }
    })()
    
    return unlockPromise
  }
})()

/**
 * API-based TTS (OpenAI or ElevenLabs)
 * - Calls server-side /api/tts endpoint
 * - Higher quality, requires API key
 */
export function useApiTts(config: TtsConfig, provider: TtsProvider): TtsHookResult {
  const { learningLanguage, onSpeakStart, onSpeakEnd, onComplete, onError } = config
  
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [currentMessageId, setCurrentMessageId] = useState<string | null>(null)
  
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const cancelledRef = useRef(false)
  const speakingRef = useRef(false)

  const speak = useCallback(async (chunks: SpeechChunk[]) => {
    if (speakingRef.current) {
      console.warn('API TTS already speaking')
      return
    }
    
    cancelledRef.current = false
    speakingRef.current = true
    setIsSpeaking(true)
    
    // Create audio element for playback
    const audio = new Audio()
    audioRef.current = audio
    
    try {
      for (const chunk of chunks) {
        if (cancelledRef.current) break
        
        const { text, language, messageId } = chunk
        if (!text.trim()) continue
        
        setCurrentMessageId(messageId)
        onSpeakStart?.(messageId)
        
        // Stop any current playback
        audio.pause()
        audio.currentTime = 0
        
        try {
          const response = await fetch('/api/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text,
              language,
              learningLanguage,
              provider,
            }),
          })
          
          if (!response.ok) {
            console.error('TTS API error:', response.status)
            onSpeakEnd?.(messageId)
            continue
          }
          
          const audioBlob = await response.blob()
          const audioUrl = URL.createObjectURL(audioBlob)
          
          await new Promise<void>((resolve) => {
            let hasResolved = false
            
            const resolveOnce = () => {
              if (!hasResolved) {
                hasResolved = true
                URL.revokeObjectURL(audioUrl)
                audio.onended = null
                audio.onerror = null
                audio.oncanplay = null
                audio.oncanplaythrough = null
                onSpeakEnd?.(messageId)
                resolve()
              }
            }
            
            audio.onended = resolveOnce
            audio.onerror = () => {
              console.error('Audio playback error')
              resolveOnce()
            }
            
            audio.src = audioUrl
            audio.load()
            
            const startPlayback = async () => {
              try {
                if (!cancelledRef.current) {
                  // Audio should already be unlocked from user interaction
                  // Only try to unlock if we get an error (shouldn't happen)
                  await audio.play()
                } else {
                  resolveOnce()
                }
              } catch (error: any) {
                // If autoplay is blocked, try to unlock and retry once
                if (error.name === 'NotAllowedError' || error.name === 'NotSupportedError') {
                  console.warn('[TTS] Autoplay blocked, attempting to unlock...')
                  try {
                    // Try unlock (non-blocking)
                    unlockAudio()
                    // Small delay to let unlock complete, then retry
                    await new Promise(resolve => setTimeout(resolve, 50))
                    await audio.play()
                  } catch (retryError) {
                    console.error('[TTS] Playback error after unlock attempt:', retryError)
                    onError?.(new Error('Audio playback requires user interaction. Please click the page and try again.'), messageId)
                    resolveOnce()
                  }
                } else {
                  console.error('[TTS] Playback error:', error)
                  resolveOnce()
                }
              }
            }
            
            if (audio.readyState >= 2) {
              startPlayback()
            } else {
              const onReady = () => startPlayback()
              audio.addEventListener('canplay', onReady, { once: true })
              audio.addEventListener('canplaythrough', onReady, { once: true })
            }
          })
        } catch (error) {
          console.error('Error processing TTS chunk:', error)
          onSpeakEnd?.(messageId)
          onError?.(error as Error, messageId)
        }
      }
    } finally {
      // Cleanup
      audio.pause()
      audio.src = ''
      audioRef.current = null
      
      speakingRef.current = false
      setIsSpeaking(false)
      setCurrentMessageId(null)
      onComplete?.()
    }
  }, [learningLanguage, provider, onSpeakStart, onSpeakEnd, onComplete, onError])

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.src = ''
    }
    setIsSpeaking(false)
    setCurrentMessageId(null)
  }, [])

  const cancel = useCallback(() => {
    cancelledRef.current = true
    stop()
  }, [stop])

  return {
    state: isSpeaking ? 'speaking' : 'idle',
    isSpeaking,
    currentMessageId,
    speak,
    stop,
    cancel,
  }
}

