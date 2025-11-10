// app/api/workflow/extract/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { openai } from '@/lib/openai'
import { PROMPTS } from '@/lib/prompts'

export async function POST(req: NextRequest) {
  try {
    const { screenshots } = await req.json()

    if (!screenshots || screenshots.length === 0) {
      return NextResponse.json(
        { error: 'No screenshots provided' },
        { status: 400 }
      )
    }

    console.log(`Extracting data from ${screenshots.length} screenshots...`)

    // Convert to OpenAI format
    const imageContents = screenshots.map((base64: string) => ({
      type: 'image_url' as const,
      image_url: {
        url: base64,
        detail: 'high' as const,
      },
    }))

    // Call OpenAI to extract structured data
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            ...imageContents,
            {
              type: 'text',
              text: PROMPTS.stage0_extraction,
            },
          ],
        },
      ],
      max_tokens: 4000,
      temperature: 0.2, // Low temp for precise extraction
      response_format: { type: 'json_object' }, // Force JSON
    })

    const extractedDataRaw = completion.choices[0].message.content || '{}'
    
    // Parse and validate JSON
    let extractedData
    try {
      extractedData = JSON.parse(extractedDataRaw)
      
      // Basic validation
      if (!extractedData.brand || !extractedData.platform_data) {
        throw new Error('Invalid extraction format')
      }
      
      console.log('✅ Data extracted successfully:', {
        brand: extractedData.brand.name,
        platforms: Object.keys(extractedData.platform_data),
        completeness: extractedData.data_quality?.completeness
      })
      
    } catch (parseError) {
      console.error('JSON Parse Error:', parseError)
      return NextResponse.json(
        { error: 'Failed to parse extracted data', raw: extractedDataRaw },
        { status: 500 }
      )
    }
    
    return NextResponse.json({ 
      extractedData,
      metadata: {
        screenshots_processed: screenshots.length,
        extraction_timestamp: new Date().toISOString(),
        model_used: 'gpt-4o'
      }
    })
    
  } catch (error: any) {
    console.error('Extraction error:', error)
    return NextResponse.json(
      { error: error.message || 'Data extraction failed' },
      { status: 500 }
    )
  }
}