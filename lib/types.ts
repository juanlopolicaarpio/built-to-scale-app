export type WorkflowStatus = 
  | 'idle'
  | 'uploading'
  | 'generating_plan'
  | 'awaiting_approval'
  | 'fact_checking'
  | 'generating_presentation'
  | 'complete'
  | 'error'

export type Message = {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
}

export type ProjectData = {
  brand: string
  category: string
  competitor?: string
  screenshots: string[]
}