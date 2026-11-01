"use client"

import { useParams } from "next/navigation"
import { useState } from "react"
import { Badge, Button, Empty, Input, PageTitle, fmtDate } from "@/components/ui"
import { deleteChat, markRead, replyToChat, setChatStatus, useSite } from "@/lib/store"
import type { Chat, ChatStatus } from "@/lib/types"

const TABS: { id: "active" | ChatStatus; label: string }[] = [
  { id: "active", label: "Open" },
  { id: "closed", label: "Closed" },
]
const STATUS = { open: "Assistant", agent: "With a team member", closed: "Closed" } as const

export default function InboxPage() {
  const { siteId } = useParams<{ siteId: string }>()
  const site = useSite(siteId)
  const [tab, setTab] = useState<"active" | ChatStatus>("active")
  const [selected, setSelected] = useState<string | null>(null)
  if (!site) return null

  const list = site.chats.filter((c) => (tab === "active" ? c.status !== "closed" : c.status === "closed"))
  const chat = site.chats.find((c) => c.id === selected) ?? null

  return (
    <>
      <PageTitle title="Inbox" hint="Chats from your visitors. Take a chat over when the assistant needs help, and answer in the same window." />
      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <div>
          <div role="tablist" className="mb-3 flex gap-1">
            {TABS.map((t) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => {
                  setTab(t.id)
                  setSelected(null)
                }}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium ${tab === t.id ? "bg-brand text-brand-ink" : "text-muted hover:bg-line/50"}`}
              >
                {t.label}
              </button>
            ))}
          </div>
          {list.length === 0 ? (
            <Empty title={tab === "active" ? "No open chats" : "No closed chats"} />
          ) : (
            <ul className="grid gap-2">
              {list.map((c) => {
                const last = c.messages[c.messages.length - 1]
                return (
                  <li key={c.id}>
                    <button
                      onClick={() => {
                        setSelected(c.id)
                        markRead(site.id, c.id)
                      }}
                      aria-current={selected === c.id}
                      className={`w-full rounded-xl border bg-surface p-3 text-left hover:border-brand ${selected === c.id ? "border-brand" : "border-line"}`}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="font-medium">{c.visitor}</span>
                        {c.unread && <span className="size-2 rounded-full bg-brand" aria-label="Unread" />}
                      </span>
                      <span className="mt-0.5 line-clamp-1 block text-sm text-muted">{last?.text}</span>
                      <span className="mt-2 flex gap-1.5">
                        <Badge tone={c.status === "agent" ? "warn" : "plain"}>{STATUS[c.status]}</Badge>
                        {c.flagged && <Badge tone="bad">Needs attention</Badge>}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
        <div>{chat ? <Conversation key={chat.id} chat={chat} siteId={site.id} onGone={() => setSelected(null)} /> : <Empty title="Choose a chat">Its messages show here.</Empty>}</div>
      </div>
    </>
  )
}

function Conversation({ chat, siteId, onGone }: { chat: Chat; siteId: string; onGone: () => void }) {
  const [text, setText] = useState("")
  return (
    <section className="flex min-h-[420px] flex-col rounded-xl border border-line bg-surface" aria-label={`Chat with ${chat.visitor}`}>
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
        <div>
          <p className="font-semibold">{chat.visitor}</p>
          <p className="text-xs text-muted">{STATUS[chat.status]}</p>
        </div>
        <div className="flex gap-2">
          {chat.status === "open" && (
            <Button small onClick={() => setChatStatus(siteId, chat.id, "agent")}>
              Take over
            </Button>
          )}
          {chat.status === "agent" && (
            <Button small onClick={() => setChatStatus(siteId, chat.id, "open")}>
              Hand back to the assistant
            </Button>
          )}
          {chat.status !== "closed" && (
            <Button small onClick={() => setChatStatus(siteId, chat.id, "closed")}>
              Close
            </Button>
          )}
          <Button
            small
            variant="danger"
            onClick={() => {
              if (window.confirm("Delete this chat for good?")) {
                deleteChat(siteId, chat.id)
                onGone()
              }
            }}
          >
            Delete
          </Button>
        </div>
      </header>
      <ol className="flex-1 space-y-3 overflow-y-auto p-4" aria-live="polite">
        {chat.messages.map((m) =>
          m.from === "system" ? (
            <li key={m.id} className="text-center text-xs text-muted">
              {m.text}
            </li>
          ) : (
            <li key={m.id} className={`flex flex-col ${m.from === "customer" ? "items-start" : "items-end"}`}>
              <p className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${m.from === "customer" ? "bg-bg" : m.from === "agent" ? "bg-brand text-brand-ink" : "border border-line"}`}>{m.text}</p>
              <span className="mt-1 text-xs text-muted">
                {m.from === "customer" ? "Visitor" : m.from === "agent" ? "Team" : "Assistant"} · {fmtDate(m.at)}
              </span>
            </li>
          )
        )}
      </ol>
      {chat.status !== "closed" ? (
        <form
          className="flex gap-2 border-t border-line p-3"
          onSubmit={(e) => {
            e.preventDefault()
            if (!text.trim()) return
            replyToChat(siteId, chat.id, text.trim())
            setText("")
          }}
        >
          <Input aria-label="Your reply" value={text} onChange={(e) => setText(e.target.value)} placeholder="Write a reply. This takes the chat over." />
          <Button variant="primary" type="submit" disabled={!text.trim()}>
            Send
          </Button>
        </form>
      ) : (
        <p className="border-t border-line p-3 text-center text-sm text-muted">This chat is closed.</p>
      )}
    </section>
  )
}
