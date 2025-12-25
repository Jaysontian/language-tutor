import { AnimatePresence, motion } from 'framer-motion'
import { conversationPresets, type ConversationPresetId } from '@/lib/conversation-presets'
import { SPRING_SOFT } from '@/lib/motion'

type ConversationModalProps = {
  open: boolean
  onClose: () => void
  selectedPresetId: ConversationPresetId
  onSelectPreset: (presetId: ConversationPresetId) => void
  reduceMotion: boolean
  disabled: boolean
}

export function ConversationModal({
  open,
  onClose,
  selectedPresetId,
  onSelectPreset,
  reduceMotion,
  disabled,
}: ConversationModalProps) {
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



