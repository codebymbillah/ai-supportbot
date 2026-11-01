import type { Metadata } from "next"
import { Schibsted_Grotesk } from "next/font/google"
import "./globals.css"

const ui = Schibsted_Grotesk({ subsets: ["latin"], variable: "--font-ui", display: "swap" })

export const metadata: Metadata = { title: "Dotbyte Chat", description: "Run the chat on your site." }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // Browser extensions add attributes to these two tags before React loads; that is not a bug in the page.
    <html lang="en" className={ui.variable} suppressHydrationWarning>
      <body className="min-h-screen" suppressHydrationWarning>{children}</body>
    </html>
  )
}
