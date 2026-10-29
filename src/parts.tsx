"use client"

import Image from "next/image"
import Link from "next/link"
import { useRef, useState } from "react"
import { ArrowUpIcon, CheckIcon, ImagePlusIcon, PackagePlusIcon, RotateCcwIcon, SparklesIcon, ThumbsDownIcon, ThumbsUpIcon, XIcon } from "lucide-react"
import { useChatUi } from "./chat-context"
import { cn } from "./cn"
import { ACCEPT, prepareImages } from "./images"
import { hasBangla, RichText } from "./rich-text"
import type { DraftState } from "./guest-storage"
import type { ChatImage, ChatMessage, DraftCardData, InfoCardData, ProductCardData, SupportChatConfig } from "./types"

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

/* ---------- cards ---------- */

function CardPhoto({ src }: { src?: string }) {
  const [failed, setFailed] = useState(false)
  return (
    <span className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-muted">
      {src && !failed && <Image src={src} alt="" fill sizes="64px" className="object-cover" onError={() => setFailed(true)} />}
    </span>
  )
}

export function ProductCard({ card, config }: { card: ProductCardData; config: SupportChatConfig }) {
  const { t } = useChatUi()
  const href = card.href && card.href.startsWith("/") && !card.href.startsWith("//") ? card.href : `/products/${encodeURIComponent(card.slug)}`
  const price = card.offerPriceFrom ?? card.priceFrom
  const [added, setAdded] = useState(false)
  return (
    <div className="flex gap-3 rounded-xl border bg-card p-2.5">
      <CardPhoto src={card.image} />
      <div className="min-w-0 flex-1">
        <p className={cn("line-clamp-2 text-[0.8rem] leading-snug font-semibold text-foreground", hasBangla(card.title) && config.bengaliFontClass)}>{card.title}</p>
        <p className="mt-1 flex flex-wrap items-baseline gap-x-2 text-xs tabular-nums">
          {price !== undefined && <span className="text-sm font-bold text-primary">{t("from", { price: config.formatMoney(price) })}</span>}
          {card.offerPriceFrom !== undefined && card.priceFrom !== undefined && card.priceFrom > card.offerPriceFrom && <span className="text-muted-foreground line-through">{config.formatMoney(card.priceFrom)}</span>}
          {card.moq !== undefined && (
            <span className="text-muted-foreground">
              {t("moq", { moq: `${card.moq}${card.unit ? ` ${card.unit}` : ""}` })}
            </span>
          )}
        </p>
        {(card.offerLabel || card.freeDelivery) && (
          <p className="mt-1 flex flex-wrap gap-1">
            {card.offerLabel && <span className="rounded-full bg-(--sc-brand)/15 px-2 py-0.5 text-[0.65rem] font-semibold text-(--sc-brand-text)">{card.offerLabel}</span>}
            {card.freeDelivery && <span className="rounded-full bg-accent px-2 py-0.5 text-[0.65rem] font-semibold text-primary">{t("freeDelivery")}</span>}
          </p>
        )}
        <div className="mt-2 flex gap-1.5">
          <Link href={href} className="inline-flex h-7 items-center rounded-full border px-3 text-xs font-semibold text-primary transition-colors hover:bg-muted">
            {t("view")}
          </Link>
          {config.onAddProduct && !card.needsOptions && (
            <button
              type="button"
              onClick={() => {
                config.onAddProduct?.(card)
                setAdded(true)
                setTimeout(() => setAdded(false), 1800)
              }}
              className="inline-flex h-7 items-center gap-1 rounded-full bg-(--sc-brand) px-3 text-xs font-semibold text-(--sc-brand-fg) transition-[background-color,transform] hover:bg-(--sc-brand)/90 active:scale-95"
            >
              {added ? <CheckIcon className="size-3.5" /> : <PackagePlusIcon className="size-3.5" />}
              {added ? t("added") : t("addToCart")}
            </button>
          )}
          {card.needsOptions && <span className="self-center text-[0.68rem] text-muted-foreground">{t("pickOnPage")}</span>}
        </div>
      </div>
    </div>
  )
}

function Rows({ rows }: { rows: { label: string; value: string }[] }) {
  return (
    <dl className="mt-2 grid gap-1 text-xs">
      {rows.map((r) => (
        <div key={r.label} className="flex justify-between gap-4">
          <dt className="text-muted-foreground">{r.label}</dt>
          <dd className="text-right font-medium tabular-nums">{r.value}</dd>
        </div>
      ))}
    </dl>
  )
}

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

/* ---------- messages ---------- */

// Photos the customer sent. Only an https link from the backend, or a picture made in this browser while it sends, is drawn.
function PhotoThumb({ image }: { image: ChatImage }) {
  const { t } = useChatUi()
  const [failed, setFailed] = useState(false)
  // A signed link that has expired (or a photo that was removed) shows a quiet empty frame, not a broken-image icon.
  if (failed) return <span aria-label={t("photoAlt")} role="img" className="flex size-24 items-center justify-center rounded-xl border bg-muted text-muted-foreground"><ImagePlusIcon className="size-5" /></span>
  // eslint-disable-next-line @next/next/no-img-element -- a signed link from the backend or a local preview: not an optimisable asset
  return <img src={image.url} alt={t("photoAlt")} loading="lazy" onError={() => setFailed(true)} className="size-24 rounded-xl border object-cover" />
}

function Photos({ images, className }: { images: ChatImage[]; className?: string }) {
  const { t } = useChatUi()
  const safe = images.filter((i) => /^(https:\/\/|blob:)/.test(i.url))
  if (!safe.length) return null
  return (
    <div className={cn("flex max-w-[85%] flex-wrap justify-end gap-1.5", className)}>
      {safe.map((i) => (
        <span key={`${i.id}-${i.url}`} className="flex flex-col items-end gap-0.5">
          <PhotoThumb image={i} />
          {!i.aiReviewed && <span className="max-w-24 text-right text-[0.65rem] leading-tight text-muted-foreground">{t("photoForTeam")}</span>}
        </span>
      ))}
    </div>
  )
}

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

/* ---------- composer ---------- */

interface Attached {
  file: File
  preview: string
}

export function Composer({
  placeholder,
  maxLength,
  onSend,
  inputRef,
}: {
  placeholder: string
  maxLength: number
  /** Returns a sentence when the text must not be sent (it then stays in the box). */
  onSend: (text: string, images: File[]) => string | void
  inputRef: React.RefObject<HTMLTextAreaElement | null>
}) {
  const { config, t } = useChatUi()
  const rules = config.images?.enabled ? config.images : undefined
  const [value, setValue] = useState("")
  const [notice, setNotice] = useState<string | null>(null)
  const [attached, setAttached] = useState<Attached[]>([])
  const picker = useRef<HTMLInputElement>(null)
  // The box grows with the text, up to five lines.
  const grow = (el: HTMLTextAreaElement) => {
    el.style.height = "auto"
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`
  }

  const canSend = value.trim().length > 0 || attached.length > 0

  function submit() {
    const text = value.trim()
    if (!text && attached.length === 0) return
    const problem = onSend(text, attached.map((a) => a.file))
    setNotice(problem ?? null)
    if (problem) return
    // The sent message makes its own previews, so these are released here.
    attached.forEach((a) => URL.revokeObjectURL(a.preview))
    setAttached([])
    setValue("")
    if (inputRef.current) grow(inputRef.current)
  }

  async function choose(list: FileList | null) {
    if (!rules || !list?.length) return
    const res = await prepareImages([...list], attached.length, rules, t)
    if ("problem" in res) return setNotice(res.problem)
    setNotice(null)
    setAttached((a) => [...a, ...res.files.map((file) => ({ file, preview: URL.createObjectURL(file) }))])
  }

  function remove(i: number) {
    setAttached((a) => {
      URL.revokeObjectURL(a[i].preview)
      return a.filter((_, k) => k !== i)
    })
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
      className="border-t bg-card p-3"
    >
      {notice && (
        <p role="alert" className="mb-2 rounded-xl bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {notice}
        </p>
      )}
      {attached.length > 0 && (
        <ul className="mb-2 flex flex-wrap gap-2">
          {attached.map((a, i) => (
            <li key={a.preview} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element -- a preview made in this browser */}
              <img src={a.preview} alt="" className="size-14 rounded-lg border object-cover" />
              <button type="button" onClick={() => remove(i)} aria-label={t("removePhoto")} className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full bg-foreground text-background shadow">
                <XIcon className="size-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex items-end gap-2 rounded-2xl border bg-background py-1.5 pr-1.5 pl-1.5 transition-shadow focus-within:border-primary/40 focus-within:ring-3 focus-within:ring-ring/30">
        {rules && (
          <>
            <input
              ref={picker}
              type="file"
              accept={ACCEPT}
              multiple
              hidden
              onChange={(e) => {
                void choose(e.target.files)
                e.target.value = ""
              }}
            />
            <button type="button" onClick={() => picker.current?.click()} disabled={attached.length >= rules.maxPerMessage} aria-label={t("attachPhoto")} title={t("attachPhoto")} className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40">
              <ImagePlusIcon className="size-[1.15rem]" />
            </button>
          </>
        )}
        <textarea
          ref={inputRef}
          value={value}
          rows={1}
          maxLength={maxLength}
          aria-label={t("yourMessage")}
          placeholder={placeholder}
          onChange={(e) => {
            setValue(e.target.value)
            setNotice(null)
            grow(e.target)
          }}
          onKeyDown={(e) => {
            // Enter sends; Shift+Enter adds a line. While a Bangla keyboard is still composing a word, Enter belongs to it.
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault()
              submit()
            }
          }}
          className={cn("max-h-[120px] min-h-8 flex-1 resize-none bg-transparent py-1.5 text-base leading-snug outline-none placeholder:text-muted-foreground/70 md:text-sm", !rules && "pl-2")}
        />
        <button type="submit" disabled={!canSend} aria-label={t("send")} className="flex size-9 shrink-0 items-center justify-center rounded-full bg-(--sc-brand) text-(--sc-brand-fg) transition-[opacity,transform] active:scale-95 disabled:opacity-40">
          <ArrowUpIcon className="size-4" />
        </button>
      </div>
      {value.length > maxLength * 0.8 && <p className="mt-1 text-right text-[0.65rem] text-muted-foreground tabular-nums">{value.length}/{maxLength}</p>}
    </form>
  )
}
