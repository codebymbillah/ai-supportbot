"use client"

import { useState } from "react"
import { ImagePlusIcon } from "lucide-react"
import { cn } from "../lib/cn"
import type { ChatImage } from "../types"
import { useChatActions, useChatUi } from "../widget/chat-context"

// Photos the customer sent. Only an https link from the backend, or a picture made in this browser while it sends, is drawn.
function PhotoThumb({ image }: { image: ChatImage }) {
  const { t } = useChatUi()
  const { refreshPhotos } = useChatActions()
  // Remember which link failed. A fresh link (after refreshPhotos) is a different address, so it gets its own try.
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  // A link that has expired (or a photo that was removed) shows a quiet empty frame, not a broken-image icon.
  if (failedUrl === image.url) return <span aria-label={t("photoAlt")} role="img" className="flex size-24 items-center justify-center rounded-xl border bg-muted text-muted-foreground"><ImagePlusIcon className="size-5" /></span>
  // eslint-disable-next-line @next/next/no-img-element -- a signed link from the backend or a local preview: not an optimisable asset
  return (
    <img
      src={image.url}
      alt={t("photoAlt")}
      loading="lazy"
      onError={() => {
        setFailedUrl(image.url)
        if (image.url.startsWith("https://")) refreshPhotos()
      }}
      className="size-24 rounded-xl border object-cover"
    />
  )
}

export function Photos({ images, className }: { images: ChatImage[]; className?: string }) {
  const { t } = useChatUi()
  const safe = images.filter((i) => /^(https:\/\/|blob:)/.test(i.url))
  if (!safe.length) return null
  return (
    <div className={cn("flex max-w-[85%] flex-wrap justify-end gap-1.5", className)}>
      {safe.map((i) => (
        <span key={`${i.id}-${i.url}`} className="flex flex-col items-end gap-0.5">
          <PhotoThumb image={i} />
        </span>
      ))}
    </div>
  )
}
