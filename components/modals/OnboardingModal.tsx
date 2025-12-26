'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { SPRING_SOFT } from '@/lib/motion'
import {
  UserProfile,
  UserProfileUpdate,
  updateUserProfile,
  completeOnboarding,
  getUserProfile,
} from '@/lib/user-profile'
import type { LearningLanguage } from '@/lib/speech'

interface OnboardingMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
}

interface OnboardingModalProps {
  open: boolean
  onClose: () => void
  onComplete: (profile: UserProfile) => void
  learningLanguage: LearningLanguage
  reduceMotion: boolean
  existingProfile?: UserProfile | null
}

export function OnboardingModal({
  open,
  onClose,
  onComplete,
  learningLanguage,
  reduceMotion,
  existingProfile,
}: OnboardingModalProps) {
  const [messages, setMessages] = useState<OnboardingMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [hasStarted, setHasStarted] = useState(false)
  const [isFinishing, setIsFinishing] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Scroll to bottom on new messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  // Focus input when modal opens
  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus()
    }
  }, [open, hasStarted])

  // Start the conversation when modal opens
  const startConversation = useCallback(async () => {
    if (hasStarted || isLoading) return
    
    setHasStarted(true)
    setIsLoading(true)

    // Check if this is an update session (existing profile data)
    const currentProfile = existingProfile || getUserProfile()
    const isUpdate = currentProfile?.onboardingComplete === true

    try {
      const response = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          learningLanguage,
          conversationHistory: [],
          message: '__START__',
          existingProfile: isUpdate ? currentProfile : undefined,
          isUpdate,
        }),
      })

      if (!response.ok) throw new Error('Failed to start onboarding')

      const data = await response.json()
      
      setMessages([{
        id: Date.now().toString(),
        role: 'assistant',
        content: data.response,
      }])

      // Update profile if we got any updates
      if (data.userProfileUpdate) {
        updateUserProfile(data.userProfileUpdate)
      }
    } catch (error) {
      console.error('Error starting onboarding:', error)
      const greeting = isUpdate 
        ? "hey again! anything new you wanna tell me about yourself?"
        : "yo! i'm gian, your language homie. what's your name?"
      setMessages([{
        id: Date.now().toString(),
        role: 'assistant',
        content: greeting,
      }])
    } finally {
      setIsLoading(false)
    }
  }, [hasStarted, isLoading, learningLanguage, existingProfile])

  // Start conversation when modal opens
  useEffect(() => {
    if (open && !hasStarted) {
      startConversation()
    }
  }, [open, hasStarted, startConversation])

  // Reset when modal closes
  useEffect(() => {
    if (!open) {
      setMessages([])
      setInputValue('')
      setHasStarted(false)
      setIsLoading(false)
      setIsFinishing(false)
    }
  }, [open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputValue.trim() || isLoading) return

    const userMessage = inputValue.trim()
    setInputValue('')
    
    // Add user message
    const userMsgId = Date.now().toString()
    setMessages(prev => [...prev, {
      id: userMsgId,
      role: 'user',
      content: userMessage,
    }])

    setIsLoading(true)

    try {
      const currentProfile = existingProfile || getUserProfile()
      const isUpdate = currentProfile?.onboardingComplete === true

      const response = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          learningLanguage,
          conversationHistory: messages,
          message: userMessage,
          existingProfile: isUpdate ? currentProfile : undefined,
          isUpdate,
        }),
      })

      if (!response.ok) throw new Error('Failed to get response')

      const data = await response.json()

      // Add assistant response
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response,
      }])

      // Note: userProfileUpdate is only provided on FINISH, not during regular conversation
      // Check if onboarding is complete (AI decided it's done)
      if (data.onboardingComplete) {
        const finalProfile = completeOnboarding()
        setTimeout(() => {
          onComplete(finalProfile)
        }, 1500)
      }
    } catch (error) {
      console.error('Error in onboarding:', error)
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "whoops, something went wrong. let's try again—what were you saying?",
      }])
    } finally {
      setIsLoading(false)
    }
  }

  const handleFinish = async () => {
    if (isLoading || isFinishing) return
    
    setIsFinishing(true)
    setIsLoading(true)

    // Check if this is an update session
    const currentProfile = existingProfile || getUserProfile()
    const isUpdate = currentProfile?.onboardingComplete === true

    try {
      // Request a summary of the conversation
      const response = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          learningLanguage,
          conversationHistory: messages,
          message: '__FINISH__',
          existingProfile: isUpdate ? currentProfile : undefined,
          isUpdate,
        }),
      })

      if (!response.ok) throw new Error('Failed to generate summary')

      const data = await response.json()

      // Add final summary message
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response,
      }])

      // Update profile with final summary
      if (data.userProfileUpdate) {
        updateUserProfile(data.userProfileUpdate)
      }

      // Complete onboarding
      const finalProfile = completeOnboarding()
      
      // Small delay to show the summary
      setTimeout(() => {
        onComplete(finalProfile)
      }, 5000)
    } catch (error) {
      console.error('Error finishing onboarding:', error)
      // Still complete even if summary fails
      const finalProfile = completeOnboarding()
      onComplete(finalProfile)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="onboarding-modal-overlay"
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={reduceMotion ? undefined : { opacity: 1 }}
          exit={reduceMotion ? undefined : { opacity: 0 }}
          transition={SPRING_SOFT}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Getting to know you"
        >
          <motion.div
            key="onboarding-modal"
            initial={reduceMotion ? false : { opacity: 0, y: 20, scale: 0.98 }}
            animate={reduceMotion ? undefined : { opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: 20, scale: 0.98 }}
            transition={SPRING_SOFT}
            className="w-full max-w-md h-[600px] max-h-[85vh] rounded-3xl bg-gradient-to-b from-neutral-900 to-neutral-800 shadow-2xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-5 py-4 border-b border-neutral-700/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-sm">
                  
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">getting to know you. ok</div>
                </div>
              </div>
              <button
                type="button"
                onClick={handleFinish}
                disabled={isLoading || isFinishing || messages.length < 2}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  isLoading || isFinishing || messages.length < 2
                    ? 'bg-neutral-700 text-neutral-500 cursor-not-allowed'
                    : 'bg-green-500 text-white hover:bg-green-600'
                }`}
              >
                {isFinishing ? 'finishing...' : "let's wrap up"}
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <AnimatePresence mode="popLayout">
                {messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                    animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
                    exit={reduceMotion ? undefined : { opacity: 0 }}
                    transition={SPRING_SOFT}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm ${
                        msg.role === 'user'
                          ? 'bg-blue-500 text-white rounded-br-md'
                          : 'bg-neutral-700/70 text-neutral-100 rounded-bl-md'
                      }`}
                    >
                      {msg.content}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              
              {/* Loading indicator */}
              {isLoading && (
                <motion.div
                  initial={reduceMotion ? false : { opacity: 0 }}
                  animate={reduceMotion ? undefined : { opacity: 1 }}
                  className="flex justify-start"
                >
                  <div className="bg-neutral-700/70 rounded-2xl rounded-bl-md px-4 py-3">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </motion.div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSubmit} className="p-4 border-t border-neutral-700/50">
              <div className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder={isFinishing ? "wrapping up..." : "type here..."}
                  disabled={isLoading || isFinishing}
                  className="flex-1 bg-neutral-700/50 border border-neutral-600/50 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-neutral-500 outline-none focus:border-blue-500/50 transition-colors disabled:opacity-50"
                />
                <motion.button
                  type="submit"
                  disabled={!inputValue.trim() || isLoading || isFinishing}
                  whileHover={reduceMotion || !inputValue.trim() ? undefined : { scale: 1.05 }}
                  whileTap={reduceMotion || !inputValue.trim() ? undefined : { scale: 0.95 }}
                  className={`p-2.5 rounded-xl transition-colors ${
                    inputValue.trim() && !isLoading && !isFinishing
                      ? 'bg-blue-500 text-white hover:bg-blue-600'
                      : 'bg-neutral-700 text-neutral-500 cursor-not-allowed'
                  }`}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 2L11 13" />
                    <path d="M22 2L15 22L11 13L2 9L22 2Z" />
                  </svg>
                </motion.button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
