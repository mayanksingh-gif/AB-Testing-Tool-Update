# TestFlow — Figma Prototype Testing Tool

A Next.js app for running two kinds of research studies against Figma prototypes:

- **A/B Testing** — compare two prototype variants via separate participant links, track
  navigation behavior, and collect an optional post-task text question.
- **Usability Testing** — guide a participant through an ordered sequence of prototype
  screens ("steps"), each with its own starting screen, a defined success screen, and an
  optional per-step question, plus an optional final whole-study question.

Both study types get a rule-based Results dashboard (participant counts, timing, friction
indicators, feedback) and an on-demand, locally-run AI insights summary.

## Stack

- Next.js 14 (App Router), React 18, TypeScript
- `node:sqlite` (built-in, no external DB server) — single file at `data/app.db`
- Tailwind CSS
- Figma's embedded prototype player (`FigmaEmbed`) + `postMessage` for in-prototype event
  tracking (navigation, clicks, success-screen detection)

No ORM, no auth, no analytics SDK, no icon library beyond `lucide-react`.

## Getting started

```bash
npm install
cp .env.local.example .env.local   # fill in values, see below
npm run db:init                    # creates data/app.db
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment variables

Copy `.env.local.example` to `.env.local` and fill in what you need — every one of these is
optional except `NEXT_PUBLIC_APP_URL`, which the app otherwise infers from the request.

| Variable | Required | Purpose |
|---|---|---|
| `NEXT_PUBLIC_APP_URL` | Recommended | Base URL used when building shareable participant links. |
| `NEXT_PUBLIC_FIGMA_CLIENT_ID` | No | Figma OAuth client ID, if you wire up OAuth for prototype selection. |
| `FIGMA_ACCESS_TOKEN` | No | Server-only Figma personal access token. Used only to resolve node IDs to human-readable screen names in A/B results. Without it, screens show as "Screen 1", "Screen 2", etc. |
| `LOCAL_LLM_BASE_URL` | No | OpenAI-compatible chat-completions base URL (e.g. a local LM Studio / llama.cpp / MLX server) that powers the "Generate AI Insights" button. |
| `LOCAL_LLM_MODEL` | No | Model name to request from that endpoint. |
| `OPENAI_API_KEY` | No | Reserved for a future hosted-LLM fallback; unused by the current local-only insights flow. |

AI insights are **on-demand only** — nothing is sent anywhere unless you click "Generate AI
Insights" on a results page, and only to the local endpoint you configure. Leave the
`LOCAL_LLM_*` vars blank to disable that button entirely.

## Project structure

```
app/
  (admin)/              Researcher-facing pages (dashboard, test/study builders, results)
    page.tsx             Dashboard — stat cards, "new study" cards, recent studies table
    tests/               A/B test creation, edit, detail, results
    studies/             Usability study creation, edit, detail, results
  test/[id]/[variant]/   Participant-facing A/B experience (no admin chrome)
  usability/[id]/        Participant-facing usability experience (no admin chrome)

components/
  FigmaEmbed.tsx          Core prototype embed + postMessage event handling (safety-critical)
  StepFigmaEmbed.tsx       Thin per-step wrapper around FigmaEmbed for usability studies
  ParticipantExperience.tsx         A/B participant flow state machine
  UsabilityParticipantExperience.tsx Usability participant flow state machine
  results/                Results-dashboard sections (charts, feedback, AI insights, etc.)

lib/
  schema.sql              SQLite schema (source of truth for table shapes)
  db.ts                   DB connection + guarded migrations for existing databases
  queries.ts / actions.ts             A/B data access + Server Actions
  usability-queries.ts / usability-actions.ts   Usability data access + Server Actions
  figma.ts                 Figma URL/node-id parsing & normalization (shared by both study types)
  metrics.ts / usability-metrics.ts   Rule-based results computation
  ai-insights.ts / llm.ts  AI insights payload building + local LLM adapter
```

Participant-facing routes (`app/test/...`, `app/usability/...`) are intentionally outside the
`(admin)` route group and never render the researcher dashboard chrome.

## Data model notes

- A/B and Usability studies are modeled as separate table families (`tests`/`sessions`/`events`
  vs. `usability_studies`/`usability_steps`/`usability_sessions`/`usability_events`) rather than
  one shared schema, so changes to one study type can't regress the other.
- `lib/db.ts`'s `migrate()` runs guarded `ALTER TABLE` statements on every connection, so pulling
  a newer version of this repo against an existing `data/app.db` adds any new columns/tables
  automatically — no manual migration step.
- `data/app.db` is gitignored; each environment gets its own local database.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm start` | Run the production build |
| `npm run db:init` | Create `data/app.db` from `lib/schema.sql` if it doesn't exist |
| `npm run lint` | Next.js lint |

## Constraints this project follows

- No random participant assignment — links are generated per variant/study and shared manually.
- No statistical-significance testing — results are presented as rule-based observations, not
  p-values.
- No session recording, video, or eye tracking.
- `FigmaEmbed.tsx`'s origin/`event.source` validation and payload parsing are safety-critical and
  are only ever extended additively, never altered in place.
