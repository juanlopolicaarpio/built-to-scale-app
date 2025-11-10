// app/api/workflow/refine/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { openai } from '@/lib/openai'
import { PROMPTS, fillPrompt } from '@/lib/prompts'

export async function POST(req: NextRequest) {
  try {
    const { extractedData, conversationHistory, feedback } = await req.json()

    if (!extractedData) {
      return NextResponse.json(
        { error: 'No extracted data provided' },
        { status: 400 }
      )
    }

    console.log('Refining plan with feedback...')

    // Build the full conversation with TEXT ONLY (no images!)
    const messages: any[] = []

    // Format extracted data as readable text
    const dataContext = formatExtractedData(extractedData)
    
    // Fill prompt with brand/category/competitor from extracted data
    const promptText = fillPrompt(PROMPTS.stage1, {
      brand: extractedData.brand?.name || 'Brand',
      category: extractedData.brand?.category || 'Category',
      competitor: extractedData.competitors?.[0]?.name || 'Competitor',
    })

    // Add initial context (data + prompt) - TEXT ONLY, NO IMAGES
    messages.push({
      role: 'user',
      content: `${dataContext}\n\n${promptText}`,
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
    
    console.log('✅ Plan refined successfully')
    
    return NextResponse.json({ output })
  } catch (error: any) {
    console.error('Refine error:', error)
    return NextResponse.json(
      { error: error.message || 'Refinement failed' },
      { status: 500 }
    )
  }
}

// Helper function to format extracted JSON data into readable text for the prompt
function formatExtractedData(data: any): string {
  const { brand, competitors, platform_data, competitive_insights, data_quality } = data
  
  let formatted = `=== EXTRACTED DATA FROM SCREENSHOTS ===\n\n`
  
  // Brand info
  formatted += `BRAND: ${brand?.name || 'Unknown'}\n`
  formatted += `CATEGORY: ${brand?.category || 'Unknown'}\n`
  formatted += `COMPETITORS: ${competitors?.map((c: any) => c.name).join(', ') || 'None identified'}\n\n`
  
  // Format Shopee data if available
  if (platform_data?.shopee?.brand_metrics) {
    const shopee = platform_data.shopee
    formatted += `--- SHOPEE DATA ---\n`
    formatted += `Brand Metrics:\n`
    formatted += `- Shop Name: ${shopee.brand_metrics.shop_name || 'N/A'}\n`
    formatted += `- Followers: ${shopee.brand_metrics.followers !== null ? shopee.brand_metrics.followers.toLocaleString() : 'Not visible'}\n`
    formatted += `- Reviews: ${shopee.brand_metrics.reviews_count !== null ? shopee.brand_metrics.reviews_count : 'Not visible'} ${shopee.brand_metrics.avg_rating ? `(${shopee.brand_metrics.avg_rating}★)` : ''}\n`
    formatted += `- Shop Badge: ${shopee.brand_metrics.shop_badge || 'None'}\n`
    
    if (shopee.brand_metrics.pricing?.average_final_price) {
      formatted += `- Average Final Price (Top 3 SKUs): ₱${shopee.brand_metrics.pricing.average_final_price}\n`
    }
    
    if (shopee.brand_metrics.promotions) {
      formatted += `- Active Vouchers: ${shopee.brand_metrics.promotions.vouchers_active !== null ? shopee.brand_metrics.promotions.vouchers_active : 'Not visible'}\n`
      if (shopee.brand_metrics.promotions.voucher_examples?.length > 0) {
        formatted += `- Voucher Examples: ${shopee.brand_metrics.promotions.voucher_examples.join(', ')}\n`
      }
      if (shopee.brand_metrics.promotions.non_voucher_promos?.length > 0) {
        formatted += `- Other Promos: ${shopee.brand_metrics.promotions.non_voucher_promos.join(', ')}\n`
      }
    }
    
    if (shopee.brand_metrics.content) {
      formatted += `- Content: ${shopee.brand_metrics.content.shopee_videos_count !== null ? shopee.brand_metrics.content.shopee_videos_count : 'N/A'} videos, ${shopee.brand_metrics.content.product_listings_count !== null ? shopee.brand_metrics.content.product_listings_count : 'N/A'} listings\n`
    }
    
    if (shopee.brand_metrics.visibility) {
      formatted += `- Search Ranking: ${shopee.brand_metrics.visibility.search_ranking_position ? `#${shopee.brand_metrics.visibility.search_ranking_position}` : 'Not visible'}\n`
      formatted += `- Paid Ad Visible: ${shopee.brand_metrics.visibility.paid_ad_visible ? 'Yes' : 'No'}\n`
    }
    
    formatted += `\n`
    
    // Competitor data
    if (shopee.competitor_metrics) {
      formatted += `Competitor Metrics (${shopee.competitor_metrics.competitor_name || 'Unknown'}):\n`
      formatted += `- Followers: ${shopee.competitor_metrics.followers !== null ? shopee.competitor_metrics.followers.toLocaleString() : 'Not visible'}\n`
      formatted += `- Reviews: ${shopee.competitor_metrics.reviews_count !== null ? shopee.competitor_metrics.reviews_count : 'Not visible'} ${shopee.competitor_metrics.avg_rating ? `(${shopee.competitor_metrics.avg_rating}★)` : ''}\n`
      if (shopee.competitor_metrics.pricing?.average_final_price) {
        formatted += `- Average Final Price (Top 3 SKUs): ₱${shopee.competitor_metrics.pricing.average_final_price}\n`
      }
      formatted += `- Active Vouchers: ${shopee.competitor_metrics.vouchers_active !== null ? shopee.competitor_metrics.vouchers_active : 'Not visible'}\n`
      formatted += `- Content Count: ${shopee.competitor_metrics.content_count !== null ? shopee.competitor_metrics.content_count : 'Not visible'}\n`
      formatted += `\n`
    }
  }
  
  // Format Lazada data if available
  if (platform_data?.lazada?.brand_metrics) {
    const lazada = platform_data.lazada
    formatted += `--- LAZADA DATA ---\n`
    formatted += `Brand Metrics:\n`
    formatted += `- Shop Name: ${lazada.brand_metrics.shop_name || 'N/A'}\n`
    formatted += `- Followers: ${lazada.brand_metrics.followers !== null ? lazada.brand_metrics.followers.toLocaleString() : 'Not visible'}\n`
    formatted += `- Reviews: ${lazada.brand_metrics.reviews_count !== null ? lazada.brand_metrics.reviews_count : 'Not visible'} ${lazada.brand_metrics.avg_rating ? `(${lazada.brand_metrics.avg_rating}★)` : ''}\n`
    formatted += `- Shop Badge: ${lazada.brand_metrics.shop_badge || 'None'}\n`
    
    if (lazada.brand_metrics.pricing?.average_final_price) {
      formatted += `- Average Final Price (Top 3 SKUs): ₱${lazada.brand_metrics.pricing.average_final_price}\n`
    }
    
    if (lazada.brand_metrics.promotions) {
      formatted += `- Active Vouchers: ${lazada.brand_metrics.promotions.vouchers_active !== null ? lazada.brand_metrics.promotions.vouchers_active : 'Not visible'}\n`
      if (lazada.brand_metrics.promotions.voucher_examples?.length > 0) {
        formatted += `- Voucher Examples: ${lazada.brand_metrics.promotions.voucher_examples.join(', ')}\n`
      }
      formatted += `- Flexi-Combo Visible: ${lazada.brand_metrics.promotions.flexi_combo_visible ? 'Yes' : 'No'}\n`
    }
    
    if (lazada.brand_metrics.content) {
      formatted += `- LazLook Videos: ${lazada.brand_metrics.content.lazlook_videos_count !== null ? lazada.brand_metrics.content.lazlook_videos_count : 'Not visible'}\n`
    }
    
    formatted += `\n`
    
    // Competitor data
    if (lazada.competitor_metrics) {
      formatted += `Competitor Metrics (${lazada.competitor_metrics.competitor_name || 'Unknown'}):\n`
      formatted += `- Followers: ${lazada.competitor_metrics.followers !== null ? lazada.competitor_metrics.followers.toLocaleString() : 'Not visible'}\n`
      formatted += `- Reviews: ${lazada.competitor_metrics.reviews_count !== null ? lazada.competitor_metrics.reviews_count : 'Not visible'} ${lazada.competitor_metrics.avg_rating ? `(${lazada.competitor_metrics.avg_rating}★)` : ''}\n`
      if (lazada.competitor_metrics.pricing?.average_final_price) {
        formatted += `- Average Final Price (Top 3 SKUs): ₱${lazada.competitor_metrics.pricing.average_final_price}\n`
      }
      formatted += `- Active Vouchers: ${lazada.competitor_metrics.vouchers_active !== null ? lazada.competitor_metrics.vouchers_active : 'Not visible'}\n`
      formatted += `\n`
    }
  }
  
  // Format TikTok data if available
  if (platform_data?.tiktok?.brand_metrics) {
    const tiktok = platform_data.tiktok
    formatted += `--- TIKTOK SHOP DATA ---\n`
    formatted += `Brand Metrics:\n`
    formatted += `- Shop Name: ${tiktok.brand_metrics.shop_name || 'N/A'}\n`
    formatted += `- Followers: ${tiktok.brand_metrics.followers !== null ? tiktok.brand_metrics.followers.toLocaleString() : 'Not visible'}\n`
    formatted += `- Videos Published: ${tiktok.brand_metrics.videos_published !== null ? tiktok.brand_metrics.videos_published : 'Not visible'}\n`
    
    if (tiktok.brand_metrics.pricing?.average_final_price) {
      formatted += `- Average Final Price (Top 3 SKUs): ₱${tiktok.brand_metrics.pricing.average_final_price}\n`
    }
    
    if (tiktok.brand_metrics.content) {
      formatted += `- Video Frequency: ${tiktok.brand_metrics.content.video_frequency || 'Not visible'}\n`
      formatted += `- Live Sessions: ${tiktok.brand_metrics.content.live_sessions_count !== null ? tiktok.brand_metrics.content.live_sessions_count : 'Not visible'}\n`
      formatted += `- Creator Partnerships: ${tiktok.brand_metrics.content.creator_partnerships !== null ? tiktok.brand_metrics.content.creator_partnerships : 'Not visible'}\n`
    }
    
    if (tiktok.brand_metrics.engagement) {
      formatted += `- Affiliate Program: ${tiktok.brand_metrics.engagement.affiliate_program_active ? 'Active' : 'Not active'}\n`
    }
    
    formatted += `\n`
    
    // Competitor data
    if (tiktok.competitor_metrics) {
      formatted += `Competitor Metrics (${tiktok.competitor_metrics.competitor_name || 'Unknown'}):\n`
      formatted += `- Followers: ${tiktok.competitor_metrics.followers !== null ? tiktok.competitor_metrics.followers.toLocaleString() : 'Not visible'}\n`
      formatted += `- Videos Published: ${tiktok.competitor_metrics.videos_published !== null ? tiktok.competitor_metrics.videos_published : 'Not visible'}\n`
      if (tiktok.competitor_metrics.pricing?.average_final_price) {
        formatted += `- Average Final Price (Top 3 SKUs): ₱${tiktok.competitor_metrics.pricing.average_final_price}\n`
      }
      formatted += `- Live Sessions: ${tiktok.competitor_metrics.live_sessions_count !== null ? tiktok.competitor_metrics.live_sessions_count : 'Not visible'}\n`
      formatted += `\n`
    }
  }
  
  // Add competitive insights
  if (competitive_insights && competitive_insights.length > 0) {
    formatted += `COMPETITIVE INSIGHTS:\n`
    competitive_insights.forEach((insight: string) => {
      formatted += `- ${insight}\n`
    })
    formatted += `\n`
  }
  
  // Add data quality notes
  if (data_quality) {
    formatted += `DATA QUALITY:\n`
    formatted += `- Completeness: ${data_quality.completeness}\n`
    formatted += `- Confidence Level: ${data_quality.confidence_level}\n`
    if (data_quality.missing_data_notes) {
      formatted += `- Notes: ${data_quality.missing_data_notes}\n`
    }
  }
  
  return formatted
}