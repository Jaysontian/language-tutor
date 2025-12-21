import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Language Tutor',
  description: 'A simple language tutor using OpenAI and Eleven Labs',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}


