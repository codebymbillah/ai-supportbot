"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useSyncExternalStore } from "react"
import { Button } from "@/components/ui"
import { resetDemo, signOut, usePanel } from "@/lib/store"

// The shell for every signed-in page. Until the browser has read the saved demo data, nothing is decided, so a signed-in visitor is not sent to the login page by mistake.
const subscribe = () => () => {}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { user } = usePanel()
  const ready = useSyncExternalStore(subscribe, () => true, () => false)

  useEffect(() => {
    if (ready && !user) router.replace("/login")
  }, [ready, user, router])

  if (!ready || !user) return <div className="grid min-h-screen place-items-center text-sm text-muted">Loading…</div>

  return (
    <>
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <Link href="/sites" className="font-semibold tracking-tight">
            Support Chat Panel
          </Link>
          <div className="flex items-center gap-2 text-sm">
            <span className="hidden text-muted sm:inline">{user.email}</span>
            <Button
              small
              variant="ghost"
              onClick={() => {
                if (window.confirm("Put the demo data back as it was?")) resetDemo()
              }}
            >
              Reset demo
            </Button>
            <Button
              small
              onClick={() => {
                signOut()
                router.push("/login")
              }}
            >
              Sign out
            </Button>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-4 py-8">{children}</div>
    </>
  )
}
