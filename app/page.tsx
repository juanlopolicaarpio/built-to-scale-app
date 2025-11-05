'use client'

import { useState } from 'react'
import { useWorkflowStore } from '@/lib/store'
import { fileToBase64 } from '@/lib/utils'
import { UploadZone } from '@/components/upload-zone'
import { ProgressStepper } from '@/components/progress-stepper'
import { ChatInterface } from '@/components/chat-interface'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, CheckCircle, Edit } from 'lucide-react'

export default function HomePage() {
  const [files, setFiles] = useState<File[]>([])
  const [brand, setBrand] = useState('')
  const [category, setCategory] = useState('')
  const [competitor, setCompetitor] = useState('')
  const [refineFeedback, setRefineFeedback] = useState('')
  const [showRefineInput, setShowRefineInput] = useState(false)

  const {
    status,
    messages,
    projectData,
    conversationHistory,
    stage1Output,
    stage2Output,
    stage3Output,
    setStatus,
    setProjectData,
    addMessage,
    addToConversationHistory,
    setStage1Output,
    setStage2Output,
    setStage3Output,
    reset,
  } = useWorkflowStore()

  const handleStart = async () => {
    if (files.length === 0 || !brand || !category) {
      alert('Please upload screenshots and fill in brand/category')
      return
    }

    try {
      setStatus('uploading')
      addMessage({
        role: 'system',
        content: '🚀 Converting screenshots and preparing data...',
      })

      // Convert files to base64
      const screenshots = await Promise.all(
        files.map(file => fileToBase64(file))
      )

      setProjectData({ brand, category, competitor, screenshots })

      // Stage 1: Generate Plan
      setStatus('generating_plan')
      addMessage({
        role: 'system',
        content: '🤖 Generating your Built to Scale™ Quick Win Action Plan...',
      })

      const stage1Response = await fetch('/api/workflow/stage1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ screenshots, brand, category, competitor }),
      })

      if (!stage1Response.ok) throw new Error('Stage 1 failed')

      const { output } = await stage1Response.json()
      setStage1Output(output)
      
      // Track in conversation history
      addToConversationHistory('assistant', output)

      addMessage({
        role: 'assistant',
        content: output,
      })

      addMessage({
        role: 'system',
        content: '✅ Plan generated! Please review and approve or request changes.',
      })

      setStatus('awaiting_approval')
    } catch (error: any) {
      console.error('Workflow error:', error)
      setStatus('error')
      addMessage({
        role: 'system',
        content: `❌ Error: ${error.message}`,
      })
    }
  }

  const handleApprove = async () => {
    try {
      setStatus('fact_checking')
      addMessage({
        role: 'user',
        content: '✅ Plan approved. Proceeding with fact-check and presentation generation.',
      })

      // Stage 2: Fact Check
      addMessage({
        role: 'system',
        content: '🔍 Running evidence-based fact check...',
      })

      const stage2Response = await fetch('/api/workflow/stage2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage1Output }),
      })

      if (!stage2Response.ok) throw new Error('Stage 2 failed')

      const { output: s2Output } = await stage2Response.json()
      setStage2Output(s2Output)

      addMessage({
        role: 'assistant',
        content: `**Fact Check Complete:**\n\n${s2Output}`,
      })

      // Stage 3: Presentation
      setStatus('generating_presentation')
      addMessage({
        role: 'system',
        content: '📊 Generating presentation guide...',
      })

      const stage3Response = await fetch('/api/workflow/stage3', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage1Output, stage2Output: s2Output }),
      })

      if (!stage3Response.ok) throw new Error('Stage 3 failed')

      const { output: s3Output } = await stage3Response.json()
      setStage3Output(s3Output)

      addMessage({
        role: 'assistant',
        content: `**Presentation Guide:**\n\n${s3Output}`,
      })

      setStatus('complete')
      addMessage({
        role: 'system',
        content: '🎉 All stages complete! Your Built to Scale™ deliverables are ready.',
      })
    } catch (error: any) {
      console.error('Approval workflow error:', error)
      setStatus('error')
      addMessage({
        role: 'system',
        content: `❌ Error: ${error.message}`,
      })
    }
  }

  const handleRefine = async () => {
    if (!refineFeedback.trim()) {
      alert('Please provide feedback')
      return
    }

    try {
      setStatus('generating_plan')
      
      // Track user feedback in conversation
      addToConversationHistory('user', refineFeedback)
      
      addMessage({
        role: 'user',
        content: `📝 Refinement requested:\n\n${refineFeedback}`,
      })

      const refineResponse = await fetch('/api/workflow/refine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          screenshots: projectData?.screenshots || [],
          brand: projectData?.brand || brand,
          category: projectData?.category || category,
          competitor: projectData?.competitor || competitor,
          conversationHistory,
          feedback: refineFeedback,
        }),
      })

      if (!refineResponse.ok) throw new Error('Refinement failed')

      const { output } = await refineResponse.json()
      setStage1Output(output)
      
      // Track assistant's refined output
      addToConversationHistory('assistant', output)

      addMessage({
        role: 'assistant',
        content: output,
      })

      addMessage({
        role: 'system',
        content: '✅ Plan refined! Please review again.',
      })

      setStatus('awaiting_approval')
      setRefineFeedback('')
      setShowRefineInput(false)
    } catch (error: any) {
      console.error('Refine error:', error)
      setStatus('error')
      addMessage({
        role: 'system',
        content: `❌ Error: ${error.message}`,
      })
    }
  }

  const isLoading = [
    'uploading',
    'generating_plan',
    'fact_checking',
    'generating_presentation',
  ].includes(status)

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Built to Scale™ Automation
          </h1>
          <p className="text-gray-600">
            Upload screenshots → AI generates plan → Review → Auto fact-check & presentation
          </p>
        </div>

        {/* Progress */}
        <Card className="p-6">
          <ProgressStepper status={status} />
        </Card>

        {/* Setup Form */}
        {status === 'idle' && (
          <Card className="p-6 space-y-6">
            <div>
              <h2 className="text-2xl font-semibold mb-4">Project Setup</h2>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <Label htmlFor="brand">Brand Name *</Label>
                  <Input
                    id="brand"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    placeholder="e.g., Oxo Tot"
                  />
                </div>
                <div>
                  <Label htmlFor="category">Category *</Label>
                  <Input
                    id="category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="e.g., Baby Feeding"
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="competitor">Competitor (Optional)</Label>
                  <Input
                    id="competitor"
                    value={competitor}
                    onChange={(e) => setCompetitor(e.target.value)}
                    placeholder="e.g., Main competitor brand"
                  />
                </div>
              </div>

              <Separator className="my-6" />

              <div>
                <Label>Upload Screenshots *</Label>
                <div className="mt-2">
                  <UploadZone files={files} onFilesChange={setFiles} />
                </div>
              </div>
            </div>

            <Button
              size="lg"
              className="w-full"
              onClick={handleStart}
              disabled={files.length === 0 || !brand || !category}
            >
              Start Workflow
            </Button>
          </Card>
        )}

        {/* Chat Interface */}
        {messages.length > 0 && (
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Workflow Progress</h2>
            <ChatInterface messages={messages} />

            {/* Approval Actions */}
            {status === 'awaiting_approval' && !showRefineInput && (
              <div className="mt-6 flex gap-3">
                <Button
                  size="lg"
                  className="flex-1"
                  onClick={handleApprove}
                >
                  <CheckCircle className="mr-2 h-5 w-5" />
                  Approve & Continue
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => setShowRefineInput(true)}
                >
                  <Edit className="mr-2 h-5 w-5" />
                  Request Changes
                </Button>
              </div>
            )}

            {/* Refine Input */}
            {status === 'awaiting_approval' && showRefineInput && (
              <div className="mt-6 space-y-3">
                <Label>What would you like to change?</Label>
                <Textarea
                  value={refineFeedback}
                  onChange={(e) => setRefineFeedback(e.target.value)}
                  placeholder="Describe the changes you'd like..."
                  rows={4}
                />
                <div className="flex gap-3">
                  <Button onClick={handleRefine} disabled={!refineFeedback.trim()}>
                    Submit Changes
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowRefineInput(false)
                      setRefineFeedback('')
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {/* Loading State */}
            {isLoading && (
              <Alert className="mt-6">
                <Loader2 className="h-4 w-4 animate-spin" />
                <AlertDescription>
                  Processing... This may take 30-60 seconds per stage.
                </AlertDescription>
              </Alert>
            )}

            {/* Complete State */}
            {status === 'complete' && (
              <div className="mt-6">
                <Button size="lg" className="w-full" onClick={reset}>
                  Start New Project
                </Button>
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
  )
}