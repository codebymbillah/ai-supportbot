"use client"

import Link from "next/link"
import { useParams, usePathname, useRouter } from "next/navigation"
import { useEffect, useSyncExternalStore } from "react"
import { ArrowLeftIcon, BarChart3Icon, BookOpenIcon, InboxIcon, LayoutDashboardIcon, type LucideIcon, PackageIcon, ShieldCheckIcon, SlidersHorizontalIcon, TerminalSquareIcon, UsersIcon } from "lucide-react"
import { Toaster } from "@/components/toast"
import { resetDemo, signOut, usePanel } from "@/lib/store"
import type { Site } from "@/lib/types"

// The shell for every signed-in page: a dark sidebar with the site switcher and the site's sections, and the page beside it.
// Until the browser has read the saved demo data nothing is decided, so a signed-in visitor is not sent to the login page by mistake.
const subscribe = () => () => {}

// Ordered by how often a shop owner opens them: the inbox daily, install once.
const SECTIONS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "", label: "Overview", icon: LayoutDashboardIcon },
  { href: "/inbox", label: "Inbox", icon: InboxIcon },
  { href: "/catalog", label: "Products", icon: PackageIcon },
  { href: "/knowledge", label: "Knowledge", icon: BookOpenIcon },
  { href: "/settings", label: "Settings", icon: SlidersHorizontalIcon },
  { href: "/team", label: "Team", icon: UsersIcon },
  { href: "/usage", label: "Usage", icon: BarChart3Icon },
  { href: "/install", label: "Install", icon: TerminalSquareIcon },
]

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { user, sites } = usePanel()
  const { siteId } = useParams<{ siteId?: string }>()
  const pathname = usePathname()
  const ready = useSyncExternalStore(subscribe, () => true, () => false)

  useEffect(() => {
    if (ready && !user) router.replace("/login")
  }, [ready, user, router])

  if (!ready || !user) return <div className="grid min-h-screen place-items-center text-sm text-muted">Loading…</div>
  const site = sites.find((s) => s.id === siteId)
  const isAdmin = pathname.startsWith("/admin")

  return (
    <div className="lg:pl-64">
      <aside className="bg-side text-side-ink lg:fixed lg:inset-y-0 lg:left-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex items-center justify-between gap-3 px-5 py-4 lg:py-5">
          <Link href="/sites" className="flex items-center gap-2.5 font-semibold tracking-tight">
            <Mark />
            Dotbyte Chat
          </Link>
          <Account email={user.email} className="lg:hidden" onSignOut={() => { signOut(); router.push("/login") }} />
        </div>

        {isAdmin ? (
          <p className="mx-3 mb-3 rounded-xl border border-side-line px-3 py-2.5 text-sm">
            <span className="block font-medium">TechaByte staff</span>
            <span className="block text-xs text-side-muted">Every client on the service</span>
          </p>
        ) : (
          <SiteSwitcher sites={sites} current={site} />
        )}

        {site && !isAdmin && <SiteNav site={site} />}
        {isAdmin && <AdminNav />}

        {/* Demo: anyone can open the staff view. In the real service only TechaByte accounts see this link. */}
        <div className="border-t border-side-line px-3 py-3">
          <Link
            href={isAdmin ? "/sites" : "/admin"}
            className="flex h-9 items-center gap-2.5 rounded-lg px-3 text-sm text-side-muted hover:bg-side-active/60 hover:text-side-ink"
          >
            {isAdmin ? <ArrowLeftIcon className="size-4" aria-hidden /> : <ShieldCheckIcon className="size-4" aria-hidden />}
            {isAdmin ? "Back to my sites" : "Super admin"}
          </Link>
        </div>

        <div className="mt-auto hidden border-t border-side-line px-5 py-4 lg:block">
          <Account email={user.email} onSignOut={() => { signOut(); router.push("/login") }} />
        </div>
      </aside>

      <main className="px-4 py-8 sm:px-8 lg:px-12 lg:py-10">{children}</main>
      <Toaster />
    </div>
  )
}

function Mark() {
  // A speech bubble whose tail is a check: the assistant answered.
  return (
    <svg viewBox="0 0 24 24" className="size-6" aria-hidden>
      <rect x="2" y="3" width="20" height="15" rx="5" fill="var(--brand)" />
      <path d="M7 18l-1 4 5-4" fill="var(--brand)" />
      <path d="M8 10.5l2.5 2.5L16 8" stroke="var(--brand-ink)" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function AdminNav() {
  const pathname = usePathname()
  const items = [
    { href: "/admin", label: "Overview", icon: LayoutDashboardIcon },
    { href: "/admin/clients", label: "Clients", icon: UsersIcon },
  ]
  return (
    <nav aria-label="Super admin" className="flex gap-1 overflow-x-auto border-t border-side-line px-3 py-3 lg:flex-col lg:overflow-visible">
      {items.map((s) => {
        const active = pathname === s.href
        return (
          <Link key={s.href} href={s.href} aria-current={active ? "page" : undefined} className={`relative flex h-9 shrink-0 items-center gap-3 rounded-lg px-3 text-sm ${active ? "bg-side-active font-medium text-side-ink" : "text-side-muted hover:bg-side-active/60 hover:text-side-ink"}`}>
            {active && <span aria-hidden className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-brand" />}
            <s.icon className={`size-4 shrink-0 ${active ? "text-brand" : ""}`} aria-hidden />
            {s.label}
          </Link>
        )
      })}
    </nav>
  )
}

function SiteSwitcher({ sites, current }: { sites: Site[]; current?: Site }) {
  const router = useRouter()
  return (
    <div className="px-3 pb-3">
      <label htmlFor="site-switch" className="sr-only">
        Site
      </label>
      <div className="relative">
        <select
          id="site-switch"
          value={current?.id ?? ""}
          onChange={(e) => router.push(e.target.value ? `/sites/${e.target.value}` : "/sites")}
          className="h-11 w-full appearance-none rounded-xl border border-side-line bg-side-active pl-3 pr-9 text-sm font-medium text-side-ink focus:border-brand"
        >
          <option value="">All sites</option>
          {sites.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <svg viewBox="0 0 12 12" className="pointer-events-none absolute right-3 top-1/2 size-3 -translate-y-1/2 text-side-muted" aria-hidden>
          <path d="M3 4.5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        </svg>
      </div>
      {current && (
        <p className="mt-2 flex items-center gap-2 px-1 text-xs text-side-muted">
          <span className={`size-1.5 rounded-full ${current.settings.enabled ? "bg-brand" : "bg-side-muted"}`} />
          {current.settings.enabled ? "Live on" : "Off for"} {current.domains[0] ?? "no domain yet"}
        </p>
      )}
    </div>
  )
}

function SiteNav({ site }: { site: Site }) {
  const pathname = usePathname()
  const base = `/sites/${site.id}`
  const waiting = site.chats.filter((c) => c.unread).length
  return (
    <nav aria-label="Site sections" className="flex gap-1 overflow-x-auto border-t border-side-line px-3 py-3 lg:flex-col lg:overflow-visible">
      {SECTIONS.map((s) => {
        const href = base + s.href
        const active = s.href === "" ? pathname === base : pathname.startsWith(href)
        return (
          <Link
            key={s.label}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`relative flex h-9 shrink-0 items-center gap-3 rounded-lg px-3 text-sm ${active ? "bg-side-active font-medium text-side-ink" : "text-side-muted hover:bg-side-active/60 hover:text-side-ink"}`}
          >
            {/* The active page also gets a jade bar on the left, so it stands out without relying on the shade alone. */}
            {active && <span aria-hidden className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-brand" />}
            <s.icon className={`size-4 shrink-0 ${active ? "text-brand" : ""}`} aria-hidden />
            <span className="flex-1">{s.label}</span>
            {s.label === "Inbox" && waiting > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-brand px-1.5 text-[11px] font-semibold text-brand-ink tabular-nums">{waiting}</span>}
          </Link>
        )
      })}
    </nav>
  )
}

function Account({ email, onSignOut, className = "" }: { email: string; onSignOut: () => void; className?: string }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-side-active text-xs font-semibold uppercase text-side-ink" aria-hidden>
        {email[0]}
      </span>
      <div className="hidden min-w-0 flex-1 lg:block">
        <p className="truncate text-sm">{email}</p>
        <div className="flex gap-3 text-xs text-side-muted">
          <button className="hover:text-side-ink" onClick={onSignOut}>
            Sign out
          </button>
          <button className="hover:text-side-ink" onClick={() => window.confirm("Put the demo data back as it was?") && resetDemo()}>
            Reset demo
          </button>
        </div>
      </div>
      <button className="text-xs text-side-muted hover:text-side-ink lg:hidden" onClick={onSignOut}>
        Sign out
      </button>
    </div>
  )
}
