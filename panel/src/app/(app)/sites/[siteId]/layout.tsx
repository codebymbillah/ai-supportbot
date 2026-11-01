"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { Empty } from "@/components/ui"
import { useSite } from "@/lib/store"

// The site's sections are in the sidebar; this only guards against a site that no longer exists.
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  const { siteId } = useParams<{ siteId: string }>()
  const site = useSite(siteId)
  if (!site)
    return (
      <Empty title="This site no longer exists" action={<Link href="/sites" className="text-sm font-medium text-brand underline-offset-4 hover:underline">Back to your sites</Link>}>
        It may have been deleted.
      </Empty>
    )
  return <>{children}</>
}
