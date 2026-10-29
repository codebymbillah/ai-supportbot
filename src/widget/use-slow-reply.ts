"use client"

import { useEffect, useState } from "react"

/** "short" after a few seconds of waiting for the assistant, "long" after much longer. A silent wait feels broken. */
export function useSlowReply(waiting: boolean): "short" | "long" | null {
  const [level, setLevel] = useState<"short" | "long" | null>(null)
  useEffect(() => {
    if (!waiting) return
    const a = setTimeout(() => setLevel("short"), 10_000)
    const b = setTimeout(() => setLevel("long"), 35_000)
    return () => {
      clearTimeout(a)
      clearTimeout(b)
      setLevel(null)
    }
  }, [waiting])
  return level
}
