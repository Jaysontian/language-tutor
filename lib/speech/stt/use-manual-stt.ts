'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import type { SttHookResult, SttConfig } from './types'
import type { InputLanguage } from '../types'
import { LANGUAGE_CODES } from '../types'

/**
 * Manual STT using browser's SpeechRecognition API
 * - Requires user to specify input language (English or learning language)
 * - No auto turn detection - user must manually stop
 */
export function useManualStt(config: SttConfig): SttHookResult {
  const { learningLanguage, onStart, onTranscript, onStop, onError } = config
  
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [messageId, setMessageId] = useState<string | null>(null)
  const [inputLanguage, setInputLanguage] = useState<InputLanguage | null>(null)
  const [audioChunks, setAudioChunks] = useState<Blob[]>([])
  
  const englishRecognitionRef = useRef<SpeechRecognition | null>(null)
  const learningRecognitionRef = useRef<SpeechRecognition | null>(null)
  const activeRecognitionRef = useRef<SpeechRecognition | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const userActivatedRef = useRef(false)
  const currentMessageIdRef = useRef<string | null>(null)
  const currentTranscriptRef = useRef('')
  const currentInputLanguageRef = useRef<InputLanguage | null>(null)

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window === 'undefined') return

    const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      console.warn('SpeechRecognition not supported in this browser')
      return
    }

    const setupRecognition = (lang: string, inputLang: InputLanguage): SpeechRecognition => {
      const recognition = new SpeechRecognition()
      recognition.continuous = false
      recognition.interimResults = true
      recognition.lang = lang

      recognition.onstart = () => {
        const msgId = Date.now().toString()
        currentMessageIdRef.current = msgId
        currentTranscriptRef.current = ''
        currentInputLanguageRef.current = inputLang
        
        setIsListening(true)
        setMessageId(msgId)
        setInputLanguage(inputLang)
        setTranscript('')
        
        startAudioRecording()
        onStart?.(msgId, inputLang)
      }

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let fullTranscript = ''
        for (let i = 0; i < event.results.length; i++) {
          fullTranscript += event.results[i][0].transcript
        }
        
        currentTranscriptRef.current = fullTranscript
        setTranscript(fullTranscript)
        
        const hasFinal = Array.from(event.results).some(r => r.isFinal)
        onTranscript?.(fullTranscript, hasFinal)
        
        // Process final result (auto-stop from speech recognition)
        if (hasFinal) {
          stopInternal(true, false)
        }
      }

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error)
        stopAudioRecording()
        setIsListening(false)
        setMessageId(null)
        onError?.(new Error(event.error), currentMessageIdRef.current || undefined)
        currentMessageIdRef.current = null
      }

      recognition.onend = () => {
        setIsListening(false)
        stopAudioRecording()
      }

      return recognition
    }

    englishRecognitionRef.current = setupRecognition('en-US', 'english')
    learningRecognitionRef.current = setupRecognition(LANGUAGE_CODES[learningLanguage], 'learning')

    return () => {
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop()
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
    }
  }, []) // Only run once on mount

  // Update learning language recognition when it changes
  useEffect(() => {
    if (learningRecognitionRef.current) {
      learningRecognitionRef.current.lang = LANGUAGE_CODES[learningLanguage]
    }
  }, [learningLanguage])

  const startAudioRecording = async () => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      audioChunksRef.current = []
      
      let mimeType = 'audio/webm'
      if (!MediaRecorder.isTypeSupported('audio/webm')) {
        if (MediaRecorder.isTypeSupported('audio/mp4')) mimeType = 'audio/mp4'
        else if (MediaRecorder.isTypeSupported('audio/ogg')) mimeType = 'audio/ogg'
        else mimeType = ''
      }
      
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
      
      recorder.ondataavailable = (event) => {
        if (event.data?.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }
      
      recorder.onstop = () => {
        setAudioChunks([...audioChunksRef.current])
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop())
          streamRef.current = null
        }
      }
      
      recorder.start(100)
      mediaRecorderRef.current = recorder
    } catch (error) {
      console.error('Error starting audio recording:', error)
    }
  }

  const stopAudioRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop()
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        if (track.readyState === 'live') track.stop()
      })
      streamRef.current = null
    }
  }

  const stopInternal = useCallback((triggerCallback: boolean, wasUserActivated: boolean) => {
    const finalTranscript = currentTranscriptRef.current
    const msgId = currentMessageIdRef.current
    const inputLang = currentInputLanguageRef.current
    
    if (activeRecognitionRef.current) {
      try {
        activeRecognitionRef.current.stop()
      } catch {
        try {
          activeRecognitionRef.current.abort()
        } catch (e) {
          console.error('Error aborting recognition:', e)
        }
      }
      activeRecognitionRef.current = null
    }
    
    stopAudioRecording()
    setIsListening(false)
    
    if (triggerCallback && msgId && inputLang) {
      onStop?.(finalTranscript, msgId, inputLang, wasUserActivated)
    }
    
    currentMessageIdRef.current = null
    currentTranscriptRef.current = ''
    currentInputLanguageRef.current = null
    userActivatedRef.current = false
  }, [onStop])

  const start = useCallback((inputLang: InputLanguage = 'english') => {
    if (isListening) return
    
    const recognition = inputLang === 'english' 
      ? englishRecognitionRef.current 
      : learningRecognitionRef.current
    
    if (!recognition) {
      onError?.(new Error('Speech recognition not available'))
      return
    }
    
    try {
      activeRecognitionRef.current = recognition
      recognition.start()
    } catch (error) {
      console.error('Error starting recognition:', error)
      onError?.(error as Error)
    }
  }, [isListening, onError])

  const stop = useCallback((triggerCallback = true) => {
    userActivatedRef.current = true
    stopInternal(triggerCallback, true)
  }, [stopInternal])

  return {
    state: isListening ? 'listening' : 'idle',
    isListening,
    transcript,
    messageId,
    inputLanguage,
    audioChunks,
    start,
    stop,
    supportsAutoTurnDetection: false,
    isMultilingual: false,
  }
}


