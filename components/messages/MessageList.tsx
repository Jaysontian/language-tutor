import { AnimatePresence, motion } from 'framer-motion'
import type { Topic, TopicStateUpdate } from '@/lib/topics'
import { SPRING, SPRING_SOFT } from '@/lib/motion'
import { StatusWithDots } from '@/components/status-with-dots'

export type Message = {
  id: string
  type: 'sent' | 'received'
  audioUrl?: string
  transcript?: string
  text?: string
  vocab?: Array<{ term: string; translation: string; pronunciation: string }>
  state?: 'listening' | 'thinking' | 'reading'
  inputLanguage?: 'english' | 'learning'
  topicStateUpdate?: TopicStateUpdate | null
}

type MessageListProps = {
  activeTopics: Topic[]
  currentState: 'idle' | 'listening' | 'thinking' | 'reading'
  reduceMotion: boolean
  messages: Message[]
  onStartTopic: () => void
  messagesEndRef: React.RefObject<HTMLDivElement>
  messagesContainerRef: React.RefObject<HTMLDivElement>
}

const eventLabels: Record<string, string> = {
  'objective_completed': 'Objective Completed',
  'vocab_mastered': 'Vocabulary Mastered',
  'topic_completed': 'Topic Completed',
  'session_end': 'Session Ended',
}

export function MessageList({
  activeTopics,
  currentState,
  reduceMotion,
  messages,
  onStartTopic,
  messagesEndRef,
  messagesContainerRef,
}: MessageListProps) {
  return (
    <div 
      ref={messagesContainerRef}
      className="flex-1 overflow-y-auto flex flex-col gap-4 p-4 w-full mx-auto pb-[400px] pt-12"
    >
      <div className="max-w-2xl w-full mx-auto">
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <div key={msg.id} className="flex flex-col gap-2">
              <motion.div
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

              {/* Topic State Update Banner */}
              {msg.topicStateUpdate && (
                <motion.div
                  initial={reduceMotion ? false : { opacity: 0, y: 10, scale: 0.98 }}
                  animate={reduceMotion ? undefined : { opacity: 1, y: 0, scale: 1 }}
                  transition={SPRING_SOFT}
                  className="flex justify-center"
                >
                  <div className="max-w-[70%] bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-4 shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className="shrink-0 w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20 6L9 17l-5-5" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-green-800 mb-1">
                          {eventLabels[msg.topicStateUpdate.event] || 'Progress Update'}
                        </div>
                        <div className="text-sm text-green-900 font-medium">
                          {msg.topicStateUpdate.summary}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          ))}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>
    </div>
  )
}
