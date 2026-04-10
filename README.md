# Viral Pulse Media — Auto Post Bot

Posts 9x/day to @viral_pulseme: morning, noon, evening × Nigeria, US, India.
Uses live web search to find trending topics, then Claude AI to write viral posts.

## Stack
- Next.js 14 App Router
- Vercel Cron Jobs (free tier)
- twitter-api-v2
- Anthropic Claude (web search + post generation)

## Setup

### 1. Clone & install
```bash
git clone <your-repo>
cd viral-post-bot
npm install
```

### 2. Set environment variables
In Vercel dashboard → Settings → Environment Variables, add:

| Variable | Value |
|---|---|
| TWITTER_API_KEY | DTykFGpBCWxQMc2P5fwFSoeNB |
| TWITTER_API_SECRET | wtoUFby14eYgxg7TGZt37DehCvDk9023x7iAcZ9IuhgMOKI0eu |
| TWITTER_ACCESS_TOKEN | 2015792494676455424-BUBtDqO6f9CoZLKuYdUIef7x6WhQr1 |
| TWITTER_ACCESS_SECRET | 4NAkrfhgbjI0r71NRGF1lwhVDrcLgK5sU0DmXLmhMpRvC |
| ANTHROPIC_API_KEY | your_anthropic_key |
| CRON_SECRET | any_random_string_you_choose |

### 3. Deploy to Vercel
```bash
npx vercel --prod
```

Vercel will auto-detect the crons in vercel.json and schedule them.

### 4. Test manually
```bash
# Test a single post
curl -X POST https://your-app.vercel.app/api/test-post \
  -H "Content-Type: application/json" \
  -d '{"region":"NG","slot":"morning"}'

# Run full cron cycle manually
curl https://your-app.vercel.app/api/cron
```

## Cron Schedule (UTC)
- 07:00 UTC → Morning posts (8am Nigeria, 3am US, 12:30pm India)
- 11:00 UTC → Noon posts (12pm Nigeria, 7am US, 4:30pm India)  
- 18:00 UTC → Evening posts (7pm Nigeria, 2pm US, 11:30pm India)

## How it works
1. Cron fires → calls `/api/cron`
2. For each region, Claude searches web for today's top trending topics
3. Claude writes a viral tweet tailored to that region's culture & time of day
4. Bot posts to X via OAuth 1.0a
5. 2 second delay between posts to respect rate limits
