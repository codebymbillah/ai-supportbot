"use client"

import { useRef, useState } from "react"
import { ArrowUpIcon, ImagePlusIcon, XIcon } from "lucide-react"
import { cn } from "../lib/cn"
import { ACCEPT, prepareImages } from "../state/prepare-images"
import { useChatUi } from "../widget/chat-context"

interface Attached {
  file: File
  preview: string
}

export function Composer({
  placeholder,
  maxLength,
  onSend,
  inputRef,
}: {
  placeholder: string
  maxLength: number
  /** Returns a sentence when the text must not be sent (it then stays in the box). */
  onSend: (text: string, images: File[]) => string | void
  inputRef: React.RefObject<HTMLTextAreaElement | null>
}) {
  const { config, t } = useChatUi()
  const rules = config.images?.enabled ? config.images : undefined
  const [value, setValue] = useState("")
  const [notice, setNotice] = useState<string | null>(null)
  const [attached, setAttached] = useState<Attached[]>([])
  const picker = useRef<HTMLInputElement>(null)
  // The box grows with the text, up to five lines.
  const grow = (el: HTMLTextAreaElement) => {
    el.style.height = "auto"
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`
  }

  const canSend = value.trim().length > 0 || attached.length > 0

  function submit() {
    const text = value.trim()
    if (!text && attached.length === 0) return
    const problem = onSend(text, attached.map((a) => a.file))
    setNotice(problem ?? null)
    if (problem) return
    // The sent message makes its own previews, so these are released here.
    attached.forEach((a) => URL.revokeObjectURL(a.preview))
    setAttached([])
    setValue("")
    if (inputRef.current) grow(inputRef.current)
  }

  async function choose(list: FileList | null) {
    if (!rules || !list?.length) return
    const res = await prepareImages([...list], attached.length, rules, t)
    if ("problem" in res) return setNotice(res.problem)
    setNotice(null)
    setAttached((a) => [...a, ...res.files.map((file) => ({ file, preview: URL.createObjectURL(file) }))])
  }

  function remove(i: number) {
    setAttached((a) => {
      URL.revokeObjectURL(a[i].preview)
      return a.filter((_, k) => k !== i)
    })
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
      className="border-t bg-card p-3"
    >
      {notice && (
        <p role="alert" className="mb-2 rounded-xl bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {notice}
        </p>
      )}
      {attached.length > 0 && (
        <ul className="mb-2 flex flex-wrap gap-2">
          {attached.map((a, i) => (
            <li key={a.preview} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element -- a preview made in this browser */}
              <img src={a.preview} alt="" className="size-14 rounded-lg border object-cover" />
              <button type="button" onClick={() => remove(i)} aria-label={t("removePhoto")} className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full bg-foreground text-background shadow">
                <XIcon className="size-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex items-end gap-2 rounded-2xl border bg-background py-1.5 pr-1.5 pl-1.5 transition-shadow focus-within:border-primary/40 focus-within:ring-3 focus-within:ring-ring/30">
        {rules && (
          <>
            <input
              ref={picker}
              type="file"
              accept={ACCEPT}
              multiple
              hidden
              onChange={(e) => {
                void choose(e.target.files)
                e.target.value = ""
              }}
            />
            <button type="button" onClick={() => picker.current?.click()} disabled={attached.length >= rules.maxPerMessage} aria-label={t("attachPhoto")} title={t("attachPhoto")} className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40">
              <ImagePlusIcon className="size-[1.15rem]" />
            </button>
          </>
        )}
        <textarea
          ref={inputRef}
          value={value}
          rows={1}
          maxLength={maxLength}
          aria-label={t("yourMessage")}
          placeholder={placeholder}
          onChange={(e) => {
            setValue(e.target.value)
            setNotice(null)
            grow(e.target)
          }}
          onKeyDown={(e) => {
            // Enter sends; Shift+Enter adds a line. While a Bangla keyboard is still composing a word, Enter belongs to it.
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault()
              submit()
            }
          }}
          className={cn("max-h-[120px] min-h-8 flex-1 resize-none bg-transparent py-1.5 text-base leading-snug outline-none placeholder:text-muted-foreground/70 md:text-sm", !rules && "pl-2")}
        />
        <button type="submit" disabled={!canSend} aria-label={t("send")} className="flex size-9 shrink-0 items-center justify-center rounded-full bg-(--sc-brand) text-(--sc-brand-fg) transition-[opacity,transform] active:scale-95 disabled:opacity-40">
          <ArrowUpIcon className="size-4" />
        </button>
      </div>
      {value.length > maxLength * 0.8 && <p className="mt-1 text-right text-[0.65rem] text-muted-foreground tabular-nums">{value.length}/{maxLength}</p>}
    </form>
  )
}
