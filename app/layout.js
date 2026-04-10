export const metadata = {
  title: 'Viral Pulse Media Bot',
  description: 'Auto-posting bot for @viral_pulseme',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
