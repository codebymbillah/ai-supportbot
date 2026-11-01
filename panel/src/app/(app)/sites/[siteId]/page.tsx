"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { Badge, Card, PageTitle, Toggle, fmtDate } from "@/components/ui"
import { saveSettings, useSite } from "@/lib/store"

// The client's home for one site: is the chat working, who is waiting, and what still needs setting up.
export default function OverviewPage() {
  const { siteId } = useParams<{ siteId: string }>()
  const site = useSite(siteId)
  if (!site) return null
  const base = `/sites/${site.id}`
  const { usage: u, settings: s } = site

  const waiting = site.chats.filter((c) => c.status !== "closed" && (c.unread || c.status === "agent" || c.flagged))
  const spendPct = Math.min(100, Math.round((u.spend / s.monthlyLimit) * 100))
  const problems = site.sources.filter((x) => x.status === "error")

  // What a new site still has to do, in the order it is usually done.
  const steps = [
    { done: site.domains.length > 0, label: "Add your domain", href: `${base}/install` },
    { done: site.status !== "pilot" || site.sources.some((x) => x.status === "ok") || site.products.length > 0, label: "Connect your products", href: `${base}/catalog` },
    { done: site.notes.length > 0, label: "Add delivery and return rules", href: `${base}/knowledge` },
    { done: !!(s.contact.phone || s.contact.email), label: "Add contact details for hand-over", href: `${base}/settings` },
    { done: s.enabled, label: "Switch the chat on", href: `${base}/settings` },
  ]
  const left = steps.filter((x) => !x.done)

  const stats = [
    { label: "Chats this month", value: u.chats.toLocaleString("en-US") },
    { label: "Answered by the assistant", value: u.chats ? `${100 - Math.round((u.handedOver / u.chats) * 100)}%` : "–" },
    { label: "First reply", value: u.chats ? `${u.firstReplySeconds} s` : "–" },
    { label: "Waiting for your team", value: String(waiting.length), tone: waiting.length ? "text-warn" : "" },
  ]

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
      <PageTitle
        title={site.name}
        hint={`${u.month}. Everything your visitors and the assistant did on ${site.domains[0] ?? "your site"}.`}
        action={
          <div className="flex items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-2.5">
            <span className="text-sm font-medium">{s.enabled ? "Chat is on" : "Chat is off"}</span>
            <Toggle checked={s.enabled} onChange={(v) => saveSettings(site.id, { ...s, enabled: v })} label="Chat on" />
          </div>
        }
      />

      {site.status === "suspended" && (
        <p role="alert" className="rounded-2xl bg-bad-soft px-5 py-4 text-sm text-bad">
          This site is paused by TechaByte, so the chat does not show. Contact us to turn it back on.
        </p>
      )}

      <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((x) => (
          <div key={x.label} className="rounded-2xl border border-line bg-surface px-5 py-4">
            <dt className="text-[13px] text-muted">{x.label}</dt>
            <dd className={`mt-1 text-[28px] font-semibold leading-tight tabular-nums tracking-[-0.02em] ${x.tone ?? ""}`}>{x.value}</dd>
          </div>
        ))}
      </dl>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card title="Waiting for your team" hint="Chats where a visitor asked for a person or the assistant needs help." action={<Link href={`${base}/inbox`} className="text-sm font-medium text-brand underline-offset-4 hover:underline">Open the inbox</Link>}>
          {waiting.length === 0 ? (
            <p className="text-sm text-muted">Nobody is waiting. The assistant is handling every chat.</p>
          ) : (
            <ul className="divide-y divide-line">
              {waiting.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="font-medium">{c.visitor}</p>
                    <p className="line-clamp-1 text-sm text-muted">{c.messages[c.messages.length - 1]?.text}</p>
                  </div>
                  <div className="flex shrink-0 gap-1.5">
                    {c.flagged && <Badge tone="bad">Needs attention</Badge>}
                    {c.status === "agent" ? <Badge tone="warn">With your team</Badge> : <Badge dot tone="ok">New</Badge>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {left.length > 0 ? (
          <Card title={`Finish setting up: ${steps.length - left.length} of ${steps.length} done`} hint="The assistant answers better with each step.">
            <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-sunken">
              <div className="h-full rounded-full bg-brand" style={{ width: `${((steps.length - left.length) / steps.length) * 100}%` }} />
            </div>
            <ul className="grid gap-1">
              {steps.map((x) => (
                <li key={x.label}>
                  <Link href={x.href} className="flex items-center gap-3 rounded-lg px-2 py-2 text-sm hover:bg-sunken">
                    <span className={`grid size-5 shrink-0 place-items-center rounded-full border ${x.done ? "border-brand bg-brand text-brand-ink" : "border-line-strong"}`} aria-hidden>
                      {x.done && (
                        <svg viewBox="0 0 12 12" className="size-3">
                          <path d="M2.5 6.2l2.2 2.2L9.5 3.6" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </span>
                    <span className={x.done ? "text-muted line-through" : "font-medium"}>{x.label}</span>
                    <span className="sr-only">{x.done ? "(done)" : "(to do)"}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        ) : (
          <Card title="Products the assistant knows" hint="Read from your own site." action={<Link href={`${base}/catalog`} className="text-sm font-medium text-brand underline-offset-4 hover:underline">Manage products</Link>}>
            <p className="text-[28px] font-semibold tabular-nums">{site.products.filter((p) => !p.hidden).length}</p>
            <ul className="mt-3 grid gap-2 text-sm">
              {site.sources.map((x) => (
                <li key={x.id} className="flex flex-wrap items-center justify-between gap-2">
                  <span className="truncate">{x.address}</span>
                  <span className="text-muted">{x.status === "error" ? <Badge tone="bad">Problem</Badge> : `read ${fmtDate(x.lastRead)}`}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>

      {(problems.length > 0 || spendPct >= 70) && (
        <Card title="Needs a look">
          <ul className="grid gap-2 text-sm">
            {problems.map((x) => (
              <li key={x.id}>
                <Link href={`${base}/catalog`} className="text-bad underline-offset-4 hover:underline">
                  {x.address}: {x.note}
                </Link>
              </li>
            ))}
            {spendPct >= 70 && (
              <li>
                <Link href={`${base}/usage`} className="text-warn underline-offset-4 hover:underline">
                  {spendPct}% of this month&apos;s AI limit is used. The chat stops at 100%.
                </Link>
              </li>
            )}
          </ul>
        </Card>
      )}
    </div>
  )
}
