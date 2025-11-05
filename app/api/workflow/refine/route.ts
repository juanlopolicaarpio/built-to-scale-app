import { NextRequest, NextResponse } from 'next/server'
import { openai } from '@/lib/openai'
import { PROMPTS, fillPrompt } from '@/lib/prompts'

export async function POST(req: NextRequest) {
  try {
    const { screenshots, brand, category, competitor, conversationHistory, feedback } = await req.json()

    // Build the full conversation with context
    const messages: any[] = []

    // Add initial prompt with screenshots
    const imageContents = screenshots.map((base64: string) => ({
      type: 'image_url' as const,
      image_url: {
        url: base64,
        detail: 'high' as const,
      },
    }))

    const promptText = fillPrompt(PROMPTS.stage1, {
      brand,
      category,
      competitor,
    })

    messages.push({
      role: 'user',
      content: [
        ...imageContents,
        {
          type: 'text',
          text: promptText,
        },
      ],
    })

    // Add all previous conversation turns
    conversationHistory.forEach((turn: { role: string; content: string }) => {
      if (turn.role === 'assistant') {
        messages.push({
          role: 'assistant',
          content: turn.content,
        })
      } else if (turn.role === 'user') {
        messages.push({
          role: 'user',
          content: turn.content,
        })
      }
    })

    // Add the new feedback
    messages.push({
      role: 'user',
      content: `Please revise the plan based on this feedback:\n\n${feedback}`,
    })

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages,
      max_tokens: 16000,
      temperature: 0.7,
    })

    const output = completion.choices[0].message.content || ''
    return NextResponse.json({ output })
  } catch (error: any) {
    console.error('Refine error:', error)
    return NextResponse.json(
      { error: error.message || 'Refinement failed' },
      { status: 500 }
    )
  }
}