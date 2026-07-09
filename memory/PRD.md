# The CA Grid — PRD (Product Requirements Document)

## Original Problem Statement (Phase 1 — verbatim summary)
Build "The CA Grid" — a premium, dark-mode-first web platform for Indian CA aspirants. Phase 1 delivers: Landing page, Auth (Emergent Google OAuth + Email/Password), Onboarding wizard with a mini "Am I CA material?" quiz for Aspiring users, Dashboard skeleton, ProtectedRoute pattern with the 3-state auth check, and seed data (demo user + syllabus).

## Stack
- Frontend: React (CRA + craco), TailwindCSS, Framer Motion, Lucide, shadcn/ui, canvas-confetti, react-router-dom v7
- Backend: FastAPI (motor async), MongoDB, httpx, bcrypt
- All backend routes prefixed with `/api`; `openapi_url='/api/openapi.json'` so schema is publicly reachable through ingress.

## Design System (locked)
- Base bg `#0A0A0B`, panel `#111114`, card `#16161B`; accent electric violet `#7C3AED` / hover `#8B5CF6`; amber `#F59E0B`, emerald `#10B981`
- Text `#F5F5F7 / #A1A1AA / #71717A`, border `rgba(255,255,255,0.06)`
- Font: Inter 400–800 with `letter-spacing: -0.03em` on display type
- Radius 20px on cards, 12px on buttons
- Motion 200–350ms; hover lift + violet glow; radial violet glow behind hero
- Tokens live in `/app/frontend/src/lib/theme.js`

## User Personas
1. **Aspiring** — exploring whether CA is right (gets the CA fit quiz on onboarding).
2. **Foundation / Intermediate / Articleship / Final** — active aspirants.
3. **Qualified CA** — practising / industry, CPD-focused.

## Core requirements (static)
- Landing page (public), Login (public), Signup (public)
- Auth via Emergent Google OAuth **and** email/password (bcrypt)
- httpOnly `session_token` cookie (samesite=none, secure, 7-day) AND Bearer support
- Onboarding wizard: welcome → level → (quiz if Aspiring) → goal + subjects → confetti → dashboard
- Dashboard shell: top nav (streak flame placeholder, avatar dropdown w/ logout), sidebar (icon-only), welcome bento + Phase 2 placeholder
- ProtectedRoute with 3-state pattern; AppRouter synchronously handles `#session_id=` before route render
- Seed: demo user + syllabus (Foundation/Intermediate/Final papers)

## What's been implemented — Phase 1 (2026-07-09)
- ✅ Landing page (`/`) — hero with animated bento mock, feature bento (6 cards), testimonials, footer, all CTAs to `/signup`
- ✅ `/signup` and `/login` — glassmorphic, violet-glow, email/password + Google OAuth button
- ✅ Emergent Google OAuth: dynamic redirect via `window.location.origin`, backend calls `demobackend.emergentagent.com/.../session-data`, sets httpOnly cookie
- ✅ Email/password: `POST /api/auth/signup`, `POST /api/auth/login` with bcrypt, session cookie
- ✅ `/api/auth/me`, `/api/auth/logout` — cookie + Bearer both accepted
- ✅ Onboarding wizard (`/onboarding`): 5 steps, quiz for Aspiring only with deterministic weighted scoring (0-100 with 3 bands + tailored 3-bullet roadmap), confetti on finish
- ✅ Dashboard (`/dashboard`) skeleton with AppShell, streak flame placeholder, avatar dropdown, sidebar
- ✅ Seed: demo user (`demo@cagrid.in / demo123`, onboarded), ICAI 2026 syllabus (16 papers)
- ✅ `/api/openapi.json` publicly accessible
- ✅ MongoDB indexes (users.email unique, user_sessions.session_token unique, TTL on expires_at)
- ✅ Test credentials + auth testing playbook committed at `/app/memory/test_credentials.md` and `/app/auth_testing.md`

### Test results (iteration 1)
- Backend: 15/15 checks pass (after openapi fix)
- Frontend: 7/7 UI flows pass (Playwright)

## Prioritized backlog (Phase 2 — next)
### P0
- Focus Timer (Pomodoro tuned for CA paper cycles) with session persistence
- Streak Engine (daily streak with weekly grace, timezone-aware)
- Syllabus Tracker per paper with chapter-level progress + progress rings

### P1
- AI Mentor (Emergent LLM key — Claude Sonnet 4.5 / GPT-5.2) with ICAI-cited answers
- Regulatory Radar — ICAI announcement/amendment feed
- Analytics page (Recharts) — hours/subject/week
- Profile page — edit level/goal/subjects

### P2
- Community rooms (per-level small cohorts)
- Push/email notifications for streaks & radar
- Weekly digest email
- Mobile app (`/app/mobile` — currently untouched)

## Non-blockers deferred from Phase 1
- Actual streak logic (placeholder shows "0")
- Chapter-level syllabus (only paper-level seeded)
- Password reset flow
- Profile edit

## Architecture Notes
- Mongo collections: `users`, `user_sessions`, `syllabus`
- User ID: custom `user_{uuid.hex[:12]}`; queries always use `{"_id": 0}` projection
- `datetime.now(timezone.utc)` throughout; naive datetime coerced to UTC before comparison
- CORS: `allow_origin_regex='.*'` + credentials (restrict for prod later)
