# Backend: turning the chat into a reusable Laravel module

For the backend team. The storefront side is already a separate package (`@techabyte/support-chat`, this repo). The backend chat is still part of the TransfarX Laravel app. To use the chat in another project, the backend needs the same split: one **module** that is the same for every project, and a small **adapter** each project writes. This file says what goes where and what "done" looks like.

The wire contract between the two sides is `docs/CONTRACT.md` and the live `swagger/openapi.yaml`. It does not change because of this work: a project that moves to the module must keep answering exactly as today.

## 1. The split

### In the module (the same for every project)
| Part | What it is |
|---|---|
| Data | conversations, messages, message photos, feedback, drafts, call-back requests, settings. Migrations ship with the package. |
| Endpoints | everything under `/chat/*` in the contract: `config`, `status`, `messages` (GET, POST, with photos), `feedback`, `close`, `handoff`, `drafts/{id}`, `images/{image}`. |
| Conversation life | open, with agent, closed, archived. A scheduled job closes idle chats (24 h visitor, 7 days customer, 3 days with an agent: settings), archives and deletes by the retention settings, and adds the system line. A deleted chat's `guest_token` simply starts a new conversation. |
| Visitor key | `guest_token` creation, checking, and moving the chat to the account when the visitor signs in. |
| AI loop | the model client behind an interface (a provider can be swapped), the tool-calling loop, the conversation window sent to the model, language handling (Bangla, English, Banglish), the rules for handing over to a person (asked for one, same question failed twice, anger or complaint words, money disputes, an uncertain answer about price, stock, delivery or an order). |
| Guardrails | masking of card-like numbers before saving, output check that rejects or rewrites a reply that names a forbidden term or pastes the instructions, injection resistance (customer text is data), per-visitor limits, daily spend limit with an alert and a hard stop (`503` with the contact details), masked logs (`guest_token`, phone). |
| Staff side | the inbox (open and with-agent by default, a closed tab, a customer's chats on their profile), taking a chat over, replying, closing, deleting a chat or all of a customer's chats, the thumbs-down review list, the numbers (solved by the assistant, handed over, first reply time, cost per chat). Ship the views so a project can publish and restyle them. |
| Settings | one config file and an admin page: assistant name, tagline, greeting, suggestion chips, photo rules, limits, retention, support contact and hours, on/off switch. |
| Events | `ChatMessageReceived`, `ChatHandoffRequested`, `ChatDraftConfirmed`, `ChatClosed`, so a project can add notifications without editing the module. |
| Install | `composer require`, `php artisan support-chat:install` (publishes config, migrations, views), `php artisan support-chat:check` (verifies the adapter is complete and the contract answers). |

### In the project's adapter (different for each project)
The module calls these through interfaces; the project implements them.

| Adapter | What the project decides |
|---|---|
| `Persona` | the assistant's character and brand voice, the languages, what it may talk about and what it must refuse. |
| `Knowledge` | where facts come from: FAQ, policies, shipping and payment rules. A source the module can search. |
| `Tools` | the actions the assistant can take: for TransfarX product search, price for a quantity, delivery estimate, order lookup. Each tool says what it returns and what it needs. |
| `CardMapper` | turns a tool result into a card (`product`, `info`, `sourcing_draft`) with only the fields the contract lists. |
| `DraftHandler` | what a draft is and what confirming it does (TransfarX: create a sourcing request exactly as `POST /sourcing-requests` does). |
| `CustomerResolver` | which model is the signed-in customer, and which of their data the assistant may read (their own orders only). |
| `ForbiddenTerms` | words and patterns that must never reach a customer (TransfarX: supplier and marketplace names). The module's output check uses this list. |
| `Links` | which site paths the assistant may link to. |
| `Contact` | support phone, WhatsApp, email and hours, if they are not in the module's settings. |

A project with no products (a bookshop, a clinic) writes different tools and cards and leaves the rest alone.

## 2. Rules the module must enforce (so a project cannot forget them)
- A customer sees only their own orders and drafts. No order detail without a signed-in customer.
- The assistant never states a price, stock level, delivery time or order status that a tool did not return. When a tool returns nothing it says it does not know and offers a person.
- Nothing is created without the customer's button (`drafts/{id}` `confirm`). The assistant can only prepare.
- Output passes the forbidden-terms check before it is saved. A failed check never reaches the customer; a safe fallback line and a flag for staff are used.
- Card fields are exactly those in the contract. A tool cannot add a field.
- The module never sends the model a secret, a token, or a supplier field it was not given as data to answer from.

## 3. What does not change for the storefront
The routes, field names, status values and error shapes in the contract. The `X-Chat-Contract` response header (a number, starting at `1`) is new and lets a client check it; bump it only for a breaking change.

## 4. Work order
Each step keeps TransfarX working, so it can be released one at a time.

1. **Extract, no behaviour change.** Move the chat tables, models, controllers, jobs and admin views into a package inside the repo (`packages/support-chat`), loaded by path. TransfarX answers exactly as before. *Large.*
2. **Define the adapter interfaces** (section 1) and move every TransfarX-specific thing behind them: prompt text, product search, price tools, the sourcing draft, supplier and marketplace terms. *Large.*
3. **Contract tests.** A test suite in the package that sends the calls in `docs/CONTRACT.md` and checks every field, status and error, run against TransfarX's adapter. This is the safety net for step 4. *Medium.*
4. **Second adapter.** Write the adapter for the next project (or a small sample one inside the package's tests) to prove nothing from TransfarX is left in the module. *Medium.*
5. **Make it installable.** Own git repository, `composer.json`, semantic versions, `CHANGELOG`, `support-chat:install` and `support-chat:check`. *Medium.*
6. **Documentation for a new project:** the adapter checklist, the settings, the scheduled jobs to register, the queue and cache needs. *Small.*

## 5. Before the first release of the module
- [ ] A TransfarX staging run passes the contract tests, including photos, `close`, idle closing and deletion.
- [ ] The forbidden-terms check is covered by tests with real supplier and marketplace words, and by prompts that try to extract the instructions.
- [ ] Card-like numbers are masked in storage and logs; `guest_token` is masked in access logs.
- [ ] The spend limit stops the assistant and the widget shows the support numbers.
- [ ] A fresh Laravel app can `composer require` the module, run `support-chat:install`, write a minimal adapter and pass `support-chat:check`.
- [ ] Retention numbers are approved by the business (closed 90 days then archive, archived 365 days then delete unless flagged as a sale or linked to an order or price request: today's proposal).

## 6. Open decisions for the product lead
- Which project is next, and does it have accounts and a catalogue?
- One shared AI account and budget, or one per project?
- Where the module's repository lives, and who may release versions.
