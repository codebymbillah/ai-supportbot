# Changelog

## 0.4.3 (1 Nov 2026)
- The door no longer follows a backend redirect. An `API_URL` that starts with `http://` on a server that moves to `https://` turned each message into a read, so the chat opened but nothing was saved. Now the route answers with a clear "use the https address" message and logs the address it was sent to.
- `init --api-url http://...` (not localhost) marks the step "to do" and says to use `https://`. 50 tests.

## 0.4.2 (1 Nov 2026)
- A message that did not send now says why under the conversation (for example "Can't reach ... right now"), and the typing dots no longer keep running after it failed.

## 0.4.1 (1 Nov 2026)
- `init --layout` now places the chat in the layout that create-next-app makes today (`<body ...>{children}</body>` on one line), keeping the file's semicolons. Before, it stopped with "to do".
- Run one folder too high (create-next-app often makes `my-app/my-app`), `init` names the folder to `cd` into. 47 tests.

## 0.4.0 (1 Nov 2026)
- Hosted mode: `init --key <site key>` saves `SUPPORT_CHAT_KEY` in `.env.local`, and the door sends it to the chat service as `X-Chat-Key` (server only). `SUPPORT_CHAT_URL` is read as a second name for the service address. `docs/HOSTED-SERVICE.md` lists what the client sets in a dashboard and what the service must do. The service itself is not built. 45 tests.

## 0.3.1 (1 Nov 2026)
- One command now does the whole install: `npx github:TechaByte-Solutions/support-chat-kit#v0.3.1 init ...` installs the package first (when it is not in `package.json`), then sets the project up. `--dry-run` says what it would install. README rewritten as a short step-by-step with a table of what the command does.

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
