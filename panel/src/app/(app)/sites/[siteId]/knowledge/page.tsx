"use client"

import { useParams } from "next/navigation"
import { useState } from "react"
import { Badge, Button, Card, Empty, Field, Input, PageTitle, Select, Textarea } from "@/components/ui"
import { deleteNote, newNote, saveNote, useSite } from "@/lib/store"
import type { Note } from "@/lib/types"

export default function KnowledgePage() {
  const { siteId } = useParams<{ siteId: string }>()
  const site = useSite(siteId)
  const [editing, setEditing] = useState<Note | null>(null)
  if (!site) return null

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
      <PageTitle
        title="Knowledge"
        hint="What the assistant may tell visitors besides products: delivery, returns, payment, opening hours, common questions. Write it here or give a page address and we read it."
        action={
          <Button variant="primary" onClick={() => setEditing(newNote())}>
            Add a note
          </Button>
        }
      />
      {editing && <NoteForm key={editing.id} note={editing} siteId={site.id} onClose={() => setEditing(null)} />}
      {site.notes.length === 0 ? (
        <Empty title="Nothing here yet">Add your delivery and return rules first. Visitors ask about them most.</Empty>
      ) : (
        <ul className="grid gap-3">
          {site.notes.map((n) => (
            <li key={n.id} className="rounded-2xl border border-line bg-surface p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 font-medium">
                    {n.title} <Badge>{n.kind === "page" ? "Page we read" : "Text"}</Badge>
                  </p>
                  <p className="mt-1 break-words text-sm text-muted">{n.body}</p>
                </div>
                <div className="flex gap-1">
                  <Button small variant="ghost" onClick={() => setEditing(n)}>
                    Edit
                  </Button>
                  <Button small variant="ghost" className="hover:text-bad" onClick={() => window.confirm(`Delete “${n.title}”?`) && deleteNote(site.id, n.id)}>
                    Delete
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function NoteForm({ note, siteId, onClose }: { note: Note; siteId: string; onClose: () => void }) {
  const [n, setN] = useState(note)
  return (
    <form
      className="grid gap-4 rounded-2xl border border-line bg-surface p-6 sm:max-w-2xl"
      onSubmit={(e) => {
        e.preventDefault()
        if (!n.title.trim() || !n.body.trim()) return
        saveNote(siteId, { ...n, title: n.title.trim(), body: n.body.trim() })
        onClose()
      }}
    >
      <Field label="Title">{(id) => <Input id={id} required value={n.title} onChange={(e) => setN({ ...n, title: e.target.value })} placeholder="Delivery times" />}</Field>
      <Field label="Kind">
        {(id) => (
          <Select id={id} value={n.kind} onChange={(e) => setN({ ...n, kind: e.target.value as Note["kind"] })}>
            <option value="text">Write it here</option>
            <option value="page">A page we read</option>
          </Select>
        )}
      </Field>
      <Field label={n.kind === "page" ? "Page address" : "Text"} hint={n.kind === "page" ? "We read this page again every day." : "Plain text. Keep it short and factual."}>
        {(id) =>
          n.kind === "page" ? (
            <Input id={id} type="url" required value={n.body} onChange={(e) => setN({ ...n, body: e.target.value })} placeholder="https://myshop.com/delivery" />
          ) : (
            <Textarea id={id} rows={5} required value={n.body} onChange={(e) => setN({ ...n, body: e.target.value })} />
          )
        }
      </Field>
      <div className="flex gap-2">
        <Button variant="primary" type="submit">
          Save note
        </Button>
        <Button onClick={onClose}>Cancel</Button>
      </div>
    </form>
  )
}
