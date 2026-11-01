"use client"

import { useParams } from "next/navigation"
import { useState, useSyncExternalStore } from "react"
import { Badge, Button, Card, Empty, Field, Input, PageTitle, Select, Textarea, fmtDate } from "@/components/ui"
import { addSource, deleteProduct, newProduct, readSource, removeSource, saveProduct, useSite } from "@/lib/store"
import type { Product, Site, SourceKind } from "@/lib/types"

const KINDS: Record<SourceKind, { label: string; placeholder: string; hint: string }> = {
  site: { label: "My website", placeholder: "https://myshop.com", hint: "We read your public product pages. You do nothing." },
  feed: { label: "Product feed", placeholder: "https://myshop.com/feed.csv", hint: "A CSV or JSON address (the Google Merchant feed format works)." },
  connector: { label: "Shop platform", placeholder: "WooCommerce or Shopify address", hint: "Connects to your shop platform's own API." },
}
const STOCK = { in_stock: "In stock", out_of_stock: "Out of stock", on_request: "On request" } as const

// Whole minutes since 1970, read in the browser only, so the server and the first browser paint agree.
const subscribe = () => () => {}
const useMinute = () => useSyncExternalStore(subscribe, () => Math.floor(Date.now() / 60000), () => 0)

export default function CatalogPage() {
  const { siteId } = useParams<{ siteId: string }>()
  const site = useSite(siteId)
  if (!site) return null
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
      <PageTitle title="Products" hint="The assistant names a product, a price or stock only from this list. It comes from your own site, so you change a product on your site and we pick it up." />
      <Sources site={site} />
      <Products site={site} />
    </div>
  )
}

function Sources({ site }: { site: Site }) {
  const [kind, setKind] = useState<SourceKind>("site")
  const [address, setAddress] = useState("")
  return (
    <Card title="Where your products come from" hint="We read these again every day, and whenever you press Read now.">
      {site.sources.length === 0 ? (
        <Empty title="No source yet">Add your website and the assistant learns your products.</Empty>
      ) : (
        <ul className="divide-y divide-line">
          {site.sources.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0">
              <div className="min-w-0">
                <p className="truncate font-medium">{s.address}</p>
                <p className="text-sm text-muted">
                  {KINDS[s.kind].label} · last read {fmtDate(s.lastRead)} · {s.products} products
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge tone={s.status === "ok" ? "ok" : s.status === "error" ? "bad" : "plain"}>{s.status === "ok" ? "Working" : s.status === "error" ? "Problem" : "Not read yet"}</Badge>
                <Button small onClick={() => readSource(site.id, s.id)}>
                  Read now
                </Button>
                <Button small variant="danger" onClick={() => window.confirm("Stop reading this source? Its products stay until you delete them.") && removeSource(site.id, s.id)}>
                  Remove
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <form
        className="mt-5 grid gap-3 border-t border-line pt-5 sm:grid-cols-[180px_1fr_auto] sm:items-end"
        onSubmit={(e) => {
          e.preventDefault()
          if (!address.trim()) return
          addSource(site.id, kind, address.trim())
          setAddress("")
        }}
      >
        <Field label="Kind">
          {(id) => (
            <Select id={id} value={kind} onChange={(e) => setKind(e.target.value as SourceKind)}>
              {Object.entries(KINDS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Address" hint={KINDS[kind].hint}>
          {(id) => <Input id={id} value={address} onChange={(e) => setAddress(e.target.value)} placeholder={KINDS[kind].placeholder} />}
        </Field>
        <Button variant="primary" type="submit" disabled={!address.trim()}>
          Add source
        </Button>
      </form>
    </Card>
  )
}

function Products({ site }: { site: Site }) {
  const [q, setQ] = useState("")
  const [editing, setEditing] = useState<Product | null>(null)
  const minute = useMinute()
  const staleMs = site.settings.staleHours * 3_600_000
  const list = site.products.filter((p) => !q.trim() || `${p.title} ${p.category}`.toLowerCase().includes(q.trim().toLowerCase()))

  return (
    <Card
      title={`Product list (${site.products.length})`}
      action={
        <Button variant="primary" onClick={() => setEditing(newProduct())}>
          Add a product by hand
        </Button>
      }
    >
      {editing && <ProductForm key={editing.id} product={editing} onClose={() => setEditing(null)} siteId={site.id} />}
      {site.products.length === 0 ? (
        <Empty title="No products yet">Press Read now on a source above, or add one by hand.</Empty>
      ) : (
        <>
          <div className="mb-4 sm:max-w-xs">
            <Input aria-label="Search products" placeholder="Search products" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="text-muted">
                <tr>
                  <th className="pb-2 font-medium">Product</th>
                  <th className="pb-2 font-medium">Price</th>
                  <th className="pb-2 font-medium">Stock</th>
                  <th className="pb-2 font-medium">Read</th>
                  <th className="pb-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {list.map((p) => {
                  const old = minute > 0 && minute * 60000 - Date.parse(p.fetchedAt) > staleMs
                  return (
                    <tr key={p.id} className={p.hidden ? "opacity-60" : undefined}>
                      <td className="py-3 pr-3">
                        <p className="font-medium">{p.title}</p>
                        <p className="text-xs text-muted">{p.category || "No category"}</p>
                      </td>
                      <td className="py-3 pr-3 tabular-nums">{p.price === null ? "On request" : `${p.price.toLocaleString("en-US")} ${p.currency}`}</td>
                      <td className="py-3 pr-3">{STOCK[p.stock]}</td>
                      <td className="py-3 pr-3">
                        <span className="text-muted">{fmtDate(p.fetchedAt)}</span> {old && <Badge tone="warn">Old</Badge>} {p.hidden && <Badge>Hidden</Badge>}
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <Button small variant="ghost" onClick={() => saveProduct(site.id, { ...p, hidden: !p.hidden })}>
                            {p.hidden ? "Show" : "Hide"}
                          </Button>
                          <Button small variant="ghost" onClick={() => setEditing(p)}>
                            Edit
                          </Button>
                          <Button small variant="ghost" className="hover:text-bad" onClick={() => window.confirm(`Delete ${p.title}?`) && deleteProduct(site.id, p.id)}>
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {list.length === 0 && <p className="py-6 text-center text-sm text-muted">No product matches that search.</p>}
          </div>
        </>
      )}
    </Card>
  )
}

function ProductForm({ product, siteId, onClose }: { product: Product; siteId: string; onClose: () => void }) {
  const [p, setP] = useState(product)
  const set = <K extends keyof Product>(k: K, v: Product[K]) => setP((x) => ({ ...x, [k]: v }))
  return (
    <form
      className="mb-6 grid gap-4 rounded-xl border border-line bg-bg p-4 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault()
        if (!p.title.trim()) return
        saveProduct(siteId, { ...p, title: p.title.trim(), fetchedAt: new Date().toISOString() })
        onClose()
      }}
    >
      <Field label="Name">{(id) => <Input id={id} required value={p.title} onChange={(e) => set("title", e.target.value)} />}</Field>
      <Field label="Category">{(id) => <Input id={id} value={p.category} onChange={(e) => set("category", e.target.value)} />}</Field>
      <Field label="Price" hint="Leave empty for “On request”.">
        {(id) => <Input id={id} type="number" min={0} value={p.price ?? ""} onChange={(e) => set("price", e.target.value === "" ? null : Math.max(0, +e.target.value))} />}
      </Field>
      <Field label="Currency">{(id) => <Input id={id} value={p.currency} maxLength={3} onChange={(e) => set("currency", e.target.value.toUpperCase())} />}</Field>
      <Field label="Stock">
        {(id) => (
          <Select id={id} value={p.stock} onChange={(e) => set("stock", e.target.value as Product["stock"])}>
            {Object.entries(STOCK).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <Field label="Page on your site" hint="The assistant links here.">
        {(id) => <Input id={id} type="url" value={p.url} onChange={(e) => set("url", e.target.value)} placeholder="https://" />}
      </Field>
      <div className="sm:col-span-2">
        <Field label="Description">{(id) => <Textarea id={id} value={p.description} onChange={(e) => set("description", e.target.value)} />}</Field>
      </div>
      <div className="flex gap-2 sm:col-span-2">
        <Button variant="primary" type="submit">
          Save product
        </Button>
        <Button onClick={onClose}>Cancel</Button>
      </div>
    </form>
  )
}
