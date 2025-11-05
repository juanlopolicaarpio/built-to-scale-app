'use client'

import { create } from 'zustand'
import { WorkflowStatus, Message, ProjectData } from './types'

interface WorkflowStore {
  status: WorkflowStatus
  projectData: ProjectData | null
  messages: Message[]
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>
  stage1Output: string | null
  stage2Output: string | null
  stage3Output: string | null
  
  setStatus: (status: WorkflowStatus) => void
  setProjectData: (data: ProjectData) => void
  addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => void
  addToConversationHistory: (role: 'user' | 'assistant', content: string) => void
  setStage1Output: (output: string) => void
  setStage2Output: (output: string) => void
  setStage3Output: (output: string) => void
  reset: () => void
}

export const useWorkflowStore = create<WorkflowStore>((set) => ({
  status: 'idle',
  projectData: null,
  messages: [],
  conversationHistory: [],
  stage1Output: null,
  stage2Output: null,
  stage3Output: null,
  
  setStatus: (status) => set({ status }),
  
  setProjectData: (data) => set({ projectData: data }),
  
  addMessage: (message) => set((state) => ({
    messages: [
      ...state.messages,
      {
        ...message,
        id: Math.random().toString(36).substr(2, 9),
        timestamp: new Date(),
      },
    ],
  })),
  
  addToConversationHistory: (role, content) => set((state) => ({
    conversationHistory: [
      ...state.conversationHistory,
      { role, content },
    ],
  })),
  
  setStage1Output: (output) => set({ stage1Output: output }),
  setStage2Output: (output) => set({ stage2Output: output }),
  setStage3Output: (output) => set({ stage3Output: output }),
  
  reset: () => set({
    status: 'idle',
    projectData: null,
    messages: [],
    conversationHistory: [],
    stage1Output: null,
    stage2Output: null,
    stage3Output: null,
  }),
}))