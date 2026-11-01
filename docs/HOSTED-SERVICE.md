# Hosted chat: the client changes nothing on their backend

The goal: a client installs the chat with one command, never touches an API, and manages the chat from a settings page we give them.

## What the client does
1. Gets a **site key** from the chat dashboard (we create the site there and send the key).
2. Runs one command in their Next.js project:
   ```
   npx github:TechaByte-Solutions/support-chat-kit#v0.4.0 init --key sk_live_xxx --brand "Their Shop" --layout
   ```
   (Once the service has a fixed address it becomes the default and `--api-url` is not needed.)
3. Opens the dashboard to switch the chat on, and sets name, greeting, colours, language and photo rules there. No code change and no redeploy for these.

The key is stored as `SUPPORT_CHAT_KEY` in `.env.local` and sent by the project's own server route as the `X-Chat-Key` header. It is never in the browser.

## What the client sets in the dashboard
| Setting | Why |
|---|---|
| On / off | The chat shows only while on (`GET /chat/config` says `enabled`). |
| Allowed domains | The service refuses a key used from any other site. |
| Assistant name, greeting, suggestion chips, tagline | Come to the widget through `GET /chat/config`. |
| Photos: on/off, count, size | Same. |
| Where orders and requests go (email, WhatsApp number, webhook) | So a handed-over chat or a request reaches the client's team. |
| Team members who answer chats | The inbox. |
| Their products / knowledge (catalog sync, CSV, or a connector) | What the assistant may talk about. |

Colours and words can stay in the project's `config` (they win over the service) or move to the dashboard later.

## What the service must do (backend work)
- One database for all sites; every row has a `site_id` taken from the key. A key can never read another site's data.
- Same contract as `docs/CONTRACT.md`, plus: reject a missing or unknown `X-Chat-Key` (401), reject a request whose `Origin` is not in the site's allowed domains (403), rate-limit per site and per visitor.
- A dashboard: sites, keys (create, rotate, revoke), the settings above, an inbox, usage.
- Keys: `sk_live_` for production, `sk_test_` for staging. Keep only a hash of a key; show it once.
- WordPress and Shopify later: a plugin or app that stores the same key and loads the chat through a script. Not built.

Until this service exists, a client who has their own backend that follows `docs/CONTRACT.md` uses `init --api-url`, as before.
