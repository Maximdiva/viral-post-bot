export default function Home() {
  return (
    <main style={{ fontFamily: 'sans-serif', maxWidth: 600, margin: '60px auto', padding: '0 20px' }}>
      <h1 style={{ fontSize: 24, fontWeight: 600 }}>Viral Pulse Media — Post Bot</h1>
      <p style={{ color: '#666', marginTop: 8 }}>Auto-posting 9x/day to @viral_pulseme across Nigeria, US &amp; India</p>

      <div style={{ marginTop: 32, display: 'grid', gap: 16 }}>
        <div style={{ border: '1px solid #e5e5e5', borderRadius: 10, padding: '16px 20px' }}>
          <div style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>Schedule</div>
          <div style={{ fontSize: 15 }}>Morning · Noon · Evening × 3 regions = <strong>9 posts/day</strong></div>
        </div>

        <div style={{ border: '1px solid #e5e5e5', borderRadius: 10, padding: '16px 20px' }}>
          <div style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>Regions covered</div>
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            {['🇳🇬 Nigeria', '🇺🇸 United States', '🇮🇳 India'].map(r => (
              <span key={r} style={{ background: '#f3f3f3', borderRadius: 6, padding: '4px 10px', fontSize: 13 }}>{r}</span>
            ))}
          </div>
        </div>

        <div style={{ border: '1px solid #e5e5e5', borderRadius: 10, padding: '16px 20px' }}>
          <div style={{ fontSize: 12, color: '#999', marginBottom: 8 }}>API endpoints</div>
          <code style={{ display: 'block', fontSize: 13, color: '#333', marginBottom: 6 }}>GET /api/cron — runs full 3-region posting cycle</code>
          <code style={{ display: 'block', fontSize: 13, color: '#333' }}>POST /api/test-post — manually trigger a single post</code>
        </div>

        <div style={{ border: '1px solid #e5e5e5', borderRadius: 10, padding: '16px 20px', background: '#f9fffe' }}>
          <div style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>Status</div>
          <div style={{ fontSize: 15, color: '#16a34a', fontWeight: 500 }}>Bot is live and running on Vercel crons</div>
        </div>
      </div>
    </main>
  )
}
