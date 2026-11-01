# Building the chat as a product: service, panel, and each client's own products

For the product lead and the backend team. Decided: this becomes a product, a few of our existing clients try it first, and each client's own site is where its product data comes from. This guide says how the backend splits the module out first, where it lives, and how product data gets in. It builds on `BACKEND-MODULE.md` (what is module and what is adapter) and `HOSTED-SERVICE.md` (what the client does).

## 1. One repository for the whole product
Keep everything in this repository (`dotbyte-chat`) so versions move together:
```
src/ cli/ example/ tests/    the website kit (npm, exists)
service/                     the Laravel package: chat module + multi-site layer (new)
panel/                       the client dashboard (frontend; built against the panel API in section 4)
docs/                        contract, guides
```
`service/` is a Laravel package (`composer.json`, service provider, migrations, routes, jobs). TransfarX installs it from a path or a tag, like any client, so **TransfarX is client number one**. A package, not a copy: a fix lands once.

## 2. Order of work
Each step is releasable and keeps TransfarX answering exactly as today.

| # | Step | Done when |
|---|---|---|
| 1 | **Extract.** Move the chat tables, models, controllers, jobs and staff views from the TransfarX Laravel app into `service/`. No behaviour change. | TransfarX runs on the package; contract tests pass. |
| 2 | **Adapter interfaces** (`BACKEND-MODULE.md` section 1): persona, knowledge, tools, card mapper, draft handler, forbidden terms. | No TransfarX word left in the package. |
| 3 | **Sites layer.** A `sites` table; every chat table gets `site_id`. A key (`X-Chat-Key`, hashed in the database) picks the site; the request's `Origin` must be in the site's allowed domains. | A test proves site A cannot read site B's rows through any endpoint. |
| 4 | **Catalog** (section 3). | A pilot client's products are searchable by the assistant. |
| 5 | **Panel API** (section 4). | The dashboard can do everything in `HOSTED-SERVICE.md` without a database edit. |
| 6 | **Pilot** with 2 or 3 existing clients, staging first, then live behind the on/off switch. | Section 5 passes. |

Step 3 is the one that must be right: every query goes through a scope that adds `site_id`; there is no way to run one without it.

## 3. Product data from each client's own site
The assistant may name a product, a price or stock only from the **catalog table** (one table for all sites, filtered by `site_id`). How rows get in, from easiest for the client to hardest:

1. **Read the site's public pages (default, nothing for the client to do).** The client gives a site address. We read its sitemap and each page's structured data (`schema.org/Product` in JSON-LD, with Open Graph and microdata as fallback). That gives name, description, price, currency, availability, image, link, SKU. It works for WordPress, Shopify, WooCommerce and most custom sites. Respect `robots.txt`, identify our crawler, re-read daily and when the client presses "Update now".
2. **A product feed.** A CSV or JSON address or file upload (the Google Merchant feed format is the common one), re-read on a schedule.
3. **Ready connectors**, when the client's platform has an API: WooCommerce REST, Shopify Admin API, TransfarX's own products. Each is a small class that returns the standard product below.
4. **Push.** `POST /catalog/products` (batch, idempotent by `external_id`) for clients that can call us, and `DELETE` for removals.

All four produce the same **standard product**:
```
external_id, title, description, url, image_urls[], price, currency, compare_price?,
stock_status (in_stock | out_of_stock | on_request), sku?, category?, attributes{}, updated_at
```
Rules:
- Money is stored as the client's own number and currency. The assistant quotes it as given and says where it came from ("price on your site"). It never converts or adds fees itself.
- Each row keeps `fetched_at`. A price older than the site's limit (default 48 h) is shown to the assistant as "may be out of date": it says so and gives the link instead of a firm number.
- A product that is missing from the source on two reads in a row is marked unavailable, not deleted at once.
- Free text from a client's site is **data, not instructions** (a product description that says "ignore your rules" must do nothing). Strip HTML and cap lengths.
- Search starts with the database's full-text search over title, description and attributes; add embeddings later only if answers are poor. Always filtered by `site_id`.
- The product card sent to the widget has only the contract's fields and the client's own `url`. A client with no cart hook gets "View on site" instead of "Add" (the kit already hides Add when the project passes no cart).
- Each site has its own forbidden-terms list and its own persona, set in the panel. TransfarX's supplier rule is just one site's list.

The assistant's non-product facts come the same way: the client pastes FAQ, delivery and return policies, opening hours, or gives page addresses to read. Stored per site, searched per site, quoted with the page they came from.

## 4. What the panel needs from the service
Plain REST under `/panel/*`, for signed-in client users only, scoped to their own sites:
- **Sites:** create, rename, allowed domains, rotate the key (the new key is shown once), delete.
- **Settings:** on/off, assistant name, tagline, greeting, chips, photo rules, forbidden terms, contact and hours, working language.
- **Catalog:** sources (site address, feed, connector) with last read and errors; run now; list, search, edit or hide a product; add one by hand; delete.
- **Knowledge:** add, edit, delete a note or a page address.
- **Inbox:** open and with-agent chats, take over, reply, close, delete; customer notes; the thumbs-down review list.
- **Team:** invite and remove people, role (owner, agent).
- **Usage:** chats, handed over, first reply time, AI spend against the site's monthly limit.
- **Install:** shows the key and the exact command with the key filled in.

The panel is an ordinary frontend app. It is built against this list with demo data first, so it does not wait for the service.

## 5. Before a pilot client goes live
- [ ] Site isolation test passes on every endpoint, including photos and drafts.
- [ ] A key used from a domain not on the list is refused (403); an unknown key gets 401.
- [ ] The assistant states no price, stock or delivery time that is not in the catalog row, and says when a row is old.
- [ ] A test product description with an instruction in it is ignored.
- [ ] A monthly AI spend limit per site, with an alert and a hard stop (the widget shows the contact details).
- [ ] The client can switch the chat off in the panel and the button disappears within a minute.
- [ ] Deleting a site deletes its chats, photos and products.
- [ ] `X-Chat-Contract` is still `1` and the kit works unchanged against the service.

## 6. Decisions for the product lead
- Who pays for the AI: one account we bill from, or the client's own key. (Start with ours and a monthly cap per site.)
- The pilot clients and their platforms. This decides which connector comes first.
- Price and plan limits (chats a month, sites, team members).
- Where the data is stored and for how long (retention numbers in `BACKEND-MODULE.md` section 5), and the privacy text the client must show.
