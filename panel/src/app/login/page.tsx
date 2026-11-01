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
    <main className="mx-auto grid min-h-screen max-w-sm content-center gap-6 px-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Support Chat Panel</h1>
        <p className="mt-1 text-sm text-muted">Sign in to manage the chat on your site.</p>
      </div>
      <form
        className="grid gap-4"
        onSubmit={(e) => {
          e.preventDefault()
          if (!/^\S+@\S+\.\S+$/.test(email)) return setError("Enter a valid email address.")
          signIn(email.trim())
          router.push("/sites")
        }}
      >
        <Field label="Email">{(id) => <Input id={id} type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@yourshop.com" />}</Field>
        {error && (
          <p role="alert" className="text-sm text-bad">
            {error}
          </p>
        )}
        <Button variant="primary" type="submit">
          Continue
        </Button>
      </form>
      <p className="rounded-lg border border-line bg-surface px-3 py-2 text-xs text-muted">Demo mode: any email works and nothing leaves this browser. The real sign-in comes with the service.</p>
    </main>
  )
}
