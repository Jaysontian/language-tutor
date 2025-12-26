'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export type PersonalityMode = 'hype-coach' | 'chill-friend' | 'strict-tutor'

interface PersonalitySelectorProps {
  value: PersonalityMode
  onChange: (mode: PersonalityMode) => void
  disabled?: boolean
}

export function PersonalitySelector({ value, onChange, disabled = false }: PersonalitySelectorProps) {
  const options: Array<{ mode: PersonalityMode; emoji: string; label: string; description: string }> = [
    {
      mode: 'hype-coach',
      emoji: '🔥',
      label: 'Hype Coach',
      description: 'High-energy, Gen-Z casual'
    },
    {
      mode: 'chill-friend',
      emoji: '😌',
      label: 'Chill Friend',
      description: 'Relaxed, low-pressure'
    },
    {
      mode: 'strict-tutor',
      emoji: '📚',
      label: 'Strict Tutor',
      description: 'Direct, no-nonsense'
    }
  ]
  
  return (
    <div>
      <label className="text-xs font-medium text-neutral-500 mb-2 block">Tutor Style</label>
      <Select
        value={value}
        onValueChange={(val) => !disabled && onChange(val as PersonalityMode)}
        disabled={disabled}
      >
        <SelectTrigger className="w-full h-9 text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.mode} value={option.mode}>
              <span className="flex items-center gap-2">
                <span>{option.emoji}</span>
                <span>{option.label}</span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
