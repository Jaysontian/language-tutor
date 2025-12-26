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
import { ChevronsUp, ChevronUp } from 'lucide-react'

interface OnboardingMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
}

interface OnboardingInlineProps {
  onComplete: (profile: UserProfile) => void
  learningLanguage: LearningLanguage
  reduceMotion: boolean
  existingProfile?: UserProfile | null
}

export function OnboardingInline({
  onComplete,
  learningLanguage,
  reduceMotion,
  existingProfile,
}: OnboardingInlineProps) {
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
      messagesEndRef.current.scrollIntoView({
        behavior: reduceMotion ? 'auto' : 'smooth',
        block: 'end',
      })
    }
  }, [messages, reduceMotion])

  // Focus input when component mounts
  useEffect(() => {
    if (inputRef.current && hasStarted) {
      inputRef.current.focus()
    }
  }, [hasStarted])

  // Start the conversation when component mounts
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

  // Start conversation on mount
  useEffect(() => {
    if (!hasStarted) {
      startConversation()
    }
  }, [hasStarted, startConversation])

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
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, x: 20 }}
      animate={reduceMotion ? undefined : { opacity: 1, x: 0 }}
      transition={SPRING_SOFT}
      className="w-full max-w-md mx-auto flex items-center justify-center"
    >
      <div className="w-full max-w-md flex flex-col max-h-[600px]">
        {/* Header */}
        <div className="px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-sm">
              {/* blue thingy */}
            </div>
            <div>
              <div className="text-sm font-semibold text-neutral-800">getting to know you</div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleFinish}
            disabled={isLoading || isFinishing || messages.length < 2}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              isLoading || isFinishing || messages.length < 2
                ? 'bg-neutral-100 text-neutral-400 cursor-not-allowed'
                : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
          >
            {isFinishing ? 'finishing...' : "let's wrap up"}
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <AnimatePresence mode="popLayout" initial={false}>
            {messages.slice(-2).map((msg) => (
              <motion.div
                key={msg.id}
                layout="position"
                initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
                exit={reduceMotion ? undefined : { opacity: 0 }}
                transition={SPRING_SOFT}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <motion.div
                  layout="position"
                  className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm ${
                    msg.role === 'user'
                      ? 'bg-neutral-700 text-white rounded-br-md'
                      : 'bg-neutral-100 text-neutral-800 rounded-bl-md'
                  }`}
                >
                  {msg.content}
                </motion.div>
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
              <div className="bg-neutral-100 rounded-2xl rounded-bl-md px-4 py-3">
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
        <form onSubmit={handleSubmit} className="p-4">
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={isFinishing ? "wrapping up..." : "type here..."}
              disabled={isLoading || isFinishing}
              className="flex-1 bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5 text-sm text-neutral-800 placeholder:text-neutral-400 outline-none  transition-colors disabled:opacity-50"
            />
            <motion.button
              type="submit"
              disabled={!inputValue.trim() || isLoading || isFinishing}
              whileHover={reduceMotion || !inputValue.trim() ? undefined : { scale: 1.05 }}
              whileTap={reduceMotion || !inputValue.trim() ? undefined : { scale: 0.95 }}
              className={`p-2.5 rounded-xl transition-colors ${
                inputValue.trim() && !isLoading && !isFinishing
                  ? 'bg-neutral-100 hover:bg-neutral-200'
                  : 'bg-neutral-100 text-neutral-400 cursor-not-allowed'
              }`}
            >
              <ChevronUp size={20} className={inputValue.trim() && !isLoading && !isFinishing ? 'text-neutral-900' : 'text-neutral-400'} />
            </motion.button>
          </div>
        </form>
      </div>
    </motion.div>
  )
}

