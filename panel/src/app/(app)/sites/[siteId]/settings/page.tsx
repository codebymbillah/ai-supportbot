"use client"

import { useParams } from "next/navigation"
import { useState } from "react"
import { Button, Card, Field, Input, PageTitle, Select, TagList, Textarea, Toggle } from "@/components/ui"
import { saveSettings, useSite } from "@/lib/store"
import type { Site, SiteSettings } from "@/lib/types"

export default function SettingsPage() {
  const { siteId } = useParams<{ siteId: string }>()
  const site = useSite(siteId)
  if (!site) return null
  // The form starts from the saved settings; a key resets it after saving or when the site changes.
  return <SettingsForm key={site.id} site={site} />
}

function SettingsForm({ site }: { site: Site }) {
  const [s, setS] = useState<SiteSettings>(site.settings)
  const [saved, setSaved] = useState(false)
  const dirty = JSON.stringify(s) !== JSON.stringify(site.settings)
  const set = <K extends keyof SiteSettings>(k: K, v: SiteSettings[K]) => {
    setSaved(false)
    setS((x) => ({ ...x, [k]: v }))
  }

  return (
    <form
      className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-start"
      onSubmit={(e) => {
        e.preventDefault()
        saveSettings(site.id, s)
        setSaved(true)
      }}
    >
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
      <PageTitle title="Settings" hint="How the chat looks and behaves on your site. Saved changes reach your site within a minute, with no change to its code." />
      <Card title="Chat on or off" hint="While it is off, the chat button does not show on your site.">
        <div className="flex items-center gap-3">
          <Toggle checked={s.enabled} onChange={(v) => set("enabled", v)} label="Chat on" />
          <span className="text-sm">{s.enabled ? "On: visitors can chat." : "Off: the button is hidden."}</span>
        </div>
      </Card>

      <Card title="How the assistant introduces itself">
        <div className="grid gap-4 sm:max-w-xl">
          <Field label="Assistant name">{(id) => <Input id={id} value={s.assistantName} onChange={(e) => set("assistantName", e.target.value)} maxLength={60} />}</Field>
          <Field label="Tagline" hint="A few words under the name.">
            {(id) => <Input id={id} value={s.tagline} onChange={(e) => set("tagline", e.target.value)} maxLength={80} />}
          </Field>
          <Field label="Greeting" hint="The first message a visitor sees.">
            {(id) => <Textarea id={id} value={s.greeting} onChange={(e) => set("greeting", e.target.value)} maxLength={300} />}
          </Field>
          <Field label="Language" hint="Auto answers in the language the visitor writes in.">
            {(id) => (
              <Select id={id} value={s.language} onChange={(e) => set("language", e.target.value as SiteSettings["language"])}>
                <option value="auto">Automatic</option>
                <option value="en">English</option>
                <option value="bn">Bangla</option>
              </Select>
            )}
          </Field>
          <div className="grid gap-1.5">
            <span className="text-sm font-medium">Quick questions</span>
            <TagList label="Add a quick question" placeholder="Shipping time" values={s.chips} onChange={(v) => set("chips", v.slice(0, 6))} />
            <p className="text-xs text-muted">Up to 6 buttons under the greeting.</p>
          </div>
        </div>
      </Card>

      <Card title="Photos" hint="Visitors can attach photos, for example of a product they want.">
        <div className="grid gap-4 sm:max-w-xl">
          <div className="flex items-center gap-3">
            <Toggle checked={s.photos.enabled} onChange={(v) => set("photos", { ...s.photos, enabled: v })} label="Photos allowed" />
            <span className="text-sm">{s.photos.enabled ? "Photos allowed" : "Photos not allowed"}</span>
          </div>
          {s.photos.enabled && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Photos per message">
                {(id) => <Input id={id} type="number" min={1} max={5} value={s.photos.maxPerMessage} onChange={(e) => set("photos", { ...s.photos, maxPerMessage: clamp(+e.target.value, 1, 5) })} />}
              </Field>
              <Field label="Largest photo (MB)">
                {(id) => <Input id={id} type="number" min={1} max={10} value={s.photos.maxMb} onChange={(e) => set("photos", { ...s.photos, maxMb: clamp(+e.target.value, 1, 10) })} />}
              </Field>
            </div>
          )}
        </div>
      </Card>

      <Card title="Words the assistant must never say" hint="For example a supplier or a competitor. A reply that contains one is stopped and a safe line is sent instead.">
        <div className="sm:max-w-xl">
          <TagList label="Add a word" placeholder="Word or name" values={s.forbiddenTerms} onChange={(v) => set("forbiddenTerms", v)} />
        </div>
      </Card>

      <Card title="Contact details" hint="Shown when a visitor asks for a person, or when the chat cannot answer.">
        <div className="grid gap-4 sm:max-w-xl sm:grid-cols-2">
          <Field label="Phone">{(id) => <Input id={id} value={s.contact.phone} onChange={(e) => set("contact", { ...s.contact, phone: e.target.value })} />}</Field>
          <Field label="WhatsApp">{(id) => <Input id={id} value={s.contact.whatsapp} onChange={(e) => set("contact", { ...s.contact, whatsapp: e.target.value })} />}</Field>
          <Field label="Email">{(id) => <Input id={id} type="email" value={s.contact.email} onChange={(e) => set("contact", { ...s.contact, email: e.target.value })} />}</Field>
          <Field label="Opening hours">{(id) => <Input id={id} value={s.contact.hours} onChange={(e) => set("contact", { ...s.contact, hours: e.target.value })} />}</Field>
        </div>
      </Card>

      <Card title="Prices and freshness" hint="The assistant quotes a price only as it is in your product list.">
        <div className="grid gap-4 sm:max-w-xl sm:grid-cols-2">
          <Field label="Call a price old after (hours)" hint="After this the assistant says the price may have changed and gives the link.">
            {(id) => <Input id={id} type="number" min={1} max={720} value={s.staleHours} onChange={(e) => set("staleHours", clamp(+e.target.value, 1, 720))} />}
          </Field>
          <Field label="Monthly AI spend limit (USD)" hint="The chat stops and shows your contact details when it is reached.">
            {(id) => <Input id={id} type="number" min={1} value={s.monthlyLimit} onChange={(e) => set("monthlyLimit", Math.max(1, +e.target.value || 1))} />}
          </Field>
        </div>
      </Card>

      <div className="sticky bottom-4 z-10 flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-surface/95 px-4 py-3 shadow-[0_8px_24px_-12px_rgba(24,32,43,.25)] backdrop-blur">
        <Button variant="primary" type="submit" disabled={!dirty}>
          Save changes
        </Button>
        {dirty && <Button onClick={() => { setS(site.settings); setSaved(false) }}>Discard</Button>}
        <span role="status" key={saved && !dirty ? "saved" : dirty ? "dirty" : "idle"} className={`rise text-sm ${saved && !dirty ? "text-ok" : "text-muted"}`}>
          {saved && !dirty ? "Saved. It reaches your site within a minute." : dirty ? "Unsaved changes" : ""}
        </span>
      </div>
      </div>
      <aside className="xl:sticky xl:top-10">
        <Preview s={s} name={site.name} />
      </aside>
    </form>
  )
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Number.isFinite(n) ? n : lo))

/** The chat's first screen as a visitor sees it, drawn from the unsaved settings so every change shows as it is typed. */
function Preview({ s, name }: { s: SiteSettings; name: string }) {
  const title = s.assistantName || name
  return (
    <figure aria-label="Preview of the chat">
      <figcaption className="mb-3 flex items-center justify-between text-[13px] text-muted">
        <span>What visitors see</span>
        <span className="inline-flex items-center gap-1.5">
          <span className={`size-1.5 rounded-full ${s.enabled ? "bg-brand" : "bg-line-strong"}`} />
          {s.enabled ? "On" : "Off: hidden on your site"}
        </span>
      </figcaption>
      <div className={`overflow-hidden rounded-[22px] border border-line bg-surface shadow-[0_24px_48px_-24px_rgba(24,32,43,.35)] ${s.enabled ? "" : "opacity-60 grayscale"}`}>
        <div className="flex items-center gap-3 bg-side px-4 py-3.5 text-side-ink">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand text-sm font-semibold text-brand-ink">{title.slice(0, 1).toUpperCase()}</span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{title}</p>
            <p className="truncate text-xs text-side-muted">{s.tagline || "Usually replies in seconds"}</p>
          </div>
        </div>
        <div className="grid min-h-[260px] content-start gap-3 bg-sunken/60 p-4">
          <p className="w-fit max-w-[88%] whitespace-pre-line rounded-2xl rounded-tl-md bg-surface px-3.5 py-2.5 text-sm leading-6 shadow-[0_1px_0_rgba(24,32,43,.06)]">{s.greeting || "Write a greeting"}</p>
          {s.chips.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {s.chips.map((c) => (
                <span key={c} className="rounded-full border border-brand/30 bg-surface px-3 py-1.5 text-xs font-medium text-brand">
                  {c}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 border-t border-line px-3 py-3">
          {s.photos.enabled && (
            <span className="grid size-8 place-items-center rounded-full text-muted" aria-hidden>
              <svg viewBox="0 0 20 20" className="size-4"><rect x="2.5" y="4.5" width="15" height="11" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.4" /><circle cx="7.5" cy="9" r="1.4" fill="currentColor" /><path d="M4 14l4-3.5 3 2.5 2.5-2 3 3" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" /></svg>
            </span>
          )}
          <span className="h-9 flex-1 rounded-full bg-sunken px-4 text-sm leading-9 text-muted">Write a message…</span>
          <span className="grid size-9 place-items-center rounded-full bg-brand text-brand-ink" aria-hidden>
            <svg viewBox="0 0 20 20" className="size-4"><path d="M4 10h11M10 5l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </span>
        </div>
      </div>
      <p className="mt-3 text-[13px] leading-5 text-muted">{s.language === "auto" ? "Answers in the visitor's language." : s.language === "bn" ? "Answers in Bangla." : "Answers in English."}{s.photos.enabled ? ` Up to ${s.photos.maxPerMessage} photos a message.` : " Photos off."}</p>
    </figure>
  )
}
