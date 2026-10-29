import type { Translate } from "./labels"
import type { ChatImageRules } from "./types"

// Photos a customer attaches. They are checked and shrunk in the browser before anything is sent: a phone photo is often 4 to 8 MB,
// which is slow on a mobile connection and more than the backend takes. The server checks again (server.ts and the backend).

export const ACCEPT = "image/jpeg,image/png,image/webp"
const TYPES = new Set(ACCEPT.split(","))
const LONG_SIDE = 1600

export const DEFAULT_RULES: ChatImageRules = { enabled: false, maxPerMessage: 3, maxFileMb: 5 }

async function shrink(file: File): Promise<File> {
  // A small picture is sent as it is.
  if (file.size <= 400 * 1024) return file
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, LONG_SIDE / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement("canvas")
  canvas.width = Math.max(1, Math.round(bitmap.width * scale))
  canvas.height = Math.max(1, Math.round(bitmap.height * scale))
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.82))
  if (!blob || blob.size >= file.size) return file
  return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" })
}

/** Checks the chosen files against the rules and shrinks them. Returns the files to attach, or a sentence saying why not. */
export async function prepareImages(chosen: File[], already: number, rules: ChatImageRules, t: Translate): Promise<{ files: File[] } | { problem: string }> {
  if (already + chosen.length > rules.maxPerMessage) return { problem: t("tooManyPhotos", { max: rules.maxPerMessage }) }
  if (chosen.some((f) => !TYPES.has(f.type))) return { problem: t("notAPhoto") }
  try {
    const files = await Promise.all(chosen.map(shrink))
    if (files.some((f) => f.size > rules.maxFileMb * 1024 * 1024)) return { problem: t("photoTooBig", { mb: rules.maxFileMb }) }
    return { files }
  } catch {
    return { problem: t("photoUnreadable") }
  }
}
