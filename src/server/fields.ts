// Small helpers that read a value from what a browser sent, and cut it down to a safe size or shape.

export const GUEST_TOKEN = /^[A-Za-z0-9]{16,100}$/
export const MAX_BODY = 8 * 1024
export const MAX_MESSAGE = 1000

export const clean = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : undefined)
export const token = (v: unknown) => (typeof v === "string" && GUEST_TOKEN.test(v) ? v : undefined)
export const text = (v: unknown, max: number) => (typeof v === "string" || typeof v === "number" ? String(v).slice(0, max) : undefined)
