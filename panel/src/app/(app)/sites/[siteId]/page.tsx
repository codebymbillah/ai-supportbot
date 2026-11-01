"use client"

import { useRouter, useParams } from "next/navigation"
import { useState } from "react"
import { Button, Card, CopyButton, Field, Input, TagList } from "@/components/ui"
import { deleteSite, renameSite, rotateKey, setDomains, useSite } from "@/lib/store"

// The release the install command points at. Keep it in step with the kit's version.
const KIT = "github:TechaByte-Solutions/support-chat-kit#v0.4.0"

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
      <Card title="Install on your website" hint="Run this one command in your Next.js project's main folder, then restart the dev server. Nothing else changes on your side.">
        <div className="grid gap-3">
          <pre className="overflow-x-auto rounded-lg bg-bg p-3 text-sm">{command}</pre>
          <div className="flex flex-wrap gap-2">
            <CopyButton text={command} label="Copy command" />
          </div>
          {!fresh && <p className="text-sm text-muted">Replace {"<your key>"} with your key. For safety the full key is shown only when it is made: make a new one below if you no longer have it.</p>}
        </div>
      </Card>

      <Card title="Site key" hint="Identifies your site to the chat service. It lives on your server only, never in the browser.">
        <div className="flex flex-wrap items-center gap-3">
          <code className="break-all rounded-lg bg-bg px-3 py-2 text-sm">{keyShown}</code>
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
