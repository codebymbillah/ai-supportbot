import Link from "next/link"
import { Fragment } from "react"

// The assistant writes plain text with a little formatting: **bold**, "- " bullets, "1. " lists and [label](link). That is turned into
// React elements here, one by one. HTML is never inserted, so nothing the assistant (or a product description it quotes) says can run.
// A link must stay on this site or be a plain https address; anything else shows as text.

const safeHref = (href: string) => (href.startsWith("/") && !href.startsWith("//") ? href : /^https:\/\/\S+$/i.test(href) ? href : undefined)

const LINK_CLASS = "font-medium text-(--sc-link) underline underline-offset-2 hover:text-primary"

function inline(text: string, keyBase: string) {
  return text.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\([^)\s]+\))/g).map((part, i) => {
    const key = `${keyBase}-${i}`
    const bold = part.match(/^\*\*([^*]+)\*\*$/)
    if (bold) return <strong key={key}>{bold[1]}</strong>
    const link = part.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/)
    if (link) {
      const href = safeHref(link[2])
      if (!href) return <Fragment key={key}>{link[1]}</Fragment>
      return href.startsWith("/") ? (
        <Link key={key} href={href} className={LINK_CLASS}>
          {link[1]}
        </Link>
      ) : (
        <a key={key} href={href} target="_blank" rel="noopener noreferrer" className={LINK_CLASS}>
          {link[1]}
        </a>
      )
    }
    return <Fragment key={key}>{part}</Fragment>
  })
}

type Block = { kind: "p" | "ul" | "ol"; lines: string[] }

function toBlocks(text: string): Block[] {
  const blocks: Block[] = []
  for (const raw of text.split("\n")) {
    const line = raw.trimEnd()
    if (!line.trim()) {
      // A blank line ends the paragraph.
      blocks.push({ kind: "p", lines: [] })
      continue
    }
    const kind = /^\s*[-*•]\s+/.test(line) ? "ul" : /^\s*\d+[.)]\s+/.test(line) ? "ol" : "p"
    const body = kind === "p" ? line : line.replace(/^\s*([-*•]|\d+[.)])\s+/, "")
    const last = blocks[blocks.length - 1]
    if (last && last.kind === kind && (kind !== "p" || last.lines.length > 0)) last.lines.push(body)
    else blocks.push({ kind, lines: [body] })
  }
  return blocks.filter((b) => b.lines.length > 0)
}

export function RichText({ text }: { text: string }) {
  return (
    <>
      {toBlocks(text).map((b, i) => {
        if (b.kind === "p") {
          return (
            <p key={i} className="[&:not(:first-child)]:mt-2">
              {b.lines.map((l, j) => (
                <Fragment key={j}>
                  {j > 0 && <br />}
                  {inline(l, `${i}-${j}`)}
                </Fragment>
              ))}
            </p>
          )
        }
        const Tag = b.kind
        return (
          <Tag key={i} className={`ml-5 flex flex-col gap-1 [&:not(:first-child)]:mt-2 ${b.kind === "ul" ? "list-disc marker:text-(--sc-brand)" : "list-decimal"}`}>
            {b.lines.map((l, j) => (
              <li key={j}>{inline(l, `${i}-${j}`)}</li>
            ))}
          </Tag>
        )
      })}
    </>
  )
}

/** Any Bangla letter gets the Bangla font. Mixed Bangla and English reads fine in it too. */
export const hasBangla = (s: string) => /[ঀ-৿]/.test(s)
