import type { Metadata } from 'next'
import { Poppins } from 'next/font/google'
import './globals.css'
import { ArenaEmailProvider } from '@/components/arena-email-provider'
import { getArenaEmailId } from '@/lib/arena-email'

const poppins = Poppins({ subsets: ['latin'], weight: ['400', '500', '600', '700'] })

export const metadata: Metadata = {
  title: 'AdScope — Competitor Ad Analysis',
  description: 'Discover competitors for any domain and analyze their ads across platforms.',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const emailId = await getArenaEmailId()
  return (
    <html lang="en">
      <body className={poppins.className}>
        <ArenaEmailProvider emailId={emailId}>{children}</ArenaEmailProvider>
      </body>
    </html>
  )
}
