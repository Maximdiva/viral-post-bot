import { getTwitterClient } from '../../../lib/twitter'
import { generateThread, getRegionsByPriority, getCurrentSlot } from '../../../lib/generator'

async function postThread(twitter, tweets) {
  const postedIds = []

  for (let i = 0; i < tweets.length; i++) {
    const tweetText = tweets[i]

    const payload = i === 0
      ? { text: tweetText }
      : { text: tweetText, reply: { in_reply_to_tweet_id: postedIds[i - 1] } }

    const result = await twitter.v2.tweet(payload)
    postedIds.push(result.data.id)

    // Delay between replies to avoid rate limiting
    if (i < tweets.length - 1) {
      await new Promise(r => setTimeout(r, 3000))
    }
  }

  return postedIds
}

export async function GET(request) {
  const authHeader = request.headers.get('authorization')
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const slot = getCurrentSlot()
  const regions = getRegionsByPriority()
  const twitter = getTwitterClient()
  const results = []

  console.log(`[CRON] ${slot} run started at ${new Date().toISOString()}`)
  console.log(`[CRON] Region priority order: ${regions.map(r => `${r.name}(${r.score})`).join(', ')}`)

  for (const region of regions) {
    try {
      console.log(`[CRON] Generating thread for ${region.name}...`)
      const thread = await generateThread(region, slot)

      if (!thread) {
        results.push({ region: region.name, status: 'error', error: 'Thread generation failed' })
        continue
      }

      console.log(`[CRON] Posting ${thread.tweets.length}-tweet thread for ${region.name}: "${thread.topic}"`)
      const tweetIds = await postThread(twitter, thread.tweets)

      results.push({
        region: region.name,
        status: 'posted',
        topic: thread.topic,
        tweetCount: thread.tweets.length,
        firstTweetId: tweetIds[0],
        tweetIds,
        vibe: thread.vibe,
      })

      console.log(`[CRON] Thread posted for ${region.name}. First tweet ID: ${tweetIds[0]}`)

      // 5 second gap between regions
      await new Promise(r => setTimeout(r, 5000))
    } catch (err) {
      console.error(`[CRON] Error posting for ${region.name}:`, err.message)
      results.push({ region: region.name, status: 'error', error: err.message })
    }
  }

  const posted = results.filter(r => r.status === 'posted').length
  console.log(`[CRON] Done. ${posted}/${regions.length} threads posted.`)

  return Response.json({
    slot,
    timestamp: new Date().toISOString(),
    regionPriority: regions.map(r => ({ name: r.name, score: r.score })),
    results,
  })
}
