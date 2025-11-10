// app/page.tsx
'use client'

import { useState } from 'react'
import { useWorkflowStore } from '@/lib/store'
import { fileToBase64 } from '@/lib/utils'
import { UploadZone } from '@/components/upload-zone'
import { ProgressStepper } from '@/components/progress-stepper'
import { ChatInterface } from '@/components/chat-interface'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, CheckCircle, Send, Sparkles, Database } from 'lucide-react'

export default function HomePage() {
  const [files, setFiles] = useState<File[]>([])
  const [chatInput, setChatInput] = useState('')

  const {
    status,
    messages,
    extractedData,
    conversationHistory,
    stage1Output,
    setStatus,
    setExtractedData,
    addMessage,
    addToConversationHistory,
    setStage1Output,
    setStage2Output,
    setStage3Output,
    reset,
  } = useWorkflowStore()

  const handleStart = async () => {
    if (files.length === 0) {
      alert('Please upload at least one screenshot')
      return
    }

    try {
      // PHASE 1: Convert images to base64
      setStatus('uploading')
      addMessage({
        role: 'system',
        content: '🚀 Converting screenshots...',
      })

      const screenshots = await Promise.all(
        files.map(file => fileToBase64(file))
      )

      // PHASE 2: Extract data from screenshots (ONCE!)
      addMessage({
        role: 'system',
        content: '🔍 Analyzing screenshots and extracting structured data...',
      })

      const extractResponse = await fetch('/api/workflow/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ screenshots }),
      })

      if (!extractResponse.ok) {
        const errorData = await extractResponse.json()
        throw new Error(errorData.error || 'Data extraction failed')
      }

      const { extractedData: data } = await extractResponse.json()
      setExtractedData(data)

      // Show extracted data summary to user
      const dataSummary = `
**Data Extracted Successfully!** 

📊 **Brand:** ${data.brand.name}
📁 **Category:** ${data.brand.category}
🏢 **Competitors:** ${data.competitors.map((c: any) => c.name).join(', ')}

**Platform Metrics:**
${data.platform_data.shopee ? `
- **Shopee:** ${data.platform_data.shopee.brand_metrics.followers} followers, ${data.platform_data.shopee.brand_metrics.reviews_count} reviews
` : ''}
${data.platform_data.lazada ? `
- **Lazada:** ${data.platform_data.lazada.brand_metrics.followers} followers, ${data.platform_data.lazada.brand_metrics.reviews_count} reviews
` : ''}
${data.platform_data.tiktok ? `
- **TikTok:** ${data.platform_data.tiktok.brand_metrics.followers} followers, ${data.platform_data.tiktok.brand_metrics.videos_published} videos
` : ''}

**Data Quality:** ${data.data_quality.completeness}
${data.data_quality.missing_data_notes ? `\n⚠️ ${data.data_quality.missing_data_notes}` : ''}

Ready to generate your Built to Scale™ plan?
`

      addMessage({
        role: 'assistant',
        content: dataSummary,
      })

      // PHASE 3: Generate plan using extracted TEXT data
      setStatus('generating_plan')
      addMessage({
        role: 'system',
        content: '🤖 Generating Built to Scale™ Quick Win Action Plan...',
      })

      const stage1Response = await fetch('/api/workflow/stage1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ extractedData: data }),
      })

      if (!stage1Response.ok) throw new Error('Stage 1 failed')

      const { output } = await stage1Response.json()
      setStage1Output(output)
      
      addToConversationHistory('assistant', output)

      addMessage({
        role: 'assistant',
        content: output,
      })

      addMessage({
        role: 'system',
        content: '💬 Review the plan above. Ask questions, request changes, or approve to proceed.',
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

  const handleContinueChat = async () => {
    if (!chatInput.trim()) {
      alert('Please type a message')
      return
    }

    try {
      addMessage({
        role: 'user',
        content: chatInput,
      })
      addToConversationHistory('user', chatInput)
      
      const userMessage = chatInput
      setChatInput('')
      
      setStatus('generating_plan')
      addMessage({
        role: 'system',
        content: '🤖 Processing your message...',
      })

      // Use extracted data (TEXT), not screenshots!
      const response = await fetch('/api/workflow/refine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          extractedData, // TEXT data only!
          conversationHistory,
          feedback: userMessage,
        }),
      })

      if (!response.ok) throw new Error('Failed to process message')

      const { output } = await response.json()
      setStage1Output(output)
      
      addToConversationHistory('assistant', output)

      addMessage({
        role: 'assistant',
        content: output,
      })

      addMessage({
        role: 'system',
        content: '💬 Continue the conversation or approve when ready.',
      })

      setStatus('awaiting_approval')
    } catch (error: any) {
      console.error('Chat error:', error)
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
            Built to Scale™ AI Strategist
          </h1>
          <p className="text-gray-600">
            Upload screenshots → AI extracts data → Collaborative planning → Deliverables
          </p>
        </div>

        {/* Progress */}
        <Card className="p-6">
          <ProgressStepper status={status} />
        </Card>

        {/* Upload Zone */}
        {status === 'idle' && (
          <Card className="p-6 space-y-6">
            <div>
              <h2 className="text-2xl font-semibold mb-2">Upload Your Screenshots</h2>
              <p className="text-muted-foreground mb-6">
                Upload screenshots of your brand and competitor pages from Shopee, Lazada, or TikTok Shop.
                Our AI will extract all metrics automatically.
              </p>

              <div>
                <Label>Screenshots from E-commerce Platforms *</Label>
                <p className="text-sm text-muted-foreground mb-3">
                  Include: Product listings, shop profiles, pricing pages, competitor comparisons
                </p>
                <UploadZone files={files} onFilesChange={setFiles} />
              </div>
            </div>

            <Button
              size="lg"
              className="w-full"
              onClick={handleStart}
              disabled={files.length === 0}
            >
              <Database className="mr-2 h-5 w-5" />
              Extract Data & Start Analysis
            </Button>
          </Card>
        )}

        {/* Chat Interface */}
        {messages.length > 0 && (
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">AI Strategy Session</h2>
            <ChatInterface messages={messages} />

            {/* Chat Input */}
            {status === 'awaiting_approval' && (
              <div className="mt-6 space-y-4">
                <Separator />
                
                <div className="space-y-3">
                  <Label>Continue the conversation or approve to proceed</Label>
                  <Textarea
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Ask questions, request changes, provide more context..."
                    rows={3}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleContinueChat()
                      }
                    }}
                  />
                  <div className="flex gap-3">
                    <Button 
                      onClick={handleContinueChat} 
                      disabled={!chatInput.trim()}
                      className="flex-1"
                    >
                      <Send className="mr-2 h-4 w-4" />
                      Send Message
                    </Button>
                    <Button
                      size="lg"
                      variant="outline"
                      onClick={handleApprove}
                      className="flex-1"
                    >
                      <CheckCircle className="mr-2 h-5 w-5" />
                      Approve & Continue to Fact-Check
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Press Enter to send • Shift+Enter for new line
                  </p>
                </div>
              </div>
            )}

            {/* Loading State */}
            {isLoading && (
              <Alert className="mt-6">
                <Loader2 className="h-4 w-4 animate-spin" />
                <AlertDescription>
                  Processing... This may take 30-60 seconds.
                </AlertDescription>
              </Alert>
            )}

            {/* Complete State */}
            {status === 'complete' && (
              <div className="mt-6 space-y-4">
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Your complete Built to Scale™ strategy is ready!
                  </AlertDescription>
                </Alert>
                <Button size="lg" className="w-full" onClick={reset}>
                  Start New Project
                </Button>
              </div>
            )}
          </Card>
        )}

        {/* Debug Panel - Show extracted data */}
        {extractedData && status !== 'idle' && (
          <Card className="p-6">
            <details>
              <summary className="cursor-pointer font-semibold mb-2">
                🔍 View Extracted Data (Debug)
              </summary>
              <pre className="text-xs bg-gray-100 p-4 rounded overflow-auto max-h-96">
                {JSON.stringify(extractedData, null, 2)}
              </pre>
            </details>
          </Card>
        )}
      </div>
    </div>
  )
}