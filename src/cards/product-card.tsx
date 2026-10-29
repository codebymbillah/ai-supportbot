"use client"

import Image from "next/image"
import Link from "next/link"
import { useState } from "react"
import { CheckIcon, PackagePlusIcon } from "lucide-react"
import { cn } from "../lib/cn"
import { hasBangla } from "../messages/rich-text"
import type { ProductCardData, SupportChatConfig } from "../types"
import { useChatUi } from "../widget/chat-context"

function CardPhoto({ src }: { src?: string }) {
  const [failed, setFailed] = useState(false)
  return (
    <span className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-muted">
      {src && !failed && <Image src={src} alt="" fill sizes="64px" className="object-cover" onError={() => setFailed(true)} />}
    </span>
  )
}

export function ProductCard({ card, config }: { card: ProductCardData; config: SupportChatConfig }) {
  const { t } = useChatUi()
  const href = card.href && card.href.startsWith("/") && !card.href.startsWith("//") ? card.href : `/products/${encodeURIComponent(card.slug)}`
  const price = card.offerPriceFrom ?? card.priceFrom
  const [added, setAdded] = useState(false)
  return (
    <div className="flex gap-3 rounded-xl border bg-card p-2.5">
      <CardPhoto src={card.image} />
      <div className="min-w-0 flex-1">
        <p className={cn("line-clamp-2 text-[0.8rem] leading-snug font-semibold text-foreground", hasBangla(card.title) && config.bengaliFontClass)}>{card.title}</p>
        <p className="mt-1 flex flex-wrap items-baseline gap-x-2 text-xs tabular-nums">
          {price !== undefined && <span className="text-sm font-bold text-primary">{t("from", { price: config.formatMoney(price) })}</span>}
          {card.offerPriceFrom !== undefined && card.priceFrom !== undefined && card.priceFrom > card.offerPriceFrom && <span className="text-muted-foreground line-through">{config.formatMoney(card.priceFrom)}</span>}
          {card.moq !== undefined && (
            <span className="text-muted-foreground">
              {t("moq", { moq: `${card.moq}${card.unit ? ` ${card.unit}` : ""}` })}
            </span>
          )}
        </p>
        {(card.offerLabel || card.freeDelivery) && (
          <p className="mt-1 flex flex-wrap gap-1">
            {card.offerLabel && <span className="rounded-full bg-(--sc-brand)/15 px-2 py-0.5 text-[0.65rem] font-semibold text-(--sc-brand-text)">{card.offerLabel}</span>}
            {card.freeDelivery && <span className="rounded-full bg-accent px-2 py-0.5 text-[0.65rem] font-semibold text-primary">{t("freeDelivery")}</span>}
          </p>
        )}
        <div className="mt-2 flex gap-1.5">
          <Link href={href} className="inline-flex h-7 items-center rounded-full border px-3 text-xs font-semibold text-primary transition-colors hover:bg-muted">
            {t("view")}
          </Link>
          {config.onAddProduct && !card.needsOptions && (
            <button
              type="button"
              onClick={() => {
                config.onAddProduct?.(card)
                setAdded(true)
                setTimeout(() => setAdded(false), 1800)
              }}
              className="inline-flex h-7 items-center gap-1 rounded-full bg-(--sc-brand) px-3 text-xs font-semibold text-(--sc-brand-fg) transition-[background-color,transform] hover:bg-(--sc-brand)/90 active:scale-95"
            >
              {added ? <CheckIcon className="size-3.5" /> : <PackagePlusIcon className="size-3.5" />}
              {added ? t("added") : t("addToCart")}
            </button>
          )}
          {card.needsOptions && <span className="self-center text-[0.68rem] text-muted-foreground">{t("pickOnPage")}</span>}
        </div>
      </div>
    </div>
  )
}
