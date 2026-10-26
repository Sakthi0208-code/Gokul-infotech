# Gokul Infocare: AI Support Concept

A redesigned, animated landing page for Gokul Infocare with a Google Gemini support chatbot that raises AI-triaged support tickets, and an admin-only dashboard where staff work on and resolve those tickets. Built for the Gokul Infocare *AI Growth & Automation Associate*, Task 1 assessment.

> **Concept redesign.** This is not the official Gokul Infocare website and is not affiliated with or endorsed by Gokul Infocare. Content is rewritten from the public site [gokulinfocare.com](https://gokulinfocare.com). The company's logo and client logos are not used.

## For reviewers: Gokul Infocare Task 1

| | |
| --- | --- |
| **Domain** | Technology |
| **Areas covered** | Website Development, Automation (AI ticket triage and resolution emails), Innovation (AI-first support workflow) |
| **AI tools** | **Claude Code**: designed, built, tested and published the project from my prompts. **Google Gemini**: powers the chatbot and the ticket triage inside the app |
| **Prompt documentation** | [PROMPT_DOCUMENTATION.md](PROMPT_DOCUMENTATION.md): every prompt I used, the revisions and why, the prompts inside the app, and live test results |

**Quickest way to review**
1. **Watch the demo video** (link in the submission email). It shows the full flow: chatbot → ticket → admin board → resolution email.
2. **Read the code:** start with [src/lib/chat-prompt.ts](src/lib/chat-prompt.ts) and [src/lib/prompt.ts](src/lib/prompt.ts) (the AI prompts), then [src/lib/gemini.ts](src/lib/gemini.ts) (how Gemini is called and validated).
3. **Run it yourself** (about 5 minutes; you need Node.js 20+ and a free Gemini key from [Google AI Studio](https://aistudio.google.com/apikey)):
   ```powershell
   git clone https://github.com/Sakthi0208-code/Gokul-infotech.git
   cd Gokul-infotech
   npm install
   copy .env.example .env.local   # then set GEMINI_API_KEY and choose your own ADMIN_ACCESS_CODE
   npm run dev                    # open http://localhost:3000
   ```
   - **Customer view:** click **Need help?**, pick a common issue, then choose "No, still not working" twice and create a ticket.
   - **Admin view:** in the chat, type `admin` and enter the `ADMIN_ACCESS_CODE` you chose. The dashboard at `/admin` shows the ticket.
   - Resolution emails are optional (SMTP settings in `.env.local`). Without them, the app clearly says email isn't set up.
4. **Run the tests** (no API key needed; Gemini and email are mocked): `npm test` runs 121 tests.

## What it does

| Part | Where | What it does |
| --- | --- | --- |
| **Landing page** | `/` | Animated homepage: hero, key facts, 8 services, solution tabs (parking sensors, fleet tracking, ERP on Map), AI support section, accreditations, client ticker, recruitment and contact. |
| **Support chatbot** | "Need help?" button on `/` | The customer describes a problem and the AI gives step-by-step fixes on screen. If that doesn't work, it **creates a support ticket** (for example `GI-7K3M9Q`) with AI priority, category, summary and the full conversation. The customer can type `status GI-7K3M9Q` later to see progress and the resolution. |
| **Admin login** | In the chatbot | Type `admin`, then enter the secret access code in a masked box. The server checks it and signs the admin in. |
| **Assistance dashboard** | `/admin` (admins only) | Every ticket from the chatbot on a New / In progress / Solved board. Each ticket arrives already analysed by Gemini: category, priority, sentiment, summary, priority reason, recommended action and a draft reply. |

## Features

**Landing page**
- Gradient hero with animated background blobs, a live-style fleet map, a parking sensor card and an AI chat card.
- Count-up statistics, scroll-reveal sections, hover effects, interactive solution tabs (keyboard accessible), and an infinite client-name ticker.
- Responsive, with a mobile menu. All animations are CSS or lightweight React (no animation library). They respect "reduce motion" settings, and content stays visible if JavaScript fails.

**Chatbot**
- **Common issues menu:** 12 one-click issues matching the company's services (login, fleet tracker offline, SAP/ERP report error, mobile app crash, slow system, billing, parking sensors, GIS map, service outage, security concern, feature request, recruitment). The first 6 show when the chat opens, with "More issues" for the rest, and a grid button next to the message box opens the menu at any time.
- Three AI outcomes: `troubleshooting` (gives steps), `needs_info` (asks questions), `escalate` (a human should take over).
- "Did this solve your problem?" buttons. After two "No" answers, or when the AI escalates (outage, security, billing, the customer asks for a human), it offers **Create support ticket**. "Contact a human" is always available.
- Creating a ticket runs the AI triage on the whole conversation and saves the ticket. The customer gets a readable ticket number.
- `status <ticket number>` in the chat is answered from the ticket records, not the AI. The customer sees the status and, once resolved, the admin's resolution note. Never the transcript or other customers' data.

**Support tickets (admin)**
- A board with three columns, **New → In progress → Solved**, with counts, search (ticket number, issue, category, customer), a priority filter, and auto-refresh every 20 seconds.
- Move tickets with the card buttons (**Start ▸**, **Solve ✓**, **Reopen**) or by dragging them between columns. Dropping a card on Solved opens the details panel to write the resolution note first.
- **Details** opens a side panel (Esc closes it).
- The ticket detail shows the AI triage, why the chatbot escalated, the AI-suggested reply, the full transcript and customer contact.
- Actions: Start working, Mark resolved (requires a resolution note, which can be pre-filled from the AI reply), Reopen and Save note.
- **Resolution email:** when a ticket is marked resolved, the customer (if they left an email) is sent an HTML email with their ticket number, the issue summary and the admin's note. It is sent over SMTP, for example Gmail with an app password. The result (sent, failed, or skipped with the reason) is saved on the ticket and shown to the admin, with a **Send again** button. An email failure never undoes the resolution.

**Admin access**
- `admin` (or `/admin`, `admin login`) switches the chat to a password box. The code is sent only to `/api/admin/login`, never to Gemini, and never shown in the chat.
- The server compares codes in constant time and sets a signed, HttpOnly, SameSite=Strict **browser-session** cookie (deleted when the browser closes). The signed token inside also expires after 4 hours.
- Login is limited to 5 attempts per 15 minutes per client.
- **Three locks on `/admin`:** (1) `src/proxy.ts` redirects requests without a valid session to `/?admin=login`, which opens the chat in login mode; (2) the page itself checks the signed session on the server before rendering anything (`AdminGate`); (3) every admin API (`/api/tickets` list and update, `/api/tickets/[id]/notify`) checks the session. Typing `/admin` in the address bar never shows the dashboard. The only way in is the code in the chatbot.
- If someone pastes the code as a normal chat message, the server refuses it instead of forwarding it to Gemini.

**Shared**
- All Gemini calls go through server routes. The browser never sees the API key.
- Structured JSON output (JSON Schema), validated again with Zod.
- Clear handling of a missing key, invalid key, unknown model, rate limits, timeouts and malformed output.
- Prompt-injection protection: customer text is wrapped in delimiter tags and treated as untrusted data.
- **Resilient AI calls:** if the main Gemini model is busy (for example a 503 "overloaded" error), times out or returns a broken answer, the request is retried once on a backup free model.
- 121 automated tests with Gemini, email and the database mocked.

## Architecture

```
Landing page "/"  ── chat widget
   │  POST /api/chat {messages}          → gemini.generateChatReply → {message, steps, status}
   │  POST /api/tickets {messages}       → transcript → gemini.analyzeTicket → saved ticket (GI-XXXXXX, Supabase or local file)
   │  "status GI-XXXXXX" → GET /api/tickets/GI-XXXXXX → status + resolution
   │  "admin" → POST /api/admin/login {code} → Set-Cookie (signed session)
   ▼
proxy.ts (runs before /admin): no valid session → redirect to /?admin=login
   ▼
/admin dashboard
   │  GET /api/tickets, PATCH /api/tickets/[id] (session required) → list, update status and resolution
   │  POST /api/admin/logout → clears cookie
```

### Project structure

```
src/
  proxy.ts                    Redirects /admin visitors without a session
  app/
    page.tsx                  Landing page + chat widget
    admin/page.tsx            Assistance dashboard
    api/chat/route.ts         Chatbot
    api/tickets/route.ts      Create ticket (public), list tickets (admin)
    api/tickets/[id]/route.ts Ticket status (public), update ticket (admin)
    api/admin/login|logout    Admin session
    layout.tsx, globals.css   Fonts, theme, animation keyframes
  components/
    landing/                  Nav, hero, sections, solution tabs, logo
    chat/                     Chat widget and ticket panel
    admin/                    Tickets board (columns), ticket detail panel, AdminGate (server-side session check)
    motion.tsx                Scroll reveal and count-up helpers
    admin-header.tsx, priority-badge.tsx
  lib/
    gemini.ts                 All Gemini calls, timeout, safe error mapping
    prompt.ts, chat-prompt.ts System instructions and JSON Schemas
    admin-auth.ts             Access code check and signed session cookies
    validation.ts             Zod schemas for requests and AI output
    ticket-store.ts           Saves tickets: Supabase when configured, otherwise a local JSON file
    mailer.ts                 Resolution email (SMTP via nodemailer)
    ticket-notify.ts          Sends the email and records the result on the ticket
    conversation.ts           Turns a chat into one ticket text for triage
    site-content.ts           Landing page content (from gokulinfocare.com)
    chat-topics.ts            Common issues shown in the chatbot
    rate-limit.ts, client-api.ts
  types/ticket.ts, types/chat.ts, types/support-ticket.ts
supabase/schema.sql           Database table for tickets (run once in Supabase)
tests/                        Vitest tests
```

## Technology stack

Next.js 16 (App Router), React 19, TypeScript 5, Tailwind CSS 4, `@google/genai` 2.31 (official Gemini SDK), Zod 4, nodemailer 10.1.7 (SMTP email), and Vitest with React Testing Library.

Default model: **`gemini-3.5-flash-lite`** (free tier, tested live on 2026-10-25). `gemini-3.8-flash` is also free tier but timed out in testing.

## Setup on Windows

```powershell
cd D:\Gokul
npm install
Copy-Item .env.example .env.local
notepad .env.local
npm run dev
```

Fill in `.env.local`:

| Name | Required | Description |
| --- | --- | --- |
| `GEMINI_API_KEY` | Yes | From [Google AI Studio](https://aistudio.google.com/apikey). Server-only. |
| `GEMINI_MODEL` | No | Defaults to `gemini-3.5-flash-lite`. |
| `GEMINI_FALLBACK_MODEL` | No | Backup model tried once if the main one fails. Defaults to `gemini-3.1-flash-lite`; `none` turns it off. |
| `ADMIN_ACCESS_CODE` | For admin access | The secret code typed into the chatbot. Make it long, for example `GI-7f3k-Quartz-2026`. Leave empty to disable admin access. |
| `ADMIN_SESSION_SECRET` | Recommended | A long random string for signing sessions. Generate one with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` | For resolution emails | SMTP server login. For Gmail: `smtp.gmail.com`, `465`, your Gmail address, and an **app password** (Google Account → Security → 2-Step Verification → App passwords). Never use your normal password. |
| `MAIL_FROM`, `MAIL_REPLY_TO` | No | Sender and reply-to. Default: `Gokul Infocare Support (demo) <SMTP_USER>`. |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | **On Vercel** | Ticket storage in Supabase (see Deployment). Without them, tickets are saved to a local file, which is fine on your own computer. |
| `TICKETS_FILE` | No | Local ticket file. Defaults to `data/tickets.json` (git-ignored). |

Restart `npm run dev` after changing `.env.local`.

Open <http://localhost:3000>. To reach the dashboard, click **Need help?**, type `admin`, then enter your access code.

## Scripts

```powershell
npm run dev         # development server
npm test            # all automated tests
npm run lint        # ESLint
npm run typecheck   # TypeScript
npm run build       # production build
npm start           # serve the production build
```

## API

| Route | Auth | Request | Response |
| --- | --- | --- | --- |
| `POST /api/chat` | – | `{ messages: [{ role, content }] }` (starts and ends with `user`, max 20 messages) | `{ reply: { message, steps[], status, escalation_reason }, model }` |
| `POST /api/tickets` | – | `{ messages, contact?: { name?, email? }, escalation_reason? }` | `201 { ticket: { id, status, category, priority, summary, createdAt, updatedAt, resolution } }` |
| `GET /api/tickets/[id]` | – | – | `{ ticket: { …public status } }` (the resolution is shown only when resolved) |
| `GET /api/tickets` | Admin session | – | `{ tickets: SupportTicket[] }` (full details) |
| `PATCH /api/tickets/[id]` | Admin session | `{ status?: "open" \| "in_progress" \| "resolved", resolution? }` | `{ ticket, email? }` (resolving requires a note and emails the customer) |
| `POST /api/tickets/[id]/notify` | Admin session | – | `{ ticket, email }` (re-sends the resolution email) |
| `POST /api/admin/login` | – | `{ code }` | `{ ok, redirectTo }` plus the session cookie |
| `POST /api/admin/logout` | – | – | Clears the cookie |

Errors use `{ error: { code, message } }`:

| Status | Codes |
| --- | --- |
| 400 | `INVALID_REQUEST`, `VALIDATION_ERROR` |
| 401 | `UNAUTHORIZED`, `INVALID_ACCESS_CODE` |
| 404 | `NOT_FOUND` |
| 413 | `PAYLOAD_TOO_LARGE` |
| 429 | `RATE_LIMITED`, `GEMINI_RATE_LIMITED` |
| 502 | `GEMINI_AUTH_ERROR`, `MODEL_UNAVAILABLE`, `GEMINI_ERROR`, `INVALID_MODEL_OUTPUT` |
| 503 | `MISSING_API_KEY`, `ADMIN_NOT_CONFIGURED`, `STORAGE_ERROR` |
| 504 | `TIMEOUT` |
| 500 | `INTERNAL_ERROR` |

## Security notes

- Secrets (`GEMINI_API_KEY`, `ADMIN_ACCESS_CODE`, `ADMIN_SESSION_SECRET`) live only in `.env.local` or the host's environment settings, and are read only on the server. `.env*` files are git-ignored except `.env.example`.
- The admin code is never stored in a cookie, logged or sent to Gemini. Sessions are HMAC-signed and expire after 8 hours.
- Error responses never include stack traces or configuration values. Logs never include customer text.
- Prompts treat customer text as untrusted, forbid revealing instructions, and forbid claiming actions that did not happen.
- This is a demo-grade single admin code, not a full user account system. For production, use proper accounts (for example SSO), audit logs and a shared rate-limit store.

## Deployment (Vercel)

Vercel can't keep files, so tickets must be stored in Supabase (free plan is enough).

1. **Supabase:** create a project at <https://supabase.com>. Open **SQL Editor → New query**, paste [supabase/schema.sql](supabase/schema.sql) and click **Run**. This creates a locked-down `support_tickets` table.
2. In Supabase, open **Project Settings → API Keys**. Copy the **Project URL** and the **secret (service_role) key**.
3. **Vercel:** import the repository at <https://vercel.com/new>. Under **Settings → Environment Variables**, add:
   - required: `GEMINI_API_KEY`, `ADMIN_ACCESS_CODE`, `ADMIN_SESSION_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
   - optional: `GEMINI_MODEL`, `GEMINI_FALLBACK_MODEL`, and the `SMTP_*` / `MAIL_*` settings for resolution emails
4. **Redeploy** (environment changes apply only to new deployments). Then test the chatbot, ticket creation, the admin login and `/admin`.

API routes allow up to 60 seconds (`maxDuration`), so there is time to retry on the backup Gemini model.

## Known limitations

- AI answers can be wrong, and troubleshooting is general because the bot has no access to real documentation or accounts.
- Without Supabase, tickets are stored in a local JSON file: fine for local demos, but not for serverless hosting. If storage fails, customers see a clear "tickets can't be saved right now" message.
- Resolution emails need SMTP settings. Gmail's free limit is about 500 emails a day. Only send to test addresses: the emails are clearly marked as coming from a concept demo, not from Gokul Infocare.
- There is no email when a ticket is created or moved to In progress, only when it is resolved.
- Anyone who knows a ticket number can see its status and resolution note (never the transcript or contact details). Ticket numbers are random (about 1 billion combinations) and status checks are rate-limited.
- Rate limits are in memory, so they are best-effort on serverless hosting.
- Chat and history live only in the open browser tab.
- Free-tier Gemini quotas are small, and Google may use free-tier inputs to improve its products, so don't paste real customer personal data.
