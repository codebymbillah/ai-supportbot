#!/usr/bin/env node
import { runInit } from "./init.mjs"

const HELP = `support-chat: set up the support chat in a Next.js project

Usage (run in the project's root folder):
  npx support-chat init [options]

Options:
  --brand "Acme Books"   the name written into the chat (default: from package.json)
  --api-url <address>    the backend address for API_URL, e.g. https://admin.example.com/api/v1
  --layout               also add the chat to app/layout (otherwise it tells you what to add)
  --dry-run              show what would change, change nothing
  -h, --help             this text

It adds only what is missing and never replaces a file's content. Commit your work first so you can see the changes.
`

const args = process.argv.slice(2)
if (args.includes("-h") || args.includes("--help") || args[0] !== "init") {
  console.log(HELP)
  process.exit(args.includes("-h") || args.includes("--help") ? 0 : args.length ? 1 : 0)
}

const value = (flag) => {
  const i = args.indexOf(flag)
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : undefined
}

const dryRun = args.includes("--dry-run")
const { ok, steps } = runInit({ brand: value("--brand"), apiUrl: value("--api-url"), layout: args.includes("--layout"), dryRun })

const mark = { created: "+ created ", changed: "~ changed ", kept: "= kept    ", manual: "! to do   ", error: "x error   " }
console.log(`\nsupport-chat init${dryRun ? " (dry run: nothing was written)" : ""}\n`)
for (const s of steps) console.log(`${mark[s.status]} ${s.file}\n           ${s.note}`)

if (!ok) process.exit(1)
const todo = steps.filter((s) => s.status === "manual")
console.log(
  todo.length
    ? `\nAlmost done: ${todo.length} thing${todo.length === 1 ? "" : "s"} marked "to do" above need you.`
    : "\nDone."
)
console.log(`
Next:
  1. Put your backend's address in API_URL (.env.local), then restart the dev server.
  2. Open /api/chat/status in the browser: some JSON means the route works.
  3. The chat button shows when the backend's chat settings say it is on.
`)
