"use client"

import { useParams } from "next/navigation"
import { useState, useSyncExternalStore } from "react"
import { EyeIcon, EyeOffIcon, GlobeIcon, PencilIcon, PlusIcon, RefreshCwIcon, RssIcon, SearchIcon, StoreIcon, Trash2Icon } from "lucide-react"
import { toast } from "@/components/toast"
import { Badge, Button, Card, Empty, Field, IconButton, Input, PageTitle, Select, Textarea, fmtDate } from "@/components/ui"
import { addSource, deleteProduct, newProduct, readSource, removeSource, saveProduct, useSite } from "@/lib/store"
import type { Product, Site, SourceKind } from "@/lib/types"

const KINDS: Record<SourceKind, { label: string; placeholder: string; hint: string }> = {
  site: { label: "My website", placeholder: "https://myshop.com", hint: "We read your public product pages. You do nothing." },
  feed: { label: "Product feed", placeholder: "https://myshop.com/feed.csv", hint: "A CSV or JSON address (the Google Merchant feed format works)." },
  connector: { label: "Shop platform", placeholder: "WooCommerce or Shopify address", hint: "Connects to your shop platform's own API." },
}
const STOCK = { in_stock: { label: "In stock", tone: "ok" }, out_of_stock: { label: "Out of stock", tone: "bad" }, on_request: { label: "On request", tone: "plain" } } as const
const KIND_ICON = { site: GlobeIcon, feed: RssIcon, connector: StoreIcon }

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
  const empty = site.sources.length === 0
  const [adding, setAdding] = useState(false)
  const [kind, setKind] = useState<SourceKind>("site")
  const [address, setAddress] = useState("")
  const showForm = adding || empty

  return (
    <Card
      title="Where your products come from"
      hint="We read these again every day, and whenever you press Read now."
      action={
        !empty && !adding ? (
          <Button onClick={() => setAdding(true)}>
            <PlusIcon className="size-4" aria-hidden />
            Add a source
          </Button>
        ) : undefined
      }
    >
      {!empty && (
        <ul className="divide-y divide-line">
          {site.sources.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
              <div className="flex min-w-0 items-center gap-3">
                <SourceIcon kind={s.kind} />
                <div className="min-w-0">
                  <p className="truncate font-medium">{s.address}</p>
                  <p className="text-sm text-muted">
                    {KINDS[s.kind].label}, last read {fmtDate(s.lastRead)}, {s.products} products
                  </p>
                  {s.status === "error" && <p className="text-sm text-bad">{s.note}</p>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge dot tone={s.status === "ok" ? "ok" : s.status === "error" ? "bad" : "plain"}>{s.status === "ok" ? "Working" : s.status === "error" ? "Problem" : "Not read yet"}</Badge>
                <Button small onClick={() => { readSource(site.id, s.id); toast("Products read again") }}>
                  <RefreshCwIcon className="size-3.5" aria-hidden />
                  Read now
                </Button>
                <IconButton label="Remove source" tone="danger" onClick={() => { if (window.confirm("Stop reading this source? Its products stay until you delete them.")) { removeSource(site.id, s.id); toast("Source removed") } }}>
                  <Trash2Icon />
                </IconButton>
              </div>
            </li>
          ))}
        </ul>
      )}

      {showForm && (
        <form
          className={`grid gap-4 ${empty ? "" : "mt-5 border-t border-line pt-5"}`}
          onSubmit={(e) => {
            e.preventDefault()
            if (!address.trim()) return
            addSource(site.id, kind, address.trim())
            setAddress("")
            setAdding(false)
            toast("Source added. Press Read now to fetch its products.")
          }}
        >
          <fieldset>
            <legend className="mb-2 text-[13px] font-medium">What do you want to connect?</legend>
            <div className="grid gap-2 sm:grid-cols-3">
              {(Object.keys(KINDS) as SourceKind[]).map((k) => {
                const Icon = KIND_ICON[k]
                const on = kind === k
                return (
                  <label key={k} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 ${on ? "border-brand bg-brand-soft/50 shadow-[0_0_0_1px_var(--brand)]" : "border-line hover:border-line-strong"}`}>
                    <input type="radio" name="source-kind" value={k} checked={on} onChange={() => setKind(k)} className="sr-only" />
                    <Icon className={`mt-0.5 size-4.5 shrink-0 ${on ? "text-brand" : "text-muted"}`} aria-hidden />
                    <span>
                      <span className="block text-sm font-medium">{KINDS[k].label}</span>
                      <span className="mt-0.5 block text-[13px] leading-5 text-muted">{KINDS[k].hint}</span>
                    </span>
                  </label>
                )
              })}
            </div>
          </fieldset>
          <div className="grid gap-1.5">
            <label htmlFor="source-address" className="text-[13px] font-medium">
              {kind === "site" ? "Your website's address" : kind === "feed" ? "The feed's address" : "Your shop's address"}
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input id="source-address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder={KINDS[kind].placeholder} />
              <Button variant="primary" type="submit" disabled={!address.trim()}>
                Add source
              </Button>
              {!empty && (
                <Button onClick={() => { setAdding(false); setAddress("") }}>
                  Cancel
                </Button>
              )}
            </div>
          </div>
        </form>
      )}
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
      hint="Hidden products stay in the list, but the assistant does not offer them."
      action={
        <Button onClick={() => setEditing(newProduct())}>
          <PlusIcon className="size-4" aria-hidden />
          Add by hand
        </Button>
      }
    >
      {editing && <ProductForm key={editing.id} product={editing} onClose={() => setEditing(null)} siteId={site.id} />}
      {site.products.length === 0 ? (
        <Empty title="No products yet">Press Read now on a source above, or add one by hand.</Empty>
      ) : (
        <>
          <div className="relative mb-4 sm:max-w-xs">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
            <Input aria-label="Search products" placeholder="Search by name or category" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
          </div>
          {/* relative: the hidden "Actions" header is positioned, and must stay inside this scroll box on a phone. */}
          <div className="relative overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="text-[13px] text-muted">
                <tr className="border-b border-line">
                  <th className="pb-2.5 font-medium">Product</th>
                  <th className="pb-2.5 text-right font-medium">Price</th>
                  <th className="pb-2.5 pl-6 font-medium">Stock</th>
                  <th className="pb-2.5 font-medium">Last read</th>
                  <th className="pb-2.5"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {list.map((p) => {
                  const old = minute > 0 && minute * 60000 - Date.parse(p.fetchedAt) > staleMs
                  return (
                    <tr key={p.id}>
                      <td className="py-3 pr-4">
                        <div className={`flex items-center gap-3 ${p.hidden ? "opacity-50" : ""}`}>
                          <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-xl bg-sunken text-sm font-semibold text-muted">{p.title.slice(0, 1)}</span>
                          <div className="min-w-0">
                            <p className="truncate font-medium">{p.title}</p>
                            <p className="text-[13px] text-muted">{p.category || "No category"}</p>
                          </div>
                        </div>
                      </td>
                      <td className={`whitespace-nowrap py-3 text-right font-medium ${p.hidden ? "opacity-50" : ""}`}>{p.price === null ? <span className="font-normal text-muted">On request</span> : `${p.price.toLocaleString("en-US")} ${p.currency}`}</td>
                      <td className="py-3 pl-6 pr-3">
                        <Badge dot tone={STOCK[p.stock].tone}>{STOCK[p.stock].label}</Badge>
                      </td>
                      <td className="py-3 pr-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-muted">{fmtDate(p.fetchedAt)}</span>
                          {old && <Badge tone="warn">Price may be old</Badge>}
                          {p.hidden && <Badge>Hidden</Badge>}
                        </div>
                      </td>
                      <td className="py-3">
                        <div className="flex justify-end gap-0.5">
                          <IconButton label={p.hidden ? `Show ${p.title}` : `Hide ${p.title}`} onClick={() => { saveProduct(site.id, { ...p, hidden: !p.hidden }); toast(p.hidden ? "Product shown to the assistant" : "Product hidden from the assistant") }}>
                            {p.hidden ? <EyeIcon /> : <EyeOffIcon />}
                          </IconButton>
                          <IconButton label={`Edit ${p.title}`} onClick={() => setEditing(p)}>
                            <PencilIcon />
                          </IconButton>
                          <IconButton label={`Delete ${p.title}`} tone="danger" onClick={() => { if (window.confirm(`Delete ${p.title}?`)) { deleteProduct(site.id, p.id); toast("Product deleted") } }}>
                            <Trash2Icon />
                          </IconButton>
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
      className="mb-6 grid gap-4 rounded-xl border border-line bg-sunken p-4 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault()
        if (!p.title.trim()) return
        saveProduct(siteId, { ...p, title: p.title.trim(), fetchedAt: new Date().toISOString() })
        toast("Product saved")
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
                {v.label}
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

function SourceIcon({ kind }: { kind: SourceKind }) {
  const Icon = KIND_ICON[kind]
  return (
    <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand">
      <Icon className="size-4.5" />
    </span>
  )
}
