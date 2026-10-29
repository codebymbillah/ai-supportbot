// What this browser remembers about the chat. Only a key: the conversation itself lives on the backend, and the widget fetches it again when
// it opens. The guest token is the only key to a visitor's conversation, so it is kept as carefully as a password: in this browser's storage,
// never in a URL, a log or a cookie the server can read. Storage can be blocked (private window); the chat then works until the page closes.

const memory = new Map<string, string>()

function read(key: string) {
  try {
    return localStorage.getItem(key) ?? memory.get(key) ?? null
  } catch {
    return memory.get(key) ?? null
  }
}

function write(key: string, value: string | null) {
  if (value === null) memory.delete(key)
  else memory.set(key, value)
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, value)
  } catch {
    // Kept in memory above.
  }
}

// A real token is letters and digits (40 characters). Anything else in storage is ignored, so a tampered value never goes to the server.
const TOKEN = /^[A-Za-z0-9]{16,100}$/

export const guestToken = {
  get: (key: string) => {
    const v = read(`${key}:token`)
    return v && TOKEN.test(v) ? v : undefined
  },
  set: (key: string, token: string) => TOKEN.test(token) && write(`${key}:token`, token),
  clear: (key: string) => write(`${key}:token`, null),
}

export type DraftState = "sent" | "dismissed"

/** Which draft cards the customer has already answered, so a reloaded chat does not offer the button again. */
export const draftStates = {
  all(key: string): Record<string, DraftState> {
    try {
      const raw = JSON.parse(read(`${key}:drafts`) ?? "{}")
      return raw && typeof raw === "object" ? raw : {}
    } catch {
      return {}
    }
  },
  set(key: string, draftId: string, state: DraftState) {
    write(`${key}:drafts`, JSON.stringify({ ...this.all(key), [draftId]: state }))
  },
}
