import { getTwitterClient } from '../../../lib/twitter'
import { generateThread, REGIONS, getCurrentSlot } from '../../../lib/generator'

async function postThread(twitter, tweets) {
  const postedIds = []

  for (let i = 0; i < tweets.length; i++) {
    const tweetText = tweets[i]
    const payload = i === 0
      ? { text: tweetText }
      : { text: tweetText, reply: { in_reply_to_tweet_id: postedIds[i - 1] } }

    const result = await twitter.v2.tweet(payload)
    postedIds.push(result.data.id)
    if (i < tweets.length - 1) await new Promise(r => setTimeout(r, 3000))
  }

  return postedIds
}

export async function POST(request) {
  try {
    const body = await request.json()
    const regionId = body.region || 'NG'
    const slot = body.slot || getCurrentSlot()
    const dryRun = body.dry_run === true

    const region = REGIONS.find(r => r.id === regionId) || REGIONS[0]
    const twitter = getTwitterClient()

    console.log(`[TEST] Generating thread for ${region.name} / ${slot}${dryRun ? ' (DRY RUN)' : ''}`)
    const thread = await generateThread(region, slot)

    if (!thread) {
      return Response.json({ status: 'error', error: 'Thread generation failed' }, { status: 500 })
    }

    if (dryRun) {
      return Response.json({
        status: 'dry_run',
        region: region.name,
        slot,
        topic: thread.topic,
        vibe: thread.vibe,
        tweets: thread.tweets,
        note: 'Set dry_run: false to actually post this thread',
      })
    }

    const tweetIds = await postThread(twitter, thread.tweets)

    return Response.json({
      status: 'posted',
      region: region.name,
      slot,
      topic: thread.topic,
      vibe: thread.vibe,
      tweetCount: thread.tweets.length,
      tweets: thread.tweets,
      tweetIds,
      firstTweetUrl: `https://twitter.com/viral_pulseme/status/${tweetIds[0]}`,
    })
  } catch (err) {
  console.error('[POST ERROR]', err?.data || err?.message || err)
  return Response.json({ 
    status: 'error', 
    error: err.message,
    twitterError: err?.data,  // shows Twitter's actual rejection reason
    code: err?.code
  }, { status: 500 })
}
}

export async function GET() {
  return Response.json({
    usage: 'POST with { "region": "NG|US|IN", "slot": "morning|noon|evening", "dry_run": true|false }',
    tip: 'Use dry_run: true to preview the thread without posting it',
  })
}
