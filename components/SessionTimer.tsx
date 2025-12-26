'use client'

import { useState, useEffect } from 'react'

interface SessionTimerProps {
  durationMinutes: number
  onTimeUp: () => void
  isActive?: boolean
}

export function SessionTimer({ durationMinutes, onTimeUp, isActive = true }: SessionTimerProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [isRunning, setIsRunning] = useState(isActive)
  
  const totalSeconds = durationMinutes * 60
  const remainingSeconds = Math.max(0, totalSeconds - elapsedSeconds)
  const remainingMinutes = Math.floor(remainingSeconds / 60)
  const remainingSecondsDisplay = remainingSeconds % 60
  
  useEffect(() => {
    setIsRunning(isActive)
  }, [isActive])
  
  useEffect(() => {
    if (!isRunning) return
    
    const interval = setInterval(() => {
      setElapsedSeconds(prev => {
        const next = prev + 1
        if (next >= totalSeconds) {
          setIsRunning(false)
          onTimeUp()
        }
        return next
      })
    }, 1000)
    
    return () => clearInterval(interval)
  }, [isRunning, totalSeconds, onTimeUp])
  
  const progressPercent = totalSeconds > 0 ? (elapsedSeconds / totalSeconds) * 100 : 0
  const isNearEnd = remainingMinutes <= 2 && remainingMinutes > 0
  
  return (
    <div className="session-timer w-full">
      {/* Progress bar */}
      <div className="w-full h-1 bg-neutral-200 rounded-full overflow-hidden mb-2">
        <div 
          className={`h-full transition-all duration-300 ${
            isNearEnd ? 'bg-orange-500' : 'bg-blue-500'
          }`}
          style={{ width: `${progressPercent}%` }}
        />
      </div>
      
      {/* Time display */}
      <div className={`text-sm font-medium text-center ${
        isNearEnd ? 'text-orange-600' : 'text-neutral-600'
      }`}>
        {remainingMinutes}:{remainingSecondsDisplay.toString().padStart(2, '0')}
        {isNearEnd && <span className="ml-1 text-xs">⚠️</span>}
      </div>
    </div>
  )
}
