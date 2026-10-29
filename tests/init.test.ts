import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { runInit } from "../cli/init.mjs"

const dirs: string[] = []
afterEach(() => {
  while (dirs.length) fs.rmSync(dirs.pop()!, { recursive: true, force: true })
})

/** Builds a small project in a temp folder from { "relative/path": "content" }. */
function project(files: Record<string, string>) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "chat-init-"))
  dirs.push(dir)
  const all = { "package.json": JSON.stringify({ name: "acme-books", dependencies: { next: "16.0.0" } }), ...files }
  for (const [f, content] of Object.entries(all)) {
    fs.mkdirSync(path.dirname(path.join(dir, f)), { recursive: true })
    fs.writeFileSync(path.join(dir, f), content)
  }
  return dir
}
const read = (dir: string, f: string) => fs.readFileSync(path.join(dir, f), "utf8")
const has = (dir: string, f: string) => fs.existsSync(path.join(dir, f))
const status = (r: ReturnType<typeof runInit>) => Object.fromEntries(r.steps.map((s) => [s.file, s.status]))

const LAYOUT = `import type { Metadata } from "next"
import "./globals.css"

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  )
}
`

describe("support-chat init", () => {
  it("sets up a typical project under src/app", () => {
    const dir = project({
      "tsconfig.json": "{}",
      "next.config.ts": `import type { NextConfig } from "next"\n\nconst nextConfig: NextConfig = {\n  reactStrictMode: true,\n}\n\nexport default nextConfig\n`,
      "src/app/globals.css": `@import "tailwindcss";\n\nbody { margin: 0 }\n`,
      "src/app/layout.tsx": LAYOUT,
    })
    const r = runInit({ cwd: dir, brand: "Acme Books", apiUrl: "https://api.example.com/v1", layout: true })
    expect(r.ok).toBe(true)
    // the route is in the right folder with the bracket name
    expect(read(dir, "src/app/api/chat/[...path]/route.ts")).toContain("createChatProxy()")
    expect(read(dir, "next.config.ts")).toContain('transpilePackages: ["@techabyte/support-chat"]')
    expect(read(dir, "next.config.ts")).toContain("reactStrictMode: true")
    // the CSS line points from the CSS file to node_modules
    expect(read(dir, "src/app/globals.css")).toContain('@source "../../node_modules/@techabyte/support-chat/src";')
    expect(read(dir, "src/app/globals.css")).toContain("body { margin: 0 }")
    expect(read(dir, ".env.local")).toContain("API_URL=https://api.example.com/v1")
    const layout = read(dir, "src/app/layout.tsx")
    expect(layout).toContain('import { SupportChat } from "@techabyte/support-chat"')
    expect(layout).toContain('<SupportChat config={{ brandName: "Acme Books" }} />')
    expect(layout.indexOf("{children}")).toBeLessThan(layout.indexOf("<SupportChat"))
  })

  it("uses a .js route and the app folder when the project has no TypeScript", () => {
    const dir = project({ "next.config.mjs": `const nextConfig = {}\nexport default nextConfig\n`, "app/globals.css": `@import "tailwindcss";\n`, "app/layout.js": LAYOUT })
    const r = runInit({ cwd: dir })
    expect(has(dir, "app/api/chat/[...path]/route.js")).toBe(true)
    expect(has(dir, "app/api/chat/[...path]/route.ts")).toBe(false)
    expect(read(dir, "app/globals.css")).toContain('@source "../node_modules/@techabyte/support-chat/src";')
    // without --layout the layout is left alone and the step says what to add
    expect(read(dir, "app/layout.js")).not.toContain("SupportChat")
    expect(status(r)["app/layout.js"]).toBe("manual")
    // no API address given: a placeholder, flagged
    expect(read(dir, ".env.local")).toContain("API_URL=https://your-backend.example.com/api/v1")
  })

  it("names the chat after package.json when no brand is given", () => {
    const dir = project({ "next.config.js": `module.exports = {}\n`, "app/globals.css": `@import "tailwindcss";\n`, "app/layout.tsx": LAYOUT, "tsconfig.json": "{}" })
    runInit({ cwd: dir, layout: true })
    expect(read(dir, "app/layout.tsx")).toContain('brandName: "Acme Books"')
  })

  it("handles the config shapes people write", () => {
    const a = project({ "app/x.txt": "", "next.config.mjs": `export default {\n  images: {},\n}\n` })
    runInit({ cwd: a })
    expect(read(a, "next.config.mjs")).toContain('transpilePackages: ["@techabyte/support-chat"]')

    const b = project({ "app/x.txt": "", "next.config.js": `module.exports = {\n  images: {},\n}\n` })
    runInit({ cwd: b })
    expect(read(b, "next.config.js")).toContain("transpilePackages")

    const c = project({ "app/x.txt": "", "next.config.mjs": `const nextConfig = {\n  transpilePackages: ["other"],\n}\nexport default nextConfig\n` })
    runInit({ cwd: c })
    expect(read(c, "next.config.mjs")).toContain('transpilePackages: ["@techabyte/support-chat", "other"]')

    const d = project({ "app/x.txt": "", "next.config.mjs": `export default someWrapper(buildConfig())\n` })
    const r = runInit({ cwd: d })
    expect(read(d, "next.config.mjs")).toBe(`export default someWrapper(buildConfig())\n`)
    expect(status(r)["next.config.mjs"]).toBe("manual")
  })

  it("creates a next.config when there is none", () => {
    const dir = project({ "app/x.txt": "" })
    runInit({ cwd: dir })
    expect(read(dir, "next.config.mjs")).toContain("@techabyte/support-chat")
  })

  it("changes nothing the second time", () => {
    const dir = project({ "tsconfig.json": "{}", "next.config.ts": `const nextConfig = {}\nexport default nextConfig\n`, "app/globals.css": `@import "tailwindcss";\n`, "app/layout.tsx": LAYOUT })
    runInit({ cwd: dir, apiUrl: "https://a/v1", layout: true })
    const files = ["app/api/chat/[...path]/route.ts", "next.config.ts", "app/globals.css", ".env.local", "app/layout.tsx"]
    const before = files.map((f) => read(dir, f))
    const again = runInit({ cwd: dir, apiUrl: "https://a/v1", layout: true })
    expect(files.map((f) => read(dir, f))).toEqual(before)
    expect(again.steps.every((s) => s.status === "kept")).toBe(true)
  })

  it("keeps an existing API_URL and adds to an existing .env without losing it", () => {
    const keep = project({ "app/x.txt": "", ".env.local": "API_URL=https://mine/v1\nOTHER=1\n" })
    runInit({ cwd: keep, apiUrl: "https://other/v1" })
    expect(read(keep, ".env.local")).toBe("API_URL=https://mine/v1\nOTHER=1\n")

    const add = project({ "app/x.txt": "", ".env": "SECRET=abc" })
    runInit({ cwd: add, apiUrl: "https://a/v1" })
    expect(read(add, ".env")).toBe("SECRET=abc\n# Backend address for the support chat\nAPI_URL=https://a/v1\n")
    expect(has(add, ".env.local")).toBe(false)
  })

  it("writes nothing on a dry run", () => {
    const dir = project({ "tsconfig.json": "{}", "next.config.ts": `const nextConfig = {}\nexport default nextConfig\n`, "app/globals.css": `@import "tailwindcss";\n`, "app/layout.tsx": LAYOUT })
    const before = ["next.config.ts", "app/globals.css", "app/layout.tsx"].map((f) => read(dir, f))
    const r = runInit({ cwd: dir, layout: true, dryRun: true })
    expect(["next.config.ts", "app/globals.css", "app/layout.tsx"].map((f) => read(dir, f))).toEqual(before)
    expect(has(dir, "app/api")).toBe(false)
    expect(has(dir, ".env.local")).toBe(false)
    expect(r.steps.some((s) => s.status === "created" || s.status === "changed")).toBe(true)
  })

  it("does not overwrite a chat route that is not ours", () => {
    const dir = project({ "tsconfig.json": "{}", "app/api/chat/[...path]/route.ts": "export const GET = () => new Response('mine')\n", "app/globals.css": `@import "tailwindcss";\n` })
    const r = runInit({ cwd: dir })
    expect(read(dir, "app/api/chat/[...path]/route.ts")).toContain("mine")
    expect(status(r)["app/api/chat/[...path]/route.ts"]).toBe("manual")
  })

  it("will not guess in a layout it cannot read safely", () => {
    const dir = project({ "tsconfig.json": "{}", "app/globals.css": `@import "tailwindcss";\n`, "app/layout.tsx": `export default function L(props) { return <html><body>{props.children}</body></html> }\n` })
    const r = runInit({ cwd: dir, layout: true })
    expect(read(dir, "app/layout.tsx")).not.toContain("SupportChat")
    expect(status(r)["app/layout.tsx"]).toBe("manual")
  })

  it("warns about Tailwind 3 instead of adding a line that cannot work", () => {
    const dir = project({ "app/globals.css": `@tailwind base;\n@tailwind components;\n@tailwind utilities;\n` })
    const r = runInit({ cwd: dir })
    expect(read(dir, "app/globals.css")).not.toContain("@source")
    expect(r.steps.find((s) => s.file.endsWith("globals.css"))?.status).toBe("manual")
  })

  it("says clearly when it is not a Next.js App Router project", () => {
    const none = fs.mkdtempSync(path.join(os.tmpdir(), "chat-init-"))
    dirs.push(none)
    expect(runInit({ cwd: none }).ok).toBe(false)
    const notNext = project({ "package.json": JSON.stringify({ name: "x", dependencies: { react: "19" } }) })
    expect(runInit({ cwd: notNext }).steps[0].note).toContain("Next.js")
    const pagesOnly = project({ "pages/index.js": "" })
    const r = runInit({ cwd: pagesOnly })
    expect(r.ok).toBe(false)
    expect(r.steps[0].note).toContain("App Router")
  })
})
