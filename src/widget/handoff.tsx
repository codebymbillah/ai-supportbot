"use client"

import { useState } from "react"
import { HeadsetIcon } from "lucide-react"
import { cn } from "../lib/cn"
import type { ChatContact } from "../types"
import { useChatUi } from "./chat-context"
import { ContactLines } from "./contact"

function CallbackForm({ onSubmit, onClose }: { onSubmit: (name: string, phone: string, note?: string) => Promise<{ message?: string }>; onClose: (message?: string) => void }) {
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [note, setNote] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const { t } = useChatUi()

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const digits = phone.replace(/\D/g, "")
    if (name.trim().length < 2) return setError(t("nameError"))
    if (digits.length < 10 || digits.length > 16) return setError(t("phoneError"))
    setBusy(true)
    setError("")
    try {
      const res = await onSubmit(name.trim(), phone.trim(), note.trim() || undefined)
      onClose(res.message ?? t("callbackThanks", { name: name.trim(), phone: phone.trim() }))
    } catch (err) {
      setError(err instanceof Error ? err.message : t("callbackFailed"))
      setBusy(false)
    }
  }

  const input = "h-10 w-full rounded-lg border bg-background px-3 text-base outline-none transition-shadow focus:border-primary/40 focus:ring-3 focus:ring-ring/30 md:text-sm"
  return (
    <form onSubmit={submit} className="mt-3 grid gap-2 border-t pt-3">
      <p className="text-xs font-semibold text-primary">{t("callPrompt")}</p>
      <input className={input} value={name} onChange={(e) => setName(e.target.value)} placeholder={t("yourName")} autoComplete="name" aria-label={t("yourName")} />
      <input className={input} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={t("phoneNumber")} inputMode="tel" autoComplete="tel" aria-label={t("phoneNumber")} />
      <textarea className={cn(input, "h-14 resize-none py-2")} value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("helpPlaceholder")} maxLength={500} aria-label={t("helpLabel")} />
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <button type="submit" disabled={busy} className="inline-flex h-9 items-center rounded-full bg-(--sc-brand) px-4 text-sm font-semibold text-(--sc-brand-fg) transition-[background-color,transform] hover:bg-(--sc-brand)/90 active:scale-95 disabled:opacity-60">
          {busy ? t("sending") : t("callMeBack")}
        </button>
        <button type="button" onClick={() => onClose()} className="inline-flex h-9 items-center rounded-full border px-4 text-sm font-semibold text-foreground/80 transition-colors hover:bg-muted">
          {t("cancel")}
        </button>
      </div>
    </form>
  )
}

/** A panel at the end of the conversation when the customer needs a person: waiting, or the number and the call-back form. */
export function HandoffPanel({ kind, contact, onCallBack }: { kind: "waiting" | "contact"; contact?: ChatContact; onCallBack: (name: string, phone: string, note?: string) => Promise<{ message?: string }> }) {
  const [form, setForm] = useState(false)
  const [done, setDone] = useState("")
  const { t } = useChatUi()
  if (done) return <p className="sc-rise mx-auto max-w-[92%] rounded-xl bg-(--sc-success)/10 px-3 py-2 text-center text-xs font-medium text-(--sc-success)">{done}</p>
  return (
    <div className="sc-rise rounded-xl border bg-card p-3.5">
      <p className="flex items-center gap-2 text-sm font-semibold text-primary">
        <HeadsetIcon className="size-4 text-(--sc-brand-text)" />
        {kind === "waiting" ? t("waitingTitle") : t("contactTitle")}
      </p>
      {kind === "waiting" ? (
        <p className="mt-1 text-xs text-muted-foreground">{t("waitingText")}</p>
      ) : (
        <>
          <p className="mt-1 text-xs text-muted-foreground">{t("contactText")}</p>
          {contact && <ContactLines contact={contact} />}
          {!form ? (
            <button type="button" onClick={() => setForm(true)} className="mt-3 inline-flex h-9 items-center rounded-full bg-(--sc-brand) px-4 text-sm font-semibold text-(--sc-brand-fg) transition-[background-color,transform] hover:bg-(--sc-brand)/90 active:scale-95">
              {t("callMeBack")}
            </button>
          ) : (
            <CallbackForm
              onSubmit={onCallBack}
              onClose={(message) => {
                if (message) setDone(message)
                else setForm(false)
              }}
            />
          )}
        </>
      )}
    </div>
  )
}
