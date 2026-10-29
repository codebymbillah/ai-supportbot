"use client"

import { SparklesIcon } from "lucide-react"
import { cn } from "../lib/cn"
import { useChatUi } from "../widget/chat-context"

/** The assistant's picture: a small dark disc with a brand-coloured spark. */
export function Avatar({ className }: { className?: string }) {
  return (
    <span aria-hidden className={cn("flex size-7 shrink-0 items-center justify-center rounded-full bg-(--sc-ink) text-(--sc-brand)", className)}>
      <SparklesIcon className="size-3.5" />
    </span>
  )
}

/** A team member's picture: their first letter on the brand green. */
export function AgentAvatar({ name, className }: { name?: string; className?: string }) {
  const { config } = useChatUi()
  return (
    <span aria-hidden className={cn("flex size-7 shrink-0 items-center justify-center rounded-full bg-(--sc-brand) text-xs font-bold text-(--sc-brand-fg)", className)}>
      {(name ?? config.brandName).trim().charAt(0).toUpperCase()}
    </span>
  )
}

export function TypingDots({ label }: { label?: string }) {
  const { t } = useChatUi()
  return (
    <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
      <span aria-hidden className="sc-dots inline-flex gap-1">
        <i />
        <i />
        <i />
      </span>
      {label || <span className="sr-only">{t("typing")}</span>}
    </span>
  )
}
