import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'Statosphere',
    template: '%s — Statosphere',
  },
  description: 'Your personal growth, structured by people who know you.',
  keywords: [
    'personal development',
    'accountability',
    'self improvement',
    'habit tracking',
    'council',
    'growth',
  ],
  authors: [{ name: 'Statosphere' }],
  creator: 'Statosphere',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: process.env.NEXT_PUBLIC_SITE_URL,
    siteName: 'Statosphere',
    title: 'Statosphere',
    description: 'Your personal growth, structured by people who know you.',
  },
  twitter: {
    card: 'summary',
    title: 'Statosphere',
    description: 'Your personal growth, structured by people who know you.',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#EBF0E5',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body
        style={{
          fontFamily: "'Spectral', 'Georgia', serif",
          backgroundColor: '#EBF0E5',
          color: '#161D14',
        }}
      >
        {children}
      </body>
    </html>
  )
}
