'use client'

import { useState, useRef, useEffect } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { getAllLessons, type LessonConfig } from '@/lib/lessons'

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

const LANGUAGE_CODES: Record<LearningLanguage, string> = {
  'French': 'fr-FR',
  'Spanish': 'es-ES',
  'Chinese': 'zh-CN',
  'Japanese': 'ja-JP'
}

const DIFFICULTY_COLORS: Record<number, { bg: string; text: string; border: string }> = {
  1: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  2: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
  3: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  4: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  5: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' }
}

export default function Home() {
  const [isListening, setIsListening] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [currentState, setCurrentState] = useState<'idle' | 'listening' | 'thinking' | 'reading'>('idle')
  const [learningLanguage, setLearningLanguage] = useState<LearningLanguage>('French')
  const [listeningLanguage, setListeningLanguage] = useState<'english' | 'learning'>('english')
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null)
  const [lessons] = useState<LessonConfig[]>(getAllLessons())
  const [ttsProvider, setTtsProvider] = useState<'elevenlabs' | 'browser' | 'openai'>('browser')
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

  const selectedLesson = lessons.find(l => l.id === selectedLessonId)

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
          lessonId: selectedLessonId
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

  const handleLessonSelect = (lessonId: string) => {
    if (currentState !== 'idle') return
    setSelectedLessonId(lessonId === selectedLessonId ? null : lessonId)
    // Clear conversation when switching lessons
    setMessages([])
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
      <aside className="w-72 border border-neutral-200 rounded-3xl shadow-xl p-5 m-8 flex flex-col gap-6">
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

        {/* Lessons Section */}
        <div className="flex flex-col gap-3">
          <label className="text-sm font-medium text-neutral-400">Lessons</label>
          
          {lessons.map((lesson) => {
            const colors = DIFFICULTY_COLORS[lesson.difficulty]
            const isSelected = selectedLessonId === lesson.id
            
            return (
              <button
                key={lesson.id}
                onClick={() => handleLessonSelect(lesson.id)}
                disabled={currentState !== 'idle'}
                className={`
                  w-full text-left p-3 rounded-xl border-2 transition-all duration-200
                  ${isSelected 
                    ? 'bg-neutral-200 border-neutral-300' 
                    : 'bg-white border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50'
                  }
                  ${currentState !== 'idle' ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}
                `}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-neutral-800 text-sm leading-tight">
                      <span className="mr-1">{lesson.emoji}</span>
                      {lesson.title}
                    </h3>
                    <p className="text-xs text-neutral-500 mt-1 line-clamp-1">
                      {lesson.description}
                    </p>
                  </div>
                  <span className={`
                    text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full shrink-0
                    ${colors.bg} ${colors.text}
                  `}>
                    LV {lesson.difficulty}
                  </span>
                </div>
              </button>
            )
          })}

          {/* Free Practice Option */}
          <button
            onClick={() => handleLessonSelect('')}
            disabled={currentState !== 'idle'}
            className={`
              w-full text-left p-3 rounded-xl border-2 transition-all duration-200
              ${selectedLessonId === null 
                ? 'bg-neutral-200 border-neutral-300' 
                : 'bg-white border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50'
              }
              ${currentState !== 'idle' ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-neutral-800 text-sm leading-tight">
                  <span className="mr-1">🗣️</span>
                  Free Practice
                </h3>
                <p className="text-xs text-neutral-500 mt-1 line-clamp-1">
                  Open conversation, adaptive difficulty
                </p>
              </div>
              <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full shrink-0 bg-blue-50 text-blue-700">
                Flexible
              </span>
            </div>
          </button>
        </div>

      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col relative overflow-hidden">
        {/* Scrollable messages area */}
        <div 
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto flex flex-col gap-4 p-4 max-w-[700px] w-full mx-auto pb-[280px] pt-12"
        >
          {/* Lesson Info */}
          {selectedLesson && (
            <div className="w-full bg-neutral-100 rounded-3xl p-4 border border-neutral-200">
              <h2 className="text-lg font-semibold text-neutral-800 mb-3">
                {selectedLesson.title}
              </h2>
              <div className="text-xs text-neutral-500">
                <ul className="space-y-1.5">
                  {selectedLesson.objectives.map((obj, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-neutral-400 mt-0.5">•</span>
                      <span>{obj}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
          
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.type === 'sent' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[70%] text-sm px-4 py-3 rounded-3xl ${
                msg.type === 'sent' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-200 text-gray-800'
              }`}>
                
                {msg.transcript && (
                  <div className={`font-medium ${msg.state === 'listening' ? 'italic opacity-90' : ''}`}>
                    {msg.transcript}
                  </div>
                )}
                
                {msg.text && (
                  <div className={msg.audioUrl ? 'mb-0' : ''}>{msg.text}</div>
                )}

                {msg.type === 'received' && msg.vocab && msg.vocab.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {msg.vocab.map((v) => (
                      <span key={v.term} className="relative inline-flex">
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
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex justify-end text-xs font-medium text-black/25">
                  {msg.state === 'listening' && !msg.transcript && <div>Listening...</div>}
                  {msg.state === 'thinking' && <div>Thinking...</div>}
                  {msg.state === 'reading' && <div>Reading...</div>}
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Sticky buttons at bottom with gradient fade */}
        <div className="sticky bottom-0 left-0 right-0 flex flex-col items-center pt-8 pb-16 gap-4 z-20 relative">
          {/* Gradient fade overlay */}
          <div className="absolute inset-x-0 top-0 h-32 pointer-events-none bg-gradient-to-t from-white via-white/80 to-transparent" />
          
          <div className="relative z-10 flex flex-col items-center gap-4">
            <div className="flex flex-col items-center gap-4 w-full">
              <div className="flex gap-6 items-center">
                {/* English Button */}
                <div
                  onClick={() => handleTap('english')}
                  className={`w-[120px] h-[120px] rounded-full flex items-center justify-center text-white text-md font-medium text-center transition-all duration-500
                    ${
                      currentState !== 'idle'
                        ? 'bg-blue-500 cursor-not-allowed opacity-70'
                        : 'bg-blue-500 cursor-pointer opacity-100 hover:bg-blue-600 hover:scale-105 hover:shadow-xl active:scale-95 active:shadow-lg'
                    }
                    ${
                      currentState === 'listening' && listeningLanguage === 'english'
                        ? 'shadow-[0_0_28px_rgba(59,130,246,0.5)] animate-slow-pulse'
                        : 'shadow-lg'
                    }
                  `}
                >
                  {getButtonText('english')}
                </div>
                {/* Learning Language Button */}
                <div
                  onClick={() => handleTap('learning')}
                  className={`w-[120px] h-[120px] rounded-full flex items-center justify-center text-white text-md font-medium text-center transition-all duration-500
                    ${
                      currentState !== 'idle'
                        ? 'bg-green-500 cursor-not-allowed opacity-70'
                        : 'bg-green-500 cursor-pointer opacity-100 hover:bg-green-600 hover:scale-105 hover:shadow-xl active:scale-95 active:shadow-lg'
                    }
                    ${
                      currentState === 'listening' && listeningLanguage === 'learning'
                        ? 'shadow-[0_0_28px_rgba(34,197,94,0.5)] animate-slow-pulse'
                        : 'shadow-lg'
                    }
                  `}
                >
                  {getButtonText('learning')}
                </div>
              </div>
              <div className="text-xs text-neutral-400 text-center mt-2">
                Press to speak in the specified language
              </div>
            </div>

            {isListening && (
              <button
                onClick={handleStop}
                className="px-4 py-2 bg-red-600 text-white border-none rounded-md text-sm cursor-pointer"
              >
                Stop
              </button>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
