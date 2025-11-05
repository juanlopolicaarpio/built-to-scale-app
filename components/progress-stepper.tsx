'use client'

import { Check, Loader2 } from 'lucide-react'
import { WorkflowStatus } from '@/lib/types'

interface ProgressStepperProps {
  status: WorkflowStatus
}

const steps: { status: WorkflowStatus; label: string }[] = [
  { status: 'idle', label: 'Setup' },
  { status: 'generating_plan', label: 'Generate Plan' },
  { status: 'awaiting_approval', label: 'Review' },
  { status: 'fact_checking', label: 'Fact Check' },
  { status: 'generating_presentation', label: 'Presentation' },
  { status: 'complete', label: 'Complete' },
]

export function ProgressStepper({ status }: ProgressStepperProps) {
  // Safety check
  if (!status) {
    return null
  }

  const currentIndex = steps.findIndex(s => s.status === status)

  return (
    <div className="w-full py-6">
      <div className="flex items-center justify-between">
        {steps.map((step, i) => {
          const isComplete = i < currentIndex
          const isCurrent = i === currentIndex

          return (
            <div key={i} className="flex items-center flex-1">
              <div className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                    isComplete
                      ? 'bg-green-500 border-green-500 text-white'
                      : isCurrent
                      ? 'bg-blue-500 border-blue-500 text-white'
                      : 'bg-white border-gray-300 text-gray-400'
                  }`}
                >
                  {isComplete ? (
                    <Check className="h-5 w-5" />
                  ) : isCurrent ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    i + 1
                  )}
                </div>
                <p className={`text-xs mt-2 text-center ${isCurrent ? 'font-semibold' : ''}`}>
                  {step.label}
                </p>
              </div>
              {i < steps.length - 1 && (
                <div
                  className={`h-0.5 flex-1 mx-2 transition-colors ${
                    isComplete ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
