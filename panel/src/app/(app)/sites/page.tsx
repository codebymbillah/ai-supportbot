"use client"

import Link from "next/link"
import { useState } from "react"
import { Badge, Button, Card, CopyButton, Empty, Field, Input, PageTitle } from "@/components/ui"
import { createSite, usePanel } from "@/lib/store"

export default function SitesPage() {
  const { sites } = usePanel()
  const [adding, setAdding] = useState(false)
  const [created, setCreated] = useState<{ name: string; key: string } | null>(null)

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
      <PageTitle
        title="Your sites"
        hint="Each site has its own key, settings, products and chats. Nothing is shared between sites."
        action={
          <Button variant="primary" onClick={() => setAdding(true)}>
            Add a site
          </Button>
        }
      />

      {created && (
        <div>
          <Card title={`${created.name} is ready`} hint="Copy the key now. It is shown only this once; if you lose it, make a new one.">
            <div className="flex flex-wrap items-center gap-3">
              <code className="break-all rounded-[10px] bg-sunken px-3 py-2 font-mono text-[13px]">{created.key}</code>
              <CopyButton text={created.key} />
              <Button variant="ghost" small onClick={() => setCreated(null)}>
                Done
              </Button>
            </div>
          </Card>
        </div>
      )}

      {adding && (
        <div>
          <NewSite
            onCancel={() => setAdding(false)}
            onCreated={(name, key) => {
              setAdding(false)
              setCreated({ name, key })
            }}
          />
        </div>
      )}

      {sites.length === 0 ? (
        <Empty title="No sites yet">Add your website to get a key and the install command.</Empty>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {sites.map((s) => (
            <li key={s.id}>
              <Link href={`/sites/${s.id}`} className="block rounded-2xl border border-line bg-surface p-6 hover:border-line-strong hover:shadow-[0_12px_32px_-20px_rgba(24,32,43,.35)]">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="font-semibold">{s.name}</h2>
                  <Badge dot tone={s.settings.enabled ? "ok" : "plain"}>{s.settings.enabled ? "Chat on" : "Chat off"}</Badge>
                </div>
                <p className="mt-1 text-sm text-muted">{s.domains.join(", ") || "No domain yet"}</p>
                <dl className="mt-6 grid grid-cols-3 gap-2 border-t border-line pt-4">
                  <div>
                    <dt className="text-[13px] text-muted">Chats</dt>
                    <dd className="mt-0.5 text-xl font-semibold tabular-nums">{s.usage.chats}</dd>
                  </div>
                  <div>
                    <dt className="text-[13px] text-muted">Products</dt>
                    <dd className="mt-0.5 text-xl font-semibold tabular-nums">{s.products.length}</dd>
                  </div>
                  <div>
                    <dt className="text-[13px] text-muted">Open</dt>
                    <dd className="mt-0.5 text-xl font-semibold tabular-nums">{s.chats.filter((c) => c.status !== "closed").length}</dd>
                  </div>
                </dl>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function NewSite({ onCancel, onCreated }: { onCancel: () => void; onCreated: (name: string, key: string) => void }) {
  const [name, setName] = useState("")
  const [domain, setDomain] = useState("")
  const [error, setError] = useState<string>()
  return (
    <Card title="Add a site">
      <form
        className="grid gap-4 sm:max-w-md"
        onSubmit={(e) => {
          e.preventDefault()
          const host = domain.trim().replace(/^https?:\/\//, "").replace(/\/.*$/, "").toLowerCase()
          if (!name.trim() || !/^[a-z0-9.-]+\.[a-z]{2,}$/.test(host)) return setError("Give the site a name and its domain, like myshop.com.")
          const { site, key } = createSite(name.trim(), host)
          onCreated(site.name, key)
        }}
      >
        <Field label="Site name">{(id) => <Input id={id} value={name} onChange={(e) => setName(e.target.value)} placeholder="My Shop" />}</Field>
        <Field label="Domain" hint="The chat works only on this domain. You can add more later.">
          {(id) => <Input id={id} value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="myshop.com" />}
        </Field>
        {error && (
          <p role="alert" className="text-sm text-bad">
            {error}
          </p>
        )}
        <div className="flex gap-2">
          <Button variant="primary" type="submit">
            Create site
          </Button>
          <Button onClick={onCancel}>Cancel</Button>
        </div>
      </form>
    </Card>
  )
}
