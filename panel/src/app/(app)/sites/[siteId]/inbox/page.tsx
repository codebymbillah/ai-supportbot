"use client"

import { useParams } from "next/navigation"
import { useState } from "react"
import { ArrowLeftIcon, BotIcon, CheckCheckIcon, InboxIcon, SearchIcon, SendHorizontalIcon, Trash2Icon, UserRoundCheckIcon } from "lucide-react"
import { toast } from "@/components/toast"
import { Badge, Button, IconButton, Initials, PageTitle, fmtDate } from "@/components/ui"
import { deleteChat, markRead, replyToChat, setChatStatus, useSite } from "@/lib/store"
import type { Chat, ChatStatus } from "@/lib/types"

type Tab = "active" | ChatStatus
const STATUS = { open: "Assistant is answering", agent: "With your team", closed: "Closed" } as const
const day = (iso?: string) => (iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }) : "")

// One window, like a mail app: the chats on the left, the open chat on the right, both the full height of the screen. On a phone the
// list and the chat take turns, with a back button.
export default function InboxPage() {
  const { siteId } = useParams<{ siteId: string }>()
  const site = useSite(siteId)
  const [tab, setTab] = useState<Tab>("active")
  const [q, setQ] = useState("")
  // null: nothing picked yet. On a wide screen the first chat is shown anyway; on a phone the list is.
  const [picked, setPicked] = useState<string | null>(null)
  if (!site) return null

  const open = site.chats.filter((c) => c.status !== "closed")
  const closed = site.chats.filter((c) => c.status === "closed")
  const needle = q.trim().toLowerCase()
  const list = (tab === "active" ? open : closed).filter((c) => !needle || `${c.visitor} ${c.messages.map((m) => m.text).join(" ")}`.toLowerCase().includes(needle))
  const shown = list.find((c) => c.id === picked) ?? list[0] ?? null
  const choose = (id: string) => {
    setPicked(id)
    markRead(site.id, id)
  }

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
      <PageTitle title="Inbox" hint="Chats from your visitors. Take a chat over when the assistant needs help, and answer in the same window." />

      <div className="flex h-[78dvh] min-h-[480px] lg:h-[calc(100dvh-13rem)] lg:min-h-[520px] overflow-hidden rounded-2xl border border-line bg-surface">
        {/* the list */}
        <div className={`${picked ? "hidden lg:flex" : "flex"} w-full flex-col border-line lg:w-[340px] lg:shrink-0 lg:border-r`}>
          <div className="grid gap-3 border-b border-line p-3">
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
              <input
                aria-label="Search chats"
                placeholder="Search by visitor or message"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="h-9 w-full rounded-[10px] border border-line-strong bg-surface pl-9 pr-3 text-sm placeholder:text-muted/70"
              />
            </div>
            <div role="tablist" aria-label="Chats" className="grid grid-cols-2 gap-1 rounded-[10px] bg-sunken p-1">
              {(
                [
                  ["active", "Open", open.length],
                  ["closed", "Closed", closed.length],
                ] as const
              ).map(([id, label, n]) => (
                <button
                  key={id}
                  role="tab"
                  aria-selected={tab === id}
                  onClick={() => {
                    setTab(id)
                    setPicked(null)
                  }}
                  className={`flex h-8 items-center justify-center gap-1.5 rounded-lg text-sm font-medium ${tab === id ? "bg-surface text-ink shadow-[0_1px_2px_rgba(24,32,43,.12)]" : "text-muted hover:text-ink"}`}
                >
                  {label}
                  <span className="text-xs text-muted tabular-nums">{n}</span>
                </button>
              ))}
            </div>
          </div>

          {list.length === 0 ? (
            <div className="grid flex-1 place-items-center p-6 text-center">
              <p className="text-sm text-muted">{needle ? "No chat matches that search." : tab === "active" ? "No open chats. The assistant is answering everyone." : "No closed chats yet."}</p>
            </div>
          ) : (
            <ul className="flex-1 overflow-y-auto">
              {list.map((c) => {
                const last = c.messages[c.messages.length - 1]
                const active = shown?.id === c.id
                return (
                  <li key={c.id}>
                    <button
                      onClick={() => choose(c.id)}
                      aria-current={active ? "true" : undefined}
                      className={`relative flex w-full gap-3 border-b border-line px-4 py-3.5 text-left ${active ? "bg-brand-soft/60" : "hover:bg-sunken"}`}
                    >
                      {active && <span aria-hidden className="absolute inset-y-0 left-0 w-0.5 bg-brand" />}
                      <Initials email={c.visitor} size="sm" />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline justify-between gap-2">
                          <span className={`truncate ${c.unread ? "font-semibold" : "font-medium"}`}>{c.visitor}</span>
                          <span className="shrink-0 text-xs text-muted">{day(last?.at)}</span>
                        </span>
                        <span className={`mt-0.5 line-clamp-1 text-sm ${c.unread ? "text-ink" : "text-muted"}`}>{last?.text}</span>
                        <span className="mt-2 flex flex-wrap items-center gap-1.5">
                          {c.status === "agent" ? <Badge tone="warn">With your team</Badge> : c.status === "open" ? <Badge>Assistant</Badge> : null}
                          {c.flagged && <Badge tone="bad">Needs attention</Badge>}
                          {c.unread && <span className="ml-auto size-2 rounded-full bg-brand" aria-label="Unread" />}
                        </span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {/* the open chat */}
        <div className={`${picked ? "flex" : "hidden lg:flex"} min-w-0 flex-1 flex-col`}>
          {shown ? (
            <Conversation key={shown.id} chat={shown} siteId={site.id} onBack={() => setPicked(null)} />
          ) : (
            <div className="grid flex-1 place-items-center p-8 text-center">
              <div>
                <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-sunken text-muted">
                  <InboxIcon className="size-5" aria-hidden />
                </span>
                <p className="mt-4 font-semibold">{tab === "active" ? "Nothing waiting" : "No closed chats"}</p>
                <p className="mt-1 max-w-[36ch] text-sm leading-6 text-muted">When a visitor writes, the chat appears here. Chats that need a person are marked for you.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Conversation({ chat, siteId, onBack }: { chat: Chat; siteId: string; onBack: () => void }) {
  const [text, setText] = useState("")
  const send = () => {
    if (!text.trim()) return
    replyToChat(siteId, chat.id, text.trim())
    setText("")
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col" aria-label={`Chat with ${chat.visitor}`}>
      <header className="flex items-center gap-3 border-b border-line px-4 py-3">
        <IconButton label="Back to the list" onClick={onBack} className="lg:hidden">
          <ArrowLeftIcon />
        </IconButton>
        <Initials email={chat.visitor} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{chat.visitor}</p>
          <p className="flex min-w-0 items-center gap-1.5 text-[13px] text-muted">
            <span className={`size-1.5 rounded-full ${chat.status === "agent" ? "bg-warn" : chat.status === "open" ? "bg-brand" : "bg-line-strong"}`} />
            <span className="truncate">{STATUS[chat.status]}</span>
          </p>
        </div>
        <div className="flex items-center gap-1">
          {chat.status === "open" && (
            <Button small variant="primary" onClick={() => { setChatStatus(siteId, chat.id, "agent"); toast("You have taken over this chat") }}>
              <UserRoundCheckIcon className="size-3.5" aria-hidden />
              <span className="hidden sm:inline">Take over</span>
              <span className="sr-only sm:hidden">Take over</span>
            </Button>
          )}
          {chat.status === "agent" && (
            <Button small onClick={() => { setChatStatus(siteId, chat.id, "open"); toast("The assistant answers this chat again") }}>
              <BotIcon className="size-3.5" aria-hidden />
              <span className="hidden sm:inline">Hand back</span>
              <span className="sr-only sm:hidden">Hand back to the assistant</span>
            </Button>
          )}
          {chat.status !== "closed" && (
            <IconButton label="Close this chat" onClick={() => { setChatStatus(siteId, chat.id, "closed"); toast("Chat closed") }}>
              <CheckCheckIcon />
            </IconButton>
          )}
          <IconButton
            label="Delete this chat"
            tone="danger"
            onClick={() => {
              if (window.confirm("Delete this chat for good?")) {
                deleteChat(siteId, chat.id)
                toast("Chat deleted")
                onBack()
              }
            }}
          >
            <Trash2Icon />
          </IconButton>
        </div>
      </header>

      <ol className="flex-1 space-y-4 overflow-y-auto bg-sunken/40 px-4 py-5 sm:px-6" aria-live="polite">
        {chat.messages.map((m) =>
          m.from === "system" ? (
            <li key={m.id} className="flex items-center gap-3 text-xs text-muted">
              <span className="h-px flex-1 bg-line" />
              {m.text}
              <span className="h-px flex-1 bg-line" />
            </li>
          ) : (
            <li key={m.id} className={`flex flex-col ${m.from === "customer" ? "items-start" : "items-end"}`}>
              <p
                className={`max-w-[78%] whitespace-pre-line rounded-2xl px-3.5 py-2.5 text-sm leading-6 ${
                  m.from === "customer" ? "rounded-tl-md bg-surface shadow-[0_1px_0_rgba(24,32,43,.06)]" : m.from === "agent" ? "rounded-tr-md bg-brand text-brand-ink" : "rounded-tr-md border border-line bg-surface"
                }`}
              >
                {m.text}
              </p>
              <span className="mt-1 flex items-center gap-1 text-xs text-muted">
                {m.from === "assistant" && <BotIcon className="size-3" aria-hidden />}
                {m.from === "customer" ? "Visitor" : m.from === "agent" ? "You" : "Assistant"}, {fmtDate(m.at)}
              </span>
            </li>
          )
        )}
      </ol>

      {chat.status !== "closed" ? (
        <form
          className="border-t border-line p-3"
          onSubmit={(e) => {
            e.preventDefault()
            send()
          }}
        >
          <div className="flex items-end gap-2 rounded-2xl border border-line-strong bg-surface p-1.5 pl-3.5 focus-within:border-brand focus-within:shadow-[0_0_0_3px_color-mix(in_srgb,var(--brand)_18%,transparent)]">
            <textarea
              aria-label="Your reply"
              rows={1}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                // Enter sends, Shift+Enter starts a new line.
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  send()
                }
              }}
              placeholder={chat.status === "open" ? "Write a reply. Sending takes the chat over from the assistant." : "Write a reply"}
              className="max-h-40 min-h-9 flex-1 resize-none bg-transparent py-2 text-sm leading-5 outline-none placeholder:text-muted/70 focus:shadow-none"
              style={{ fieldSizing: "content" } as React.CSSProperties}
            />
            <IconButton label="Send" type="submit" disabled={!text.trim()} className="size-9 bg-brand text-brand-ink hover:bg-brand-hover hover:text-brand-ink disabled:bg-line-strong">
              <SendHorizontalIcon />
            </IconButton>
          </div>
          <p className="mt-1.5 px-1 text-xs text-muted">Enter to send, Shift+Enter for a new line.</p>
        </form>
      ) : (
        <p className="border-t border-line p-4 text-center text-sm text-muted">This chat is closed. A new message from the visitor opens a new chat.</p>
      )}
    </section>
  )
}
