# @techabyte/support-chat

An AI sales and support chat for Next.js: a floating button and a chat window, a safe server door to the backend, a scripted demo for review, and a written backend contract. Built for TransfarX first. A new project brings its own name, colours, words and backend tools; nothing inside the package names a brand.

## What the visitor gets
The visitor writes in any language and the assistant answers a few seconds later, with cards when useful (products, an order estimate, a sourcing request to confirm). They can attach up to three photos, rate an answer, start a new chat, ask for a person, and leave a number for a call-back. A team member can take the chat over in the same window. It is full screen on a phone.

It **polls** (it does not stream): the widget asks for new messages every 1.7 s while an answer is due and every 4.5 s when idle, and stops when the chat is closed or the tab is hidden.

## What is in the package
| Path | Purpose |
|---|---|
| `src/index.ts` | the client entry: `SupportChat`, `createHttpTransport`, `createDemoTransport`, `BANGLA_LABELS`, the types |
| `src/server.ts` | the server entry: `createChatProxy` (the safe door) and `defaultGuard`. Import it from server code only |
| `src/support-chat.css` | the widget's motion, border colour and brand variables |
| `src/labels.ts`, `src/labels-bn.ts` | every sentence the widget writes (English defaults, a ready Bangla set) |
| `example/` | a wrapper, a route, demo scripts and the CSS lines a new project copies |
| `docs/CONTRACT.md` | what the backend must answer |
| `docs/BACKEND-MODULE.md` | how to turn the Laravel chat into a module any project can install |
| `tests/` | 23 tests of the safety rules, the labels, the server door and the reading of backend answers |

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
