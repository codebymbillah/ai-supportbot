"use client"

import { MailIcon, MessageCircleIcon, PhoneIcon } from "lucide-react"
import type { ChatContact } from "../types"
import { useChatUi } from "./chat-context"

const wa = (n: string) => `https://wa.me/${n.replace(/\D/g, "")}`

/** The support number, WhatsApp and hours: shown when nobody can pick the chat up, and whenever the assistant is off. */
export function ContactLines({ contact }: { contact: ChatContact }) {
  const { t } = useChatUi()
  return (
    <ul className="mt-2 flex flex-col gap-1.5 text-sm">
      {contact.phone && (
        <li>
          <a href={`tel:${contact.phone.replace(/[^\d+]/g, "")}`} className="inline-flex items-center gap-2 font-semibold text-primary hover:underline">
            <PhoneIcon className="size-4 text-(--sc-brand-text)" /> {contact.phone}
          </a>
        </li>
      )}
      {contact.whatsapp && (
        <li>
          <a href={wa(contact.whatsapp)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 font-semibold text-primary hover:underline">
            <MessageCircleIcon className="size-4 text-(--sc-brand-text)" /> {t("whatsapp")}
          </a>
        </li>
      )}
      {contact.email && (
        <li>
          <a href={`mailto:${contact.email}`} className="inline-flex items-center gap-2 font-semibold text-primary hover:underline">
            <MailIcon className="size-4 text-(--sc-brand-text)" /> {contact.email}
          </a>
        </li>
      )}
      {contact.hours && <li className="text-xs text-muted-foreground">{contact.hours}</li>}
    </ul>
  )
}
