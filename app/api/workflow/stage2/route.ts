import { NextRequest, NextResponse } from 'next/server'
import { openai } from '@/lib/openai'
import { PROMPTS } from '@/lib/prompts'

export async function POST(req: NextRequest) {
  try {
    const { stage1Output } = await req.json()

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: `${PROMPTS.stage2}\n\n=== PLAN TO EVALUATE ===\n${stage1Output}`,
        },
      ],
      max_tokens: 8000,
      temperature: 0.5,
    })

    const output = completion.choices[0].message.content || ''
    return NextResponse.json({ output })
  } catch (error: any) {
    console.error('Stage 2 error:', error)
    return NextResponse.json(
      { error: error.message || 'Stage 2 failed' },
      { status: 500 }
    )
  }
}