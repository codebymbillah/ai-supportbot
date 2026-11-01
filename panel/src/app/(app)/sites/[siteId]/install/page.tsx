"use client"

import { useRouter, useParams } from "next/navigation"
import { useState } from "react"
import { Button, Card, CopyButton, Field, Input, PageTitle, TagList } from "@/components/ui"
import { deleteSite, renameSite, rotateKey, setDomains, useSite } from "@/lib/store"

// The release the install command points at. Keep it in step with the kit's version.
const KIT = "github:TechaByte-Solutions/support-chat-kit#v0.4.3"

export default function InstallPage() {
  const { siteId } = useParams<{ siteId: string }>()
  const router = useRouter()
  const site = useSite(siteId)
  const [fresh, setFresh] = useState<string | null>(null)
  const [name, setName] = useState<string | null>(null)
  if (!site) return null

  const keyShown = fresh ?? `${site.keyPrefix}…`
  const command = `npx ${KIT} init --key ${fresh ?? "<your key>"} --brand "${site.name}" --layout`

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
      <PageTitle title="Install" hint="Put the chat on your website with one command. Everything after that is set here, with no change to your site's code." />
      <section className="overflow-hidden rounded-2xl bg-side text-side-ink">
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 pt-5">
          <div>
            <h2 className="text-[15px] font-semibold">Install command</h2>
            <p className="mt-0.5 text-sm text-side-muted">Run it in your Next.js project&apos;s main folder, then restart the dev server.</p>
          </div>
          <CopyButton text={command} label="Copy command" />
        </div>
        <pre className="mt-4 overflow-x-auto border-t border-side-line px-6 py-5 font-mono text-[13px] leading-6">
          <span className="select-none text-side-muted">$ </span>
          {command}
        </pre>
      </section>
      {!fresh && <p className="-mt-2 text-sm text-muted">Put your key where it says {"<your key>"}. The full key is shown only when it is made; if you no longer have it, make a new one below.</p>}

      <Card title="Site key" hint="Identifies your site to the chat service. It lives on your server only, never in the browser.">
        <div className="flex flex-wrap items-center gap-3">
          <code className="break-all rounded-[10px] bg-sunken px-3 py-2 font-mono text-[13px]">{keyShown}</code>
          {fresh && <CopyButton text={fresh} />}
          <Button
            variant="danger"
            onClick={() => {
              if (window.confirm("Make a new key? The old key stops working at once, so update SUPPORT_CHAT_KEY on your site.")) setFresh(rotateKey(site.id))
            }}
          >
            Make a new key
          </Button>
        </div>
        {fresh && <p className="mt-3 text-sm text-warn">Copy it now. It will not be shown again.</p>}
      </Card>

      <Card title="Allowed domains" hint="The chat answers only on these domains. A key used anywhere else is refused.">
        <TagList label="Add a domain" placeholder="myshop.com" values={site.domains} onChange={(v) => setDomains(site.id, v.map((d) => d.toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "")))} />
      </Card>

      <Card title="Check it works">
        <ol className="list-decimal space-y-1 pl-5 text-sm">
          <li>Open your site at /api/chat/status. Some JSON means the connection works.</li>
          <li>Switch the chat on in Settings. The button shows on your site within a minute.</li>
          <li>Send a test message and see it in the Inbox.</li>
        </ol>
      </Card>

      <Card title="Site name and removal">
        <div className="grid gap-4 sm:max-w-md">
          <Field label="Site name">
            {(id) => (
              <div className="flex gap-2">
                <Input id={id} value={name ?? site.name} onChange={(e) => setName(e.target.value)} />
                <Button disabled={!name?.trim() || name === site.name} onClick={() => { renameSite(site.id, name!.trim()); setName(null) }}>
                  Rename
                </Button>
              </div>
            )}
          </Field>
          <div>
            <Button
              variant="danger"
              onClick={() => {
                if (window.confirm(`Delete ${site.name}? Its chats, photos and products are deleted too. This cannot be undone.`)) {
                  deleteSite(site.id)
                  router.push("/sites")
                }
              }}
            >
              Delete this site
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
