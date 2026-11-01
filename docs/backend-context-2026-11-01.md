# Context: turning the Laravel chat into a package any project can install

Hand this file to the backend developer (or to an AI coding assistant working in the Laravel repository) before they start. It says what exists, what to build, the rules that cannot change, and when the work is done. Details: `BACKEND-MODULE.md` (the module/adapter split), `CONTRACT.md` (every call the website makes).

## 1. Where we are
- **Website side: done.** The chat is a package, `dotbyte-chat`. A Next.js project installs and sets it up with one command:
  ```
  npx github:TechaByte-Solutions/dotbyte-chat#v0.5.0 init --brand "Project Name" --api-url https://backend.example.com/api/v1 --layout
  ```
  The website never talks to the AI. Its own server route forwards a fixed list of calls to `{API_URL}/chat/*` and polls for answers. No streaming.
- **Backend side: not reusable yet.** The working chat (conversations, AI loop, tools, inbox, settings) lives inside the TransfarX Laravel app, mixed with TransfarX code (products, sourcing requests, supplier rules). A second project cannot use it without copying and editing it.

The goal is that a second project gets a working chat backend with `composer require`, one install command, and a small adapter of its own.

## 2. What to build
A Laravel package, `techabyte/dotbyte-chat`:

```
packages/dotbyte-chat/            (inside the TransfarX repo first, loaded by a path repository; its own repository once stable)
  composer.json
  config/dotbyte-chat.php          every setting, with defaults
  database/migrations/             conversations, messages, message_images, feedback, drafts, handoffs, settings
  routes/api.php                   the /chat/* routes from CONTRACT.md, prefix and middleware from config
  src/
    SupportChatServiceProvider.php
    Http/Controllers/              thin: validate, call a service, return the contract's JSON
    Services/                      ConversationService, AssistantLoop, ImageService, HandoffService, Retention
    Contracts/                     the adapter interfaces (section 3)
    Ai/                            ModelClient interface + one implementation (the model the TransfarX chat uses today)
    Guardrails/                    card-number masking, forbidden-terms output check, prompt-injection rules
    Console/                       dotbyte-chat:install, dotbyte-chat:check, dotbyte-chat:prune
    Events/                        ChatMessageReceived, ChatHandoffRequested, ChatDraftConfirmed, ChatClosed
  resources/views/                 the staff inbox and settings pages (publishable, so a project can restyle them)
  tests/                           contract tests (section 5) and a sample adapter
```

## 3. The adapter: the only code a project writes
The package calls these interfaces; the project binds its own classes in a service provider. TransfarX's current code moves behind them.

| Interface | TransfarX implementation (move existing code here) |
|---|---|
| `Persona` | the system prompt text, brand voice, languages (Bangla, English, Banglish), what to refuse |
| `Tools` | product search, price for a quantity (MOQ and tiers), delivery estimate, the customer's own order lookup |
| `CardMapper` | tool result to `product`, `info` or `sourcing_draft` card, with only the contract's fields |
| `DraftHandler` | confirming a draft creates a sourcing request exactly as `POST /sourcing-requests` does |
| `CustomerResolver` | the signed-in user from the bearer token, and which of their data the assistant may read |
| `ForbiddenTerms` | supplier and marketplace names that must never reach a customer |
| `Knowledge` | FAQ, delivery, payment and return rules the assistant may quote |
| `Links` | which site paths the assistant may link to |

The package ships a `NullTools` and a plain `Persona` so a project with no catalogue still runs: the assistant then answers from Knowledge and hands over to a person.

## 4. Rules that cannot change
- **The contract stays exactly as it is.** Same routes, fields, status codes and error shapes as `CONTRACT.md` and the current `swagger/openapi.yaml`. The website package already depends on them. Add an `X-Chat-Contract: 1` response header.
- **TransfarX must keep working at every step.** Each step is released on its own and tested on staging first.
- A customer sees only their own conversations, orders and drafts. A guest is known only by `guest_token`, which is masked in every log.
- The assistant never states a price, stock, delivery time or order status that a tool did not return.
- Nothing is created (request, call-back) unless the customer pressed the button (`drafts/{id}` `confirm`, `handoff`).
- Every reply passes the forbidden-terms check before it is saved. A failed check never reaches the customer.
- No secret, token or supplier field is ever sent to the model.
- A daily AI spend limit stops the assistant with `503` and the contact details.
- The backend serves `https` only and does not redirect API calls (a redirected POST loses the message).

## 5. Order of work
1. **Extract without changing behaviour.** Move tables, models, controllers, jobs and staff views into `packages/dotbyte-chat`. TransfarX loads it by path. Nothing a customer sees changes.
2. **Write the contract tests.** For every call in `CONTRACT.md`: fields, statuses, errors, photos, `close`, `409` on an answered draft, guest-to-account move on sign-in. Run them against TransfarX. This is the safety net for the next steps.
3. **Introduce the adapter interfaces** and move every TransfarX-specific thing behind them. Search the package for "TransfarX", "sourcing", "supplier", "1688", "AliExpress" until nothing is left.
4. **Sample adapter in the package's tests** (a small bookshop: two tools, no drafts) to prove a project with different products works.
5. **Install commands.** `php artisan dotbyte-chat:install` publishes config, migrations and views and prints the adapter checklist. `php artisan dotbyte-chat:check` confirms every adapter is bound and the routes answer.
6. **Own repository and versions.** Semantic versions, `CHANGELOG.md`, a README with the install steps below.

## 6. What installing should look like for a new project (the finish line)
```
composer require techabyte/dotbyte-chat
php artisan dotbyte-chat:install
php artisan migrate
# write the adapter classes, bind them in a service provider, set the AI key in .env
php artisan dotbyte-chat:check
```
Then, in the project's Next.js site:
```
npx github:TechaByte-Solutions/dotbyte-chat#v0.5.0 init --brand "Project Name" --api-url https://that-backend/api/v1 --layout
```
and the chat works end to end.

## 7. Done when
- [ ] TransfarX runs on the package on staging and production; the contract tests pass.
- [ ] A fresh Laravel app with the sample adapter passes `dotbyte-chat:check` and the contract tests.
- [ ] The website package works against that fresh app with no change on the website side.
- [ ] No TransfarX word, table or rule is left inside the package.
- [ ] Forbidden terms, card-number masking and the spend limit are covered by tests.

## 8. Not part of this work
- A hosted service shared by many clients (one backend for several sites), client sign-up, billing, and the client panel. These come later as a separate project.
- Streaming. The polling contract stays.

## 9. Decisions the product lead makes before step 3
- Which project is second (it sets the sample adapter's tools).
- One AI account and budget for all projects, or one per project.
- Retention: how long closed chats are kept before they are archived and deleted.
