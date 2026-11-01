"use client"

// components/chat.tsx: the FULL setup, for a project that wants its own words, colours, money format, cart or Bangla font.
// Most projects need none of this: see minimal-layout.tsx.
import { usePathname } from "next/navigation"
import { useMemo } from "react"
import { BANGLA_LABELS, createHttpTransport, DotbyteChat, type DotbyteChatConfig } from "dotbyte-chat"
import "dotbyte-chat/styles.css"
import { taka } from "@/utils"

const BRAND = "Acme Books"
const transport = createHttpTransport("/api/chat", { brandName: BRAND, labels: BANGLA_LABELS })

/** `settings` comes from the backend's GET /chat/config (read on the server): names, greeting, chips, whether photos are on. */
export function AcmeChat({ settings }: { settings?: { assistantName?: string; greeting?: string; images?: DotbyteChatConfig["images"] } }) {
  const pathname = usePathname()

  const config = useMemo<DotbyteChatConfig>(
    () => ({
      brandName: BRAND,
      assistantName: settings?.assistantName ?? "Acme assistant",
      tagline: "বাংলা ও ইংরেজিতে উত্তর দিই",
      greeting: settings?.greeting ?? "স্বাগতম! কীভাবে সাহায্য করতে পারি?",
      suggestions: [{ label: "বই খুঁজুন", message: "আমি একটি বই খুঁজছি" }],
      placeholder: "এখানে লিখুন…",
      disclaimer: "এটি একটি AI সহকারী, ভুল হতে পারে।",
      privacyHref: "/privacy",
      transport,
      formatMoney: taka,
      storageKey: "acme:chat:v1", // different per project, so two sites on one domain never share a chat
      images: settings?.images,
      theme: { brand: "#2563eb", brandForeground: "#ffffff", brandText: "#1d4ed8", ink: "#0f172a", link: "#1d4ed8", success: "#047857" },
      labels: BANGLA_LABELS,
      bengaliFontClass: "font-bangla", // the class of the project's Bangla font, if it has one
      // onAddProduct: (card) => cart.add(...), // only if the project has a cart; without it product cards have no "Add" button
    }),
    [settings]
  )

  return <DotbyteChat config={config} context={{ path: pathname }} fallbackContact={{ phone: "+8801700000000", hours: "10am to 7pm" }} />
}
