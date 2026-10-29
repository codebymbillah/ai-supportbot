"use client"

import Link from "next/link"
import type { InfoCardData } from "../types"
import { Rows } from "./rows"

export function InfoCard({ card }: { card: InfoCardData }) {
  return (
    <div className="rounded-xl border bg-card p-3">
      <p className="text-sm font-semibold text-primary">{card.title}</p>
      {card.rows && card.rows.length > 0 && <Rows rows={card.rows} />}
      {card.note && <p className="mt-2 text-xs text-muted-foreground">{card.note}</p>}
      {card.cta && card.cta.href.startsWith("/") && !card.cta.href.startsWith("//") && (
        <Link href={card.cta.href} className="mt-3 inline-flex h-8 items-center rounded-full bg-primary px-4 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90">
          {card.cta.label}
        </Link>
      )}
    </div>
  )
}
