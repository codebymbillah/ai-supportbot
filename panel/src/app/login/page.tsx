"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { Button, Field, Input } from "@/components/ui"
import { signIn } from "@/lib/store"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [error, setError] = useState<string>()

  return (
    <main className="grid min-h-screen lg:grid-cols-[1fr_minmax(420px,520px)]">
      <section className="relative hidden overflow-hidden bg-side p-12 text-side-ink lg:flex lg:flex-col lg:justify-between">
        <p className="flex items-center gap-2.5 font-semibold tracking-tight">
          <svg viewBox="0 0 24 24" className="size-6" aria-hidden>
            <rect x="2" y="3" width="20" height="15" rx="5" fill="var(--brand)" />
            <path d="M7 18l-1 4 5-4" fill="var(--brand)" />
            <path d="M8 10.5l2.5 2.5L16 8" stroke="var(--brand-ink)" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Dotbyte Chat
        </p>
        {/* A real-looking exchange says what the product does better than a slogan. */}
        <div className="grid max-w-md gap-3" aria-hidden>
          <p className="w-fit max-w-[85%] rounded-2xl rounded-tl-md bg-side-active px-4 py-3 text-[15px] leading-6">Do you have this lamp in white? I need 200 for my shop.</p>
          <p className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-tr-md bg-brand px-4 py-3 text-[15px] leading-6 text-brand-ink">Yes, the white one is in stock at 1,450 BDT each. For 200 pieces our team confirms a better price today.</p>
          <p className="mt-1 text-sm text-side-muted">Answered from the shop&apos;s own product list, in four seconds.</p>
        </div>
        <p className="max-w-sm text-sm leading-6 text-side-muted">Your products, your words, your rules. The assistant answers visitors on your site and hands over to your team when it should.</p>
      </section>

      <section className="grid content-center px-6 py-16 sm:px-12">
        <div className="mx-auto w-full max-w-sm">
          <h1 className="text-[28px] font-semibold leading-tight tracking-[-0.02em]">Sign in</h1>
          <p className="mt-2 text-[15px] text-muted">Manage the chat on your site.</p>
          <form
            className="mt-8 grid gap-5"
            onSubmit={(e) => {
              e.preventDefault()
              if (!/^\S+@\S+\.\S+$/.test(email)) return setError("Enter a valid email address, like you@yourshop.com.")
              signIn(email.trim())
              router.push("/sites")
            }}
          >
            <Field label="Email">{(id) => <Input id={id} type="email" autoComplete="email" value={email} onChange={(e) => { setEmail(e.target.value); setError(undefined) }} placeholder="you@yourshop.com" aria-invalid={!!error} />}</Field>
            {error && (
              <p role="alert" className="-mt-2 text-sm text-bad">
                {error}
              </p>
            )}
            <Button variant="primary" type="submit" className="w-full">
              Continue
            </Button>
          </form>
          <p className="mt-8 rounded-xl bg-sunken px-4 py-3 text-[13px] leading-5 text-muted">Demo: any email works and nothing leaves this browser.</p>
        </div>
      </section>
    </main>
  )
}
