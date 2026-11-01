# Support Chat Panel

The dashboard where a client runs the chat on their own site: install command and key, settings, products, knowledge, inbox, team and usage. It is the frontend half of the hosted service described in `../docs/HOSTED-SERVICE.md` and `../docs/SERVICE-BUILD-GUIDE.md`.

**Status: works on demo data.** Everything is saved in the browser only (localStorage), so each screen can be tried before the service exists. Nothing leaves the browser.

## Run it
```
cd panel
npm install
npm run dev        # http://localhost:3100
```
Sign in with any email. "Reset demo" at the bottom of the sidebar puts the sample data back.

## Two dashboards
- **Client dashboard** (`/sites/...`): what a shop owner uses for their own sites. Every site opens on its **Overview**: chat on/off, this month in four numbers, chats waiting for the team, a setup checklist until it is done, and anything broken.
- **Super admin** (`/admin`): TechaByte staff only. **Service overview** (clients, live sites, chats, hand-over rate, AI spend, a "needs attention" list across every client, sites by plan) and **Clients** (search, filter by status, change plan, pause or resume a site, open it to help the owner). In the demo anyone can open it from the sidebar; the real service shows it only to TechaByte accounts.

## Client screens
| Screen | What the client does |
|---|---|
| Your sites | See sites, add a site (a key is shown once). |
| Overview | Chat on/off, chats this month, share answered by the assistant, first reply time, who is waiting, setup checklist, problems. |
| Install | Copy the one install command, see the key prefix, make a new key, edit allowed domains, rename or delete the site. |
| Settings | Chat on or off, assistant name, tagline, greeting, quick questions, language, photo rules, words never to say, contact details, price freshness, monthly AI limit, with a live preview. |
| Products | Where products come from (own website, feed, shop platform), "Read now", the product list with search, hide, edit, add by hand, delete, and an "Old" mark on prices past the freshness limit. |
| Knowledge | Notes the assistant may use, written here or read from a page address. |
| Inbox | Open and closed chats, take over, reply, hand back, close, delete. |
| Team | Invite and remove people; a site always keeps one owner. |
| Usage | Chats, handed over, first reply time, AI spend against the limit. |

## Connect it to the real service
All data access is in two files:
- `src/lib/types.ts`: the shapes (they match the API list in `docs/SERVICE-BUILD-GUIDE.md`, section 4).
- `src/lib/store.ts`: one function per action (`saveSettings`, `readSource`, `replyToChat`, ...).

To go live, replace the bodies in `store.ts` with calls to the service's `/panel/*` API and the sign-in with the real one. Keep the function names and the screens do not change. A key is never kept after it is shown: `createSite` and `rotateKey` return the full key once.

## Not done yet
- Real sign-in, real API, real-time inbox (the demo does not poll).
- Reading a site's products happens in the service; here "Read now" only marks the demo products as fresh.
- Billing and plans.
