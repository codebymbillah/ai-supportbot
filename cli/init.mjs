// `npx support-chat init`: sets up the chat in a Next.js project with one command. It adds only what is missing, never overwrites a
// file's content, and says what it did. The logic lives here (no prompts, no process.exit) so it can be tested.
import { spawnSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

export const PACKAGE = "@techabyte/support-chat"
const REPO = "github:TechaByte-Solutions/support-chat-kit"

const ROUTE = `import { createChatProxy } from "${PACKAGE}/server"

export const { GET, POST } = createChatProxy() // reads API_URL from the environment
`

/** @typedef {{ status: "created" | "changed" | "kept" | "manual" | "error", file: string, note: string }} Step */

const exists = (p) => fs.existsSync(p)
const read = (p) => fs.readFileSync(p, "utf8")
const posix = (p) => p.split(path.sep).join("/")

/**
 * @param {{ cwd?: string, brand?: string, apiUrl?: string, siteKey?: string, layout?: boolean, dryRun?: boolean, install?: boolean }} [options]
 * @returns {{ ok: boolean, steps: Step[], appDir?: string }}
 */
export function runInit({ cwd = process.cwd(), brand, apiUrl, siteKey, layout = false, dryRun = false, install = false } = {}) {
  /** @type {Step[]} */
  const steps = []
  const rel = (p) => posix(path.relative(cwd, p)) || "."
  const add = (status, file, note) => steps.push({ status, file: typeof file === "string" && path.isAbsolute(file) ? rel(file) : file, note })
  const write = (file, text) => {
    if (dryRun) return
    fs.mkdirSync(path.dirname(file), { recursive: true })
    fs.writeFileSync(file, text)
  }

  // ---- is this a Next.js project?
  const pkgFile = path.join(cwd, "package.json")
  if (!exists(pkgFile)) {
    add("error", "package.json", "No package.json here. Run this from the root folder of your Next.js project.")
    return { ok: false, steps }
  }
  const pkg = JSON.parse(read(pkgFile))
  if (!pkg.dependencies?.next && !pkg.devDependencies?.next) {
    add("error", "package.json", "This does not look like a Next.js project (no `next` dependency).")
    return { ok: false, steps }
  }
  const appDir = ["src/app", "app"].map((d) => path.join(cwd, d)).find((d) => exists(d))
  if (!appDir) {
    add("error", "app/", "No `app` folder (the App Router) found. The chat needs the App Router: `app/` or `src/app/`.")
    return { ok: false, steps }
  }
  const isTs = exists(path.join(cwd, "tsconfig.json"))

  // ---- 0. the package itself (only when asked: the command line does, the tests do not)
  if (install) {
    if (pkg.dependencies?.[PACKAGE] || pkg.devDependencies?.[PACKAGE]) {
      add("kept", "package.json", "The chat package is already installed.")
    } else {
      const version = JSON.parse(read(path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "package.json"))).version
      const spec = `${REPO}#v${version}`
      if (dryRun) {
        add("created", "package.json", `Would run: npm install ${spec}`)
      } else {
        const r = spawnSync("npm", ["install", spec], { cwd, stdio: "inherit", shell: process.platform === "win32" })
        if (r.status !== 0) {
          add("error", "package.json", `npm install ${spec} failed. Run it yourself, then run this command again.`)
          return { ok: false, steps }
        }
        add("created", "package.json", `Installed ${PACKAGE} ${version}.`)
      }
    }
  }

  // ---- 1. the route: the safe door to the backend
  const route = path.join(appDir, "api", "chat", "[...path]", isTs ? "route.ts" : "route.js")
  const otherRoute = path.join(appDir, "api", "chat", "[...path]", isTs ? "route.js" : "route.ts")
  const existingRoute = [route, otherRoute].find((f) => exists(f))
  if (existingRoute) {
    add(read(existingRoute).includes("createChatProxy") ? "kept" : "manual", existingRoute, read(existingRoute).includes("createChatProxy") ? "The chat route is already there." : "A route already exists here and is not the chat's. Left as it is: merge it by hand (see example/route.ts).")
  } else {
    write(route, ROUTE)
    add("created", route, "The safe door between the browser and the backend.")
  }

  // ---- 2. next.config: let Next compile the package
  const configNames = ["next.config.ts", "next.config.mjs", "next.config.js", "next.config.cjs"]
  const configFile = configNames.map((n) => path.join(cwd, n)).find((f) => exists(f))
  if (!configFile) {
    const created = path.join(cwd, "next.config.mjs")
    write(created, `/** @type {import("next").NextConfig} */\nconst nextConfig = {\n  transpilePackages: ["${PACKAGE}"],\n}\n\nexport default nextConfig\n`)
    add("created", created, "Lets Next compile the chat package.")
  } else {
    let text = read(configFile)
    if (text.includes(PACKAGE)) {
      add("kept", configFile, "transpilePackages already lists the chat package.")
    } else if (/transpilePackages\s*:\s*\[/.test(text)) {
      text = text.replace(/transpilePackages\s*:\s*\[/, `transpilePackages: ["${PACKAGE}", `)
      write(configFile, text)
      add("changed", configFile, "Added the chat package to transpilePackages.")
    } else {
      const open = [/(const\s+\w+\s*(?::\s*[\w.]+)?\s*=\s*\{)/, /(export\s+default\s*\{)/, /(module\.exports\s*=\s*\{)/].map((re) => text.match(re)).find(Boolean)
      if (open && open.index !== undefined) {
        const at = open.index + open[0].length
        text = `${text.slice(0, at)}\n  transpilePackages: ["${PACKAGE}"],${text.slice(at)}`
        write(configFile, text)
        add("changed", configFile, "Added transpilePackages for the chat package.")
      } else {
        add("manual", configFile, `Could not find where to add it. Add this to your config: transpilePackages: ["${PACKAGE}"]`)
      }
    }
  }

  // ---- 3. global CSS: let Tailwind see the package's classes
  const cssCandidates = [
    ...["globals.css", "global.css", "styles.css"].map((n) => path.join(appDir, n)),
    ...["src/styles/globals.css", "styles/globals.css", "src/app/globals.css", "app/globals.css"].map((n) => path.join(cwd, n)),
  ].filter((f, i, all) => exists(f) && all.indexOf(f) === i)
  const cssFile = cssCandidates.find((f) => /tailwindcss/.test(read(f))) ?? cssCandidates[0]
  if (!cssFile) {
    add("manual", "global CSS", `No global CSS file found. In yours, add: @source "<path to>/node_modules/${PACKAGE}/src";`)
  } else {
    const css = read(cssFile)
    const source = posix(path.relative(path.dirname(cssFile), path.join(cwd, "node_modules", PACKAGE, "src")))
    if (css.includes("support-chat")) {
      add("kept", cssFile, "Tailwind already sees the chat package.")
    } else if (/@tailwind\s+(base|components|utilities)/.test(css) && !/@import\s+["']tailwindcss/.test(css)) {
      add("manual", cssFile, "This project uses Tailwind 3. The chat needs Tailwind 4 (it uses `@source` and CSS variables); upgrade Tailwind first.")
    } else {
      write(cssFile, `${css.replace(/\s*$/, "")}\n\n/* The support chat's classes (added by \`support-chat init\`). */\n@source "${source}";\n`)
      add("changed", cssFile, `Added @source "${source}".`)
    }
  }

  // ---- 4. the backend address, and the site key when the chat is hosted
  const envFile = [".env.local", ".env"].map((n) => path.join(cwd, n)).find((f) => exists(f)) ?? path.join(cwd, ".env.local")
  let env = exists(envFile) ? read(envFile) : ""
  const has = (name) => new RegExp(`^\s*${name}\s*=`, "m").test(env)
  const line = (comment, name, value) => `${env && !env.endsWith("\n") ? "\n" : ""}${comment ? `# ${comment}\n` : ""}${name}=${value}\n`
  const wrote = []
  if (siteKey && !has("SUPPORT_CHAT_KEY")) {
    env += line("Site key from the chat service (server only: never put it in the browser)", "SUPPORT_CHAT_KEY", siteKey)
    wrote.push("SUPPORT_CHAT_KEY")
  }
  if (!has("API_URL") && !has("SUPPORT_CHAT_URL")) {
    env += line(siteKey ? "Address of the chat service" : "Backend address for the support chat", "API_URL", apiUrl ?? "https://your-backend.example.com/api/v1")
    wrote.push("API_URL")
  }
  if (wrote.length) {
    write(envFile, env)
    add(siteKey || apiUrl ? "changed" : "manual", envFile, apiUrl || siteKey ? `Set ${wrote.join(" and ")}.` : "Added API_URL with a placeholder: put your backend's address there.")
  } else {
    add("kept", envFile, "The chat settings are already there.")
  }

  // ---- 5. the chat in the layout (only with --layout; otherwise it says what to add)
  const name = (brand ?? String(pkg.name ?? "My Shop").replace(/^@[^/]+\//, "").split(/[-_\s]+/).filter(Boolean).map((w) => w[0].toUpperCase() + w.slice(1)).join(" ")) || "My Shop"
  const element = `<SupportChat config={{ brandName: ${JSON.stringify(name)} }} />`
  const layoutFile = ["layout.tsx", "layout.jsx", "layout.js"].map((n) => path.join(appDir, n)).find((f) => exists(f))
  if (!layoutFile) {
    add("manual", "app/layout", `No root layout found. Add: import { SupportChat } from "${PACKAGE}" and ${element} inside <body>.`)
  } else {
    const text = read(layoutFile)
    if (text.includes("SupportChat")) {
      add("kept", layoutFile, "The chat is already in the layout.")
    } else if (!layout) {
      add("manual", layoutFile, `Add to the layout: import { SupportChat } from "${PACKAGE}", and ${element} after {children}. (Or run again with --layout and it does this.)`)
    } else {
      const spots = [...text.matchAll(/^([ \t]*)\{children\}[ \t]*$/gm)]
      const imports = [...text.matchAll(/^import .+$/gm)]
      if (spots.length !== 1 || imports.length === 0) {
        add("manual", layoutFile, `Could not place it safely. Add: import { SupportChat } from "${PACKAGE}", and ${element} after {children}.`)
      } else {
        const spot = spots[0]
        const lastImport = imports[imports.length - 1]
        const afterChildren = (spot.index ?? 0) + spot[0].length
        let out = `${text.slice(0, afterChildren)}\n${spot[1]}${element}${text.slice(afterChildren)}`
        const importEnd = (lastImport.index ?? 0) + lastImport[0].length
        out = `${out.slice(0, importEnd)}\nimport { SupportChat } from "${PACKAGE}"${out.slice(importEnd)}`
        write(layoutFile, out)
        add("changed", layoutFile, `Added the chat with the name "${name}".`)
      }
    }
  }

  return { ok: !steps.some((s) => s.status === "error"), steps, appDir }
}
