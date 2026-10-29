"use client"

import { createContext, useContext, useMemo } from "react"
import { makeTranslate, type Translate } from "./labels"
import type { SupportChatConfig } from "./types"

interface ChatUi {
  config: SupportChatConfig
  t: Translate
}

const Ctx = createContext<ChatUi | null>(null)

/** Gives the widget's parts the config and the text function, so they do not need them passed one by one. */
export function ChatUiProvider({ config, children }: { config: SupportChatConfig; children: React.ReactNode }) {
  const value = useMemo(() => ({ config, t: makeTranslate(config.brandName, config.assistantName, config.labels) }), [config])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useChatUi() {
  const v = useContext(Ctx)
  if (!v) throw new Error("useChatUi must be used inside <SupportChat>")
  return v
}
