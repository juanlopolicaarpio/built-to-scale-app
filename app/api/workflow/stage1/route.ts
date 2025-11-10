// app/api/workflow/stage1/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { openai } from '@/lib/openai'
import { PROMPTS, fillPrompt } from '@/lib/prompts'

export async function POST(req: NextRequest) {
  try {
    const { extractedData } = await req.json()

    if (!extractedData) {
      return NextResponse.json(
        { error: 'No extracted data provided' },
        { status: 400 }
      )
    }

    console.log('Generating Stage 1 plan using extracted data...')

    // Convert extracted JSON data to readable text format for the prompt
    const dataContext = formatExtractedData(extractedData)

    // Fill prompt with brand/category/competitor
    const promptText = fillPrompt(PROMPTS.stage1, {
      brand: extractedData.brand.name,
      category: extractedData.brand.category,
      competitor: extractedData.competitors[0]?.name || 'competitor',
    })

    // Send TEXT ONLY (no images!)
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: `${dataContext}\n\n${promptText}`,
        },
      ],
      max_tokens: 16000,
      temperature: 0.7,
    })

    const output = completion.choices[0].message.content || ''
    
    console.log('✅ Stage 1 plan generated')
    
    return NextResponse.json({ output })
  } catch (error: any) {
    console.error('Stage 1 error:', error)
    return NextResponse.json(
      { error: error.message || 'Stage 1 failed' },
      { status: 500 }
    )
  }
}

// Helper function to format extracted data for the prompt
function formatExtractedData(data: any): string {
  const { brand, competitors, platform_data } = data
  
  let formatted = `=== EXTRACTED DATA FROM SCREENSHOTS ===\n\n`
  formatted += `BRAND: ${brand.name}\n`
  formatted += `CATEGORY: ${brand.category}\n`
  formatted += `COMPETITORS: ${competitors.map((c: any) => c.name).join(', ')}\n\n`
  
  // Format Shopee data
  if (platform_data.shopee) {
    formatted += `--- SHOPEE DATA ---\n`
    formatted += `Brand Metrics:\n`
    formatted += `- Followers: ${platform_data.shopee.brand_metrics.followers}\n`
    formatted += `- Reviews: ${platform_data.shopee.brand_metrics.reviews_count} (${platform_data.shopee.brand_metrics.avg_rating}★)\n`
    formatted += `- Top 3 SKU Avg Price: ₱${platform_data.shopee.brand_metrics.pricing.average_final_price}\n`
    formatted += `- Active Vouchers: ${platform_data.shopee.brand_metrics.promotions.vouchers_active}\n`
    formatted += `- Content Count: ${platform_data.shopee.brand_metrics.content.shopee_videos_count} videos\n`
    formatted += `- Shop Badge: ${platform_data.shopee.brand_metrics.shop_badge || 'None'}\n\n`
    
    formatted += `Competitor Metrics (${platform_data.shopee.competitor_metrics.competitor_name}):\n`
    formatted += `- Followers: ${platform_data.shopee.competitor_metrics.followers}\n`
    formatted += `- Reviews: ${platform_data.shopee.competitor_metrics.reviews_count}\n`
    formatted += `- Top 3 SKU Avg Price: ₱${platform_data.shopee.competitor_metrics.pricing.average_final_price}\n`
    formatted += `- Active Vouchers: ${platform_data.shopee.competitor_metrics.vouchers_active}\n\n`
  }
  
  // Format Lazada data
  if (platform_data.lazada) {
    formatted += `--- LAZADA DATA ---\n`
    formatted += `Brand Metrics:\n`
    formatted += `- Followers: ${platform_data.lazada.brand_metrics.followers}\n`
    formatted += `- Reviews: ${platform_data.lazada.brand_metrics.reviews_count} (${platform_data.lazada.brand_metrics.avg_rating}★)\n`
    formatted += `- Top 3 SKU Avg Price: ₱${platform_data.lazada.brand_metrics.pricing.average_final_price}\n`
    formatted += `- Active Vouchers: ${platform_data.lazada.brand_metrics.promotions.vouchers_active}\n\n`
    
    if (platform_data.lazada.competitor_metrics) {
      formatted += `Competitor Metrics (${platform_data.lazada.competitor_metrics.competitor_name}):\n`
      formatted += `- Followers: ${platform_data.lazada.competitor_metrics.followers}\n`
      formatted += `- Reviews: ${platform_data.lazada.competitor_metrics.reviews_count}\n\n`
    }
  }
  
  // Format TikTok data
  if (platform_data.tiktok) {
    formatted += `--- TIKTOK SHOP DATA ---\n`
    formatted += `Brand Metrics:\n`
    formatted += `- Followers: ${platform_data.tiktok.brand_metrics.followers}\n`
    formatted += `- Videos Published: ${platform_data.tiktok.brand_metrics.videos_published}\n`
    formatted += `- Top 3 SKU Avg Price: ₱${platform_data.tiktok.brand_metrics.pricing.average_final_price}\n`
    formatted += `- Live Sessions: ${platform_data.tiktok.brand_metrics.content.live_sessions_count}\n\n`
    
    if (platform_data.tiktok.competitor_metrics) {
      formatted += `Competitor Metrics (${platform_data.tiktok.competitor_metrics.competitor_name}):\n`
      formatted += `- Followers: ${platform_data.tiktok.competitor_metrics.followers}\n`
      formatted += `- Videos Published: ${platform_data.tiktok.competitor_metrics.videos_published}\n\n`
    }
  }
  
  // Add competitive insights
  if (data.competitive_insights && data.competitive_insights.length > 0) {
    formatted += `COMPETITIVE INSIGHTS:\n`
    data.competitive_insights.forEach((insight: string) => {
      formatted += `- ${insight}\n`
    })
  }
  
  return formatted
}