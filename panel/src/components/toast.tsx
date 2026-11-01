"use client"

import { CheckIcon, CircleAlertIcon } from "lucide-react"
import { useSyncExternalStore } from "react"

// A short note after an action ("Product hidden", "Key copied"), so every click shows its result. One at a time, gone after 2.6 s.
type Toast = { id: number; text: string; tone: "ok" | "bad" }

let current: Toast | null = null
let seq = 0
let timer: ReturnType<typeof setTimeout> | undefined
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

export function toast(text: string, tone: Toast["tone"] = "ok") {
  current = { id: ++seq, text, tone }
  emit()
  clearTimeout(timer)
  timer = setTimeout(() => {
    current = null
    emit()
  }, 2600)
}

export function Toaster() {
  const t = useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => current,
    () => null
  )
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
      {t && (
        <p key={t.id} className="rise flex items-center gap-2 rounded-full bg-side px-4 py-2.5 text-sm font-medium text-side-ink shadow-[0_12px_32px_-12px_rgba(24,32,43,.5)]">
          {t.tone === "ok" ? <CheckIcon className="size-4 text-brand" aria-hidden /> : <CircleAlertIcon className="size-4 text-bad" aria-hidden />}
          {t.text}
        </p>
      )}
    </div>
  )
}
