'use client'

import { Message } from '@/lib/types'
import { Card } from './ui/card'
import { Bot, User } from 'lucide-react'

interface ChatInterfaceProps {
  messages: Message[]
}

export function ChatInterface({ messages }: ChatInterfaceProps) {
  return (
    <div className="space-y-4">
      {messages.map((msg) => (
        <Card key={msg.id} className={`p-4 ${
          msg.role === 'assistant' ? 'bg-blue-50' : 'bg-gray-50'
        }`}>
          <div className="flex gap-3">
            <div className="flex-shrink-0">
              {msg.role === 'assistant' ? (
                <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                  <Bot className="h-5 w-5 text-white" />
                </div>
              ) : (
                <div className="w-8 h-8 rounded-full bg-gray-500 flex items-center justify-center">
                  <User className="h-5 w-5 text-white" />
                </div>
              )}
            </div>
            <div className="flex-1">
              <div className="prose prose-sm max-w-none whitespace-pre-wrap">
                {msg.content}
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}