"use client"

import Link from "next/link"
import { useParams, usePathname } from "next/navigation"
import { Badge, Empty } from "@/components/ui"
import { useSite } from "@/lib/store"

const TABS = [
  { href: "", label: "Install" },
  { href: "/settings", label: "Settings" },
  { href: "/catalog", label: "Products" },
  { href: "/knowledge", label: "Knowledge" },
  { href: "/inbox", label: "Inbox" },
  { href: "/team", label: "Team" },
  { href: "/usage", label: "Usage" },
]

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  const { siteId } = useParams<{ siteId: string }>()
  const pathname = usePathname()
  const site = useSite(siteId)

  if (!site)
    return (
      <Empty title="This site does not exist">
        <Link href="/sites" className="underline">
          Back to your sites
        </Link>
      </Empty>
    )

  const base = `/sites/${site.id}`
  const unread = site.chats.filter((c) => c.unread).length
  return (
    <>
      <div className="mb-1 text-sm">
        <Link href="/sites" className="text-muted hover:text-ink">
          All sites
        </Link>
      </div>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-semibold tracking-tight">{site.name}</h1>
        <Badge tone={site.settings.enabled ? "ok" : "plain"}>{site.settings.enabled ? "Chat on" : "Chat off"}</Badge>
      </div>
      <nav aria-label="Site sections" className="mb-8 flex gap-1 overflow-x-auto border-b border-line">
        {TABS.map((t) => {
          const href = base + t.href
          const active = t.href === "" ? pathname === base : pathname.startsWith(href)
          return (
            <Link
              key={t.label}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`-mb-px shrink-0 border-b-2 px-3 py-2 text-sm font-medium ${active ? "border-brand text-ink" : "border-transparent text-muted hover:text-ink"}`}
            >
              {t.label}
              {t.label === "Inbox" && unread > 0 && <span className="ml-1.5 rounded-full bg-brand px-1.5 text-xs text-brand-ink">{unread}</span>}
            </Link>
          )
        })}
      </nav>
      {children}
    </>
  )
}
