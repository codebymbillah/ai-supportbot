"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { type DraftState, draftStates, guestToken } from "./guest-storage"
import { makeTranslate } from "../labels/labels"
import { type ChatContext, ChatError, type ChatMessage, type ChatState, EMPTY_STATE, type SupportChatConfig } from "../types"

const FAST_MS = 1700 // while an answer is on its way
const IDLE_MS = 4500 // an open chat with nothing going on

/**
 * The state and actions of one chat. The backend does not stream: a message is saved at once and the answer is written a few seconds later,
 * so while the chat is open this asks for new messages every couple of seconds (faster while an answer is due), and stops when the chat is
 * closed or the tab is hidden. The conversation lives on the backend; this keeps only the key to it.
 */
export function useSupportChat(config: SupportChatConfig, context: ChatContext, open: boolean) {
  const { transport, storageKey = "support-chat" } = config
  const t = useMemo(() => makeTranslate(config.brandName, config.assistantName, config.labels), [config.brandName, config.assistantName, config.labels])
  // Photos of messages that are still sending or failed, so Try again can send them again.
  const pending = useRef(new Map<number, File[]>())
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [state, setState] = useState<ChatState>(EMPTY_STATE)
  const [error, setError] = useState<ChatError | null>(null)
  // The widget draws its window only once opened, never in the server's HTML, so reading the browser's storage here cannot mismatch.
  const [drafts, setDrafts] = useState<Record<string, DraftState>>(() => (typeof window === "undefined" ? {} : draftStates.all(storageKey)))
  const token = useRef<string | undefined>(typeof window === "undefined" ? undefined : guestToken.get(storageKey))
  const lastId = useRef(0)
  const tempId = useRef(0)
  const polling = useRef(false)
  const contextRef = useRef(context)
  useEffect(() => {
    contextRef.current = context
  })

  const merge = useCallback((incoming: ChatMessage[]) => {
    if (!incoming.length) return
    setMessages((list) => {
      const known = new Set(list.map((m) => m.id))
      const fresh = incoming.filter((m) => !known.has(m.id))
      // A feedback vote the server now reports replaces what is on screen.
      const updated = list.map((m) => incoming.find((i) => i.id === m.id) ?? m)
      return fresh.length ? [...updated, ...fresh] : updated
    })
    lastId.current = Math.max(lastId.current, ...incoming.map((m) => m.id))
  }, [])

  const poll = useCallback(async () => {
    if (polling.current) return
    polling.current = true
    try {
      // With no key there is no conversation yet (a visitor who has not written), unless they are signed in: then the server knows them.
      const res = await transport.poll({ after: lastId.current, guestToken: token.current })
      merge(res.messages)
      setState(res.state)
      setError((e) => (e && e.status === 0 ? null : e))
    } catch (e) {
      // A dropped connection is not worth a message: the next poll tries again. Anything else (a limit, the chat being off) is shown.
      if (e instanceof ChatError && e.status !== 0) setError(e)
    } finally {
      polling.current = false
    }
  }, [merge, transport])

  // The loop. One timer at a time; it reschedules itself with the delay that fits the state.
  const awaiting = state.awaitingReply || state.handoff?.status === "waiting" || messages.some((m) => m.local === "sending") || messages[messages.length - 1]?.sender === "customer"
  useEffect(() => {
    if (!open) return
    let timer: ReturnType<typeof setTimeout> | undefined
    let stopped = false
    const tick = async () => {
      if (stopped) return
      if (!document.hidden) await poll()
      if (!stopped) timer = setTimeout(tick, awaiting ? FAST_MS : IDLE_MS)
    }
    void tick()
    // Coming back to the tab asks at once.
    const onVisible = () => {
      if (!document.hidden) {
        clearTimeout(timer)
        void tick()
      }
    }
    document.addEventListener("visibilitychange", onVisible)
    return () => {
      stopped = true
      clearTimeout(timer)
      document.removeEventListener("visibilitychange", onVisible)
    }
  }, [open, awaiting, poll])

  const send = useCallback(
    async (text: string, images: File[] = []) => {
      const body = text.trim().slice(0, config.maxLength ?? 1000)
      if (!body && images.length === 0) return
      const tempMsgId = -(++tempId.current)
      // While it sends, the customer sees their own photos from this device.
      const preview = images.map((f, i) => ({ id: -(i + 1), url: URL.createObjectURL(f), aiReviewed: true }))
      const temp: ChatMessage = { id: tempMsgId, sender: "customer", body, cards: [], images: preview.length ? preview : undefined, createdAt: new Date().toISOString(), local: "sending" }
      if (images.length) pending.current.set(tempMsgId, images)
      setMessages((l) => [...l, temp])
      setError(null)
      const release = () => preview.forEach((p) => URL.revokeObjectURL(p.url))
      try {
        const res = await transport.send({ message: body, images: images.length ? images : undefined, context: contextRef.current, guestToken: token.current })
        if (res.guestToken) {
          token.current = res.guestToken
          guestToken.set(storageKey, res.guestToken)
        }
        // The saved message takes the place of the one shown while sending.
        setMessages((l) => l.map((m) => (m.id === tempMsgId ? res.message : m)))
        lastId.current = Math.max(lastId.current, res.message.id)
        setState(res.state)
        pending.current.delete(tempMsgId)
        release()
      } catch (e) {
        const err = e instanceof ChatError ? e : new ChatError(t("failed"))
        setMessages((l) => l.map((m) => (m.id === tempMsgId ? { ...m, local: "failed" } : m)))
        setError(err)
      }
    },
    [config.maxLength, storageKey, t, transport]
  )

  /** Send a message that failed again. */
  const retry = useCallback(
    (m: ChatMessage) => {
      const files = pending.current.get(m.id)
      pending.current.delete(m.id)
      m.images?.forEach((p) => URL.revokeObjectURL(p.url))
      setMessages((l) => l.filter((x) => x.id !== m.id))
      void send(m.body, files)
    },
    [send]
  )

  const rate = useCallback(
    (m: ChatMessage, value: "up" | "down") => {
      const next = m.feedback === value ? undefined : value
      setMessages((l) => l.map((x) => (x.id === m.id ? { ...x, feedback: next } : x)))
      if (next) void transport.feedback({ messageId: m.id, value: next, guestToken: token.current })
    },
    [transport]
  )

  /** Press a button on a draft card. Returns a sentence to show when it did not work. */
  const actDraft = useCallback(
    async (draftId: string, action: "confirm" | "dismiss") => {
      const done = (s: DraftState) => {
        draftStates.set(storageKey, draftId, s)
        setDrafts((d) => ({ ...d, [draftId]: s }))
      }
      try {
        const res = await transport.actDraft({ draftId, action, guestToken: token.current })
        done(action === "confirm" ? "sent" : "dismissed")
        void poll() // the server adds a line "Sourcing request … sent"
        return { result: res }
      } catch (e) {
        // Pressed twice, or sent from another device: it is already done.
        if (e instanceof ChatError && e.status === 409) {
          done("sent")
          return { result: { message: t("alreadySent") } }
        }
        return { problem: e instanceof Error ? e.message : t("failed") }
      }
    },
    [poll, storageKey, t, transport]
  )

  /** The backend's photo links work for a few hours. When one fails to load, read the whole conversation again (at most every 20 s) to get fresh links. */
  const lastRefresh = useRef(0)
  const refreshPhotos = useCallback(() => {
    if (Date.now() - lastRefresh.current < 20_000) return
    lastRefresh.current = Date.now()
    void transport
      .poll({ after: 0, guestToken: token.current })
      .then((res) => merge(res.messages))
      .catch(() => undefined)
  }, [merge, transport])

  const callBack = useCallback((name: string, phone: string, note?: string) => transport.handoff({ name, phone, note, guestToken: token.current }), [transport])

  /** A new chat: ask the backend to close this conversation (it stays in the team's inbox as closed), then forget the key here. */
  const reset = useCallback(() => {
    if (messages.length > 0) void transport.close?.({ guestToken: token.current })
    guestToken.clear(storageKey)
    token.current = undefined
    lastId.current = 0
    setMessages([])
    setState(EMPTY_STATE)
    setError(null)
  }, [messages.length, storageKey, transport])

  return { messages, state, error, drafts, awaiting, send, retry, rate, actDraft, callBack, reset, refreshPhotos, clearError: () => setError(null) }
}
