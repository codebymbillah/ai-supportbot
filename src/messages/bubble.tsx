"use client"

import { RotateCcwIcon, ThumbsDownIcon, ThumbsUpIcon } from "lucide-react"
import { DraftCard, InfoCard, ProductCard } from "../cards"
import { cn } from "../lib/cn"
import type { DraftState } from "../state/guest-storage"
import type { ChatMessage, SupportChatConfig } from "../types"
import { useChatUi } from "../widget/chat-context"
import { AgentAvatar, Avatar } from "./avatars"
import { Photos } from "./photos"
import { hasBangla, RichText } from "./rich-text"

export function Bubble({
  message,
  config,
  drafts,
  onRate,
  onRetry,
  onDraft,
}: {
  message: ChatMessage
  config: SupportChatConfig
  drafts: Record<string, DraftState>
  onRate: (value: "up" | "down") => void
  onRetry: () => void
  onDraft: (draftId: string, action: "confirm" | "dismiss") => Promise<string | undefined>
}) {
  const { t } = useChatUi()
  if (message.sender === "system") {
    return <p className="sc-rise mx-auto max-w-[90%] rounded-full bg-muted/70 px-3 py-1 text-center text-xs text-muted-foreground">{message.body}</p>
  }
  if (message.sender === "customer") {
    return (
      <div className="sc-rise flex flex-col items-end gap-1">
        {message.images && <Photos images={message.images} />}
        {message.body && (
          <p className={cn("max-w-[85%] rounded-2xl rounded-tr-md px-3.5 py-2 text-sm leading-relaxed whitespace-pre-wrap [overflow-wrap:anywhere]", message.local === "failed" ? "bg-destructive/10 text-destructive" : "bg-primary text-primary-foreground", message.local === "sending" && "opacity-70", hasBangla(message.body) && config.bengaliFontClass)}>{message.body}</p>
        )}
        {message.local === "failed" && (
          <button type="button" onClick={onRetry} className="inline-flex items-center gap-1 text-xs font-semibold text-primary underline underline-offset-2">
            <RotateCcwIcon className="size-3" /> {t("notSent")}
          </button>
        )}
      </div>
    )
  }
  const agent = message.sender === "agent"
  return (
    <div className="sc-rise flex gap-2">
      {agent ? <AgentAvatar name={message.agentName} className="mt-0.5" /> : <Avatar className="mt-0.5" />}
      <div className="min-w-0 max-w-[88%] flex-1">
        {agent && message.agentName && <p className="mb-0.5 text-[0.7rem] font-semibold text-muted-foreground">{t("agentTag", { agent: message.agentName })}</p>}
        {message.body && (
          <div className={cn("rounded-2xl rounded-tl-md px-3.5 py-2 text-sm leading-relaxed [overflow-wrap:anywhere]", agent ? "bg-accent text-foreground" : "bg-muted/70 text-foreground", hasBangla(message.body) && config.bengaliFontClass)}>
            <RichText text={message.body} />
          </div>
        )}
        {message.cards.length > 0 && (
          <div className="mt-2 flex flex-col gap-2">
            {message.cards.map((c, i) =>
              c.type === "product" ? <ProductCard key={`${c.productId}-${i}`} card={c} config={config} /> : c.type === "info" ? <InfoCard key={i} card={c} /> : <DraftCard key={c.draftId} card={c} state={drafts[c.draftId]} onAct={(a) => onDraft(c.draftId, a)} />
            )}
          </div>
        )}
        {message.sender === "ai" && message.body && (
          <div className="mt-1 flex items-center gap-0.5 text-muted-foreground">
            <button type="button" aria-label={t("goodAnswer")} aria-pressed={message.feedback === "up"} onClick={() => onRate("up")} className={cn("rounded-md p-1.5 transition-colors hover:bg-muted hover:text-foreground", message.feedback === "up" && "text-(--sc-success)")}>
              <ThumbsUpIcon className="size-3.5" />
            </button>
            <button type="button" aria-label={t("poorAnswer")} aria-pressed={message.feedback === "down"} onClick={() => onRate("down")} className={cn("rounded-md p-1.5 transition-colors hover:bg-muted hover:text-foreground", message.feedback === "down" && "text-destructive")}>
              <ThumbsDownIcon className="size-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
