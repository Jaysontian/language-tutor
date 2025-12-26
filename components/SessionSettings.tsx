'use client'

import { PersonalitySelector, type PersonalityMode } from './PersonalitySelector'

interface SessionSettingsProps {
  durationMinutes: number
  onDurationChange: (minutes: number) => void
  personalityMode: PersonalityMode
  onPersonalityChange: (mode: PersonalityMode) => void
  disabled?: boolean
}

export function SessionSettings({
  durationMinutes,
  onDurationChange,
  personalityMode,
  onPersonalityChange,
  disabled = false
}: SessionSettingsProps) {
  const durationOptions = [5, 10, 15, 20]
  
  return (
    <div className="space-y-4">
      {/* Duration selector */}
      <div>
        <label className="text-xs font-medium text-neutral-500 mb-2 block">Session Length</label>
        <div className="flex gap-2">
          {durationOptions.map(minutes => (
            <button
              key={minutes}
              type="button"
              onClick={() => !disabled && onDurationChange(minutes)}
              disabled={disabled}
              className={`flex-1 h-9 px-3 rounded-xl text-sm font-medium transition-all ${
                durationMinutes === minutes
                  ? 'bg-neutral-900 text-white'
                  : 'bg-neutral-50 border border-neutral-200 text-neutral-600 hover:bg-neutral-100'
              } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              {minutes}m
            </button>
          ))}
        </div>
      </div>
      
      {/* Tutor style */}
      <PersonalitySelector 
        value={personalityMode} 
        onChange={onPersonalityChange}
        disabled={disabled}
      />
    </div>
  )
}
