import { NextRequest, NextResponse } from 'next/server'
import { openai } from '@/lib/openai'
import { PROMPTS, fillPrompt } from '@/lib/prompts'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { screenshots, brand, category, competitor } = body

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

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            ...imageContents,
            {
              type: 'text',
              text: promptText,
            },
          ],
        },
      ],
      max_tokens: 16000,
      temperature: 0.7,
    })

    const output = completion.choices[0].message.content || ''
    return NextResponse.json({ output })
  } catch (error: any) {
    console.error('Stage 1 error:', error)
    return NextResponse.json(
      { error: error.message || 'Stage 1 failed' },
      { status: 500 }
    )
  }
}