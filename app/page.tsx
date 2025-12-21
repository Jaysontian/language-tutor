'use client'

import { useState, useRef, useEffect } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { getAllLessons, type LessonConfig } from '@/lib/lessons'
import { conversationPresets, type ConversationPresetId } from '@/lib/conversation-presets'

type Message = {
  id: string
  type: 'sent' | 'received'
  audioUrl?: string
  transcript?: string
  text?: string
  vocab?: Array<{ term: string; translation: string; pronunciation: string }>
  state?: 'listening' | 'thinking' | 'reading'
  inputLanguage?: 'english' | 'learning'
}

type LearningLanguage = 'French' | 'Spanish' | 'Chinese' | 'Japanese'
type AppMode = 'conversation' | 'learning'

const LANGUAGE_CODES: Record<LearningLanguage, string> = {
  'French': 'fr-FR',
  'Spanish': 'es-ES',
  'Chinese': 'zh-CN',
  'Japanese': 'ja-JP'
}

const SPRING = { type: 'spring' as const, stiffness: 420, damping: 34, mass: 0.8 }
const SPRING_SOFT = { type: 'spring' as const, stiffness: 260, damping: 28, mass: 0.9 }

function StatusWithDots({ label, reduceMotion }: { label: string; reduceMotion: boolean }) {
  if (reduceMotion) return <span>{label}</span>

  const dot = {
    initial: { opacity: 0.25, y: 0 },
    animate: (i: number) => ({
      opacity: [0.25, 1, 0.25],
      y: [0, -2, 0],
      transition: { duration: 0.9, repeat: Infinity, delay: i * 0.12 },
    }),
  }

  return (
    <span className="inline-flex items-center gap-1">
      <span>{label}</span>
      <span className="inline-flex w-[18px] justify-start">
        <motion.span variants={dot} custom={0} initial="initial" animate="animate" className="inline-block">.</motion.span>
        <motion.span variants={dot} custom={1} initial="initial" animate="animate" className="inline-block">.</motion.span>
        <motion.span variants={dot} custom={2} initial="initial" animate="animate" className="inline-block">.</motion.span>
      </span>
    </span>
  )
}

function LessonsModal({
  open,
  onClose,
  lessons,
  selectedLessonId,
  onSelectLesson,
  reduceMotion,
  disabled,
}: {
  open: boolean
  onClose: () => void
  lessons: LessonConfig[]
  selectedLessonId: string | null
  onSelectLesson: (lessonId: string | null) => void
  reduceMotion: boolean
  disabled: boolean
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="lesson-modal-overlay"
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={reduceMotion ? undefined : { opacity: 1 }}
          exit={reduceMotion ? undefined : { opacity: 0 }}
          transition={SPRING_SOFT}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
          onClick={() => {
            if (!disabled) onClose()
          }}
          role="dialog"
          aria-modal="true"
          aria-label="Select a lesson"
        >
          <motion.div
            key="lesson-modal"
            initial={reduceMotion ? false : { opacity: 0, y: 10, scale: 0.99 }}
            animate={reduceMotion ? undefined : { opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: 10, scale: 0.99 }}
            transition={SPRING_SOFT}
            className="w-full max-w-lg rounded-3xl border border-neutral-200 bg-white shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-200">
              <div>
                <div className="text-sm font-semibold text-neutral-800">Select a lesson</div>
                <div className="text-xs text-neutral-500">Choose one to start structured practice.</div>
              </div>
              <button
                type="button"
                onClick={onClose}
                disabled={disabled}
                className={`h-9 w-9 rounded-full border border-neutral-200 text-neutral-700 transition-colors ${
                  disabled ? 'opacity-60 cursor-not-allowed' : 'hover:bg-neutral-50 active:bg-neutral-100'
                }`}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto p-3 flex flex-col gap-2">
              {lessons.map((lesson) => {
                const isSelected = selectedLessonId === lesson.id
                return (
                  <button
                    key={lesson.id}
                    type="button"
                    onClick={() => onSelectLesson(lesson.id)}
                    disabled={disabled}
                    className={`w-full text-left p-3 rounded-2xl border transition-all duration-200 ${
                      isSelected ? 'bg-neutral-200 border-neutral-300' : 'bg-white border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50'
                    } ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="mr-1">{lesson.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-neutral-800 text-sm leading-tight">{lesson.title}</h3>
                        <p className="text-xs text-neutral-500 mt-1 line-clamp-1">Level {lesson.difficulty}</p>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function ConversationModal({
  open,
  onClose,
  selectedPresetId,
  onSelectPreset,
  reduceMotion,
  disabled,
}: {
  open: boolean
  onClose: () => void
  selectedPresetId: ConversationPresetId
  onSelectPreset: (presetId: ConversationPresetId) => void
  reduceMotion: boolean
  disabled: boolean
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="conversation-modal-overlay"
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={reduceMotion ? undefined : { opacity: 1 }}
          exit={reduceMotion ? undefined : { opacity: 0 }}
          transition={SPRING_SOFT}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
          onClick={() => {
            if (!disabled) onClose()
          }}
          role="dialog"
          aria-modal="true"
          aria-label="Select conversation mode"
        >
          <motion.div
            key="conversation-modal"
            initial={reduceMotion ? false : { opacity: 0, y: 10, scale: 0.99 }}
            animate={reduceMotion ? undefined : { opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: 10, scale: 0.99 }}
            transition={SPRING_SOFT}
            className="w-full max-w-lg rounded-3xl border border-neutral-200 bg-white shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-200">
              <div>
                <div className="text-sm font-semibold text-neutral-800">Conversation mode</div>
                <div className="text-xs text-neutral-500">Pick a style for your chat session.</div>
              </div>
              <button
                type="button"
                onClick={onClose}
                disabled={disabled}
                className={`h-9 w-9 rounded-full border border-neutral-200 text-neutral-700 transition-colors ${
                  disabled ? 'opacity-60 cursor-not-allowed' : 'hover:bg-neutral-50 active:bg-neutral-100'
                }`}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto p-3 flex flex-col gap-2">
              {conversationPresets.map((preset) => {
                const isSelected = selectedPresetId === preset.id
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => onSelectPreset(preset.id)}
                    disabled={disabled}
                    className={`w-full text-left p-3 rounded-2xl border transition-all duration-200 ${
                      isSelected ? 'bg-neutral-200 border-neutral-300' : 'bg-white border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50'
                    } ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-neutral-800 text-sm leading-tight">{preset.title}</h3>
                        <p className="text-xs text-neutral-500 mt-1 line-clamp-2">{preset.description}</p>
                      </div>
                      {isSelected && (
                        <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full shrink-0 bg-neutral-900 text-white">
                          Selected
                        </span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default function Home() {
  const [isListening, setIsListening] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [currentState, setCurrentState] = useState<'idle' | 'listening' | 'thinking' | 'reading'>('idle')
  const [appMode, setAppMode] = useState<AppMode>('conversation')
  const [learningLanguage, setLearningLanguage] = useState<LearningLanguage>('French')
  const [listeningLanguage, setListeningLanguage] = useState<'english' | 'learning'>('english')
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null)
  const [isLessonModalOpen, setIsLessonModalOpen] = useState(false)
  const [lessons] = useState<LessonConfig[]>(getAllLessons())
  const [ttsProvider, setTtsProvider] = useState<'elevenlabs' | 'browser' | 'openai'>('browser')
  const [selectedConversationPresetId, setSelectedConversationPresetId] = useState<ConversationPresetId>('free-chat')
  const [isConversationModalOpen, setIsConversationModalOpen] = useState(false)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const englishRecognitionRef = useRef<SpeechRecognition | null>(null)
  const learningRecognitionRef = useRef<SpeechRecognition | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const currentMessageIdRef = useRef<string | null>(null)
  const currentTranscriptRef = useRef<string>('')
  const userActivatedRef = useRef<boolean>(false)
  const isProcessingRef = useRef<boolean>(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const userHasScrolledRef = useRef<boolean>(false)
  const reduceMotion = useReducedMotion()

  const selectedLesson = lessons.find(l => l.id === selectedLessonId)
  const selectedConversationPreset = conversationPresets.find((p) => p.id === selectedConversationPresetId)

  const playChunksSequentially = async (chunks: Array<{text: string, language: string}>, messageIds: string[], userActivated: boolean) => {
    // Use browser TTS if provider is 'browser'
    if (ttsProvider === 'browser') {
      // Use SpeechSynthesis directly for browser TTS
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i]
        const messageId = messageIds[i]
        
        try {
          // Update message state to reading
          setMessages(prev => prev.map(msg => 
            msg.id === messageId ? { ...msg, state: 'reading' } : msg
          ))
          
          // Determine language code
          let langCode = LANGUAGE_CODES[learningLanguage] || 'en-US'
          if (chunk.language) {
            const upperLang = chunk.language.toUpperCase()
            const langMap: Record<string, string> = {
              'FR': 'fr-FR',
              'ES': 'es-ES',
              'ZH': 'zh-CN',
              'JA': 'ja-JP',
              'EN': 'en-US'
            }
            langCode = langMap[upperLang] || langCode
          }
          
          // Wait for this chunk to finish before playing next
          await new Promise<void>((resolve) => {
            const utterance = new SpeechSynthesisUtterance(chunk.text)
            utterance.lang = langCode
            utterance.rate = 1.0
            utterance.pitch = 1.0
            utterance.volume = 1.0
            
            utterance.onend = () => {
              setMessages(prev => prev.map(msg => 
                msg.id === messageId ? { ...msg, state: undefined } : msg
              ))
              resolve()
            }
            
            utterance.onerror = (error) => {
              console.error('SpeechSynthesis error for chunk:', i, error)
              setMessages(prev => prev.map(msg => 
                msg.id === messageId ? { ...msg, state: undefined } : msg
              ))
              resolve()
            }
            
            // Cancel any ongoing speech
            speechSynthesis.cancel()
            
            // Start speaking
            speechSynthesis.speak(utterance)
          })
        } catch (error) {
          console.error('Error processing chunk:', i, error)
          setMessages(prev => prev.map(msg => 
            msg.id === messageId ? { ...msg, state: undefined } : msg
          ))
        }
      }
      
      // All chunks played
      setCurrentState('idle')
      isProcessingRef.current = false
      return
    }
    
    // Use server-side TTS (ElevenLabs)
    // Use a single audio element to ensure sequential playback
    const audio = new Audio()
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]
      const messageId = messageIds[i]
      
      try {
        // Update message state to reading
        setMessages(prev => prev.map(msg => 
          msg.id === messageId ? { ...msg, state: 'reading' } : msg
        ))
        
        // Stop any current playback
        audio.pause()
        audio.currentTime = 0
        
        const audioRes = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: chunk.text, language: chunk.language, learningLanguage, provider: ttsProvider }),
        })
        
        if (!audioRes.ok) {
          console.error('TTS error for chunk:', i)
          // Update message state to remove reading state
          setMessages(prev => prev.map(msg => 
            msg.id === messageId ? { ...msg, state: undefined } : msg
          ))
          continue
        }
        
        const audioBlob = await audioRes.blob()
        const audioUrl = URL.createObjectURL(audioBlob)
        
        // Wait for this chunk to finish before playing next
        await new Promise<void>((resolve) => {
          let hasResolved = false
          
          const resolveOnce = () => {
            if (!hasResolved) {
              hasResolved = true
              URL.revokeObjectURL(audioUrl)
              // Remove all event listeners
              audio.onended = null
              audio.onerror = null
              audio.oncanplay = null
              audio.oncanplaythrough = null
              // Update message state to remove reading state
              setMessages(prev => prev.map(msg => 
                msg.id === messageId ? { ...msg, state: undefined } : msg
              ))
              resolve()
            }
          }
          
          // Set up handlers
          audio.onended = () => {
            resolveOnce()
          }
          
          audio.onerror = () => {
            console.error('Audio playback error for chunk:', i)
            resolveOnce()
          }
          
          // Set source and load
          audio.src = audioUrl
          audio.load()
          
          // Wait for audio to be ready, then play
          const startPlayback = async () => {
            try {
              await audio.play()
            } catch (error: any) {
              if (userActivated) {
                console.log('Autoplay blocked despite user activation:', error)
              }
              resolveOnce()
            }
          }
          
          // Check if already ready
          if (audio.readyState >= 2) {
            startPlayback()
          } else {
            const onReady = () => {
              startPlayback()
            }
            audio.addEventListener('canplay', onReady, { once: true })
            audio.addEventListener('canplaythrough', onReady, { once: true })
          }
        })
      } catch (error) {
        console.error('Error processing chunk:', i, error)
        // Update message state to remove reading state
        setMessages(prev => prev.map(msg => 
          msg.id === messageId ? { ...msg, state: undefined } : msg
        ))
        // Continue to next chunk
      }
    }
    
    // Clean up
    audio.pause()
    audio.src = ''
    
    // All chunks played
    setCurrentState('idle')
    isProcessingRef.current = false
  }

  const processRecording = async (transcript: string, messageId: string, inputLanguage: 'english' | 'learning', userActivated: boolean = false) => {
    // Prevent duplicate processing
    if (isProcessingRef.current) {
      return
    }
    isProcessingRef.current = true

    // Update message with final transcript and audio
    setMessages(prev => prev.map(msg => 
      msg.id === messageId 
        ? { ...msg, transcript, state: undefined, inputLanguage }
        : msg
    ))

    // Get recorded audio URL
    setTimeout(() => {
      if (audioChunksRef.current.length > 0) {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        const recordedAudioUrl = URL.createObjectURL(audioBlob)
        setMessages(prev => prev.map(msg => 
          msg.id === messageId 
            ? { ...msg, audioUrl: recordedAudioUrl }
            : msg
        ))
      }
    }, 200)

    // Process with API
    setCurrentState('thinking')
    const thinkingMessageId = (Date.now() + 1).toString()
    setMessages(prev => [...prev, { id: thinkingMessageId, type: 'received', state: 'thinking' }])

    try {
      // Get last 6 messages (3 conversation pairs) for context
      const conversationHistory = messages
        .filter(msg => (msg.type === 'sent' && msg.transcript) || (msg.type === 'received' && msg.text))
        .slice(-6)
      
      const res = await fetch('/api/openai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: transcript, 
          learningLanguage, 
          conversationHistory, 
          inputLanguage,
          lessonId: appMode === 'learning' ? selectedLessonId : undefined,
          conversationPresetId: appMode === 'conversation' ? selectedConversationPresetId : undefined,
        }),
      })
      const data = await res.json()
      const responseItems = data.response || data.chunks || []
      const vocab: Array<{ term: string; translation: string; pronunciation: string }> =
        Array.isArray(data.vocab) ? data.vocab : []

      if (responseItems.length === 0) {
        setCurrentState('idle')
        setMessages(prev => prev.filter(msg => msg.id !== thinkingMessageId))
        isProcessingRef.current = false
        return
      }

      // Remove thinking message and create separate messages for each chunk
      const baseTime = Date.now()
      const messageIds = responseItems.map((_: any, index: number) => (baseTime + index + 1).toString())
      
      setMessages(prev => {
        const filtered = prev.filter(msg => msg.id !== thinkingMessageId)
        const chunkMessages = responseItems.map((chunk: any, index: number) => ({
          id: messageIds[index],
          type: 'received' as const,
          text: chunk.text,
          state: undefined,
          vocab: index === responseItems.length - 1 && vocab.length ? vocab : undefined,
        }))
        return [...filtered, ...chunkMessages]
      })

      // Play chunks sequentially
      await playChunksSequentially(responseItems, messageIds, userActivated)
    } catch (error: any) {
      console.error('Error processing:', error)
      setCurrentState('idle')
      setMessages(prev => prev.filter(msg => msg.id !== thinkingMessageId))
      isProcessingRef.current = false
    }
  }

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition
      if (SpeechRecognition) {
        // English recognition for commands
        const englishRecognition = new SpeechRecognition()
        englishRecognition.continuous = false
        englishRecognition.interimResults = true
        englishRecognition.lang = 'en-US'

        const setupRecognitionHandlers = (recognition: SpeechRecognition, inputLanguage: 'english' | 'learning') => {
          recognition.onstart = () => {
            setIsListening(true)
            setCurrentState('listening')
            setListeningLanguage(inputLanguage)
            const messageId = Date.now().toString()
            currentMessageIdRef.current = messageId
            currentTranscriptRef.current = ''
            isProcessingRef.current = false
            setMessages(prev => [...prev, { id: messageId, type: 'sent', state: 'listening', inputLanguage }])
            startAudioRecording()
          }

          recognition.onresult = (event: SpeechRecognitionEvent) => {
            // Combine all results to get the full transcript
            let transcriptText = ''
            for (let i = 0; i < event.results.length; i++) {
              transcriptText += event.results[i][0].transcript
            }
            
            // Store the transcript in ref
            currentTranscriptRef.current = transcriptText
            
            // Update message with current transcript (interim or final) for real-time display
            const messageId = currentMessageIdRef.current!
            setMessages(prev => prev.map(msg => 
              msg.id === messageId 
                ? { ...msg, transcript: transcriptText }
                : msg
            ))
            
            // Only process final result
            const hasFinalResult = Array.from(event.results).some(result => result.isFinal)
            if (hasFinalResult) {
              setIsListening(false)
              stopAudioRecording()
              processRecording(transcriptText, messageId, inputLanguage, false) // Auto-stop, no user activation
              currentMessageIdRef.current = null
              currentTranscriptRef.current = ''
              userActivatedRef.current = false
            }
          }

          recognition.onerror = (event: any) => {
            console.error('Speech recognition error:', event.error)
            setIsListening(false)
            setCurrentState('idle')
            stopAudioRecording()
            if (currentMessageIdRef.current) {
              setMessages(prev => prev.filter(msg => msg.id !== currentMessageIdRef.current!))
              currentMessageIdRef.current = null
              currentTranscriptRef.current = ''
            }
          }

          recognition.onend = () => {
            setIsListening(false)
            stopAudioRecording()
          }
        }

        setupRecognitionHandlers(englishRecognition, 'english')
        englishRecognitionRef.current = englishRecognition

        // Learning language recognition
        const learningRecognition = new SpeechRecognition()
        learningRecognition.continuous = false
        learningRecognition.interimResults = true
        learningRecognition.lang = LANGUAGE_CODES[learningLanguage]
        setupRecognitionHandlers(learningRecognition, 'learning')
        learningRecognitionRef.current = learningRecognition

        recognitionRef.current = englishRecognition // Default
      }
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop()
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
        streamRef.current = null
      }
      messages.forEach(msg => {
        if (msg.audioUrl) URL.revokeObjectURL(msg.audioUrl)
      })
    }
  }, [messages])

  // Update learning language recognition when learning language changes
  useEffect(() => {
    if (learningRecognitionRef.current && typeof window !== 'undefined') {
      learningRecognitionRef.current.lang = LANGUAGE_CODES[learningLanguage]
    }
  }, [learningLanguage])

  // Auto-scroll to bottom when new messages arrive (unless user scrolled up)
  useEffect(() => {
    if (!userHasScrolledRef.current && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  // Track user scroll to detect manual scrolling
  useEffect(() => {
    const container = messagesContainerRef.current
    if (!container) return

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100
      userHasScrolledRef.current = !isNearBottom
      
      // If user scrolled back to bottom, reset the flag
      if (isNearBottom) {
        userHasScrolledRef.current = false
      }
    }

    container.addEventListener('scroll', handleScroll)
    return () => container.removeEventListener('scroll', handleScroll)
  }, [])

  const startAudioRecording = async () => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
        streamRef.current = null
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      
      let mimeType = 'audio/webm'
      if (!MediaRecorder.isTypeSupported('audio/webm')) {
        if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4'
        } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
          mimeType = 'audio/ogg'
        } else {
          mimeType = ''
        }
      }
      
      const options = mimeType ? { mimeType } : undefined
      const mediaRecorder = new MediaRecorder(stream, options)
      audioChunksRef.current = []
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }
      
      mediaRecorder.onstop = () => {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop())
          streamRef.current = null
        }
      }
      
      mediaRecorder.start(100)
      mediaRecorderRef.current = mediaRecorder
    } catch (error: any) {
      console.error('Error starting audio recording:', error)
    }
  }

  const stopAudioRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop()
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        if (track.readyState === 'live') track.stop()
      })
      streamRef.current = null
    }
  }

  const handleTap = (language: 'english' | 'learning') => {
    if (isListening || currentState !== 'idle') return
    
    const recognition = language === 'english' 
      ? englishRecognitionRef.current 
      : learningRecognitionRef.current
    
    if (recognition) {
      try {
        recognition.start()
        recognitionRef.current = recognition
      } catch (error: any) {
        console.error('Error starting recognition:', error)
      }
    }
  }

  const handleStop = () => {
    // Mark that user activated (clicked Stop)
    userActivatedRef.current = true
    
    if (recognitionRef.current && isListening) {
      try {
        recognitionRef.current.stop()
      } catch (error: any) {
        try {
          recognitionRef.current.abort()
        } catch (abortError: any) {
          console.error('Error aborting recognition:', abortError)
        }
      }
    }
    stopAudioRecording()
    setIsListening(false)
    
    // Process recording if we have a message
    if (currentMessageIdRef.current && currentTranscriptRef.current) {
      const messageId = currentMessageIdRef.current
      const transcript = currentTranscriptRef.current
      const inputLang = listeningLanguage
      processRecording(transcript, messageId, inputLang, true) // User activated
      currentMessageIdRef.current = null
      currentTranscriptRef.current = ''
    } else if (currentMessageIdRef.current) {
      // No transcript, just clean up
      setMessages(prev => prev.filter(msg => msg.id !== currentMessageIdRef.current!))
      currentMessageIdRef.current = null
      setCurrentState('idle')
      userActivatedRef.current = false
    }
  }

  const handleSelectLessonFromModal = (lessonId: string | null) => {
    if (currentState !== 'idle') return
    setSelectedLessonId(lessonId)
    setMessages([]) // Clear conversation when switching lessons
    setIsLessonModalOpen(false)
  }

  const handleSelectConversationPresetFromModal = (presetId: ConversationPresetId) => {
    if (currentState !== 'idle') return
    setSelectedConversationPresetId(presetId)
    setMessages([]) // Clear conversation when switching conversation modes
    setIsConversationModalOpen(false)
  }

  useEffect(() => {
    if (!isLessonModalOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && currentState === 'idle') setIsLessonModalOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isLessonModalOpen, currentState])

  useEffect(() => {
    if (!isConversationModalOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && currentState === 'idle') setIsConversationModalOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isConversationModalOpen, currentState])

  const handleStartLesson = () => {
    if (currentState !== 'idle') return
    if (appMode !== 'learning') return
    if (!selectedLesson) return

    // Ensure we don't accidentally attach a previous recording to this manual message
    audioChunksRef.current = []

    const text = "Let's begin the lesson!"
    const messageId = Date.now().toString()

    setMessages(prev => [
      ...prev,
      { id: messageId, type: 'sent', transcript: text, inputLanguage: 'english' }
    ])

    // Use the same pipeline as voice input (minus audio recording)
    processRecording(text, messageId, 'english', true)
  }

  const getButtonText = (language: 'english' | 'learning') => {
    if (currentState === 'listening' && listeningLanguage === language) return 'Listening...'
    if (currentState === 'thinking') return 'Thinking...'
    if (currentState === 'reading') return 'Reading...'
    return language === 'english' ? 'English' : `${learningLanguage}`
  }

  return (
    <main className="flex h-screen">
      {/* Sidebar */}
      <motion.aside
        initial={reduceMotion ? false : { opacity: 0, x: -10 }}
        animate={reduceMotion ? undefined : { opacity: 1, x: 0 }}
        transition={SPRING_SOFT}
        className="w-72 h-[calc(100vh-4rem)] border border-neutral-200 rounded-3xl shadow-xl p-5 m-8 flex flex-col gap-6 overflow-hidden"
      >
        {/* Language Selection */}
        <div>
          <label className="text-sm font-medium text-neutral-400 mb-2 block">Learning</label>
          <Select
            value={learningLanguage}
            onValueChange={(value) => {
              setLearningLanguage(value as LearningLanguage)
              setMessages([]) // Clear conversation when switching languages
            }}
            disabled={currentState !== 'idle'}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select language" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="French">🇫🇷 French</SelectItem>
              <SelectItem value="Spanish">🇪🇸 Spanish</SelectItem>
              <SelectItem value="Chinese">🇨🇳 Chinese</SelectItem>
              <SelectItem value="Japanese">🇯🇵 Japanese</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* TTS Provider Selection */}
        <div>
          <label className="text-sm font-medium text-neutral-400 mb-2 block">Speech</label>
          <Select
            value={ttsProvider}
            onValueChange={(value) => {
              setTtsProvider(value as 'elevenlabs' | 'browser' | 'openai')
            }}
            disabled={currentState !== 'idle'}
          >
            <SelectTrigger className="w-full text-left">
              <SelectValue placeholder="Select Provider" />
            </SelectTrigger>
            <SelectContent className='max-w-xs'>
              <SelectItem value="browser">
                <div>
                  <div className="font-medium">Browser</div>
                  <div className="text-xs text-neutral-400">Use your device's built-in voice (lowest quality)</div>
                </div>
              </SelectItem>
              <SelectItem value="openai">
                <div>
                  <div className="font-medium">GPT-4o</div>
                  <div className="text-xs text-neutral-400">Latest OpenAI speech - natural, expressive (medium quality)</div>
                </div>
              </SelectItem>
              <SelectItem value="elevenlabs" disabled>
                <div>
                  <div className="font-medium flex items-center gap-2">
                    Eleven Labs
                    <span className="bg-orange-100 text-orange-700 text-[10px] px-2 py-0.5 rounded-full font-semibold ml-2">Coming Soon</span>
                  </div>
                  <div className="text-xs text-neutral-400">Neural voices for multiple languages (highest quality)</div>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Mode Tabs */}
        <div className="flex flex-col items-start justify-stretch gap-2">
          <div className="text-sm font-medium text-neutral-400">Mode</div>
          <div
            className={`w-full grid grid-cols-2 gap-1 rounded-2xl border border-neutral-200 bg-white p-1 ${
              currentState !== 'idle' ? 'opacity-70' : ''
            }`}
          >
            <button
              type="button"
              onClick={() => {
                if (currentState !== 'idle') return
                setAppMode('conversation')
                setMessages([])
                setIsLessonModalOpen(false)
                setIsConversationModalOpen(false)
              }}
              disabled={currentState !== 'idle'}
              aria-pressed={appMode === 'conversation'}
              className={`w-full px-3 py-2 text-xs font-semibold rounded-xl transition-colors flex items-center justify-center ${
                appMode === 'conversation'
                  ? 'bg-neutral-900 text-white shadow-sm'
                  : 'text-neutral-700 hover:bg-neutral-50'
              } ${currentState !== 'idle' ? 'cursor-not-allowed' : ''}`}
            >
              Conversation
            </button>
            <button
              type="button"
              onClick={() => {
                if (currentState !== 'idle') return
                setAppMode('learning')
                setMessages([])
                setIsLessonModalOpen(false)
                setIsConversationModalOpen(false)
              }}
              disabled={currentState !== 'idle'}
              aria-pressed={appMode === 'learning'}
              className={`w-full px-3 py-2 text-xs font-semibold rounded-xl transition-colors flex items-center justify-center ${
                appMode === 'learning'
                  ? 'bg-neutral-900 text-white shadow-sm'
                  : 'text-neutral-700 hover:bg-neutral-50'
              } ${currentState !== 'idle' ? 'cursor-not-allowed' : ''}`}
            >
              Learning
            </button>
          </div>
        </div>

        {/* Lessons Section */}
        <div className="flex flex-1 min-h-0 flex-col gap-3">
          <label className="text-sm font-medium text-neutral-400">
            {appMode === 'learning' ? 'Lesson' : 'Conversation'}
          </label>

          <div className="flex-1 min-h-0 flex flex-col gap-3">
            {appMode === 'learning' && selectedLesson ? (
              <motion.div
                initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
                transition={SPRING_SOFT}
                className="rounded-2xl border border-neutral-200 bg-white p-4"
              >
                <div className="flex items-start gap-2">
                  <div className="text-lg leading-none">{selectedLesson.emoji}</div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-neutral-800 leading-tight">{selectedLesson.title}</div>
                    <div className="text-xs text-neutral-500 mt-1">Level {selectedLesson.difficulty}</div>
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsLessonModalOpen(true)}
                    disabled={currentState !== 'idle'}
                    className={`flex-1 rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
                      currentState !== 'idle'
                        ? 'bg-neutral-200 text-neutral-500 cursor-not-allowed'
                        : 'bg-neutral-200 text-neutral-500 hover:bg-neutral-300 active:bg-neutral-300'
                    }`}
                  >
                    Change
                  </button>
                </div>
              </motion.div>
            ) : appMode === 'learning' ? (
              <motion.button
                type="button"
                onClick={() => setIsLessonModalOpen(true)}
                disabled={currentState !== 'idle'}
                whileHover={reduceMotion || currentState !== 'idle' ? undefined : { y: -1, scale: 1.01 }}
                whileTap={reduceMotion || currentState !== 'idle' ? undefined : { scale: 0.99 }}
                transition={SPRING_SOFT}
                className={`w-full rounded-2xl border px-4 py-3 text-sm font-semibold transition-colors ${
                  currentState !== 'idle'
                    ? 'bg-neutral-200 border-neutral-200 text-neutral-500 cursor-not-allowed'
                    : 'bg-white border-neutral-200 text-neutral-900 hover:bg-neutral-50 hover:border-neutral-300 active:bg-neutral-100'
                }`}
              >
                Select lesson
              </motion.button>
            ) : (
              <motion.div
                initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
                transition={SPRING_SOFT}
                className="rounded-2xl border border-neutral-200 bg-white p-4"
              >
                <div className="text-sm font-semibold text-neutral-800 leading-tight">
                  {selectedConversationPreset?.title || 'Free chat'}
                </div>
                <div className="text-xs text-neutral-500 mt-1">
                  {selectedConversationPreset?.description || 'Open-ended conversation.'}
                </div>

                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsConversationModalOpen(true)}
                    disabled={currentState !== 'idle'}
                    className={`flex-1 rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
                      currentState !== 'idle'
                        ? 'bg-neutral-200 text-neutral-500 cursor-not-allowed'
                        : 'bg-neutral-200 text-neutral-500 hover:bg-neutral-300 active:bg-neutral-300'
                    }`}
                  >
                    Change
                  </button>
                </div>
              </motion.div>
            )}

            {appMode === 'learning' && !selectedLesson && (
              <div className="text-xs text-neutral-500">
                No lesson selected. Choose one to start structured practice.
              </div>
            )}
          </div>
          
        </div>

      </motion.aside>

      <LessonsModal
        open={appMode === 'learning' && isLessonModalOpen}
        onClose={() => setIsLessonModalOpen(false)}
        lessons={lessons}
        selectedLessonId={selectedLessonId}
        onSelectLesson={handleSelectLessonFromModal}
        reduceMotion={!!reduceMotion}
        disabled={currentState !== 'idle'}
      />

      <ConversationModal
        open={appMode === 'conversation' && isConversationModalOpen}
        onClose={() => setIsConversationModalOpen(false)}
        selectedPresetId={selectedConversationPresetId}
        onSelectPreset={handleSelectConversationPresetFromModal}
        reduceMotion={!!reduceMotion}
        disabled={currentState !== 'idle'}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col relative overflow-hidden">
        {/* Scrollable messages area */}
        <div 
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto flex flex-col gap-4 p-4 w-full mx-auto pb-[400px] pt-12"
        >
          <div className="max-w-2xl mx-auto">
              
            {/* Lesson Info */}
            <AnimatePresence mode="wait">
              {appMode === 'learning' && selectedLesson && (
                <motion.div
                  key={selectedLesson.id}
                  initial={reduceMotion ? false : { opacity: 0, y: 10, scale: 0.99 }}
                  animate={reduceMotion ? undefined : { opacity: 1, y: 0, scale: 1 }}
                  exit={reduceMotion ? undefined : { opacity: 0, y: 8, scale: 0.99 }}
                  transition={SPRING_SOFT}
                  className="w-full bg-neutral-100 rounded-3xl p-4 border border-neutral-200 mb-8"
                >
                  <motion.h2
                    layout="position"
                    className="text-lg font-semibold text-neutral-800 mb-3 text-center"
                  >
                    {selectedLesson.title}
                  </motion.h2>
                  <motion.div layout className="flex gap-3 mt-2">
                    {selectedLesson.objectives.slice(0, 3).map((obj, i) => (
                      <motion.div
                        key={i}
                        layout
                        transition={SPRING_SOFT}
                        className="flex-1 bg-white rounded-xl border border-neutral-200 p-3 text-sm text-neutral-500 shadow-sm min-w-0 text-center flex justify-center items-center"
                      >
                        {obj}
                      </motion.div>
                    ))}
                  </motion.div>

                  <motion.button
                    onClick={handleStartLesson}
                    disabled={currentState !== 'idle'}
                    whileHover={reduceMotion || currentState !== 'idle' ? undefined : { scale: 1.01 }}
                    whileTap={reduceMotion || currentState !== 'idle' ? undefined : { scale: 0.99 }}
                    transition={SPRING}
                    className={`
                      mt-4 w-full rounded-2xl px-4 py-3 text-sm font-semibold text-white transition-colors
                      ${currentState !== 'idle'
                        ? 'bg-blue-400 opacity-70 cursor-not-allowed'
                        : 'bg-blue-500 hover:bg-blue-600 active:bg-blue-700'
                      }
                    `}
                  >
                    <AnimatePresence mode="wait" initial={false}>
                      {currentState === 'idle' ? (
                        <motion.span
                          key="start"
                          initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                          animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
                          exit={reduceMotion ? undefined : { opacity: 0, y: -6 }}
                          transition={SPRING_SOFT}
                          className="inline-flex items-center justify-center w-full"
                        >
                          Start lesson
                        </motion.span>
                      ) : (
                        <motion.span
                          key="loading"
                          initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                          animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
                          exit={reduceMotion ? undefined : { opacity: 0, y: -6 }}
                          transition={SPRING_SOFT}
                          className="inline-flex items-center justify-center w-full"
                        >
                          <StatusWithDots label="Loading" reduceMotion={!!reduceMotion} />
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>
            
            <AnimatePresence initial={false}>
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  layout="position"
                  initial={reduceMotion ? false : { opacity: 0, y: 10, scale: 0.985 }}
                  animate={reduceMotion ? undefined : { opacity: 1, y: 0, scale: 1 }}
                  exit={reduceMotion ? undefined : { opacity: 0, y: -10, scale: 0.985 }}
                  transition={SPRING_SOFT}
                  className={`flex ${msg.type === 'sent' ? 'justify-end' : 'justify-start'}`}
                >
                  <motion.div
                    layout
                    transition={SPRING_SOFT}
                    className={`max-w-[70%] text-sm px-4 py-3 mb-2 rounded-3xl ${
                      msg.type === 'sent' 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-gray-200 text-gray-800'
                    }`}
                  >
                  
                    {msg.transcript && (
                      <motion.div
                        layout="position"
                        transition={SPRING_SOFT}
                        className={`font-medium ${msg.state === 'listening' ? 'italic opacity-90' : ''}`}
                      >
                        {msg.transcript}
                      </motion.div>
                    )}
                  
                    {msg.text && (
                      <motion.div layout="position" transition={SPRING_SOFT} className={msg.audioUrl ? 'mb-0' : ''}>
                        {msg.text}
                      </motion.div>
                    )}

                    {msg.type === 'received' && msg.vocab && msg.vocab.length > 0 && (
                      <motion.div layout className="mt-2 flex flex-wrap gap-2">
                        {msg.vocab.map((v) => (
                          <motion.span
                            key={v.term}
                            layout
                            transition={SPRING_SOFT}
                            className="relative inline-flex"
                          >
                            <span className="group inline-flex">
                              <span className="inline-flex items-center rounded-full border border-neutral-300 bg-white/70 px-2.5 py-1 text-[11px] font-medium text-neutral-700">
                                {v.term}
                              </span>
                              <span className="pointer-events-none absolute left-1/2 top-0 z-30 hidden -translate-x-1/2 -translate-y-[calc(100%+8px)] group-hover:block">
                                <span className="block w-max max-w-[240px] rounded-xl border border-neutral-200 bg-white px-3 py-2 text-[11px] text-neutral-800 shadow-lg">
                                  <div className="font-semibold">{v.translation || '—'}</div>
                                  <div className="text-neutral-500">{v.pronunciation || '—'}</div>
                                </span>
                              </span>
                            </span>
                          </motion.span>
                        ))}
                      </motion.div>
                    )}

                    <div className="flex justify-end text-xs font-medium text-black/25">
                      {msg.state === 'listening' && !msg.transcript && (
                        <StatusWithDots label="Listening" reduceMotion={!!reduceMotion} />
                      )}
                      {msg.state === 'thinking' && (
                        <StatusWithDots label="Thinking" reduceMotion={!!reduceMotion} />
                      )}
                      {msg.state === 'reading' && (
                        <StatusWithDots label="Reading" reduceMotion={!!reduceMotion} />
                      )}
                    </div>
                  </motion.div>
                </motion.div>
              ))}
            </AnimatePresence>
            <div ref={messagesEndRef} />
          
          </div>
        </div>

        {/* Buttons at bottom with gradient fade */}
        <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center pt-8 pb-8 gap-4 z-0">
          {/* Masked Gradient Blur */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-0 right-0 bottom-0 top-0 h-full z-0"
            style={{
              WebkitMaskImage: "linear-gradient(to bottom, rgba(0,0,0,0) 0%, #000 80%)",
              maskImage: "linear-gradient(to bottom, rgba(0,0,0,0) 0%, #000 80%)",
              backdropFilter: "blur(24px)",
              background: "linear-gradient(to bottom, rgba(255,255,255,0.6) 60%, #fff 100%)",
            }}
          />
          <div className="relative z-10 flex flex-col items-center gap-4">
            <div className="flex flex-col items-center gap-4 w-full">
              <div className="flex gap-6 items-center">
                {/* English Button */}
                <motion.button
                  type="button"
                  onClick={() => handleTap('english')}
                  disabled={currentState !== 'idle'}
                  whileHover={reduceMotion || currentState !== 'idle' ? undefined : { scale: 1.05 }}
                  whileTap={reduceMotion || currentState !== 'idle' ? undefined : { scale: 0.96 }}
                  animate={
                    reduceMotion
                      ? undefined
                      : (currentState === 'listening' && listeningLanguage === 'english')
                        ? { scale: [1, 1.03, 1] }
                        : { scale: 1 }
                  }
                  transition={
                    reduceMotion
                      ? SPRING
                      : (currentState === 'listening' && listeningLanguage === 'english')
                        ? { duration: 1.2, repeat: Infinity, ease: 'easeInOut' }
                        : SPRING
                  }
                  className={`w-[120px] h-[120px] shadow-md rounded-full flex items-center justify-center text-white text-md font-medium text-center transition-all duration-800
                    ${
                      currentState !== 'idle'
                        ? 'bg-blue-500 cursor-not-allowed opacity-70'
                        : 'bg-blue-500 cursor-pointer opacity-100 hover:bg-blue-600 hover:shadow-xl active:shadow-lg'
                    }
                    ${
                      currentState === 'listening' && listeningLanguage === 'english'
                        ? 'shadow-[0_0_28px_rgba(59,130,246,0.5)] animate-slow-pulse'
                        : 'shadow-lg'
                    }
                  `}
                >
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.span
                      key={getButtonText('english')}
                      initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                      animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
                      exit={reduceMotion ? undefined : { opacity: 0, y: -6 }}
                      transition={SPRING_SOFT}
                    >
                      {getButtonText('english')}
                    </motion.span>
                  </AnimatePresence>
                </motion.button>
                {/* Learning Language Button */}
                <motion.button
                  type="button"
                  onClick={() => handleTap('learning')}
                  disabled={currentState !== 'idle'}
                  whileHover={reduceMotion || currentState !== 'idle' ? undefined : { scale: 1.05 }}
                  whileTap={reduceMotion || currentState !== 'idle' ? undefined : { scale: 0.96 }}
                  animate={
                    reduceMotion
                      ? undefined
                      : (currentState === 'listening' && listeningLanguage === 'learning')
                        ? { scale: [1, 1.03, 1] }
                        : { scale: 1 }
                  }
                  transition={
                    reduceMotion
                      ? SPRING
                      : (currentState === 'listening' && listeningLanguage === 'learning')
                        ? { duration: 1.2, repeat: Infinity, ease: 'easeInOut' }
                        : SPRING
                  }
                  className={`w-[120px] h-[120px] shadow-md rounded-full flex items-center justify-center text-white text-md font-medium text-center transition-all duration-800
                    ${
                      currentState !== 'idle'
                        ? 'bg-green-500 cursor-not-allowed opacity-70'
                        : 'bg-green-500 cursor-pointer opacity-100 hover:bg-green-600 hover:shadow-xl active:shadow-lg'
                    }
                    ${
                      currentState === 'listening' && listeningLanguage === 'learning'
                        ? 'shadow-[0_0_28px_rgba(34,197,94,0.5)] animate-slow-pulse'
                        : 'shadow-lg'
                    }
                  `}
                >
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.span
                      key={getButtonText('learning')}
                      initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                      animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
                      exit={reduceMotion ? undefined : { opacity: 0, y: -6 }}
                      transition={SPRING_SOFT}
                    >
                      {getButtonText('learning')}
                    </motion.span>
                  </AnimatePresence>
                </motion.button>
              </div>
              <div className="text-xs text-neutral-400 text-center mt-2">
                Press to speak in the specified language
              </div>
            </div>

            {isListening && (
              <motion.button
                type="button"
                onClick={handleStop}
                whileHover={reduceMotion ? undefined : { scale: 1.03 }}
                whileTap={reduceMotion ? undefined : { scale: 0.97 }}
                transition={SPRING}
                className="px-4 py-2 bg-red-600 text-white border-none rounded-2xl text-sm cursor-pointer"
              >
                Stop
              </motion.button>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
