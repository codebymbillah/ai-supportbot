# Install the support chat in a project

For a Next.js 15 or 16 project with Tailwind v4. About an hour with a ready backend. This path was tried on a fresh Next.js 16 app: the package built and the chat opened, sent a message with a photo and started a new chat.

## The quick way: one command
In the project's root folder:
```
npx github:TechaByte-Solutions/support-chat-kit#v0.4.2 init --brand "Acme Books" --api-url https://your-backend.com/api/v1 --layout
```
It installs the package, then does steps 1, 2, 4 and the layout part of 3 below, prints what it changed, and a second run changes nothing. Add `--dry-run` to only see what it would do. Restart the dev server, then open `/api/chat/status`: some JSON means it works. Read on to do it by hand or to change something.

## 1. Add the package
```
npm install github:<owner>/support-chat-kit#v0.4.2
```
(or `npm install ./techabyte-support-chat-0.4.0.tgz` from `npm pack`). It ships TypeScript source, so let Next compile it, in `next.config.ts`:
```ts
const config: NextConfig = { transpilePackages: ["@techabyte/support-chat"] }
```
Peer dependencies: `next`, `react`, `react-dom`, `lucide-react`.

## 2. CSS (Tailwind v4)
In the global CSS, one line so Tailwind finds the classes the package uses:
```css
@source "../node_modules/@techabyte/support-chat/src";
```
The widget's surfaces use the standard shadcn colour tokens: `background`, `foreground`, `card`, `muted`, `muted-foreground`, `accent`, `border`, `ring`, `primary`, `primary-foreground`, `destructive`. A project made with shadcn/ui has them. A plain Tailwind project copies `example/tokens.css` once.

## 3. The quick way
Put `<SupportChat config={{ brandName: "Acme Books" }} />` in a layout (`example/minimal-layout.tsx`) and create the route with `createChatProxy()` (`example/route.ts`), with `API_URL` in `.env`. Everything else has a default, and the assistant's name, greeting, chips, photo rules and the on/off switch come from the backend's `GET /chat/config`. Stop here if that is enough; the next sections are options.

## 3b. Name, colours and words (options)
These go in the config you pass to `<SupportChat>` (all optional; see `example/custom-setup.tsx` for a full one):
- `brandName`, `assistantName`, `tagline`, `greeting`, `suggestions`, `placeholder`, `disclaimer`, `privacyHref`.
- **Colours:** `theme: { brand, brandForeground, brandText, ink, link, success }`, or set `--sc-brand`, `--sc-brand-fg`, `--sc-brand-text`, `--sc-ink`, `--sc-link`, `--sc-success` in CSS (`example/globals-snippet.css`). Without either, they follow the project's `--trade`, `--ink` and similar tokens if it has them, else a neutral set.
- **Words:** every sentence the widget writes is in `labels`. `BANGLA_LABELS` is a complete Bangla set; pass `labels: { ...BANGLA_LABELS, launcher: "..." }` to change single lines. `{brand}`, `{assistant}`, `{agent}` are filled in. Give `createHttpTransport("/api/chat", { brandName, labels })` the same, so its error messages match.
- `bengaliFontClass`: the class of the project's Bangla font, applied to text with Bangla letters. Leave it out to use the page font.
- `storageKey`: different for each project, so two sites on one domain never share a chat.

## 4. The door to the backend (server)
`app/api/chat/[...path]/route.ts` (see `example/route.ts`). `createChatProxy()` with no arguments reads `API_URL` and treats everyone as a visitor. With the options:
```ts
import { cookies } from "next/headers"
import { createChatProxy } from "@techabyte/support-chat/server"

export const { GET, POST } = createChatProxy({
  apiUrl: process.env.API_URL!,
  authToken: async () => (await cookies()).get("session")?.value,
})
```
- Without `guard` it uses `defaultGuard`: writes must come from your own pages (Origin check) and each visitor is limited (messages 8 a minute and 120 a day, call-back 3 per 10 minutes, feedback 30, drafts 10, polling 75, status 20, close 10), counted in the server's memory. A project with its own rate limiter passes `guard: { crossSite, visitorIp, forwardedFor, rateLimit, tooMany }` instead. Change numbers with `limits`.
- The visitor's address is read from `X-Forwarded-For`. Your reverse proxy must **overwrite** that header from the connection (nginx: `proxy_set_header X-Forwarded-For $remote_addr`), or a visitor can forge it. The backend must list your server in its trusted proxies, or every visitor shares one limit.
- Photos: up to 3 files of 5 MB; each is checked by its first bytes and renamed. `images: { maxFiles, maxBytes }` changes it, `images: false` refuses photos. A reverse proxy in front must allow a body of at least 16 MB.

## 5. The wrapper and the switch
Write one client component like `example/custom-setup.tsx` and mount it once in a layout (only needed for things that are functions: the money format, the cart; a server layout can pass plain data directly). It passes `context` (the path, the product on screen, the cart lines) and `onAddProduct` only if the project has a cart (without it a product card has no Add button). If you bring your own transport (like TransfarX's), the widget does not read the backend's `GET /chat/config` itself: read it on the server and pass its names, greeting, chips and `images` rules (`useBackendConfig: true` turns the browser read back on).

For review before the backend is ready, `createDemoTransport({ scripts, fallback })` with `demo: true` (see `example/demo-scripts.ts`): replies after a short wait, sends nothing, and the header says Demo. Never use it on a live site.

Anything on the page can open the chat: `window.dispatchEvent(new Event("support-chat:open"))`.

## 6. The backend
The widget needs the calls in `docs/CONTRACT.md`. To use the same Laravel chat in a second project, the backend becomes a module with a small adapter per project: `docs/BACKEND-MODULE.md`.

## 7. Check before going live
- [ ] A visitor cannot see a supplier, a marketplace or a link to one in any answer or card.
- [ ] The assistant never states a price the backend did not give.
- [ ] A request or call-back is sent only after the customer presses a button.
- [ ] The guest token is never in a URL the client builds and is masked in the backend's logs.
- [ ] The button shows only while `GET /chat/config` says `enabled`.
- [ ] A photo reaches the inbox, and the customer sees it (the backend's signed link).
- [ ] "New chat" closes the conversation for a signed-in customer too.
- [ ] The reverse proxy overwrites `X-Forwarded-For`, and the backend trusts it.
