"use client"

import { useState } from "react"
import { CheckIcon } from "lucide-react"
import type { DraftState } from "../state/guest-storage"
import type { DraftCardData } from "../types"
import { useChatUi } from "../widget/chat-context"
import { Rows } from "./rows"

export function DraftCard({ card, state, onAct }: { card: DraftCardData; state?: DraftState; onAct: (action: "confirm" | "dismiss") => Promise<string | undefined> }) {
  const { t } = useChatUi()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  async function act(action: "confirm" | "dismiss") {
    if (busy) return
    setBusy(true)
    setError("")
    const problem = await onAct(action)
    if (problem) setError(problem)
    setBusy(false)
  }
  if (state === "dismissed") return <p className="rounded-xl border border-dashed p-3 text-xs text-muted-foreground">{t("requestNotSent")}</p>
  if (state === "sent") {
    return (
      <p className="flex items-center gap-1.5 rounded-xl border border-(--sc-success)/30 bg-(--sc-success)/10 p-3 text-sm font-semibold text-(--sc-success)">
        <CheckIcon className="size-4" /> {t("requestSent")}
      </p>
    )
  }
  return (
    <div className="rounded-xl border bg-card p-3">
      <p className="text-sm font-semibold text-primary">{card.title}</p>
      <Rows rows={card.rows} />
      <p className="mt-2 text-xs text-muted-foreground">{t("nothingSentUntil")}</p>
      {error && (
        <p role="alert" className="mt-2 text-xs text-destructive">
          {error}
        </p>
      )}
      <div className="mt-3 flex gap-2">
        <button type="button" disabled={busy} onClick={() => act("confirm")} className="inline-flex h-8 items-center rounded-full bg-(--sc-brand) px-4 text-xs font-semibold text-(--sc-brand-fg) transition-[background-color,transform] hover:bg-(--sc-brand)/90 active:scale-95 disabled:opacity-60">
          {busy ? t("sending") : (card.confirmLabel ?? t("sendRequest"))}
        </button>
        <button type="button" disabled={busy} onClick={() => act("dismiss")} className="inline-flex h-8 items-center rounded-full border px-4 text-xs font-semibold text-foreground/80 transition-colors hover:bg-muted disabled:opacity-60">
          {t("notNow")}
        </button>
      </div>
    </div>
  )
}
