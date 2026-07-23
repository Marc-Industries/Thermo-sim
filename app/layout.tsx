import '@/styles/globals.css'
import type { Metadata } from 'next'
import RootProvider from '@/components/RootProvider'

export const metadata: Metadata = {
  title: 'Thermonator Pro',
  description: 'Advanced thermodynamic simulation, calculation and visualization',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="it" suppressHydrationWarning>
      <head />
      <body className="bg-gradient-to-br from-slate-950 to-slate-900 text-slate-100">
        <RootProvider>
          {children}
        </RootProvider>
      </body>
    </html>
  )
}
