# @techabyte/support-chat

An AI sales and support chat for Next.js: a floating button and a chat window, a safe server door to the backend, a scripted demo for review, and a written backend contract. Built for TransfarX first. A new project brings its own name, colours, words and backend tools; nothing inside the package names a brand.

## How it is used
The chat has two halves that work together: this package (the chat box on the website) and a backend that writes the answers (today the TransfarX Laravel chat; making it reusable is planned in `docs/BACKEND-MODULE.md`).

**On another Next.js website** (works today):
1. Install it: `npm install github:TechaByte-Solutions/support-chat-kit#v0.1.2` and add `transpilePackages: ["@techabyte/support-chat"]` to `next.config.ts`.
2. Add one line to the global CSS so Tailwind finds its classes: `@source "../node_modules/@techabyte/support-chat/src";`
3. Add a route `app/api/chat/[...path]/route.ts` with `createChatProxy({ apiUrl, authToken })`: the safe door to the backend (copy `example/route.ts`).
4. Write one small component with the site's name, colours and words, and mount it once in the layout (copy `example/support-chat.tsx`). Colours, every sentence and a ready Bangla set are options, nothing is fixed to one brand.
5. Point `apiUrl` at a backend that follows `docs/CONTRACT.md`. Until the backend is ready, the scripted demo (`createDemoTransport`) shows the chat with sample answers.

**On WordPress or Shopify** (planned, not built): a plugin or app that adds the same chat through a script, with the chat service hosted by us. The plan is in `docs/BACKEND-MODULE.md`.

Full steps and the checklist before going live: `INSTALL.md`.

## What the visitor gets
The visitor writes in any language and the assistant answers a few seconds later, with cards when useful (products, an order estimate, a sourcing request to confirm). They can attach up to three photos, rate an answer, start a new chat, ask for a person, and leave a number for a call-back. A team member can take the chat over in the same window. It is full screen on a phone.

It **polls** (it does not stream): the widget asks for new messages every 1.7 s while an answer is due and every 4.5 s when idle, and stops when the chat is closed or the tab is hidden.

## What is in the package
```
src/
  index.ts        the client entry: SupportChat, createHttpTransport, createDemoTransport, labels, types
  types.ts        every type, and the SupportChatConfig a project fills in
  server/         the safe door (server code only): index.ts createChatProxy, guard.ts defaultGuard,
                  messages.ts and photos.ts rebuild what a browser sent, fields.ts small readers
  widget/         the launcher and the window: chat-widget.tsx, hand-over and call-back, contact lines, theme, slow-reply note
  messages/       what is drawn in the conversation: bubble, photos, composer, avatars, rich-text (the assistant's text as elements)
  cards/          product, info and draft cards. A project with other things to show changes only this folder
  transport/      how the widget talks: http-transport.ts (the real backend), demo.ts (scripted, for review)
  state/          the chat's logic: use-support-chat.ts (polling), guest-storage.ts, safety.ts, prepare-images.ts
  labels/         every sentence the widget writes: labels.ts (English), labels-bn.ts (a ready Bangla set)
  styles/         support-chat.css: motion, border colour and the brand variables
  lib/            cn.ts
example/          a route, a wrapper, demo scripts and the CSS lines a new project copies
docs/             CONTRACT.md (what the backend must answer), BACKEND-MODULE.md (turning the Laravel chat into a module)
tests/            23 tests: safety rules, labels, the server door, the reading of backend answers
```
Outside the package only two paths are public: `@techabyte/support-chat` (`src/index.ts`) and `@techabyte/support-chat/server` (`src/server/index.ts`). Everything else can move without breaking a project.

## Rules that travel with it
- No model key and no direct backend call in the browser. Everything goes through the project's own route.
- The assistant's text is drawn as plain elements, never as HTML. A link is followed only if it is a path on the site or `https`.
- A card shows only the fields in the contract. A field the backend adds by mistake (a supplier, a source link) is dropped on arrival.
- Nothing is written (a request, a call-back) without the customer pressing a button.
- Card numbers, passwords, PINs and one-time codes are stopped in the browser before sending.
- Photos: JPEG, PNG or WebP, at most three a message, shrunk in the browser, checked by their first bytes in the route, drawn only from an https link the backend signed.
- The guest token is a key to a person's conversation. It stays in the browser's storage and goes only to the project's own route.

## Install and use
See `INSTALL.md`. Short version: add the package, add the CSS lines, add one route, write one small wrapper, mount it once in a layout.

## Develop
```
npm install
npm run check      # type-check and run the tests
```
Change `CHANGELOG.md` and the `version` in `package.json` for every release, and keep `docs/CONTRACT.md` in step with the backend's OpenAPI file.
