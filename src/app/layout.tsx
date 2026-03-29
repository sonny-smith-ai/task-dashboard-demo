import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Task Dashboard',
  description: 'Real-time task tracking with audit logs',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        {children}
      </body>
    </html>
  )
}