export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const topic = searchParams.get('topic') || 'Burna Boy'
  try {
    const query = encodeURIComponent(`${topic} -is:retweet lang:en`)
    const res = await fetch(
      `https://twitter-v24.p.rapidapi.com/search/?query=${query}&section=top&limit=5`,
      {
        headers: {
          'x-rapidapi-host': 'twitter-v24.p.rapidapi.com',
          'x-rapidapi-key': process.env.RAPIDAPI_KEY,
          'Content-Type': 'application/json',
        },
      }
    )
    const data = await res.json()
    function shallowMap(obj, depth) {
      if (depth === 0 || !obj || typeof obj !== 'object') return typeof obj
      if (Array.isArray(obj)) return `Array(${obj.length}) [${shallowMap(obj[0], depth - 1)}]`
      const out = {}
      for (const k of Object.keys(obj).slice(0, 8)) out[k] = shallowMap(obj[k], depth - 1)
      return out
    }
    return Response.json({
      topLevelKeys: Object.keys(data || {}),
      structure: shallowMap(data, 3),
      rawSample: JSON.stringify(data).slice(0, 3000),
    })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}