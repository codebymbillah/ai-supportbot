import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = { title: "Support Chat Panel", description: "Manage your site's support chat." }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">{children}</body>
    </html>
  )
}
