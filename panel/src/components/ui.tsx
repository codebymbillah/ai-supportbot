"use client"

import { useId, useState } from "react"
import { toast } from "./toast"

/** A panel of related controls. The heading sits inside, without a band, so a page reads as one surface rather than a stack of boxes. */
export function Card({ title, hint, action, children, tight }: { title?: string; hint?: string; action?: React.ReactNode; children: React.ReactNode; tight?: boolean }) {
  return (
    <section className="rounded-2xl border border-line bg-surface">
      {(title || action) && (
        <header className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3 px-6 pt-5">
          <div className="max-w-2xl">
            {title && <h2 className="text-[15px] font-semibold leading-6">{title}</h2>}
            {hint && <p className="mt-0.5 text-sm leading-6 text-muted">{hint}</p>}
          </div>
          {action}
        </header>
      )}
      <div className={tight ? "px-6 py-4" : "px-6 pb-6 pt-5"}>{children}</div>
    </section>
  )
}

export function PageTitle({ title, hint, action }: { title: string; hint?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-[28px] font-semibold leading-tight tracking-[-0.02em]">{title}</h1>
        {hint && <p className="mt-2 max-w-[62ch] text-[15px] leading-6 text-muted">{hint}</p>}
      </div>
      {action}
    </div>
  )
}

type Variant = "primary" | "outline" | "danger" | "ghost"
const VARIANTS: Record<Variant, string> = {
  primary: "bg-brand text-brand-ink hover:bg-brand-hover",
  outline: "border border-line-strong bg-surface text-ink hover:bg-sunken",
  danger: "border border-line-strong bg-surface text-bad hover:border-bad/40 hover:bg-bad-soft",
  ghost: "text-muted hover:bg-sunken hover:text-ink",
}
export function Button({ variant = "outline", small, className = "", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; small?: boolean }) {
  return (
    <button
      type="button"
      {...props}
      className={`inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-[10px] font-medium active:translate-y-px disabled:pointer-events-none disabled:opacity-45 ${small ? "h-8 px-3 text-[13px]" : "h-10 px-4 text-sm"} ${VARIANTS[variant]} ${className}`}
    />
  )
}

/** A small square button with only an icon. `label` is read aloud and shown on hover. */
export function IconButton({ label, tone = "plain", className = "", children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string; tone?: "plain" | "danger" }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      {...props}
      className={`grid size-8 shrink-0 place-items-center rounded-lg text-muted disabled:pointer-events-none disabled:opacity-40 [&>svg]:size-4 ${tone === "danger" ? "hover:bg-bad-soft hover:text-bad" : "hover:bg-sunken hover:text-ink"} ${className}`}
    >
      {children}
    </button>
  )
}

/** A round mark with a person's first letter, coloured from their email so the same person always looks the same. */
export function Initials({ email, size = "md" }: { email: string; size?: "sm" | "md" }) {
  const hues = ["#0b7a63", "#2f5bd3", "#9a4fd1", "#c2410c", "#0e7490", "#a16207"]
  const hue = hues[[...email].reduce((n, c) => n + c.charCodeAt(0), 0) % hues.length]
  return (
    <span aria-hidden className={`grid shrink-0 place-items-center rounded-full font-semibold uppercase text-white ${size === "sm" ? "size-7 text-xs" : "size-9 text-sm"}`} style={{ background: hue }}>
      {email[0]}
    </span>
  )
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: (id: string) => React.ReactNode }) {
  const id = useId()
  return (
    <div className="grid content-start gap-1.5">
      <label htmlFor={id} className="text-[13px] font-medium text-ink">
        {label}
      </label>
      {children(id)}
      {hint && <p className="text-[13px] leading-5 text-muted">{hint}</p>}
    </div>
  )
}

const INPUT = "w-full rounded-[10px] border border-line-strong bg-surface px-3 text-sm text-ink placeholder:text-muted/70"
export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`h-10 ${INPUT} ${props.className ?? ""}`} />
}
export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea rows={3} {...props} className={`py-2.5 leading-6 ${INPUT} ${props.className ?? ""}`} />
}
export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`h-10 ${INPUT} ${props.className ?? ""}`} />
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)} className={`relative h-6 w-11 shrink-0 rounded-full ${checked ? "bg-brand" : "bg-line-strong"}`}>
      <span className="absolute left-0.5 top-0.5 size-5 rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,.25)] transition-transform duration-200 ease-out" style={{ transform: checked ? "translateX(20px)" : "translateX(0)" }} />
    </button>
  )
}

const TONES = { ok: "bg-brand-soft text-ok", warn: "bg-warn-soft text-warn", bad: "bg-bad-soft text-bad", plain: "bg-sunken text-muted" }
/** A short state. `dot` marks a live state (the chat is on, a chat is waiting). */
export function Badge({ tone = "plain", dot, children }: { tone?: keyof typeof TONES; dot?: boolean; children: React.ReactNode }) {
  return (
    <span className={`inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-xs font-medium ${TONES[tone]}`}>
      {dot && <span className="size-1.5 rounded-full bg-current" />}
      {children}
    </span>
  )
}

/** A list of short words you can add to and remove from (chips, forbidden terms, domains). */
export function TagList({ values, onChange, placeholder, label }: { values: string[]; onChange: (v: string[]) => void; placeholder: string; label: string }) {
  const [draft, setDraft] = useState("")
  const add = () => {
    const v = draft.trim()
    if (v && !values.includes(v)) onChange([...values, v])
    setDraft("")
  }
  return (
    <div className="grid gap-3">
      {values.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {values.map((v) => (
            <li key={v} className="inline-flex h-8 items-center gap-1 rounded-full border border-line-strong bg-surface pl-3 pr-1 text-sm">
              {v}
              <button type="button" aria-label={`Remove ${v}`} onClick={() => onChange(values.filter((x) => x !== v))} className="grid size-6 place-items-center rounded-full text-muted hover:bg-sunken hover:text-ink">
                <svg viewBox="0 0 12 12" className="size-3" aria-hidden>
                  <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <Input
          aria-label={label}
          value={draft}
          placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault()
              add()
            }
          }}
        />
        <Button onClick={add} disabled={!draft.trim()}>
          Add
        </Button>
      </div>
    </div>
  )
}

export function Empty({ title, children, action }: { title: string; children?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-line-strong bg-surface/50 px-6 py-12 text-center">
      <p className="font-semibold">{title}</p>
      {children && <p className="mx-auto mt-1.5 max-w-[46ch] text-sm leading-6 text-muted">{children}</p>}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  )
}

export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false)
  return (
    <Button
      small
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text)
          setDone(true)
          setTimeout(() => setDone(false), 1600)
          toast("Copied")
        } catch {
          toast("Copy did not work here. Select the text and copy it.", "bad")
        }
      }}
    >
      <span aria-live="polite">{done ? "Copied" : label}</span>
    </Button>
  )
}

export const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "UTC" }) + " UTC" : "never"
