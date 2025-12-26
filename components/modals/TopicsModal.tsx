import { AnimatePresence, motion } from 'framer-motion'
import type { Topic } from '@/lib/topics'
import { SPRING_SOFT } from '@/lib/motion'

type TopicsModalProps = {
  open: boolean
  onClose: () => void
  topics: Topic[]
  activeTopicIds: Set<string>
  onToggleTopic: (topicId: string) => void
  difficultyLabels: Record<number, string>
  reduceMotion: boolean
}

export function TopicsModal({
  open,
  onClose,
  topics,
  activeTopicIds,
  onToggleTopic,
  difficultyLabels,
  reduceMotion,
}: TopicsModalProps) {
  // Group topics by difficulty
  const topicsByDifficulty = topics.reduce((acc, topic) => {
    const level = topic.difficulty
    if (!acc[level]) acc[level] = []
    acc[level].push(topic)
    return acc
  }, {} as Record<number, Topic[]>)

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="topics-modal-overlay"
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={reduceMotion ? undefined : { opacity: 1 }}
          exit={reduceMotion ? undefined : { opacity: 0 }}
          transition={SPRING_SOFT}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label="Select topics"
        >
          <motion.div
            key="topics-modal"
            initial={reduceMotion ? false : { opacity: 0, y: 10, scale: 0.99 }}
            animate={reduceMotion ? undefined : { opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: 10, scale: 0.99 }}
            transition={SPRING_SOFT}
            className="w-full max-w-2xl rounded-3xl border border-neutral-200 bg-white shadow-2xl overflow-hidden max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-200">
              <div>
                <div className="text-sm font-semibold text-neutral-800">Select Topics</div>
                <div className="text-xs text-neutral-500">Choose topics to practice in this session.</div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="h-9 w-9 rounded-full border border-neutral-200 text-neutral-700 transition-colors hover:bg-neutral-50 active:bg-neutral-100"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-4">
                {Object.entries(topicsByDifficulty)
                  .sort(([a], [b]) => Number(a) - Number(b))
                  .map(([level, levelTopics]) => (
                    <div key={level}>
                      <div className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-3">
                        {difficultyLabels[Number(level)] || `Level ${level}`}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {levelTopics.map((topic) => {
                          const isActive = activeTopicIds.has(topic.id)
                          return (
                            <button
                              key={topic.id}
                              type="button"
                              onClick={() => onToggleTopic(topic.id)}
                              className={`w-full flex items-center gap-2 p-3 rounded-xl text-left transition-all ${
                                isActive
                                  ? 'bg-neutral-200 text-neutral-800 border-2 border-neutral-400'
                                  : 'bg-white border border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50'
                              }`}
                            >
                              <span className="text-base shrink-0">{topic.emoji}</span>
                              <span className="text-sm font-medium truncate flex-1">{topic.title}</span>
                              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                                isActive 
                                  ? 'border-neutral-600 bg-neutral-600'
                                  : 'border-neutral-300'
                              }`}>
                                {isActive && (
                                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                                    <path d="M20 6L9 17l-5-5" />
                                  </svg>
                                )}
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

