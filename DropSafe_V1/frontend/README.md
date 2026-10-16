# DropSafe — Frontend (V1)

React + TypeScript frontend for **DropSafe**, the AI-powered Student Risk Detection &
Early Intervention Platform, built directly from `DropSafe_V1_Final_PRD.md`.

Architecture per PRD §6: **React + TypeScript → Node.js/Express API → Prisma → PostgreSQL**
(this repo is the React layer only; ML and chatbot remain separate services/workstreams).

---

## Quick start

```bash
npm install
npm run dev        # http://localhost:5173
```

The app boots in **demo mode** by default — an in-browser adapter
(`src/api/demo/`) serves realistic, PRD-consistent data for all three roles,
so every screen works without a backend.

| Demo account            | Role               | Can see / do |
| ----------------------- | ------------------ | ------------ |
| `admin@vvce.edu.in`     | Organization Admin | Everything: org setup, users, RBAC, mentor approvals, imports, predictions, counseling, governance, reports |
| `teacher@vvce.edu.in`   | Teacher            | Academic structure, students, attendance/assessment entry, imports |
| `mentor@vvce.edu.in`    | Mentor             | Assigned students, risk monitoring, interventions, counseling sessions, follow-ups |

Any password works in demo mode.

## Wiring your existing backend

The PRD (§28/§37) deliberately does **not** freeze endpoint paths, so the frontend
keeps them in one registry:

1. `.env` → set `VITE_DEMO_MODE=false` and `VITE_API_BASE_URL=http://your-api/api`
2. `src/api/endpoints.ts` → adjust any path to match your Express routes
3. Response shapes are the types in `src/types/models.ts`

That's it — pages never call `fetch` directly; they use the typed service layer
(`src/api/services/*`), which goes through the transport in `src/api/http.ts`
(JWT from `localStorage`, `Authorization: Bearer …`, 401 → login redirect).
Organization scope is expected to come from the JWT server-side — the client
never sends another organization's ID (PRD §28).

## PRD coverage map

| PRD area | Where in the UI |
| --- | --- |
| §3 Users (Admin/Teacher/Mentor) | Role-aware navigation, dashboard, and route guards |
| §5/§15 Human-in-the-loop | "Open human review" on Risk Monitoring; predictions never auto-create interventions |
| §7 Master/Org, RBAC | Admin → Organization & Settings, Users, Roles & Permissions (User→Role→Group→Permission matrix) |
| §8 Academic hierarchy | Academic → Structure (Program→Level→Period→Component tree, lifecycle transitions) |
| §8 Students & identifiers | Academic → Students, Student 360 (identity / evidence / AI kept separate) |
| §10 Imports | Data Imports → wizard Upload→Validate→Preview→Process→Commit, partial/fatal semantics |
| §13–14 AI domain | AI & Risk → Risk Monitoring board, Student 360 → AI Insights, Prediction history trend |
| §13/§30 Q6 | "Prediction unavailable" (insufficient evidence) shown without inventing a label |
| §15 Counseling | Counseling → Interventions (+sessions, follow-ups), Counseling privacy on session outcomes |
| §16 Governance | Governance → Audit Logs, Access Logs (with denial reasons), Notification History |
| §17 Privacy | Mentor access approval flow, approved behaviour summaries only, **no raw chatbot messages anywhere in the portal**, permission-gated exports |
| §20 State machines | `src/lib/transitions.ts` — UI only offers valid transitions; server re-validates |
| §21 Retention | Settings → graduated-retention months + action (ARCHIVE/ANONYMIZE/DELETE) |
| §25 Reporting | Reports → view (`report:view`) + CSV export (`report:export`) |
| §34 Data integrity | Client-side validation mirroring constraints (attended ≤ total, obtained ≤ max, passing ≤ max, started/ended on session completion, completed_at on completion...) |

Students are **not** portal users (PRD §3) — there is no student login, no student
dashboard, and no chatbot-message viewer (raw conversations are Critical
sensitivity, hidden even from admins).

## Project layout

```
src/
├─ api/
│  ├─ endpoints.ts        # single endpoint registry (edit for your backend)
│  ├─ http.ts             # transport: demo adapter OR fetch + JWT + 401 handling
│  ├─ services/           # typed APIs per domain (org, users, academic, imports, AI, counseling, governance)
│  └─ demo/               # in-browser backend used when VITE_DEMO_MODE=true
│     ├─ store.ts         # seeded dataset (all PRD domains)
│     └─ router.ts        # enforces transitions/rules like the real API
├─ auth/                  # AuthContext (session, hasPerm), route guards, <Can/> gate
├─ components/ui/         # design system (cards, tables, modals, badges, charts, toast)
├─ layout/                # AppShell + permission-filtered navigation
├─ lib/                   # permissions, state machines, formatting
├─ pages/                 # one folder per workstream (admin, academic, imports, risk, counseling, mentor, governance, reports)
└─ types/                 # enums + models reflecting PRD terminology verbatim
```

## Conventions kept from the PRD

- Enum values and entity names are used **verbatim** (`LEARNING_COMPONENT`, statuses like
  `PARTIAL_SUCCESS`, priorities `LOW…URGENT`); `titleCase()` is display-only.
- Archived/terminal records are never editable or deletable in the UI.
- Every sensitive action (transitions, approvals, exports) confirms first and notes
  that it is audit-logged.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Vite dev server (0.0.0.0:5173) |
| `npm run build` | Type-check + production build |
| `npm run preview` | Serve the production build |

## Environment

See `.env.example`. Only two variables:

- `VITE_API_BASE_URL` — your backend base URL
- `VITE_DEMO_MODE` — `true` uses the in-browser demo adapter; `false` calls your API
