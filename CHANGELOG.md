# Changelog

## 0.1.0 (29 Oct 2026)
First version as a separate package, taken from the TransfarX storefront.

- Chat widget: launcher, window, polling, retry, ratings, product, info and draft cards, hand-over to a person with a call-back form, "New chat" that closes the conversation on the backend.
- Photos in a message (up to three), shrunk in the browser, checked in the route, drawn from the backend's signed https link.
- Configurable per project: `brandName`, colours (`theme` or `--sc-*` CSS variables), every sentence (`labels`, with a ready Bangla set), Bangla font class, storage key.
- Server door `createChatProxy` with a ready `defaultGuard`; only listed calls pass, bodies are rebuilt field by field, errors return only the message, errors and contact.
- Safety in the browser: card numbers, passwords, PINs and one-time codes are stopped before sending; slow-reply notes.
- Scripted demo transport for review.
- 23 tests (safety, labels, the door, the reading of backend answers). Tried on a fresh Next.js 16 app installed from the packed tarball.
