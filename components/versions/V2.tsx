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
import { 
  getAllTopics, 
  getTopicWithVocab,
  topics,
  type Topic, 
  type TopicWithVocab,
  type TopicStateUpdate,
  type TopicState,
  type UserPreferences,
  createDefaultTopicState
} from '@/lib/topics'
import {
  getUserProfile,
  resetUserProfile,
  type UserProfile,
} from '@/lib/user-profile'
import { SessionTimer } from '@/components/SessionTimer'
import { SessionSettings } from '@/components/SessionSettings'
import type { PersonalityMode } from '@/components/PersonalitySelector'
import { SPRING, SPRING_SOFT } from '@/lib/motion'
import { MessageList, type Message as ChatMessage } from '@/components/messages/MessageList'
import { TopicsModal } from '@/components/modals/TopicsModal'
import { OnboardingModal } from '@/components/modals/OnboardingModal'
import { OnboardingInline } from '@/components/OnboardingInline'
import { 
  useSpeech, 
  type LearningLanguage,
  type InputLanguage,
} from '@/lib/speech'

type Message = ChatMessage

export function V2() {
  const [messages, setMessages] = useState<Message[]>([])
  const [currentState, setCurrentState] = useState<'idle' | 'listening' | 'thinking' | 'reading'>('idle')
  const [learningLanguage, setLearningLanguage] = useState<LearningLanguage>('French')
  const [listeningLanguage, setListeningLanguage] = useState<InputLanguage>('english')
  
  // Topics state
  const [allTopics] = useState<Topic[]>(getAllTopics())
  const [activeTopicIds, setActiveTopicIds] = useState<Set<string>>(new Set())
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  
  // Session state
  const [sessionDurationMinutes, setSessionDurationMinutes] = useState(15)
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null)
  const [sessionElapsedMinutes, setSessionElapsedMinutes] = useState(0)
  const [sessionEnded, setSessionEnded] = useState(false)
  const [sessionStarted, setSessionStarted] = useState(false)
  const [topicsModalOpen, setTopicsModalOpen] = useState(false)
  const [onboardingModalOpen, setOnboardingModalOpen] = useState(false)
  const [showOnboardingInline, setShowOnboardingInline] = useState(false)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  
  // User preferences
  const [personalityMode, setPersonalityMode] = useState<PersonalityMode>('hype-coach')
  
  // Track topic states (full TopicState objects)
  const [topicStates, setTopicStates] = useState<Record<string, TopicState>>({})
  
  const isProcessingRef = useRef<boolean>(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const userHasScrolledRef = useRef<boolean>(false)
  const topicStatesRef = useRef<Record<string, TopicState>>({})
  const reduceMotion = useReducedMotion()

  // Load user profile on mount
  useEffect(() => {
    const profile = getUserProfile()
    setUserProfile(profile)
  }, [])

  // Get all active topics
  const activeTopics = allTopics.filter(t => activeTopicIds.has(t.id))
  
  // For AI: if more than 3 active, only pass lowest 3 difficulty
  const topicsForAI = activeTopics.length > 3
    ? activeTopics.sort((a, b) => a.difficulty - b.difficulty).slice(0, 3)
    : activeTopics
  
  // Get topics with vocab for API (only for AI - subset)
  const activeTopicsWithVocab = topicsForAI.map(t => getTopicWithVocab(t.id, learningLanguage)).filter(Boolean) as TopicWithVocab[]
  
  // Initialize topic states for active topics
  useEffect(() => {
    setTopicStates(prev => {
      const newStates = { ...prev }
      let changed = false
      
      activeTopics.forEach(topic => {
        const topicWithVocab = getTopicWithVocab(topic.id, learningLanguage)
        
        if (!newStates[topic.id]) {
          newStates[topic.id] = createDefaultTopicState(topic.id, topic, topicWithVocab)
          newStates[topic.id].isActive = true
          changed = true
        } else {
          const state = newStates[topic.id]
          const existing = state.progressMetrics
          
          // Merge objectives: keep existing complete status, add new ones from topic
          const objectives = topic.coreObjectives?.map(obj => {
            const objId = typeof obj === 'string' ? obj : obj.id
            const existingObj = existing.objectives?.find(o => o.id === objId)
            return existingObj || { id: objId, complete: false }
          }) || []
          
          // Merge vocab: keep existing complete status, add new ones from topic
          const vocab = topicWithVocab?.requiredVocab?.map(v => {
            const term = typeof v === 'string' ? v : v.term
            const existingVocab = existing.vocab?.find(v2 => v2.term === term)
            return existingVocab || { term, complete: false }
          }) || []
          
          if (!state.isActive || 
              JSON.stringify(state.progressMetrics.objectives) !== JSON.stringify(objectives) ||
              JSON.stringify(state.progressMetrics.vocab) !== JSON.stringify(vocab)) {
            newStates[topic.id] = {
              ...state,
              isActive: true,
              progressMetrics: {
                objectives,
                vocab,
                sessionsCompleted: existing.sessionsCompleted || 0
              }
            }
            changed = true
          }
        }
      })
      
      Object.keys(newStates).forEach(topicId => {
        if (!activeTopicIds.has(topicId) && newStates[topicId].isActive) {
          newStates[topicId] = { ...newStates[topicId], isActive: false }
          changed = true
        }
      })
      
      const finalStates = changed ? newStates : prev
      // Keep ref in sync with state
      topicStatesRef.current = finalStates
      return finalStates
    })
  }, [activeTopicIds, learningLanguage])
  
  // Update session elapsed time
  useEffect(() => {
    if (!sessionStartTime || sessionEnded) return
    
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - sessionStartTime.getTime()) / 60000)
      setSessionElapsedMinutes(elapsed)
    }, 1000)
    
    return () => clearInterval(interval)
  }, [sessionStartTime, sessionEnded])

  // Toggle topic active state
  const toggleTopic = (topicId: string) => {
    if (!sessionStarted && currentState !== 'idle') return
    if (sessionStarted && currentState !== 'idle') return
    setActiveTopicIds(prev => {
      const next = new Set(prev)
      if (next.has(topicId)) {
        next.delete(topicId)
      } else {
        next.add(topicId)
      }
      return next
    })
  }

  const difficultyLabels: Record<number, string> = {
    1: 'Beginner',
    2: 'Elementary', 
    3: 'Intermediate',
    4: 'Advanced',
    5: 'Expert'
  }

  // Speech hook callbacks for Gemini Live
  const handleUserSpeakStart = useCallback((messageId: string, inputLanguage: InputLanguage) => {
    setCurrentState('listening')
    setListeningLanguage(inputLanguage)
    isProcessingRef.current = false
    setMessages(prev => [...prev, { id: messageId, type: 'sent', state: 'listening', inputLanguage }])
  }, [])

  const handleUserTranscript = useCallback((transcript: string, _isFinal: boolean) => {
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
    _audioChunks: Blob[]
  ) => {
    // In Gemini Live mode, the conversation is handled directly by Gemini
    // We just update the message state
    setCurrentState('idle')
    setMessages(prev => prev.map(msg => 
      msg.id === messageId 
        ? { ...msg, state: undefined, transcript: transcript || msg.transcript } 
        : msg
    ))
  }, [])

  const handleAgentSpeakStart = useCallback((messageId: string) => {
    setCurrentState('reading')
    setMessages(prev => {
      // Find or create a received message for the agent response
      const existing = prev.find(msg => msg.id === messageId)
      if (existing) {
        return prev.map(msg => 
          msg.id === messageId ? { ...msg, state: 'reading' } : msg
        )
      }
      return [...prev, { id: messageId, type: 'received', state: 'reading', text: '' }]
    })
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

  // Initialize speech hook with Gemini Live
  const speech = useSpeech({
    learningLanguage,
    initialSttProvider: 'gemini-live',
    initialTtsProvider: 'gemini-live',
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

  const handleStartSession = () => {
    if (activeTopics.length === 0) return
    
    setSessionStarted(true)
    setSessionStartTime(new Date())
    setSessionElapsedMinutes(0)
    setSessionEnded(false)

    const messageId = Date.now().toString()
    setMessages(prev => [
      ...prev,
      {
        id: messageId,
        type: 'received',
        text: 'Starting Gemini Live (audio-to-audio)...',
        state: 'thinking',
      },
    ])
    setCurrentState('listening')
    speech.startListening('learning')
  }

  const handleEndSession = () => {
    setSessionEnded(true)
    setSessionStarted(false)
    setSessionStartTime(null)
    setMessages([])
    setCurrentState('idle')
    speech.stopListening(false)
  }
  
  const handleTimeUp = () => {
    setSessionEnded(true)
  }

  return (
    <main className="flex m-4 rounded-3xl bg-white" style={{ height: 'calc(100% - 2rem)' }}>
      {/* Topics Sidebar - Only show when session started */}
      {sessionStarted && (
        <motion.aside
          initial={reduceMotion ? false : { opacity: 0, x: -10 }}
          animate={reduceMotion ? undefined : { opacity: 1, x: 0 }}
          transition={SPRING_SOFT}
          className={`${isSidebarCollapsed ? 'w-16' : 'w-80'} h-[calc(100%-4rem)] border border-neutral-200 rounded-3xl shadow-xl m-8 flex flex-col overflow-hidden transition-all duration-300`}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-neutral-100">
            {!isSidebarCollapsed && (
              <h2 className="text-sm font-semibold text-neutral-800">Orali.ai V2</h2>
            )}
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="p-1.5 rounded-lg hover:bg-neutral-100 transition-colors text-neutral-500"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                {isSidebarCollapsed ? (
                  <path d="M9 18l6-6-6-6" />
                ) : (
                  <path d="M15 18l-6-6 6-6" />
                )}
              </svg>
            </button>
          </div>

          {!isSidebarCollapsed && (
            <div className="flex-1 flex flex-col">
              {/* Active Topics Content */}
              {activeTopics.length > 0 && (
                <div className="flex-1 overflow-y-auto p-4">
                  <div className="space-y-4">
                    {activeTopics.map((topic) => {
                      const state = topicStates[topic.id]
                      if (!state) return null
                      
                      const objectives = state.progressMetrics.objectives || []
                      const vocab = state.progressMetrics.vocab || []
                      
                      return (
                        <div key={topic.id} className="space-y-3">
                          <div className="flex items-center gap-2">
                            <span className="text-base">{topic.emoji}</span>
                            <h3 className="text-sm font-semibold text-neutral-800">{topic.title}</h3>
                          </div>
                          
                          {/* Objectives Checklist */}
                          {objectives.length > 0 && (
                            <div>
                              <div className="text-[10px] font-medium text-neutral-500 mb-2">Objectives</div>
                              <div className="space-y-1.5">
                                {objectives.map((obj, idx) => (
                                  <div key={idx} className="flex items-start gap-2">
                                    <div className={`mt-0.5 w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${
                                      obj.complete 
                                        ? 'bg-green-500 border-green-500' 
                                        : 'bg-white border-neutral-300'
                                    }`}>
                                      {obj.complete && (
                                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                          <path d="M20 6L9 17l-5-5" />
                                        </svg>
                                      )}
                                    </div>
                                    <span className={`text-[11px] leading-relaxed ${
                                      obj.complete ? 'text-neutral-600 line-through' : 'text-neutral-800'
                                    }`}>
                                      {obj.id}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Vocab Checklist */}
                          {vocab.length > 0 && (
                            <div>
                              <div className="text-[10px] font-medium text-neutral-500 mb-2">Vocabulary</div>
                              <div className="space-y-1.5">
                                {vocab.map((v, idx) => (
                                  <div key={idx} className="flex items-center gap-2">
                                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${
                                      v.complete 
                                        ? 'bg-green-500 border-green-500' 
                                        : 'bg-white border-neutral-300'
                                    }`}>
                                      {v.complete && (
                                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                          <path d="M20 6L9 17l-5-5" />
                                        </svg>
                                      )}
                                    </div>
                                    <span className={`text-[11px] ${
                                      v.complete ? 'text-neutral-600 line-through' : 'text-neutral-800'
                                    }`}>
                                      {v.term}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Bottom Section - Timer and End Session */}
              <div className="mt-auto border-t border-neutral-100">
                {/* Session Timer */}
                {sessionStartTime && !sessionEnded && (
                  <div className="p-4 bg-neutral-50">
                    <SessionTimer
                      durationMinutes={sessionDurationMinutes}
                      onTimeUp={handleTimeUp}
                      isActive={!sessionEnded}
                    />
                  </div>
                )}

                {/* End Session Button */}
                <div className="p-4">
                  <button
                    onClick={handleEndSession}
                    className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold bg-red-500 text-white hover:bg-red-600 transition-colors"
                  >
                    End Session
                  </button>
                </div>
              </div>
            </div>
          )}
        </motion.aside>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col relative overflow-hidden">
        {!sessionStarted ? (
          /* Onboarding / Session Init */
          <div className="flex-1 flex items-center justify-center p-8">
            <AnimatePresence mode="wait">


              {showOnboardingInline ? (
                <OnboardingInline
                  key="onboarding"
                  onComplete={(profile) => {
                    setUserProfile(profile)
                    setShowOnboardingInline(false)
                  }}
                  learningLanguage={learningLanguage}
                  reduceMotion={!!reduceMotion}
                  existingProfile={userProfile}
                />
              ) : (
                <motion.div
                  key="setup-form"
                  initial={reduceMotion ? false : { opacity: 0, y: 20 }}
                  animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
                  exit={reduceMotion ? undefined : { opacity: 0 }}
                  transition={SPRING_SOFT}
                  className="w-full max-w-md mx-auto space-y-5"
                >

              {/* Gemini Live Info */}
              <div className="">
                <div className="text-xl font-semibold text-neutral-800">Google Gemini Live API</div>
                <div className="text-sm text-neutral-400 py-2">
                  Real-time audio-to-audio conversation powered by Gemini Live. Not yet complete.
                </div>
              </div>

              {/* Language Selection */}
              <div>
                <label className="text-xs font-medium text-neutral-500 mb-2 block">Language</label>
                <Select
                  value={learningLanguage}
                  onValueChange={(value) => {
                    setLearningLanguage(value as LearningLanguage)
                    setMessages([])
                  }}
                >
                  <SelectTrigger className="w-full h-9 text-sm">
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


              {/* Meet GIAN - Onboarding */}
              {!userProfile?.onboardingComplete && (
                <div className="p-4 rounded-2xl bg-blue-50 border border-blue-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-neutral-800">tell me your lore.</div>
                    <div className="text-xs text-neutral-500">a cracked tutor knows their student</div>
                  </div>
                  <button
                    onClick={() => setShowOnboardingInline(true)}
                    className="px-4 py-2 rounded-xl bg-blue-500 text-white text-xs font-semibold hover:bg-blue-600 transition-colors shrink-0"
                  >
                    let's go
                  </button>
                </div>
                </div>
              )}
              
              {userProfile?.onboardingComplete && userProfile.name && (
                <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">👋</span>
                      <span className="text-sm text-neutral-600">hey {userProfile.name.toLowerCase()}!</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setOnboardingModalOpen(true)}
                        className="text-xs text-neutral-400 hover:text-neutral-600 transition-colors"
                      >
                        update
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('reset your profile? you\'ll need to do onboarding again.')) {
                            resetUserProfile()
                            setUserProfile(null)
                          }
                        }}
                        className="text-xs text-red-400 hover:text-red-600 transition-colors"
                      >
                        reset
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Session Settings */}
              <SessionSettings
                durationMinutes={sessionDurationMinutes}
                onDurationChange={setSessionDurationMinutes}
                personalityMode={personalityMode}
                onPersonalityChange={setPersonalityMode}
              />

              {/* Topic Selection */}
              <div>
                <label className="text-xs font-medium text-neutral-500 mb-2 block">Select Topics</label>
                <div className="flex flex-wrap gap-2 items-center">
                  {allTopics.slice(0, 4).map((topic) => {
                    const isActive = activeTopicIds.has(topic.id)
                    return (
                      <button
                        key={topic.id}
                        onClick={() => toggleTopic(topic.id)}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-left transition-all ${
                          isActive
                            ? 'bg-blue-100 text-blue-800 border-2 border-blue-500'
                            : 'bg-neutral-50 hover:bg-neutral-100 text-neutral-600 border border-neutral-200'
                        }`}
                      >
                        <span className="text-sm shrink-0">{topic.emoji}</span>
                        <span className="text-xs font-medium whitespace-nowrap">{topic.title}</span>
                        {isActive && (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="shrink-0">
                            <path d="M20 6L9 17l-5-5" />
                          </svg>
                        )}
                      </button>
                    )
                  })}
                  {allTopics.length > 4 && (
                    <button
                      onClick={() => setTopicsModalOpen(true)}
                      className="flex items-center justify-center h-9 px-3 rounded-xl bg-neutral-50 hover:bg-neutral-100 text-neutral-600 border border-neutral-200 transition-all text-xs font-medium"
                      title="View all topics"
                    >
                      More...
                    </button>
                  )}
                </div>
                {activeTopics.length > 0 && (
                  <div className="mt-2 text-xs text-neutral-500">
                    {activeTopics.length} topic{activeTopics.length !== 1 ? 's' : ''} selected
                  </div>
                )}
              </div>

              {/* Start Button */}
              <motion.button
                onClick={handleStartSession}
                disabled={activeTopics.length === 0}
                whileHover={reduceMotion || activeTopics.length === 0 ? undefined : { scale: 1.02 }}
                whileTap={reduceMotion || activeTopics.length === 0 ? undefined : { scale: 0.98 }}
                transition={SPRING}
                className={`w-full rounded-xl px-6 py-3 text-sm font-semibold text-white transition-colors ${
                  activeTopics.length === 0
                    ? 'bg-neutral-400 cursor-not-allowed'
                    : 'bg-purple-600 hover:bg-purple-700 active:bg-purple-800'
                }`}
              >
                Start Gemini Live Session
              </motion.button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Topics Modal */}
            <TopicsModal
              open={topicsModalOpen}
              onClose={() => setTopicsModalOpen(false)}
              topics={allTopics}
              activeTopicIds={activeTopicIds}
              onToggleTopic={toggleTopic}
              difficultyLabels={difficultyLabels}
              reduceMotion={!!reduceMotion}
            />

            {/* Onboarding Modal (for update button) */}
            <OnboardingModal
              open={onboardingModalOpen}
              onClose={() => setOnboardingModalOpen(false)}
              onComplete={(profile) => {
                setUserProfile(profile)
                setOnboardingModalOpen(false)
              }}
              learningLanguage={learningLanguage}
              reduceMotion={!!reduceMotion}
              existingProfile={userProfile}
            />
          </div>
        ) : (
          <>
            <MessageList
              activeTopics={activeTopics}
              currentState={currentState}
              reduceMotion={!!reduceMotion}
              messages={messages}
              onStartTopic={() => {}}
              messagesEndRef={messagesEndRef}
              messagesContainerRef={messagesContainerRef}
            />

            {/* Input Bar - Gemini Live Mode */}
            <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center pt-8 pb-8 gap-4 z-0">
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
              <div className="relative z-10 w-full max-w-2xl px-4">
                <div className="flex items-center justify-center gap-4 bg-white border border-neutral-200 rounded-2xl px-6 py-4 shadow-lg">
                  <motion.button
                    type="button"
                    title={speech.isListening ? 'Stop listening' : 'Start conversation'}
                    onClick={() => {
                      if (speech.isListening) {
                        speech.stopListening(false)
                      } else if (currentState === 'idle') {
                        speech.startListening('learning')
                      }
                    }}
                    disabled={currentState !== 'idle' && !speech.isListening}
                    className={`p-4 rounded-xl transition-all ${
                      speech.isListening
                        ? 'bg-purple-600 text-white shadow-[0_0_12px_rgba(147,51,234,0.5)] animate-pulse'
                        : currentState !== 'idle'
                          ? 'bg-purple-100 text-purple-300 cursor-not-allowed'
                          : 'bg-purple-600 text-white hover:bg-purple-700'
                    }`}
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                      <line x1="12" x2="12" y1="19" y2="22" />
                    </svg>
                  </motion.button>
                  <div className="text-sm text-neutral-600">
                    {speech.isListening ? 'Listening...' : currentState === 'reading' ? 'Speaking...' : 'Ready to talk'}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  )
}

