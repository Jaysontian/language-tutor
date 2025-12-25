import { AnimatePresence, motion } from 'framer-motion'
import type { LessonConfig } from '@/lib/lessons'
import type { ConversationPresetId } from '@/lib/conversation-presets'
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
}

type MessageListProps = {
  appMode: 'conversation' | 'learning'
  selectedLesson?: LessonConfig
  currentState: 'idle' | 'listening' | 'thinking' | 'reading'
  reduceMotion: boolean
  messages: Message[]
  onStartLesson: () => void
  messagesEndRef: React.RefObject<HTMLDivElement>
  messagesContainerRef: React.RefObject<HTMLDivElement>
}

export function MessageList({
  appMode,
  selectedLesson,
  currentState,
  reduceMotion,
  messages,
  onStartLesson,
  messagesEndRef,
  messagesContainerRef,
}: MessageListProps) {
  return (
    <div 
      ref={messagesContainerRef}
      className="flex-1 overflow-y-auto flex flex-col gap-4 p-4 w-full mx-auto pb-[400px] pt-12"
    >
      <div className="max-w-2xl w-full mx-auto">
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
                onClick={onStartLesson}
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
  )
}

