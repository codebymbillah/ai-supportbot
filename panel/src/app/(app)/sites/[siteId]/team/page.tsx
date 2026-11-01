"use client"

import { useParams } from "next/navigation"
import { useState } from "react"
import { UserMinusIcon } from "lucide-react"
import { toast } from "@/components/toast"
import { Badge, Button, Card, Field, IconButton, Initials, Input, PageTitle, Select } from "@/components/ui"
import { inviteMember, removeMember, useSite } from "@/lib/store"
import type { Member } from "@/lib/types"

export default function TeamPage() {
  const { siteId } = useParams<{ siteId: string }>()
  const site = useSite(siteId)
  const [email, setEmail] = useState("")
  const [role, setRole] = useState<Member["role"]>("agent")
  const [error, setError] = useState<string>()
  if (!site) return null
  const owners = site.team.filter((m) => m.role === "owner").length

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
      <PageTitle title="Team" hint="People who can answer chats. An owner can also change settings and delete the site." />
      <Card>
        <ul className="divide-y divide-line">
          {site.team.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center justify-between gap-3 py-3.5 first:pt-0 last:pb-0">
              <div className="flex min-w-0 items-center gap-3">
                <Initials email={m.email} />
                <div className="min-w-0">
                  <p className="truncate font-medium">{m.email}</p>
                  <p className="text-[13px] text-muted">{m.role === "owner" ? "Owner: answers chats, changes settings, manages the team" : "Agent: answers chats"}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {m.invited ? <Badge tone="warn">Invitation sent</Badge> : <Badge dot tone="ok">Active</Badge>}
                {m.role === "owner" && owners === 1 ? (
                  <span className="w-8" aria-hidden />
                ) : (
                  <IconButton
                    label={`Remove ${m.email}`}
                    tone="danger"
                    onClick={() => {
                      if (window.confirm(`Remove ${m.email}? They can no longer open this site's inbox.`)) {
                        removeMember(site.id, m.id)
                        toast(`${m.email} removed`)
                      }
                    }}
                  >
                    <UserMinusIcon />
                  </IconButton>
                )}
              </div>
            </li>
          ))}
        </ul>
      </Card>
      <Card title="Invite someone">
        <form
          className="grid gap-3 sm:grid-cols-[1fr_160px_auto] sm:items-end"
          onSubmit={(e) => {
            e.preventDefault()
            const v = email.trim().toLowerCase()
            if (!/^\S+@\S+\.\S+$/.test(v)) return setError("Enter a valid email address.")
            if (site.team.some((m) => m.email === v)) return setError("That person is already on the team.")
            setError(undefined)
            inviteMember(site.id, v, role)
            toast(`Invitation sent to ${v}`)
            setEmail("")
          }}
        >
          <Field label="Email">{(id) => <Input id={id} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@yourshop.com" />}</Field>
          <Field label="Role">
            {(id) => (
              <Select id={id} value={role} onChange={(e) => setRole(e.target.value as Member["role"])}>
                <option value="agent">Agent</option>
                <option value="owner">Owner</option>
              </Select>
            )}
          </Field>
          <Button variant="primary" type="submit">
            Send invitation
          </Button>
        </form>
        {error && (
          <p role="alert" className="mt-3 text-sm text-bad">
            {error}
          </p>
        )}
      </Card>
    </div>
  )
}
