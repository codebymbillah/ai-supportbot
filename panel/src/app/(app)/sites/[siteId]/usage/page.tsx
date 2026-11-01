"use client"

import { useParams } from "next/navigation"
import { Card, PageTitle } from "@/components/ui"
import { useSite } from "@/lib/store"

export default function UsagePage() {
  const { siteId } = useParams<{ siteId: string }>()
  const site = useSite(siteId)
  if (!site) return null
  const { usage: u, settings } = site
  const pct = Math.min(100, Math.round((u.spend / settings.monthlyLimit) * 100))
  const handedPct = u.chats ? Math.round((u.handedOver / u.chats) * 100) : 0

  const stats = [
    { label: "Chats", value: String(u.chats) },
    { label: "Handed to a person", value: `${u.handedOver} (${handedPct}%)` },
    { label: "First reply", value: u.chats ? `${u.firstReplySeconds} s` : "–" },
  ]
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
      <PageTitle title={`Usage, ${u.month}`} hint="What the chat did this month and what it cost." />
      <dl className="grid gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-line bg-surface p-6">
            <dt className="text-sm text-muted">{s.label}</dt>
            <dd className="mt-1 text-2xl font-semibold tabular-nums">{s.value}</dd>
          </div>
        ))}
      </dl>
      <Card title="AI spend" hint="The chat stops and shows your contact details when the monthly limit is reached. Change the limit in Settings.">
        <p className="text-sm">
          ${u.spend.toFixed(2)} of ${settings.monthlyLimit} ({pct}%)
        </p>
        <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Spend against the monthly limit">
          <div className={`h-full rounded-full ${pct >= 90 ? "bg-bad" : pct >= 70 ? "bg-warn" : "bg-brand"}`} style={{ width: `${pct}%` }} />
        </div>
        {pct >= 70 && <p className="mt-3 text-sm text-warn">{pct >= 90 ? "Almost at the limit." : "More than two thirds used."}</p>}
      </Card>
    </div>
  )
}
