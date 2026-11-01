"use client"

import { useParams } from "next/navigation"
import { useState } from "react"
import { Button, Card, Field, Input, Select, TagList, Textarea, Toggle } from "@/components/ui"
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
      className="grid grid-cols-[minmax(0,1fr)] gap-6"
      onSubmit={(e) => {
        e.preventDefault()
        saveSettings(site.id, s)
        setSaved(true)
      }}
    >
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
        <Preview s={s} name={site.name} />
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

      <div className="sticky bottom-4 flex items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3">
        <Button variant="primary" type="submit" disabled={!dirty}>
          Save changes
        </Button>
        {dirty && <Button onClick={() => { setS(site.settings); setSaved(false) }}>Discard</Button>}
        <span role="status" className="text-sm text-muted">
          {saved && !dirty ? "Saved. It reaches your site within a minute." : dirty ? "You have unsaved changes." : ""}
        </span>
      </div>
    </form>
  )
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Number.isFinite(n) ? n : lo))

/** A small picture of the chat's first screen, so a change is visible before saving. */
function Preview({ s, name }: { s: SiteSettings; name: string }) {
  return (
    <div className="mt-6 max-w-sm rounded-xl border border-line bg-bg p-4" aria-label="Preview">
      <p className="mb-2 text-xs uppercase tracking-wide text-muted">Preview</p>
      <div className="rounded-xl border border-line bg-surface">
        <div className="border-b border-line px-4 py-3">
          <p className="text-sm font-semibold">{s.assistantName || name}</p>
          {s.tagline && <p className="text-xs text-muted">{s.tagline}</p>}
        </div>
        <div className="grid gap-3 p-4">
          <p className="w-fit max-w-[85%] rounded-xl bg-bg px-3 py-2 text-sm">{s.greeting || "…"}</p>
          {s.chips.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {s.chips.map((c) => (
                <span key={c} className="rounded-full border border-line px-3 py-1 text-xs">
                  {c}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
