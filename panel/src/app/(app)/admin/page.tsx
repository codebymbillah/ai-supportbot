"use client"

import Link from "next/link"
import { Badge, Card, PageTitle } from "@/components/ui"
import { usePanel } from "@/lib/store"
import { PLAN_LABEL } from "@/lib/labels"
import type { Plan } from "@/lib/types"

// TechaByte's own view across every client: is the service healthy, who needs help, what it costs. Staff only in the real service.

export default function AdminOverview() {
  const { sites } = usePanel()
  const live = sites.filter((s) => s.settings.enabled && s.status !== "suspended")
  const chats = sites.reduce((n, s) => n + s.usage.chats, 0)
  const handed = sites.reduce((n, s) => n + s.usage.handedOver, 0)
  const spend = sites.reduce((n, s) => n + s.usage.spend, 0)

  // Everything a staff member should act on today, worst first.
  const attention = [
    ...sites.flatMap((s) => s.sources.filter((x) => x.status === "error").map((x) => ({ tone: "bad" as const, site: s, text: `Product source failing: ${x.note}` }))),
    ...sites.filter((s) => s.usage.spend / s.settings.monthlyLimit >= 0.7).map((s) => ({ tone: "warn" as const, site: s, text: `${Math.round((s.usage.spend / s.settings.monthlyLimit) * 100)}% of the monthly AI limit used` })),
    ...sites.filter((s) => s.chats.some((c) => c.flagged && c.status !== "closed")).map((s) => ({ tone: "warn" as const, site: s, text: "A visitor's chat is marked as needing attention" })),
    ...sites.filter((s) => s.status === "pilot" && !s.settings.enabled).map((s) => ({ tone: "plain" as const, site: s, text: "Pilot set up but the chat is still off" })),
    ...sites.filter((s) => s.sources.length === 0 && s.products.length === 0).map((s) => ({ tone: "plain" as const, site: s, text: "No products connected yet" })),
  ]

  const stats = [
    { label: "Clients", value: String(new Set(sites.map((s) => s.client)).size) },
    { label: "Sites live", value: `${live.length} of ${sites.length}` },
    { label: "Chats this month", value: chats.toLocaleString("en-US") },
    { label: "Handed to a person", value: chats ? `${Math.round((handed / chats) * 100)}%` : "–" },
    { label: "AI spend this month", value: `$${spend.toFixed(2)}` },
  ]
  const byPlan = (["pilot", "starter", "growth"] as Plan[]).map((p) => ({ plan: p, count: sites.filter((s) => s.plan === p).length }))

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
      <PageTitle title="Service overview" hint="Every client site on the chat service, this month." action={<Link href="/admin/clients" className="text-sm font-medium text-brand underline-offset-4 hover:underline">All clients</Link>} />

      <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {stats.map((x) => (
          <div key={x.label} className="rounded-2xl border border-line bg-surface px-5 py-4">
            <dt className="text-[13px] text-muted">{x.label}</dt>
            <dd className="mt-1 text-[28px] font-semibold leading-tight tracking-[-0.02em]">{x.value}</dd>
          </div>
        ))}
      </dl>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card title="Needs attention" hint="Act on these first. Each opens the client's site.">
          {attention.length === 0 ? (
            <p className="text-sm text-muted">Nothing needs attention.</p>
          ) : (
            <ul className="divide-y divide-line">
              {attention.map((a, i) => (
                <li key={i}>
                  <Link href={`/sites/${a.site.id}`} className="-mx-2 flex items-center justify-between gap-4 rounded-lg px-2 py-3 hover:bg-sunken">
                    <span className="min-w-0">
                      <span className="block font-medium">{a.site.name}</span>
                      <span className="block text-sm text-muted">{a.text}</span>
                    </span>
                    <Badge tone={a.tone}>{a.tone === "bad" ? "Broken" : a.tone === "warn" ? "Watch" : "Setup"}</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Sites by plan">
          <ul className="grid gap-4">
            {byPlan.map((p) => (
              <li key={p.plan}>
                <div className="flex justify-between text-sm">
                  <span>{PLAN_LABEL[p.plan]}</span>
                  <span className="tabular-nums text-muted">{p.count}</span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-sunken">
                  <div className="h-full rounded-full bg-brand" style={{ width: `${sites.length ? (p.count / sites.length) * 100 : 0}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  )
}
