import { clean, MAX_MESSAGE, text, token } from "./fields"

export const MAX_FIELD = 64 * 1024

// A photo is accepted only if its first bytes say JPEG, PNG or WebP, whatever name or type the browser gave it.
async function sniff(file: File): Promise<"jpg" | "png" | "webp" | undefined> {
  const b = new Uint8Array(await file.slice(0, 12).arrayBuffer())
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpg"
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "png"
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return "webp"
  return undefined
}

/** A message with photos arrives as a form. Rebuilt field by field like the JSON one; each photo is checked and renamed. */
export async function rebuildForm(form: FormData, rules: { maxFiles: number; maxBytes: number }): Promise<{ body: FormData } | { status: number; message: string }> {
  const field = (k: string) => (typeof form.get(k) === "string" ? (form.get(k) as string) : undefined)
  const message = clean(field("message"), MAX_MESSAGE)?.trim() ?? ""
  const files = form.getAll("images[]").filter((f): f is File => typeof f !== "string")
  if (!message && files.length === 0) return { status: 422, message: "Please write a message first." }
  if (files.length > rules.maxFiles) return { status: 422, message: `You can send up to ${rules.maxFiles} photos in one message.` }
  const body = new FormData()
  body.set("message", message)
  const gt = token(field("guest_token"))
  if (gt) body.set("guest_token", gt)
  const path = clean(field("context[path]"), 200)
  if (path) body.set("context[path]", path)
  const slug = clean(field("context[product_slug]"), 120)
  if (slug) body.set("context[product_slug]", slug)
  let n = 0
  for (let i = 0; i < 10; i++) {
    const id = text(field(`context[cart][${i}][product_id]`), 64)
    const qty = Number(field(`context[cart][${i}][qty]`))
    if (id && Number.isInteger(qty) && qty > 0 && qty < 1_000_000) {
      body.set(`context[cart][${n}][product_id]`, id)
      body.set(`context[cart][${n}][qty]`, String(qty))
      n++
    }
  }
  for (const [i, file] of files.entries()) {
    if (file.size === 0 || file.size > rules.maxBytes) return { status: 422, message: `A photo is larger than ${Math.round(rules.maxBytes / 1024 / 1024)} MB.` }
    const kind = await sniff(file)
    if (!kind) return { status: 422, message: "Only JPEG, PNG or WebP photos can be sent." }
    const type = kind === "jpg" ? "image/jpeg" : kind === "png" ? "image/png" : "image/webp"
    body.append("images[]", new File([file], `photo-${i + 1}.${kind}`, { type }))
  }
  return { body }
}
