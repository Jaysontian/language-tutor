'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
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
import { SPRING, SPRING_SOFT } from '@/lib/motion'
import { LessonsModal } from '@/components/modals/LessonsModal'
import { ConversationModal } from '@/components/modals/ConversationModal'
import { MessageList, type Message as ChatMessage } from '@/components/messages/MessageList'
import { 
  useSpeech, 
  type LearningLanguage,
  type SttProvider,
  type TtsProvider,
  type InputLanguage,
  type SpeechChunk,
  STT_PROVIDERS,
  TTS_PROVIDERS,
} from '@/lib/speech'

type Message = ChatMessage
type AppMode = 'conversation' | 'learning'

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([])
  const [currentState, setCurrentState] = useState<'idle' | 'listening' | 'thinking' | 'reading'>('idle')
  const [appMode, setAppMode] = useState<AppMode>('conversation')
  const [learningLanguage, setLearningLanguage] = useState<LearningLanguage>('French')
  const [listeningLanguage, setListeningLanguage] = useState<InputLanguage>('english')
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null)
  const [isLessonModalOpen, setIsLessonModalOpen] = useState(false)
  const [lessons] = useState<LessonConfig[]>(getAllLessons())
  const [selectedConversationPresetId, setSelectedConversationPresetId] = useState<ConversationPresetId>('free-chat')
  const [isConversationModalOpen, setIsConversationModalOpen] = useState(false)
  
  const isProcessingRef = useRef<boolean>(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const userHasScrolledRef = useRef<boolean>(false)
  const audioChunksRef = useRef<Blob[]>([])
  const reduceMotion = useReducedMotion()
  const [textInput, setTextInput] = useState('')
  const textInputRef = useRef<HTMLInputElement>(null)

  const selectedLesson = lessons.find(l => l.id === selectedLessonId)
  const selectedConversationPreset = conversationPresets.find((p) => p.id === selectedConversationPresetId)

  // Process user speech and get AI response
  const processUserSpeech = useCallback(async (
    transcript: string, 
    messageId: string, 
    inputLanguage: InputLanguage,
    audioChunks: Blob[]
  ) => {
    console.log('processUserSpeech called:', { transcript, messageId, inputLanguage })
    
    if (isProcessingRef.current) {
      console.log('processUserSpeech skipped - already processing')
      return
    }
    isProcessingRef.current = true

    // Update message with final transcript
    setMessages(prev => prev.map(msg => 
      msg.id === messageId 
        ? { ...msg, transcript, state: undefined, inputLanguage }
        : msg
    ))

    // Create audio URL from chunks if available
    if (audioChunks.length > 0) {
      setTimeout(() => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' })
        const recordedAudioUrl = URL.createObjectURL(audioBlob)
        setMessages(prev => prev.map(msg => 
          msg.id === messageId 
            ? { ...msg, audioUrl: recordedAudioUrl }
            : msg
        ))
      }, 200)
    }

    // Process with API
    setCurrentState('thinking')
    const thinkingMessageId = (Date.now() + 1).toString()
    setMessages(prev => [...prev, { id: thinkingMessageId, type: 'received', state: 'thinking' }])

    try {
      const conversationHistory = messages
        .filter(msg => (msg.type === 'sent' && msg.transcript) || (msg.type === 'received' && msg.text))
        .slice(-6)

      const payload = { 
        message: transcript, 
        learningLanguage, 
        conversationHistory, 
        inputLanguage,
        lessonId: appMode === 'learning' ? selectedLessonId : undefined,
        conversationPresetId: appMode === 'conversation' ? selectedConversationPresetId : undefined,
      }

      const MAX_ATTEMPTS = 2
      let responseItems: any[] = []
      let vocab: Array<{ term: string; translation: string; pronunciation: string }> = []

      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        const res = await fetch('/api/openai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })

        let data: any = null
        try {
          data = await res.json()
        } catch {
          data = null
        }

        if (!res.ok) {
          if (data?.retryable && attempt < MAX_ATTEMPTS) continue
          throw new Error(data?.error || 'Failed to get response')
        }

        responseItems = (data?.response || data?.chunks || []) as any[]
        vocab = Array.isArray(data?.vocab) ? data.vocab : []

        responseItems = responseItems
          .map((c: any) => ({ ...c, text: typeof c?.text === 'string' ? c.text.trim() : '' }))
          .filter((c: any) => typeof c.text === 'string' && c.text.length > 0)
        
        if (responseItems.length > 0) break
        if (attempt < MAX_ATTEMPTS) continue
      }

      if (responseItems.length === 0) {
        setCurrentState('idle')
        setMessages(prev => prev.filter(msg => msg.id !== thinkingMessageId))
        isProcessingRef.current = false
        return
      }

      // Create messages for response chunks
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

      // Create speech chunks and speak
      const speechChunks: SpeechChunk[] = responseItems.map((chunk: any, index: number) => ({
        text: chunk.text,
        language: chunk.language,
        messageId: messageIds[index],
      }))

      setCurrentState('reading')
      await speech.speak(speechChunks)
      setCurrentState('idle')
      isProcessingRef.current = false
    } catch (error: any) {
      console.error('Error processing:', error)
      setCurrentState('idle')
      setMessages(prev => prev.filter(msg => msg.id !== thinkingMessageId))
      isProcessingRef.current = false
    }
  }, [messages, learningLanguage, appMode, selectedLessonId, selectedConversationPresetId])

  // Speech hook callbacks
  const handleUserSpeakStart = useCallback((messageId: string, inputLanguage: InputLanguage) => {
    setCurrentState('listening')
    setListeningLanguage(inputLanguage)
    isProcessingRef.current = false
    setMessages(prev => [...prev, { id: messageId, type: 'sent', state: 'listening', inputLanguage }])
  }, [])

  const handleUserTranscript = useCallback((transcript: string, _isFinal: boolean) => {
    // Update message with current transcript for real-time display
    setMessages(prev => {
      const lastSent = [...prev].reverse().find(msg => msg.type === 'sent' && msg.state === 'listening')
      if (!lastSent) return prev
      return prev.map(msg => 
        msg.id === lastSent.id ? { ...msg, transcript } : msg
      )
    })
  }, [])

  const handleUserSpeakComplete = useCallback((
    transcript: string,
    messageId: string,
    inputLanguage: InputLanguage,
    audioChunks: Blob[]
  ) => {
    audioChunksRef.current = audioChunks
    if (transcript.trim()) {
      processUserSpeech(transcript, messageId, inputLanguage, audioChunks)
    } else {
      // No transcript, clean up
      setMessages(prev => prev.filter(msg => msg.id !== messageId))
      setCurrentState('idle')
    }
  }, [processUserSpeech])

  const handleAgentSpeakStart = useCallback((messageId: string) => {
    setMessages(prev => prev.map(msg => 
      msg.id === messageId ? { ...msg, state: 'reading' } : msg
    ))
  }, [])

  const handleAgentSpeakEnd = useCallback((messageId: string) => {
    setMessages(prev => prev.map(msg => 
      msg.id === messageId ? { ...msg, state: undefined } : msg
    ))
  }, [])

  const handleAgentSpeakComplete = useCallback(() => {
    setCurrentState('idle')
    isProcessingRef.current = false
  }, [])

  const handleSpeechError = useCallback((error: Error, context?: string) => {
    console.error('Speech error:', context, error)
    setCurrentState('idle')
  }, [])

  // Initialize speech hook
  const speech = useSpeech({
    learningLanguage,
    initialSttProvider: 'manual',
    initialTtsProvider: 'browser',
    initialAutoTurnDetection: true,
    onUserSpeakStart: handleUserSpeakStart,
    onUserTranscript: handleUserTranscript,
    onUserSpeakComplete: handleUserSpeakComplete,
    onAgentSpeakStart: handleAgentSpeakStart,
    onAgentSpeakEnd: handleAgentSpeakEnd,
    onAgentSpeakComplete: handleAgentSpeakComplete,
    onError: handleSpeechError,
  })

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (!userHasScrolledRef.current && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  // Track user scroll
  useEffect(() => {
    const container = messagesContainerRef.current
    if (!container) return

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100
      userHasScrolledRef.current = !isNearBottom
      if (isNearBottom) userHasScrolledRef.current = false
    }

    container.addEventListener('scroll', handleScroll)
    return () => container.removeEventListener('scroll', handleScroll)
  }, [])

  // Escape key handlers for modals
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

  // Handler functions
  const handleTap = (language: InputLanguage) => {
    if (speech.sttProvider !== 'manual') return
    if (speech.isListening || currentState !== 'idle') return
    speech.startListening(language)
  }

  const handleStop = () => {
    if (speech.sttProvider !== 'manual') return
    speech.stopListening(true)
  }

  const toggleDeepgramRecording = () => {
    if (speech.sttProvider === 'manual') return
    if (speech.isListening) {
      speech.stopListening(true)
    } else if (currentState === 'idle') {
      speech.startListening('learning')
    }
  }

  const handleSelectLessonFromModal = (lessonId: string | null) => {
    if (currentState !== 'idle') return
    setSelectedLessonId(lessonId)
    setMessages([])
    setIsLessonModalOpen(false)
  }

  const handleSelectConversationPresetFromModal = (presetId: ConversationPresetId) => {
    if (currentState !== 'idle') return
    setSelectedConversationPresetId(presetId)
    setMessages([])
    setIsConversationModalOpen(false)
  }

  const handleStartLesson = () => {
    if (currentState !== 'idle') return
    if (appMode !== 'learning') return
    if (!selectedLesson) return

    audioChunksRef.current = []
    const text = "Let's begin the lesson!"
    const messageId = Date.now().toString()

    setMessages(prev => [
      ...prev,
      { id: messageId, type: 'sent', transcript: text, inputLanguage: 'english' }
    ])

    processUserSpeech(text, messageId, 'english', [])
  }

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!textInput.trim() || currentState !== 'idle') return
    
    const messageId = Date.now().toString()
    const text = textInput.trim()
    setTextInput('')
    
    // Add the message immediately
    setMessages(prev => [...prev, { 
      id: messageId, 
      type: 'sent', 
      transcript: text, 
      inputLanguage: 'english' 
    }])
    
    // Process the message
    processUserSpeech(text, messageId, 'english', [])
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
              setMessages([])
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

        {/* STT Provider Selection */}
        <div>
          <label className="text-sm font-medium text-neutral-400 mb-2 block">Speech to text</label>
          <Select
            value={speech.sttProvider}
            onValueChange={(value) => {
              if (currentState !== 'idle') return
              speech.setSttProvider(value as SttProvider)
            }}
            disabled={currentState !== 'idle'}
          >
            <SelectTrigger className="w-full text-left">
              <SelectValue placeholder="Select STT" />
            </SelectTrigger>
            <SelectContent className='max-w-xs'>
              <SelectItem value="manual">
                <div>
                  <div className="font-medium">{STT_PROVIDERS.manual.name}</div>
                  <div className="text-xs text-neutral-400">{STT_PROVIDERS.manual.description}</div>
                </div>
              </SelectItem>
              <SelectItem value="deepgram-nova">
                <div>
                  <div className="font-medium">{STT_PROVIDERS['deepgram-nova'].name}</div>
                  <div className="text-xs text-neutral-400">{STT_PROVIDERS['deepgram-nova'].description}</div>
                </div>
              </SelectItem>
              <SelectItem value="gemini-live">
                <div>
                  <div className="font-medium">{STT_PROVIDERS['gemini-live'].name}</div>
                  <div className="text-xs text-neutral-400">{STT_PROVIDERS['gemini-live'].description}</div>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* TTS Provider Selection */}
        <div>
          <label className="text-sm font-medium text-neutral-400 mb-2 block">Speech</label>
          <Select
            value={speech.ttsProvider}
            onValueChange={(value) => {
              speech.setTtsProvider(value as TtsProvider)
            }}
            disabled={currentState !== 'idle'}
          >
            <SelectTrigger className="w-full text-left">
              <SelectValue placeholder="Select Provider" />
            </SelectTrigger>
            <SelectContent className='max-w-xs'>
              <SelectItem value="browser">
                <div>
                  <div className="font-medium">{TTS_PROVIDERS.browser.name}</div>
                  <div className="text-xs text-neutral-400">{TTS_PROVIDERS.browser.description}</div>
                </div>
              </SelectItem>
              <SelectItem value="openai">
                <div>
                  <div className="font-medium">{TTS_PROVIDERS.openai.name}</div>
                  <div className="text-xs text-neutral-400">{TTS_PROVIDERS.openai.description}</div>
                </div>
              </SelectItem>
              <SelectItem value="elevenlabs" disabled>
                <div>
                  <div className="font-medium flex items-center gap-2">
                    {TTS_PROVIDERS.elevenlabs.name}
                    <span className="bg-orange-100 text-orange-700 text-[10px] px-2 py-0.5 rounded-full font-semibold ml-2">Coming Soon</span>
                  </div>
                  <div className="text-xs text-neutral-400">{TTS_PROVIDERS.elevenlabs.description}</div>
                </div>
              </SelectItem>
              <SelectItem value="gemini-live">
                <div>
                  <div className="font-medium">{TTS_PROVIDERS['gemini-live'].name}</div>
                  <div className="text-xs text-neutral-400">{TTS_PROVIDERS['gemini-live'].description}</div>
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
        <MessageList
          appMode={appMode}
          selectedLesson={selectedLesson || undefined}
          currentState={currentState}
          reduceMotion={!!reduceMotion}
          messages={messages}
          onStartLesson={handleStartLesson}
          messagesEndRef={messagesEndRef}
          messagesContainerRef={messagesContainerRef}
        />

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
          {/* Horizontal Toolbar */}
          <form onSubmit={handleTextSubmit} className="relative z-10 w-full max-w-2xl px-4">
            <div className="flex items-center gap-2 bg-white border border-neutral-200 rounded-2xl px-3 py-2 shadow-lg">
              {/* Mic Buttons */}
              {speech.sttProvider === 'manual' ? (
                <>
                  {/* English Mic */}
                  <motion.button
                    type="button"
                    title="Speak in English"
                    onClick={() => currentState === 'listening' && listeningLanguage === 'english' ? handleStop() : handleTap('english')}
                    disabled={currentState !== 'idle' && !(currentState === 'listening' && listeningLanguage === 'english')}
                    className={`p-2.5 rounded-xl transition-all ${
                      currentState === 'listening' && listeningLanguage === 'english'
                        ? 'bg-blue-500 text-white shadow-[0_0_12px_rgba(59,130,246,0.5)] animate-pulse'
                        : currentState !== 'idle'
                          ? 'bg-blue-100 text-blue-300 cursor-not-allowed'
                          : 'bg-blue-500 text-white'
                    }`}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                      <line x1="12" x2="12" y1="19" y2="22" />
                    </svg>
                  </motion.button>
                  {/* Learning Language Mic */}
                  <motion.button
                    type="button"
                    title={`Speak in ${learningLanguage}`}
                    onClick={() => currentState === 'listening' && listeningLanguage === 'learning' ? handleStop() : handleTap('learning')}
                    disabled={currentState !== 'idle' && !(currentState === 'listening' && listeningLanguage === 'learning')}
                    className={`p-2.5 rounded-xl transition-all ${
                      currentState === 'listening' && listeningLanguage === 'learning'
                        ? 'bg-green-500 text-white shadow-[0_0_12px_rgba(34,197,94,0.5)] animate-pulse'
                        : currentState !== 'idle'
                          ? 'bg-green-100 text-green-300 cursor-not-allowed'
                          : 'bg-green-500 text-white'
                    }`}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                      <line x1="12" x2="12" y1="19" y2="22" />
                    </svg>
                  </motion.button>
                </>
              ) : (
                /* Single Mic for Deepgram/Gemini */
                <motion.button
                  type="button"
                  title={speech.isListening ? 'Stop listening' : 'Speak (multilingual)'}
                  onClick={toggleDeepgramRecording}
                  disabled={currentState !== 'idle' && !speech.isListening}
                  className={`p-2.5 rounded-xl transition-all ${
                    speech.isListening
                      ? 'bg-purple-600 text-white shadow-[0_0_12px_rgba(147,51,234,0.5)] animate-pulse'
                      : currentState !== 'idle'
                        ? 'bg-purple-100 text-purple-300 cursor-not-allowed'
                        : 'bg-purple-600 text-white'
                  }`}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                    <line x1="12" x2="12" y1="19" y2="22" />
                  </svg>
                </motion.button>
              )}

              {/* Divider */}
              <div className="w-px h-6 bg-neutral-200" />

              {/* Text Input */}
              <input
                ref={textInputRef}
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Type a message..."
                disabled={currentState !== 'idle'}
                className="flex-1 bg-transparent outline-none text-sm text-neutral-800 placeholder:text-neutral-400 disabled:opacity-50 min-w-0"
              />

              {/* Send Button */}
              <motion.button
                type="submit"
                title="Send message"
                disabled={!textInput.trim() || currentState !== 'idle'}
                whileHover={reduceMotion || !textInput.trim() || currentState !== 'idle' ? undefined : { scale: 1.1 }}
                whileTap={reduceMotion || !textInput.trim() || currentState !== 'idle' ? undefined : { scale: 0.95 }}
                className={`p-2.5 rounded-xl transition-colors ${
                  textInput.trim() && currentState === 'idle'
                    ? 'bg-neutral-900 text-white hover:bg-neutral-800'
                    : 'bg-neutral-100 text-neutral-400 cursor-not-allowed'
                }`}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 2L11 13" />
                  <path d="M22 2L15 22L11 13L2 9L22 2Z" />
                </svg>
              </motion.button>
            </div>
          </form>
        </div>
      </div>
    </main>
  )
}
