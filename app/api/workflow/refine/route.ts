// app/api/workflow/refine/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { openai } from '@/lib/openai'
import { PROMPTS, fillPrompt } from '@/lib/prompts'

// Safe helpers (small subset)
function safeNum(x: any) {
  if (x == null) return null
  const n = Number(String(x).replace(/,/g, ''))
  return isNaN(n) ? null : n
}
function safeStr(x: any) {
  if (x == null) return null
  return String(x)
}
function ensureArray(x: any) {
  if (!x) return []
  return Array.isArray(x) ? x : [x]
}

// Validate extractedData minimal shape
function validateExtractedDataRefine(d: any) {
  const missing: string[] = []
  if (!d) {
    missing.push('extractedData (body missing)')
    return missing
  }
  if (!d.brand) missing.push('brand')
  else {
    if (!d.brand.name) missing.push('brand.name')
    if (!d.brand.category) missing.push('brand.category')
  }
  // optional platform_data check (warn if not present)
  if (!d.platform_data || Object.keys(d.platform_data).length === 0) {
    missing.push('platform_data (none provided)')
  }
  return missing
}

// A defensive formatter: returns readable text ONLY
function formatExtractedData(data: any): string {
  const brand = data?.brand ?? {}
  const competitors = ensureArray(data?.competitors)
  const platform_data = data?.platform_data ?? {}
  const competitive_insights = ensureArray(data?.competitive_insights)
  const data_quality = data?.data_quality

  let formatted = `=== EXTRACTED DATA FROM SCREENSHOTS ===\n\n`
  formatted += `BRAND: ${brand?.name ?? 'Unknown'}\n`
  formatted += `CATEGORY: ${brand?.category ?? 'Unknown'}\n`
  formatted += `COMPETITORS: ${competitors.map((c: any) => c?.name ?? 'Unnamed').join(', ') || 'None identified'}\n\n`

  const renderPlatform = (key: string, label: string) => {
    const pd = platform_data[key]
    if (!pd) {
      formatted += `--- ${label.toUpperCase()} DATA ---\nNo ${label} data provided.\n\n`
      return
    }

    const bm = pd.brand_metrics ?? {}
    formatted += `--- ${label.toUpperCase()} DATA ---\n`
    formatted += `Brand Metrics:\n`
    formatted += `- Shop Name: ${safeStr(bm.shop_name) ?? 'N/A'}\n`
    const followers = safeNum(bm.followers)
    formatted += `- Followers: ${followers != null ? followers.toLocaleString() : 'Not visible'}\n`
    const reviews = safeNum(bm.reviews_count)
    formatted += `- Reviews: ${reviews != null ? reviews.toLocaleString() : 'Not visible'}${bm.avg_rating ? ` (${bm.avg_rating}★)` : ''}\n`
    formatted += `- Shop Badge: ${safeStr(bm.shop_badge) ?? 'None'}\n`
    if (bm.pricing?.average_final_price != null) {
      const avgPrice = safeNum(bm.pricing.average_final_price)
      formatted += `- Average Final Price (Top 3 SKUs): ₱${avgPrice != null ? avgPrice : 'Not visible'}\n`
    }
    if (bm.promotions) {
      const vouchers = safeNum(bm.promotions.vouchers_active)
      formatted += `- Active Vouchers: ${vouchers != null ? vouchers : 'Not visible'}\n`
      if (Array.isArray(bm.promotions.voucher_examples) && bm.promotions.voucher_examples.length > 0) {
        formatted += `- Voucher Examples: ${bm.promotions.voucher_examples.join(', ')}\n`
      }
      if (Array.isArray(bm.promotions.non_voucher_promos) && bm.promotions.non_voucher_promos.length > 0) {
        formatted += `- Other Promos: ${bm.promotions.non_voucher_promos.join(', ')}\n`
      }
    }
    if (bm.content) {
      const videos = safeNum(bm.content.shopee_videos_count ?? bm.content.videos_published ?? bm.content.lazlook_videos_count)
      formatted += `- Content: ${videos != null ? `${videos} videos` : 'Not visible'}\n`
      const liveSessions = safeNum(bm.content.live_sessions_count)
      if (liveSessions != null) formatted += `- Live Sessions: ${liveSessions}\n`
    }
    formatted += `\n`

    // competitor metrics
    const cm = pd.competitor_metrics
    if (cm) {
      formatted += `Competitor Metrics (${safeStr(cm.competitor_name) ?? 'Unknown'}):\n`
      const cFollowers = safeNum(cm.followers)
      formatted += `- Followers: ${cFollowers != null ? cFollowers.toLocaleString() : 'Not visible'}\n`
      const cReviews = safeNum(cm.reviews_count)
      formatted += `- Reviews: ${cReviews != null ? cReviews.toLocaleString() : 'Not visible'}${cm.avg_rating ? ` (${cm.avg_rating}★)` : ''}\n`
      if (cm.pricing?.average_final_price != null) {
        const cp = safeNum(cm.pricing.average_final_price)
        formatted += `- Average Final Price (Top 3 SKUs): ₱${cp != null ? cp : 'Not visible'}\n`
      }
      formatted += `\n`
    }
  }

  renderPlatform('shopee', 'Shopee')
  renderPlatform('lazada', 'Lazada')
  renderPlatform('tiktok', 'TikTok Shop')

  if (competitive_insights.length > 0) {
    formatted += `COMPETITIVE INSIGHTS:\n`
    competitive_insights.forEach((ins: any) => {
      formatted += `- ${ins}\n`
    })
    formatted += `\n`
  }

  if (data_quality) {
    formatted += `DATA QUALITY:\n`
    formatted += `- Completeness: ${safeStr(data_quality.completeness) ?? 'Unknown'}\n`
    formatted += `- Confidence Level: ${safeStr(data_quality.confidence_level) ?? 'Unknown'}\n`
    if (data_quality.missing_data_notes) {
      formatted += `- Notes: ${safeStr(data_quality.missing_data_notes)}\n`
    }
    formatted += `\n`
  }

  // raw JSON for the model to reference (keeps it easy to read)
  formatted += `RAW_JSON_SOURCE:\n\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\`\n`

  return formatted
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { extractedData, conversationHistory, feedback } = body ?? {}

    // Validate minimal extractedData shape
    const missing = validateExtractedDataRefine(extractedData)
    if (missing.includes('extractedData (body missing)') || missing.includes('brand') || missing.includes('brand.name')) {
      return NextResponse.json({ error: 'Missing critical extractedData fields', missing }, { status: 400 })
    }

    // Build messages array
    const messages: any[] = []

    // system role: instruct the model clearly about Stage 1/Refine behavior
    messages.push({
      role: 'system',
      content: `You are a senior e-commerce strategist and Built to Scale™ expert. When asked to refine a plan, only use the provided data and prior assistant/user turns. If data is missing, include Data-Lock notices and avoid inventing numeric baselines.`,
    })

    // Format extractedData safely
    const dataContext = formatExtractedData(extractedData)

    // Fill prompt with safe fallbacks
    const promptText = fillPrompt(PROMPTS.stage1, {
      brand: extractedData?.brand?.name ?? 'Brand',
      category: extractedData?.brand?.category ?? 'Category',
      competitor:
        (Array.isArray(extractedData?.competitors) && extractedData.competitors[0]?.name) ??
        extractedData?.platform_data?.shopee?.competitor_metrics?.competitor_name ??
        'Competitor',
    })

    // initial user message = data + prompt
    messages.push({
      role: 'user',
      content: `${dataContext}\n\n${promptText}`,
    })

    // Add conversationHistory safely (could be null)
    const history = Array.isArray(conversationHistory) ? conversationHistory : []
    for (const turn of history) {
      if (!turn || !turn.role || !turn.content) continue
      // respect roles only 'assistant' or 'user'
      if (turn.role === 'assistant' || turn.role === 'user') {
        messages.push({ role: turn.role, content: String(turn.content) })
      }
    }

    // Add feedback
    messages.push({
      role: 'user',
      content: `Please revise the plan based on this feedback:\n\n${String(feedback ?? '')}`,
    })

    // Call OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages,
      max_tokens: 16000,
      temperature: 0.7,
    })

    const output = completion.choices?.[0]?.message?.content ?? ''

    return NextResponse.json({
      output,
      validation_warnings: missing,
      formatted_input: dataContext,
    })
  } catch (error: any) {
    console.error('Refine error:', error)
    return NextResponse.json({ error: error?.message ?? 'Refinement failed' }, { status: 500 })
  }
}
