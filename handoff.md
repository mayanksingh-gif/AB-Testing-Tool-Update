# Figma A/B Usability Testing Tool — Handoff

Stakeholder-demo MVP. Proves: two Figma prototypes can be tested with two
separate participant groups, interactions are recorded, and A vs B can be
compared in a results dashboard.

## Stack

- Next.js 14 (App Router) + TypeScript + Tailwind CSS
- SQLite (via Node's built-in `node:sqlite` — see **"Changed from the
  original macOS build"** below) — local file database, no cloud dependency
- Figma Embed Kit 2.0 (iframe + postMessage event tracking)
- No auth, no AI, no external services required to run.

## Setup

```
npm install
cp .env.local.example .env.local   # then fill in the Figma client ID
npm run dev
```

App runs at http://localhost:3000 (or next free port — check terminal output).

Requires **Node.js 22+** (built-in `node:sqlite` needs it; developed/tested
on Node 24). `npm run dev` will log an
`ExperimentalWarning: SQLite is an experimental feature` — this is expected
and harmless.

## Changed from the original macOS build

This project was originally built and handed off on macOS using
`better-sqlite3` (a native/compiled module) as the SQLite driver. Setting it
up fresh on a Windows machine surfaced two environment differences worth
knowing about if you're moving this again or debugging install issues:

1. **`better-sqlite3` needed a native compile on Windows, and it failed.**
   No prebuilt binary existed for the Node version installed here (Node 24 —
   very new, `better-sqlite3` prebuilds hadn't caught up), so npm fell back
   to compiling from source via `node-gyp`. That requires Python **and** a
   full Visual Studio C++ build toolchain, neither of which were on this
   machine (macOS dev machines usually have Xcode Command Line Tools
   already, which quietly provides an equivalent toolchain — that's likely
   why this wasn't hit during original development).
2. **Fix applied: swapped `better-sqlite3` → `node:sqlite` (built into
   Node 22+).** This removes the native-compile dependency entirely — no
   Python, no C++ toolchain, no prebuilt-binary version matching, on any OS.
   Changes were isolated to [lib/db.ts](lib/db.ts) (swapped the import/driver
   only) and [lib/queries.ts](lib/queries.ts) (added `toPlain`/`toPlainAll`
   helpers — `node:sqlite` returns rows as null-prototype objects, which
   Next.js Server Components can't pass to Client Components as-is, so every
   query result is spread into a plain object before being returned).
   `package.json` no longer lists `better-sqlite3` or its `@types` package;
   `@types/node` was bumped to `^22.9.0` so `node:sqlite` types resolve.

If you re-platform this again (e.g. to a Linux CI box or a Docker image),
`node:sqlite` should continue to work with zero native-dependency setup as
long as the Node version is 22+. The only reason to go back to
`better-sqlite3` would be if you need a Node version below 22 — in that
case, budget time for the native toolchain on whatever OS you're on.

## Environment variables (`.env.local`)

```
NEXT_PUBLIC_FIGMA_CLIENT_ID=   # required for embedded prototypes to load
NEXT_PUBLIC_APP_URL=http://localhost:3000   # used to build the /test/{id}/a and /b links
OPENAI_API_KEY=   # optional, unused — AI insights not implemented yet
```

## Database

SQLite file at `data/app.db`, created automatically on first run from
[lib/schema.sql](lib/schema.sql). No manual setup, no migrations to run.
Delete `data/app.db*` to reset to an empty state.

Three tables: `tests`, `sessions`, `events` (see schema file for exact
columns). Query/helper functions in [lib/queries.ts](lib/queries.ts).
Mutations (create test, publish, start/complete session, log event) are
Next.js Server Actions in [lib/actions.ts](lib/actions.ts) — no separate API
routes.

## How the flow works

1. **Dashboard** (`/`) — lists tests, shows participant counts per variant.
2. **Create Test** (`/tests/new`) — name, task, two Figma prototype URLs,
   optional target counts, optional "final screen" links (paste the full
   Figma link to the success/end screen — e.g. copied from Present view —
   and the app extracts the `node-id` automatically via
   [lib/figma.ts](lib/figma.ts)'s `extractNodeId()`; no need to know or
   look up raw node IDs yourself).
3. **Test Overview** (`/tests/{id}`) — shows details, **Publish Test** button.
4. **Publish** generates two separate links — `/test/{id}/a` and
   `/test/{id}/b`. No random assignment; you manually send each link to its
   own participant group.
5. **Participant experience** (`/test/{id}/a` or `/b`) — task instruction
   screen → `Start Task` creates a session → nearly full-screen embedded
   Figma prototype → task completes automatically if a success node ID is
   configured (via the `PRESENTED_NODE_CHANGED` event) or via a floating
   `Finish Task` button otherwise → thank-you screen.
6. **Results** (`/tests/{id}/results`) — targets vs actuals, A/B comparison
   table (participants, completion rate, durations, interactions, unhandled
   interactions, frames visited, time to first interaction — all computed
   programmatically, never estimated), expandable per-session timelines and
   navigation paths (sequences of Figma node IDs).

Debug mode: append `?debug=true` to a participant link to show a small
panel of raw Figma Embed API events (type, node IDs, handled, x/y) — used to
verify tracking is wired up correctly. Never shown to real participants.

## Figma Embed Kit setup

- Get your Figma Client ID and put it in `NEXT_PUBLIC_FIGMA_CLIENT_ID`.
- Researchers paste normal `figma.com/proto/...` URLs — [lib/figma.ts](lib/figma.ts)
  converts them to `embed.figma.com` URLs with `embed-host` and `client-id`
  params automatically. No iframe HTML needs to be pasted.
- Tracked events: `INITIAL_LOAD`, `MOUSE_PRESS_OR_RELEASE`,
  `PRESENTED_NODE_CHANGED`, `NEW_STATE`. Parsing in
  [components/FigmaEmbed.tsx](components/FigmaEmbed.tsx) is defensive since
  Figma's payload shape can vary slightly between event types.
- Message origin is validated (`event.source` must be the embedded iframe's
  `contentWindow`, and `event.origin` must include `figma.com`) before any
  event is accepted or stored.

## What's intentionally NOT built (per MVP scope)

Auth/accounts, teams, billing, participant recruitment, email, surveys,
multiple tasks per test, video/audio/screen recording, session replay,
mobile testing, statistical significance testing, CSV/PDF export, Figma
plugin/REST API integration, AI insights, chat interfaces, marketing pages.

## Known limitations

- Not tested against a **real** Figma prototype/live Client ID in this
  environment — the flow was verified end-to-end with simulated
  session/event data (DB writes, dashboard, publish, results all confirmed
  correct). Confirm with a real Figma file that Figma's actual postMessage
  payload shapes match what [components/FigmaEmbed.tsx](components/FigmaEmbed.tsx)
  expects; adjust `parseFigmaMessage` if any fields come through differently.
- `NEXT_PUBLIC_APP_URL` must be set correctly for the generated participant
  links to point at the right domain (defaults to `localhost:3000`).
- Single-machine, single-file SQLite — fine for a demo, not for concurrent
  production traffic.

## Verifying Figma tracking works

1. Publish a test with a real Figma prototype URL.
2. Open `/test/{id}/a?debug=true`, click **Start Task**.
3. Interact with the prototype — the debug panel (bottom-left) should show
   live events (`INITIAL_LOAD`, `PRESENTED_NODE_CHANGED`, etc.) with node
   IDs as you click through it.
4. Check the results page afterward — the same session's interaction count,
   frames visited, and navigation path should reflect what you just did.
