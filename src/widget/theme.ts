import type { ChatTheme } from "../types"

/** The widget's colours as CSS variables (only the ones the project set; the rest come from support-chat.css). */
export function themeVars(theme?: ChatTheme): React.CSSProperties | undefined {
  if (!theme) return undefined
  const map: [keyof ChatTheme, string][] = [
    ["brand", "--sc-brand"],
    ["brandForeground", "--sc-brand-fg"],
    ["brandText", "--sc-brand-text"],
    ["ink", "--sc-ink"],
    ["link", "--sc-link"],
    ["success", "--sc-success"],
  ]
  return Object.fromEntries(map.flatMap(([k, v]) => (theme[k] ? [[v, theme[k]]] : []))) as React.CSSProperties
}
