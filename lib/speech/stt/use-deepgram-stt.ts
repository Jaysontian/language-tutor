'use client'

import { useState, useRef, useCallback } from 'react'
import { createClient, LiveTranscriptionEvents, type LiveClient } from '@deepgram/sdk'
import type { SttHookResult, SttConfig } from './types'
import type { InputLanguage, SttProvider } from '../types'

type DeepgramModel = 'nova-3'

/**
 * Deepgram STT using real-time WebSocket connection
 * - Multilingual support (auto-detects language)
 * - Auto turn detection via utterance end and speech_final
 */
export function useDeepgramStt(
  config: SttConfig,
  model: DeepgramModel = 'nova-3'
): SttHookResult {
  const { autoTurnDetection = true, onStart, onTranscript, onStop, onError } = config
  
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [messageId, setMessageId] = useState<string | null>(null)
  const [audioChunks, setAudioChunks] = useState<Blob[]>([])
  
  const connectionRef = useRef<LiveClient | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const processorRef = useRef<ScriptProcessorNode | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const keepAliveIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const transcriptRef = useRef('')
  const messageIdRef = useRef<string | null>(null)
  const eotHandledRef = useRef(false)
  const autoTurnDetectionRef = useRef(autoTurnDetection)

  // Keep ref in sync with prop
  autoTurnDetectionRef.current = autoTurnDetection

  const cleanup = useCallback(() => {
    if (keepAliveIntervalRef.current) {
      clearInterval(keepAliveIntervalRef.current)
      keepAliveIntervalRef.current = null
    }
    if (processorRef.current) {
      processorRef.current.disconnect()
      processorRef.current = null
    }
    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }
    if (connectionRef.current) {
      try {
        connectionRef.current.finish()
      } catch (err) {
        console.error('Error closing Deepgram connection:', err)
      }
      connectionRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
  }, [])

  const stopInternal = useCallback(async (triggerCallback: boolean, wasUserActivated: boolean) => {
    console.log('Deepgram stopInternal:', { triggerCallback, wasUserActivated })
    
    eotHandledRef.current = true
    cleanup()
    
    setIsListening(false)
    setAudioChunks([...audioChunksRef.current])
    
    const finalTranscript = transcriptRef.current.trim()
    const msgId = messageIdRef.current
    
    transcriptRef.current = ''
    messageIdRef.current = null
    
    if (triggerCallback && msgId) {
      onStop?.(finalTranscript, msgId, 'learning', wasUserActivated)
    }
  }, [cleanup, onStop])

  const start = useCallback(async (_inputLanguage?: InputLanguage) => {
    if (isListening) return
    
    const apiKey = process.env.NEXT_PUBLIC_DEEPGRAM_API_KEY
    if (!apiKey) {
      const error = new Error('Missing NEXT_PUBLIC_DEEPGRAM_API_KEY')
      console.error(error.message)
      onError?.(error)
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      audioChunksRef.current = []
      
      const deepgram = createClient(apiKey)
      
      const connection = deepgram.listen.live({
        model: 'nova-3',
        language: 'multi',
        encoding: 'linear16',
        sample_rate: 16000,
        channels: 1,
        smart_format: true,
        interim_results: true,
        utterance_end_ms: 1500,
        vad_events: true,
        endpointing: 100,
      })

      connection.on(LiveTranscriptionEvents.Open, () => {
        console.log('Deepgram connection opened')
        connectionRef.current = connection
        eotHandledRef.current = false
        
        const msgId = Date.now().toString()
        messageIdRef.current = msgId
        transcriptRef.current = ''
        
        setIsListening(true)
        setMessageId(msgId)
        setTranscript('')
        
        onStart?.(msgId, 'learning')
        
        // Keep connection alive
        keepAliveIntervalRef.current = setInterval(() => {
          if (connectionRef.current) {
            try {
              connectionRef.current.keepAlive()
            } catch (err) {
              console.error('Failed to send keepalive:', err)
            }
          }
        }, 5000)

        // Start audio recording using Web Audio API for linear16 PCM
        const audioContext = new AudioContext({ sampleRate: 16000 })
        audioContextRef.current = audioContext
        
        const source = audioContext.createMediaStreamSource(stream)
        const processor = audioContext.createScriptProcessor(4096, 1, 1)
        processorRef.current = processor
        
        processor.onaudioprocess = (e) => {
          if (!connectionRef.current) return
          
          const inputData = e.inputBuffer.getChannelData(0)
          // Convert float32 to int16 (linear16)
          const int16Data = new Int16Array(inputData.length)
          for (let i = 0; i < inputData.length; i++) {
            const s = Math.max(-1, Math.min(1, inputData[i]))
            int16Data[i] = s < 0 ? s * 0x8000 : s * 0x7FFF
          }
          
          try {
            connection.send(int16Data.buffer)
          } catch (err) {
            console.error('Failed to send audio chunk:', err)
          }
        }
        
        source.connect(processor)
        processor.connect(audioContext.destination)
      })

      connection.on(LiveTranscriptionEvents.Transcript, (data) => {
        // Log full response to check multilingual detection
        console.log('Deepgram transcript response:', JSON.stringify(data, null, 2))
        
        const text = data.channel?.alternatives?.[0]?.transcript || ''
        const isFinal = data.is_final
        const speechFinal = data.speech_final

        if (text) {
          if (isFinal) {
            transcriptRef.current = (transcriptRef.current + ' ' + text).trim()
          }
          
          const displayTranscript = isFinal 
            ? transcriptRef.current 
            : (transcriptRef.current + ' ' + text).trim()
          
          setTranscript(displayTranscript)
          onTranscript?.(displayTranscript, isFinal)
        }

        // Auto turn detection
        if (speechFinal && autoTurnDetectionRef.current && !eotHandledRef.current && transcriptRef.current.trim()) {
          console.log('Deepgram speech_final - ending turn')
          void stopInternal(true, false)
        }
      })

      connection.on(LiveTranscriptionEvents.UtteranceEnd, () => {
        console.log('Deepgram UtteranceEnd')
        if (autoTurnDetectionRef.current && !eotHandledRef.current && transcriptRef.current.trim()) {
          void stopInternal(true, false)
        }
      })

      connection.on(LiveTranscriptionEvents.Error, (error) => {
        console.error('Deepgram error:', error)
        setIsListening(false)
        onError?.(new Error(JSON.stringify(error)), messageIdRef.current || undefined)
      })

      connection.on(LiveTranscriptionEvents.Close, () => {
        console.log('Deepgram connection closed')
        if (!eotHandledRef.current && isListening) {
          void stopInternal(true, false)
        }
      })

    } catch (err) {
      console.error('Error starting Deepgram session:', err)
      onError?.(err as Error)
    }
  }, [isListening, model, onStart, onTranscript, onError, stopInternal])

  const stop = useCallback((triggerCallback = true) => {
    void stopInternal(triggerCallback, true)
  }, [stopInternal])

  return {
    state: isListening ? 'listening' : 'idle',
    isListening,
    transcript,
    messageId,
    inputLanguage: isListening ? 'learning' : null,
    audioChunks,
    start,
    stop,
    supportsAutoTurnDetection: true,
    isMultilingual: true,
  }
}

