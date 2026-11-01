import type { Metadata } from "next"
import { Schibsted_Grotesk } from "next/font/google"
import "./globals.css"

const ui = Schibsted_Grotesk({ subsets: ["latin"], variable: "--font-ui", display: "swap" })

export const metadata: Metadata = { title: "Support Chat Panel", description: "Run the support chat on your site." }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={ui.variable}>
      <body className="min-h-screen">{children}</body>
    </html>
  )
}
