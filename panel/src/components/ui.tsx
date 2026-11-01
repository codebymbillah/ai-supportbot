"use client"

import { useId, useState } from "react"

export function Card({ title, hint, action, children }: { title?: string; hint?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-line bg-surface">
      {(title || action) && (
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div>
            {title && <h2 className="font-semibold">{title}</h2>}
            {hint && <p className="mt-0.5 text-sm text-muted">{hint}</p>}
          </div>
          {action}
        </header>
      )}
      <div className="p-5">{children}</div>
    </section>
  )
}

export function PageTitle({ title, hint, action }: { title: string; hint?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {hint && <p className="mt-1 max-w-2xl text-sm text-muted">{hint}</p>}
      </div>
      {action}
    </div>
  )
}

type Variant = "primary" | "outline" | "danger" | "ghost"
const VARIANTS: Record<Variant, string> = {
  primary: "bg-brand text-brand-ink hover:opacity-90",
  outline: "border border-line bg-surface hover:bg-bg",
  danger: "border border-line text-bad hover:bg-bad/10",
  ghost: "text-muted hover:bg-bg hover:text-ink",
}
export function Button({ variant = "outline", small, className = "", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; small?: boolean }) {
  return (
    <button
      type="button"
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium disabled:cursor-not-allowed disabled:opacity-50 ${small ? "px-2.5 py-1 text-sm" : "px-3.5 py-2 text-sm"} ${VARIANTS[variant]} ${className}`}
    />
  )
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: (id: string) => React.ReactNode }) {
  const id = useId()
  return (
    <div className="grid gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {children(id)}
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </div>
  )
}

const INPUT = "w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm placeholder:text-muted/70"
export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${INPUT} ${props.className ?? ""}`} />
}
export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea rows={3} {...props} className={`${INPUT} ${props.className ?? ""}`} />
}
export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${INPUT} ${props.className ?? ""}`} />
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)} className={`relative h-6 w-11 shrink-0 rounded-full ${checked ? "bg-brand" : "bg-line"}`}>
      <span className="absolute left-0.5 top-0.5 size-5 rounded-full bg-white shadow-sm transition-transform duration-150" style={{ transform: checked ? "translateX(20px)" : "translateX(0)" }} />
    </button>
  )
}

const TONES = { ok: "bg-ok/12 text-ok", warn: "bg-warn/15 text-warn", bad: "bg-bad/12 text-bad", plain: "bg-line/60 text-muted" }
export function Badge({ tone = "plain", children }: { tone?: keyof typeof TONES; children: React.ReactNode }) {
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${TONES[tone]}`}>{children}</span>
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
    <div className="grid gap-2">
      {values.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {values.map((v) => (
            <li key={v} className="inline-flex items-center gap-1 rounded-full border border-line bg-bg py-1 pl-3 pr-1 text-sm">
              {v}
              <button type="button" aria-label={`Remove ${v}`} onClick={() => onChange(values.filter((x) => x !== v))} className="grid size-5 place-items-center rounded-full text-muted hover:bg-line hover:text-ink">
                ×
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

export function Empty({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-line px-6 py-10 text-center">
      <p className="font-medium">{title}</p>
      {children && <p className="mx-auto mt-1 max-w-md text-sm text-muted">{children}</p>}
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
        } catch {
          /* the text is on screen to select by hand */
        }
      }}
    >
      {done ? "Copied" : label}
    </Button>
  )
}

export const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "UTC" }) + " UTC" : "never"
