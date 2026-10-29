"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { HeadsetIcon, MessageCircleIcon, SquarePenIcon, XIcon } from "lucide-react"
import "../styles/support-chat.css"
import { cn } from "../lib/cn"
import { AgentAvatar, Avatar, TypingDots } from "../messages/avatars"
import { Bubble } from "../messages/bubble"
import { Composer } from "../messages/composer"
import { hasBangla } from "../messages/rich-text"
import { sensitiveProblem } from "../state/safety"
import { useSupportChat } from "../state/use-support-chat"
import type { ChatContact, ChatContext, SupportChatConfig } from "../types"
import { ChatUiProvider, useChatUi } from "./chat-context"
import { ContactLines } from "./contact"
import { HandoffPanel } from "./handoff"
import { themeVars } from "./theme"
import { useSlowReply } from "./use-slow-reply"

/** Anything on the page can open the chat: `window.dispatchEvent(new Event("support-chat:open"))`. */
export const OPEN_EVENT = "support-chat:open"

export function SupportChat(props: { config: SupportChatConfig; context: ChatContext; fallbackContact?: ChatContact }) {
  return (
    <ChatUiProvider config={props.config}>
      {/* `contents`: no box of its own, it only carries the colour variables to the launcher and the window. */}
      <div className="sc-theme contents" style={themeVars(props.config.theme)}>
        <SupportChatInner {...props} />
      </div>
    </ChatUiProvider>
  )
}

function SupportChatInner({ config, context, fallbackContact }: { config: SupportChatConfig; context: ChatContext; fallbackContact?: ChatContact }) {
  const { t } = useChatUi()
  const [open, setOpen] = useState(false)
  const chat = useSupportChat(config, context, open)
  const [online, setOnline] = useState(false)
  const launcher = useRef<HTMLButtonElement>(null)
  const input = useRef<HTMLTextAreaElement>(null)
  const scroller = useRef<HTMLDivElement>(null)
  const stick = useRef(true)
  const { transport } = config

  const close = useCallback(() => {
    setOpen(false)
    launcher.current?.focus()
  }, [])

  // Whether a team member is online, for the "Our team is online" line (the green dot only says the chat is on: the assistant is always there). Once, when the page opens, then every minute while it is visible.
  useEffect(() => {
    let alive = true
    const ask = () => {
      if (!document.hidden) void transport.status().then((s) => alive && setOnline(s.agentsOnline))
    }
    ask()
    const t = setInterval(ask, 60_000)
    return () => {
      alive = false
      clearInterval(t)
    }
  }, [transport])

  // Anything on the page (the sidebar's Chat button) can open the chat.
  useEffect(() => {
    const show = () => setOpen(true)
    window.addEventListener(OPEN_EVENT, show)
    return () => window.removeEventListener(OPEN_EVENT, show)
  }, [])

  // Focus the box when the window opens, close it with Escape, and on a phone keep the page behind from scrolling.
  useEffect(() => {
    if (!open) return
    const t = setTimeout(() => input.current?.focus(), 60)
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close()
    document.addEventListener("keydown", onKey)
    const phone = window.matchMedia("(max-width: 639px)").matches
    if (phone) document.documentElement.style.overflow = "hidden"
    return () => {
      clearTimeout(t)
      document.removeEventListener("keydown", onKey)
      if (phone) document.documentElement.style.overflow = ""
    }
  }, [open, close])

  // Follow the conversation, unless the visitor scrolled up to read.
  useEffect(() => {
    const el = scroller.current
    if (el && stick.current) el.scrollTop = el.scrollHeight
  })

  const { state } = chat
  const human = state.mode === "human"
  const empty = chat.messages.length === 0
  // When the assistant is off the server says so with the numbers: show them instead of the keyboard's dead end.
  const off = chat.error?.status === 503 ? chat.error : null
  const offContact = off?.contact ?? fallbackContact
  const send = (text: string, images: File[] = []) => {
    const problem = sensitiveProblem(text, t)
    if (problem) return problem
    stick.current = true
    void chat.send(text, images)
  }
  const slow = useSlowReply(chat.awaiting && !state.handoff)

  return (
    <>
      {!open && (
        <button
          ref={launcher}
          type="button"
          onClick={() => setOpen(true)}
          aria-label={t(online ? "launcherAriaOnline" : "launcherAria")}
          className="sc-pop fixed right-4 bottom-4 z-40 flex h-14 items-center gap-2.5 rounded-full bg-(--sc-ink) px-4 text-white shadow-lg ring-1 ring-white/10 transition-transform hover:scale-[1.03] active:scale-95 print:hidden sm:px-5"
        >
          <span className="relative flex size-6 items-center justify-center">
            <MessageCircleIcon className="size-6" />
            <span aria-hidden className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-(--sc-brand) ring-2 ring-(--sc-ink)" />
          </span>
          <span className="hidden text-sm font-semibold sm:inline">{t("launcher")}</span>
        </button>
      )}

      {open && (
        <section
          role="dialog"
          aria-label={config.assistantName}
          className="sc-rise fixed inset-0 z-[60] flex flex-col overflow-hidden bg-card print:hidden sm:inset-auto sm:right-4 sm:bottom-4 sm:h-[min(680px,calc(100dvh-2rem))] sm:w-[400px] sm:rounded-2xl sm:shadow-2xl sm:ring-1 sm:ring-border"
        >
          <header className="flex items-center gap-3 bg-(--sc-ink) px-4 py-3 text-white">
            {human ? <AgentAvatar name={state.agentName} className="size-9" /> : <Avatar className="size-9 bg-white/10" />}
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 truncate text-sm font-bold">
                {human ? t("agentFromTeam", { agent: state.agentName ?? t("teamMember") }) : config.assistantName}
                {config.demo && <span className="rounded-full bg-(--sc-brand) px-2 py-0.5 text-[0.6rem] font-bold tracking-wide text-(--sc-brand-fg) uppercase">{t("demoBadge")}</span>}
              </p>
              <p className="flex items-center gap-1.5 truncate text-xs text-white/65">
                <span aria-hidden className="size-1.5 rounded-full bg-(--sc-brand)" />
                {human ? t("chattingWithPerson") : online ? t("teamOnline") : config.tagline}
              </p>
            </div>
            <button type="button" onClick={() => send(t("talkToPersonMessage"))} aria-label={t("talkToPerson")} title={t("talkToPerson")} className="flex size-8 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-white">
              <HeadsetIcon className="size-4" />
            </button>
            <button type="button" onClick={chat.reset} aria-label={t("newChatAria")} title={t("newChat")} className="flex size-8 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-white">
              <SquarePenIcon className="size-4" />
            </button>
            <button type="button" onClick={close} aria-label={t("closeChat")} className="flex size-8 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-white">
              <XIcon className="size-4" />
            </button>
          </header>

          <div
            ref={scroller}
            role="log"
            aria-label={t("conversation")}
            aria-busy={chat.awaiting}
            onScroll={(e) => {
              const el = e.currentTarget
              stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80
            }}
            className="flex flex-1 flex-col gap-3 overflow-y-auto overscroll-contain bg-background/60 px-4 py-4"
          >
            <div className="flex gap-2">
              <Avatar className="mt-0.5" />
              <div className="min-w-0 max-w-[88%]">
                <p className={cn("rounded-2xl rounded-tl-md bg-muted/70 px-3.5 py-2 text-sm leading-relaxed whitespace-pre-line [overflow-wrap:anywhere]", hasBangla(config.greeting) && config.bengaliFontClass)}>{config.greeting}</p>
                {empty && config.suggestions.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {config.suggestions.map((s) => (
                      <button key={s.label} type="button" onClick={() => send(s.message)} className="rounded-full border bg-card px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:border-primary/40 hover:bg-accent">
                        {s.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {chat.messages.map((m) => (
              <Bubble key={m.id} message={m} config={config} drafts={chat.drafts} onRate={(v) => chat.rate(m, v)} onRetry={() => chat.retry(m)} onDraft={async (id, a) => (await chat.actDraft(id, a)).problem} />
            ))}

            {chat.awaiting && !human && !state.handoff && (
              <div className="flex gap-2" aria-live="polite">
                <Avatar className="mt-0.5" />
                <p className="rounded-2xl rounded-tl-md bg-muted/70 px-3.5 py-2.5">
                  <TypingDots />
                </p>
              </div>
            )}
            {slow && !human && (
              <p className="mx-auto max-w-[92%] text-center text-xs text-muted-foreground" aria-live="polite">
                {slow === "long" ? t("slowLong") : t("slowShort")}
                {slow === "long" && fallbackContact && <ContactLines contact={fallbackContact} />}
              </p>
            )}
            {chat.awaiting && human && (
              <div className="flex gap-2" aria-live="polite">
                <AgentAvatar name={state.agentName} className="mt-0.5" />
                <p className="rounded-2xl rounded-tl-md bg-accent px-3.5 py-2.5">
                  <TypingDots />
                </p>
              </div>
            )}

            {state.handoff && <HandoffPanel kind={state.handoff.status} contact={state.handoff.status === "contact" ? state.handoff.contact : undefined} onCallBack={chat.callBack} />}

            {chat.error && !off && chat.error.status !== 0 && (
              <p role="alert" className="mx-auto max-w-[92%] rounded-xl bg-destructive/10 px-3 py-2 text-center text-xs text-destructive">
                {chat.error.message}
              </p>
            )}
            {off && (
              <div className="rounded-xl border bg-card p-3.5">
                <p className="text-sm font-semibold text-primary">{off.message}</p>
                {offContact && <ContactLines contact={offContact} />}
              </div>
            )}
          </div>

          <Composer placeholder={config.placeholder} maxLength={config.maxLength ?? 1000} inputRef={input} onSend={send} />
          <p className="bg-card px-4 pb-3 text-center text-[0.68rem] leading-snug text-muted-foreground">
            {human ? t("personNotice") : config.disclaimer}{" "}
            <a href={config.privacyHref} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-primary">
              {t("privacy")}
            </a>
          </p>
        </section>
      )}
    </>
  )
}
