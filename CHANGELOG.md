# Changelog

## 0.3.0 (29 Oct 2026)
- `npx support-chat init` sets a Next.js project up with one command: the route (`app/` or `src/app/`, `.ts` or `.js`), `transpilePackages`, the Tailwind `@source` line, `API_URL`, and with `--layout` the chat in the layout. Options `--brand`, `--api-url`, `--dry-run`. It never replaces a file's content, says what it did, changes nothing on a second run, and tells you plainly when a file needs a manual change (a Tailwind 3 project, a config it cannot read, a route that already exists). 12 tests, 43 in all.

## 0.2.0 (29 Oct 2026)
Easier to install. Nothing that worked before is removed.
- `<SupportChat config={{ brandName: "Acme" }} />` is enough: every other setting has a default, `context` defaults to the current path, and without a transport of its own the widget talks to `/api/chat` and takes the assistant's name, greeting, suggestion chips, photo rules and the on/off switch from the backend's `GET /chat/config` (nothing is shown while the backend says it is off or cannot answer). A setting the project gives wins over the backend's.
- `createChatProxy()` needs no arguments: it reads `API_URL`, treats everyone as a visitor, and says plainly when `API_URL` is missing. The route now also passes `GET config`.
- `example/` has a one-line route, a minimal layout and a full custom setup. 31 tests.

## 0.1.2 (29 Oct 2026)
- A photo whose signed link has expired (the backend's links last six hours) is read again from the backend once, at most every 20 seconds, to get a fresh link; until then an empty frame shows instead of a broken image.
- A photo the assistant did not review is drawn like any other (the backend already tells the customer with a system message); the extra note and its label `photoForTeam` are removed.

## 0.1.1 (29 Oct 2026)
Only the layout of `src/` changed: files are grouped in folders (server, widget, messages, cards, transport, state, labels, styles), large files are split, and the example no longer needs a shim file. The two public entries and their behaviour are the same. The photo and form checks in the route moved to `server/photos.ts`.

## 0.1.0 (29 Oct 2026)
First version as a separate package, taken from the TransfarX storefront.

- Chat widget: launcher, window, polling, retry, ratings, product, info and draft cards, hand-over to a person with a call-back form, "New chat" that closes the conversation on the backend.
- Photos in a message (up to three), shrunk in the browser, checked in the route, drawn from the backend's signed https link.
- Configurable per project: `brandName`, colours (`theme` or `--sc-*` CSS variables), every sentence (`labels`, with a ready Bangla set), Bangla font class, storage key.
- Server door `createChatProxy` with a ready `defaultGuard`; only listed calls pass, bodies are rebuilt field by field, errors return only the message, errors and contact.
- Safety in the browser: card numbers, passwords, PINs and one-time codes are stopped before sending; slow-reply notes.
- Scripted demo transport for review.
- 23 tests (safety, labels, the door, the reading of backend answers). Tried on a fresh Next.js 16 app installed from the packed tarball.
