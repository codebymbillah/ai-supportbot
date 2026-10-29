# The backend contract (what the widget expects)

Summary of the backend's chat API, written from its OpenAPI file on 29 Oct 2026. The backend's `swagger/openapi.yaml` is the source of truth; if they differ, the swagger wins and this file should be corrected.

All calls go to the project's own route (`/api/chat/*`, see `createChatProxy`), which adds the customer's sign-in and forwards to `{API}/chat/*`. The chat does **not** stream: a message is saved at once, the answer is written a moment later, and the widget polls.

| Call | Purpose |
|---|---|
| `GET /chat/config` | read when the site loads: `enabled`, `assistant_name`, `tagline`, `greeting`, `suggestions[{label, message}]`, `images{enabled, max_per_message, max_file_mb}`. Not shown when `enabled` is false. Cached 60 s. |
| `GET /chat/status` | `agents_online`: a team member has the inbox open. For "Our team is online". |
| `POST /chat/messages` | send a message. JSON `{message, guest_token?, context{path, product_slug, cart[{product_id, qty}]}}`, or `multipart/form-data` with up to 3 files in `images[]` (JPEG, PNG, WebP, 5 MB each; `message` may then be empty; context fields in bracket style `context[cart][0][product_id]`). Answers `201 {data: {message, conversation, guest_token}}`. |
| `GET /chat/messages?after=<id>&guest_token=` | new messages after an id (oldest first, at most 100) and `meta` (the conversation state). Poll every 2 to 3 s while an answer is due, slower when idle. |
| `POST /chat/feedback` | `{message_id, value: up\|down, guest_token?}` on an assistant message. |
| `POST /chat/close` | "New chat": close the open conversation; the next message starts a new one. `{guest_token?}`. Safe when nothing is open. |
| `POST /chat/handoff` | call-back request `{name, phone, note?, guest_token?}`. Answers `{message}` to show as it is. |
| `POST /chat/drafts/{id}` | `{action: confirm\|dismiss, guest_token?}` on a `sourcing_draft` card. `409` when already answered. |
| `GET /chat/images/{image}` | a customer's photo, by the signed `url` in the message (never built by the client). |

**Identity.** A signed-in customer is identified by the bearer token (the route adds it from the project's cookie). A visitor's first message returns a secret `guest_token`; the widget keeps it in browser storage and sends it with every later call. It is never put in a URL by the client except the polling query, and the backend must mask it in logs.

**Message** `{id, sender: customer|ai|agent|system, body, agent_name?, cards[], images[{id, url, ai_reviewed}], feedback?, created_at}`.

**Card** (only these fields are read; anything else is dropped by the widget):
- `product`: `product_id`, `slug`, `title`, `image`, `price_from`, `offer_price_from`, `moq`, `unit`, `offer_label`, `free_delivery`, `needs_options`, `href` (a path on the site).
- `info`: `title`, `rows[{label, value}]`, `note`, `cta{label, href}`.
- `sourcing_draft`: `draft_id`, `title`, `rows`, `confirm_label`.

**Conversation state** (`meta` / `conversation`): `mode` (`ai` or `human`), `agent_name`, `agents_online`, `awaiting_reply`, `handoff` (null, or `{status: waiting}`, or `{status: contact, contact{phone, whatsapp, email, hours}}`).

**Errors.** `{message, errors?, contact?}`. `503` means the chat is off or has no AI: `message` is ready to show and `contact` has the support numbers. `429` is a rate limit. The client shows `message`, `errors` and `contact` only.

**What the widget guarantees** (the backend can rely on it): no card number, password, PIN or one-time code is sent (blocked in the browser); photos are shrunk to at most 1600 px and re-checked by their first bytes in the route; nothing is written (a request, a call-back) without the customer pressing a button; the assistant's text is drawn as plain elements, never as HTML, and a link is followed only if it is a path on the site or `https`.
