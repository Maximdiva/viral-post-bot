import Groq from 'groq-sdk'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
const MODEL = 'llama-3.3-70b-versatile'
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY
const RAPIDAPI_HOST = 'twitter-v24.p.rapidapi.com'

const REGION_WOEIDS = {
  NG: 23424908,
  US: 23424977,
  IN: 23424848,
}

export const REGIONS = [
  {
    id: 'NG',
    name: 'Nigeria',
    voice: `You grew up in Lagos. You speak Pidgin when it fits naturally. You know the streets, the music scene, 
    Nollywood drama, EFCC wahala, sapa life, CBN policies, and Afrobeats beef. You say things like 
    "e don happen", "the matter don enter", "see gobe", "this one pass me". You know Burna Boy, 
    Wizkid, Davido, Portable, Bobrisky, VDM, Shallipopi. You reference ASUU, PVC, Aso Rock naturally.`,
    peakHoursUTC: [7, 8, 9, 11, 12, 18, 19, 20],
  },
  {
    id: 'US',
    name: 'United States',
    voice: `You are terminally online. You know NBA beef, NFL takes, pop culture drama, political chaos, 
    TikTok sounds, hip hop feuds, tech layoffs, Wall Street moves. You say things like "bro what", 
    "this is insane", "no way this is real", "they cooked", "the audacity". You know Drake, Kendrick, 
    Taylor Swift, Trump, LeBron, Elon, Zuckerberg energy.`,
    peakHoursUTC: [12, 13, 14, 20, 21, 22, 23],
  },
  {
    id: 'IN',
    name: 'India',
    voice: `You live on Twitter India. You know IPL drama, Bollywood fights, UPSC pain, startup culture, 
    political news, reels trends, influencer beef. You say things like "this guy is something else", 
    "absolute scenes", "only in India", "the audacity of this man". You know Kohli, Rohit, Shah Rukh, 
    Ranveer, Modi, Kejriwal, the startup bros.`,
    peakHoursUTC: [4, 5, 6, 13, 14, 15, 16],
  },
]

export function getRegionsByPriority() {
  const nowUTC = new Date().getUTCHours()
  const scored = REGIONS.map(region => {
    const isPeak = region.peakHoursUTC.includes(nowUTC)
    const nearPeak = region.peakHoursUTC.some(h => Math.abs(h - nowUTC) <= 1)
    const score = isPeak ? 100 : nearPeak ? 50 : 10
    return { ...region, score }
  })
  return scored.sort((a, b) => b.score - a.score)
}

export function getCurrentSlot() {
  const hour = new Date().getUTCHours()
  if (hour >= 5 && hour < 10) return 'morning'
  if (hour >= 10 && hour < 15) return 'noon'
  return 'evening'
}

async function getTopTrend(regionId) {
  const woeid = REGION_WOEIDS[regionId]
  try {
    const res = await fetch(`https://${RAPIDAPI_HOST}/trends/?woeid=${woeid}`, {
      headers: {
        'x-rapidapi-host': RAPIDAPI_HOST,
        'x-rapidapi-key': RAPIDAPI_KEY,
        'Content-Type': 'application/json',
      },
    })
    if (!res.ok) throw new Error(`Trends API error: ${res.status}`)
    const data = await res.json()
    const trends = data?.trends || data?.[0]?.trends || []
    if (!trends.length) throw new Error('No trends returned')
    const sorted = trends
      .filter(t => t.name && !t.name.startsWith('#'))
      .sort((a, b) => (b.tweet_volume || 0) - (a.tweet_volume || 0))
    const top = sorted[0] || trends[0]
    return { name: top.name, tweetVolume: top.tweet_volume || 0, url: top.url || '' }
  } catch (e) {
    console.error('[TRENDS] Error:', e.message)
    return null
  }
}

async function searchLiveTweets(topicName) {
  try {
    const query = encodeURIComponent(`${topicName} -is:retweet lang:en`)
    const res = await fetch(
      `https://${RAPIDAPI_HOST}/search/?query=${query}&section=top&limit=20`,
      {
        headers: {
          'x-rapidapi-host': RAPIDAPI_HOST,
          'x-rapidapi-key': RAPIDAPI_KEY,
          'Content-Type': 'application/json',
        },
      }
    )
    if (!res.ok) throw new Error(`Search API error: ${res.status}`)
    const data = await res.json()

    // EXACT PATH: data.search_by_raw_query.search_timeline.timeline.instructions[].entries[].itemContent.tweet_results.result
    const entries = data
      ?.data
      ?.search_by_raw_query
      ?.search_timeline
      ?.timeline
      ?.instructions
      ?.flatMap(i => i?.entries || []) || []

    console.log(`[SEARCH] Found ${entries.length} entries for "${topicName}"`)

    const extracted = []
    const seen = new Set()

    for (const entry of entries) {
      const result = entry?.content?.itemContent?.tweet_results?.result
      if (!result) continue

      const legacy = result?.legacy
      const userLegacy = result?.core?.user_results?.result?.legacy

      if (!legacy || !userLegacy) continue

      const text = legacy.full_text || legacy.text || ''
      const handle = userLegacy.screen_name || 'unknown'
      const tweetId = legacy.id_str || result.rest_id || ''
      const key = `${handle}:${text.slice(0, 30)}`

      if (text.length > 10 && !seen.has(key)) {
        seen.add(key)
        extracted.push({
          user: handle,
          name: userLegacy.name || 'Unknown',
          text: text.replace(/https?:\/\/t\.co\/\S+/g, '').trim(),
          likes: Number(legacy.favorite_count || 0),
          retweets: Number(legacy.retweet_count || 0),
          url: `https://twitter.com/${handle}/status/${tweetId}`,
        })
      }

      if (extracted.length >= 15) break
    }

    console.log(`[SEARCH] Extracted ${extracted.length} tweets for "${topicName}"`)
    return extracted
  } catch (e) {
    console.error('[SEARCH] Error:', e.message)
    return []
  }
}

async function buildThreadFromRealTweets(region, slot, topicName, liveTweets) {
  const slotEnergy = {
    morning: 'morning — people just woke up and opened X. Hook them instantly.',
    noon: 'lunch break — people are scrolling hard. Make it impossible to stop.',
    evening: 'evening — fully relaxed, ready for drama. Go all in.',
  }

  const today = new Date().toDateString()
  const searchLink = `https://twitter.com/search?q=${encodeURIComponent(topicName)}&f=live`

  const tweetDump = liveTweets
    .sort((a, b) => (b.likes + b.retweets * 2) - (a.likes + a.retweets * 2))
    .slice(0, 12)
    .map((t, i) => `[${i + 1}] @${t.user} (${t.likes} likes, ${t.retweets} RTs):\n"${t.text}"\n${t.url}`)
    .join('\n\n')

  const prompt = `You are the social media voice of @viral_pulseme — a culture and news page covering everything trending.
Today is ${today}.

YOUR VOICE: ${region.voice}

TRENDING ON X RIGHT NOW: "${topicName}"

REAL TWEETS PEOPLE ARE POSTING RIGHT NOW:
${tweetDump}

Using ONLY the real tweets above, write a Twitter thread of 4 to 6 tweets breaking this down like a plugged-in friend sending you the tea.

TWEET 1 (hook): Most shocking or dramatic angle from those tweets. Stop the scroll. Under 240 chars.
TWEET 2 (what is happening): Explain based on what people are actually tweeting. Like texting a friend. Under 260 chars.
TWEET 3 (receipts): Quote one of the most liked tweets verbatim. Credit the @handle. Under 260 chars.
TWEET 4 (the split): Both sides of the conversation from the real tweets. Under 260 chars.
TWEET 5 (take and link): Hot take then: "check the live tweets: ${searchLink}". Under 260 chars.
TWEET 6 (optional): Only if there is more spice. Otherwise stop at 5.

HARD RULES:
- ONLY use info from the real tweets above. Do NOT invent anything.
- NO em dashes (no — or --)
- NO AI language. Sound like a real 23-year-old on X.
- NO hashtags unless in the real tweets. Max 1 total.
- Number tweets: "1/" "2/" "3/" etc.
- Time context: ${slotEnergy[slot]}

Return ONLY a valid JSON array of tweet strings. Nothing else.
["1/ tweet one", "2/ tweet two", "3/ tweet three"]`

  try {
    const response = await groq.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: 'You are a viral social media writer. Write only from the real tweets given. Return ONLY a valid JSON array of tweet strings. No markdown, no backticks.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.85,
      max_tokens: 2500,
    })
    const raw = response.choices[0].message.content.trim()
    const clean = raw.replace(/```json|```/g, '').trim()
    const start = clean.indexOf('[')
    const end = clean.lastIndexOf(']')
    if (start === -1 || end === -1) throw new Error('No JSON array found')
    const tweets = JSON.parse(clean.slice(start, end + 1))
    if (!Array.isArray(tweets)) throw new Error('Not an array')
    return tweets.filter(t => typeof t === 'string' && t.trim().length > 0)
  } catch (e) {
    console.error('[THREAD] Build error:', e.message)
    return null
  }
}

export async function generateThread(region, slot) {
  console.log(`[GEN] Getting top trend for ${region.name}...`)
  const trend = await getTopTrend(region.id)
  if (!trend) { console.error(`[GEN] No trend found for ${region.name}`); return null }

  console.log(`[GEN] Trend: "${trend.name}" — searching live tweets...`)
  const liveTweets = await searchLiveTweets(trend.name)
  if (!liveTweets || liveTweets.length === 0) {
    console.error(`[GEN] No live tweets found for "${trend.name}"`)
    return null
  }

  console.log(`[GEN] ${liveTweets.length} tweets found. Building thread...`)
  const tweets = await buildThreadFromRealTweets(region, slot, trend.name, liveTweets)
  if (!tweets || tweets.length === 0) { console.error(`[GEN] Thread build failed`); return null }

  return {
    topic: trend.name,
    trendVolume: trend.tweetVolume,
    sourceTweetCount: liveTweets.length,
    tweets,
    searchUrl: `https://twitter.com/search?q=${encodeURIComponent(trend.name)}&f=live`,
    vibe: 'live',
  }
}
