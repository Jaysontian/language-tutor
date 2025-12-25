'use client'

import { useState, useRef, useCallback } from 'react'
import type { TtsHookResult, TtsConfig } from './types'
import type { SpeechChunk } from '../types'
import { LANGUAGE_CODE_MAP, LANGUAGE_CODES } from '../types'

/**
 * Browser TTS using SpeechSynthesis API
 * - Uses device's built-in voices
 * - No API required
 * - Lower quality but instant
 */
export function useBrowserTts(config: TtsConfig): TtsHookResult {
  const { learningLanguage, onSpeakStart, onSpeakEnd, onComplete, onError } = config
  
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [currentMessageId, setCurrentMessageId] = useState<string | null>(null)
  
  const cancelledRef = useRef(false)
  const speakingRef = useRef(false)

  const speak = useCallback(async (chunks: SpeechChunk[]) => {
    if (speakingRef.current) {
      console.warn('Browser TTS already speaking')
      return
    }
    
    cancelledRef.current = false
    speakingRef.current = true
    setIsSpeaking(true)
    
    try {
      for (const chunk of chunks) {
        if (cancelledRef.current) break
        
        const { text, language, messageId } = chunk
        if (!text.trim()) continue
        
        setCurrentMessageId(messageId)
        onSpeakStart?.(messageId)
        
        // Determine language code
        let langCode = LANGUAGE_CODES[learningLanguage] || 'en-US'
        if (language) {
          const upperLang = language.toUpperCase()
          langCode = LANGUAGE_CODE_MAP[upperLang] || langCode
        }
        
        await new Promise<void>((resolve) => {
          const utterance = new SpeechSynthesisUtterance(text)
          utterance.lang = langCode
          utterance.rate = 1.0
          utterance.pitch = 1.0
          utterance.volume = 1.0
          
          utterance.onend = () => {
            onSpeakEnd?.(messageId)
            resolve()
          }
          
          utterance.onerror = (error) => {
            console.error('SpeechSynthesis error:', error)
            onSpeakEnd?.(messageId)
            resolve()
          }
          
          // Cancel any ongoing speech
          speechSynthesis.cancel()
          
          // Small delay after cancel
          setTimeout(() => {
            if (!cancelledRef.current) {
              speechSynthesis.speak(utterance)
              // Safari fix
              if (speechSynthesis.paused) {
                speechSynthesis.resume()
              }
            } else {
              resolve()
            }
          }, 50)
        })
      }
    } catch (error) {
      console.error('Browser TTS error:', error)
      onError?.(error as Error)
    } finally {
      speakingRef.current = false
      setIsSpeaking(false)
      setCurrentMessageId(null)
      onComplete?.()
    }
  }, [learningLanguage, onSpeakStart, onSpeakEnd, onComplete, onError])

  const stop = useCallback(() => {
    speechSynthesis.cancel()
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


