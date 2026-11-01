"use client"

import Link from "next/link"
import { useState } from "react"
import { Badge, Button, Input, PageTitle, Select, fmtDate } from "@/components/ui"
import { setPlan, setSiteStatus, usePanel } from "@/lib/store"
import type { Plan, SiteStatus } from "@/lib/types"
import { PLAN_LABEL } from "@/lib/labels"

const STATUS: Record<SiteStatus, { label: string; tone: "ok" | "warn" | "bad" }> = {
  active: { label: "Active", tone: "ok" },
  pilot: { label: "Pilot", tone: "warn" },
  suspended: { label: "Paused", tone: "bad" },
}

export default function AdminClients() {
  const { sites } = usePanel()
  const [q, setQ] = useState("")
  const [status, setStatus] = useState<"all" | SiteStatus>("all")
  const list = sites.filter((s) => (status === "all" || s.status === status) && (!q.trim() || `${s.name} ${s.client} ${s.domains.join(" ")}`.toLowerCase().includes(q.trim().toLowerCase())))

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
      <PageTitle title="Clients" hint="Change a plan, pause a site that breaks the terms or stops paying, or open a site to help its owner." />

      <div className="flex flex-wrap gap-3">
        <Input aria-label="Search clients" placeholder="Search by name or domain" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />
        <Select aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value as typeof status)} className="w-44!">
          <option value="all">Every status</option>
          <option value="active">Active</option>
          <option value="pilot">Pilot</option>
          <option value="suspended">Paused</option>
        </Select>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
        <table className="w-full min-w-[920px] text-left text-sm">
          <thead className="border-b border-line text-[13px] text-muted">
            <tr>
              <th className="px-5 py-3 font-medium">Site</th>
              <th className="px-3 py-3 font-medium">Status</th>
              <th className="px-3 py-3 font-medium">Plan</th>
              <th className="px-3 py-3 font-medium">Chats</th>
              <th className="px-3 py-3 font-medium">AI spend</th>
              <th className="px-3 py-3 font-medium">Products read</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {list.map((s) => {
              const pct = Math.min(100, Math.round((s.usage.spend / s.settings.monthlyLimit) * 100))
              const lastRead = s.sources.map((x) => x.lastRead).filter(Boolean).sort().pop() ?? null
              const failing = s.sources.some((x) => x.status === "error")
              return (
                <tr key={s.id}>
                  <td className="px-5 py-4">
                    <p className="font-medium">{s.name}</p>
                    <p className="text-[13px] text-muted">
                      {s.client}, {s.domains[0] ?? "no domain"}
                    </p>
                  </td>
                  <td className="px-3 py-4">
                    <div className="flex flex-col items-start gap-1">
                      <Badge dot tone={STATUS[s.status].tone}>{STATUS[s.status].label}</Badge>
                      <span className="text-xs text-muted">{s.settings.enabled ? "Chat on" : "Chat off"}</span>
                    </div>
                  </td>
                  <td className="px-3 py-4">
                    <Select aria-label={`Plan for ${s.name}`} value={s.plan} onChange={(e) => setPlan(s.id, e.target.value as Plan)} className="h-8! w-28! text-[13px]">
                      {(Object.keys(PLAN_LABEL) as Plan[]).map((p) => (
                        <option key={p} value={p}>
                          {PLAN_LABEL[p]}
                        </option>
                      ))}
                    </Select>
                  </td>
                  <td className="px-3 py-4 tabular-nums">{s.usage.chats.toLocaleString("en-US")}</td>
                  <td className="px-3 py-4">
                    <p>
                      ${s.usage.spend.toFixed(2)} <span className="text-muted">of ${s.settings.monthlyLimit}</span>
                    </p>
                    <div className="mt-1.5 h-1 w-28 overflow-hidden rounded-full bg-sunken">
                      <div className={`h-full rounded-full ${pct >= 90 ? "bg-bad" : pct >= 70 ? "bg-warn" : "bg-brand"}`} style={{ width: `${pct}%` }} />
                    </div>
                  </td>
                  <td className="px-3 py-4">{failing ? <Badge tone="bad">Failing</Badge> : <span className="text-muted">{fmtDate(lastRead)}</span>}</td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-2">
                      <Link href={`/sites/${s.id}`} className="inline-flex h-8 items-center rounded-[10px] border border-line-strong px-3 text-[13px] font-medium hover:bg-sunken">
                        Open
                      </Link>
                      {s.status === "suspended" ? (
                        <Button small onClick={() => setSiteStatus(s.id, "active")}>
                          Resume
                        </Button>
                      ) : (
                        <Button small variant="danger" onClick={() => window.confirm(`Pause ${s.name}? Its chat is switched off at once.`) && setSiteStatus(s.id, "suspended")}>
                          Pause
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {list.length === 0 && <p className="px-5 py-8 text-center text-sm text-muted">No client matches.</p>}
      </div>
    </div>
  )
}
