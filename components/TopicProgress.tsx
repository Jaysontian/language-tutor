'use client'

import { Topic, TopicState } from '@/lib/topics'

interface TopicProgressProps {
  topic: Topic
  state: TopicState
  updateHistory?: Array<{
    timestamp: Date
    update: import('@/lib/topics').TopicStateUpdate
  }>
}

export function TopicProgress({ topic, state, updateHistory = [] }: TopicProgressProps) {
  const objectives = state.progressMetrics.objectives || []
  const vocab = state.progressMetrics.vocab || []
  const objectivesCompleted = objectives.filter(o => o.complete).length
  const vocabMastered = vocab.filter(v => v.complete).length
  
  const objectiveProgress = objectives.length > 0
    ? (objectivesCompleted / objectives.length) * 100
    : 0
  const vocabProgress = vocab.length > 0
    ? (vocabMastered / vocab.length) * 100
    : 0
  
  const masteryLabels = ['Not Started', 'Beginner', 'Practicing', 'Competent', 'Proficient', 'Mastered']
  const masteryLabel = masteryLabels[state.masteryLevel] || 'Unknown'
  
  const masteryColors = [
    'bg-neutral-200 text-neutral-600',
    'bg-blue-100 text-blue-700',
    'bg-green-100 text-green-700',
    'bg-purple-100 text-purple-700',
    'bg-yellow-100 text-yellow-700',
    'bg-emerald-100 text-emerald-700'
  ]
  const masteryColor = masteryColors[state.masteryLevel] || masteryColors[0]
  
  return (
    <div className="topic-progress p-3 rounded-xl bg-white border border-neutral-200 relative">
      <div className="flex items-start gap-2 mb-3">
        <span className="text-xl shrink-0">{topic.emoji}</span>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-neutral-800">{topic.title}</h4>
          <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-medium ${masteryColor}`}>
            {masteryLabel}
          </span>
        </div>
      </div>
      
      <div className="space-y-2">
        <div className="progress-item">
          <div className="flex items-center justify-between mb-1">
            <label className="text-[10px] font-medium text-neutral-600">
              Objectives
            </label>
          </div>
          <div className="w-full h-1.5 bg-neutral-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-500 transition-all duration-300"
              style={{ width: `${objectiveProgress}%` }}
            />
          </div>
        </div>
        
        <div className="progress-item">
          <div className="flex items-center justify-between mb-1">
            <label className="text-[10px] font-medium text-neutral-600">
              Vocabulary
            </label>
          </div>
          <div className="w-full h-1.5 bg-neutral-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-green-500 transition-all duration-300"
              style={{ width: `${vocabProgress}%` }}
            />
          </div>
        </div>
      </div>
      
      {state.aiNotes && state.aiNotes !== 'Not started yet' && (
        <div className="mt-3 pt-3 border-t border-neutral-100">
          <div className="text-[10px] font-medium text-neutral-500 mb-1">AI Notes:</div>
          <div className="text-[10px] text-neutral-600 leading-relaxed">{state.aiNotes}</div>
        </div>
      )}
    </div>
  )
}
