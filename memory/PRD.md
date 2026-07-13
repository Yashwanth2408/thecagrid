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

## Frontend Visual Overhaul — Awwwards-tier (2026-07-09)
- Fonts swapped to Instrument Serif (display italic) + Space Grotesk (body/UI) + JetBrains Mono (labels/tickers/numbers); Inter removed
- Full landing rebuild: editorial off-canvas hero, live "NOW ON THE GRID" ticker, generative-dot "Right now on the grid" with count-up stats, sticky-pinned "How it works" (FOCUS / STREAK / MENTOR / SHIP) with clip-path swaps, asymmetric bento with mixed radii, "5.2 years" cost section, repeating-wordmark editorial footer
- Auth pages: split-screen with rotating quote panel (4 quotes) + underline-only inputs + text-link CTAs
- Onboarding: vertical-list level selector, one-question quiz with A/B/C/D shortcuts, animated fit-score counter
- Dashboard shell: violet-bar sidebar, glass topnav with mono breadcrumb, acid-green streak
- Custom cursor: dot + trailing ring with spring lag, magnetic pull on `[data-magnetic]`, mono labels via `[data-cursor-label]`, auto-disables on touch / reduced-motion
- Cursor-reactive dot grid, film-grain SVG noise overlay, Framer AnimatePresence route transitions
- All Phase 1 functionality preserved: 15/15 backend + 13/13 frontend regression tests pass

## Phase 2 — Retention Core (2026-07-09)
### Backend
- New collections: focus_sessions, user_stats, achievements (20 badges), user_achievements, daily_focus
- XP formula (locked): 1 XP/min + 10 completion + 20 first-of-day + 50 new-streak-best. Level = floor(sqrt(xp/50)) + 1
- Streak logic in IST (Asia/Kolkata) with weekly Monday-reset freeze
- Endpoints: /focus/start, /focus/complete, /focus/cancel, /focus/active, /focus/history, /stats/me, /stats/heatmap, /stats/weekly, /stats/monthly, /stats/subjects, /stats/hour-of-day, /achievements, /dashboard, /live/pulse (public, 10s cache, priming blend when data thin)
- Demo user seeded with ~40 sessions across 30 days, 14-day active streak, ~34.6h total focus, 10 badges unlocked (Founder + First Focus + Hour One + 25-Hour Club + Streak 3/7 + Night Owl + Weekend Warrior + Polymath + Level 5)
- City field added to users; onboarding accepts optional `city`
- Fresh signup auto-unlocks founder_grid (founder period)

### Frontend
- **Dashboard** (`/dashboard`): 9-card asymmetric bento — Continue (last subject resume), Streak (acid green flame, current + best), Today (violet radial ring), Level (XP bar), 90-day heatmap, Badges (latest 3 + count), Top Subjects, Next Up (AI Mentor teaser), Regulatory Radar (Phase 4 teaser). All animated in, no page spinner (per-card shimmer).
- **Focus** (`/focus`): editorial idle config (duration chips, subject chips, ambient rain/lofi/cafe/none, START text-link CTA). Fullscreen active mode with massive Instrument Serif countdown, thin violet ring, ambient audio, mute toggle, cancel-confirm modal. Persists across refresh via `/focus/active`. Completion modal with XP + streak + level + new-badge unlocks + confetti burst.
- **Analytics** (`/analytics`): 365-day heatmap, 30-day area chart, hour-of-day bars, subject stacked bar with legend, records column (longest streak / longest session / total focus)
- **Profile** (`/profile`): big avatar + editorial name, 4 filter tabs (ALL/UNLOCKED/LOCKED/LEGENDARY), 20-badge grid with legendary glow
- **Landing** (`/`): live-pulse-bound ticker (12 rows, /api/live/pulse refresh every 12s) + generative dot grid intensity scaled to active_now + LIVE UPDATED Xs AGO caption
- **Onboarding**: optional city input in goal step (data-testid `onb-city`)
- Top nav: real streak (acid green) + level badge (violet), refreshes after focus completion

### Phase 4 backlog note
- Rate-limit `/api/live/pulse` (public endpoint)
- Split server.py into modules (auth, focus, stats, achievements, pulse, seed)
- Migrate deprecated @on_event to lifespan context manager
- Wire require_user via FastAPI Depends
- Replace in-memory pulse cache with Redis if scaled

### Tests
- Backend: 30/30 pytest pass (15 Phase 1 regression + 15 Phase 2)
- Frontend: all Phase 2 pages render for demo user; Landing critical Hero prop bug caught and fixed by testing agent

## Phase 3 — AI CA Mentor + Micro-Toast (2026-07-09)

### Backend
- `emergentintegrations` LlmChat streaming with **claude-sonnet-4-5-20250929**, per-session instances, SSE responses
- New collections: `mentor_sessions`, `mentor_messages`, `study_plans`
- New endpoints: `POST /mentor/sessions`, `GET /mentor/sessions[/id]`, `DELETE /mentor/sessions/id`, `POST /mentor/chat` (SSE), `POST /mentor/quick` (SSE, 10/min in-memory rate limit), `POST /study-plan/generate` (structured JSON via LLM), `GET /study-plan/active`, `POST /study-plan/{id}/archive`
- System prompts locked in `/app/backend/prompts.py` (Exam + Practice + Study Plan JSON schema)
- Citations parsed via regex from `SOURCES:` block, stored on `mentor_messages.citations`
- Demo user seeded with 2 mentor sessions (Ind AS 115 + GST exports, pre-authored assistant content w/ proper citations) + 1 active 12-week study plan biased toward Advanced Accounts + Costing

### Frontend
- **`/mentor`** — sidebar (sessions + `[ + NEW ]` + `[ STUDY PLAN → ]` link) + chat pane with mode toggle (locked after first msg), streaming assistant bubble w/ blinking violet caret, markdown rendering via `react-markdown + remark-gfm`, SOURCES card w/ violet border-left
- **`/mentor/study-plan`** — editorial form or 12-week rendered plan with weekly dividers, day rows (mono date + italic subject + task bullets + hours badge), regenerate/archive
- **Dashboard `NextUpCard`** — real quick-ask input, creates session on Enter and navigates to `/mentor?session=<id>`
- **Persistent `MentorDrawer`** — floating violet Sparkles button bottom-right on `/dashboard`, `/focus`, `/analytics`, `/profile`. Drawer slides in right, glass, ~420px, shares MentorChat component. State (open + sessionId + mode) persisted to `localStorage.cagrid.drawer`
- **`MicroToast`** — Toast provider at app root; fires on focus completion (500ms after `/focus/complete` resolves) — pulls fresh `/live/pulse.active_now` and shows "You're on the grid." + mono `NOW FOCUSED · N ASPIRANTS`. Auto-dismiss 4.5s. Does NOT fire on cancel.
- **Sidebar** — added Mentor entry (`Sparkles` icon) between Focus and Analytics
- **Voice** — SpeechRecognition (mic) + SpeechSynthesis (speak) toggles, gracefully hidden on unsupported browsers

### Test results
- Backend: **49/49** pytest (30 Phase 1+2 regression + 19 Phase 3 new)
- Frontend: **all** Phase 3 review scenarios pass
- Real Claude streaming verified end-to-end; rate limit + SSE headers + citation parsing all green

### Deferred (all OPTIONAL per iteration 4 testing agent)
- Split `server.py` (now 1663 lines) into `auth/focus/mentor/study_plan/seed/pulse/stats` modules
- Migrate rate-limit dict to Redis for multi-worker deployment
- Abort in-flight LLM stream on client disconnect (credit saver)
- Study-plan JSON parse fallback (regex-extract first `{...}` block)
- Migrate deprecated `@on_event` → FastAPI lifespan
- Wire `require_user` via `Depends`

---

## Phase 3.5 — Production Hardening (2026-07-09)

### Backend
- `slowapi` rate limiting: auth 5/min per IP, mentor/chat 20/min/user, mentor/quick 10/min/user, study-plan 5/hour, focus 30/min/user, client-errors 10/min/IP, live/pulse 60/min/IP, default 100/min/user. 429 JSON returned.
- `SecurityHeadersMiddleware`: HSTS, XFO=DENY, nosniff, Referrer-Policy, Permissions-Policy, COOP, CSP (with documented unsafe-* relaxations for CRA/Framer/PostHog).
- CORS locked to `*.preview.emergentagent.com` + `*.internal.preview.emergentagent.com` + `localhost` + backend URL host; `.*` regex removed.
- Password strength: ≥8, letter+digit, block-listed against `common_passwords.py`.
- Password reset endpoints (stdout-only link): `/api/auth/password-reset/{request,confirm}` with URL-safe 32-byte token, 60-min TTL, single-use, generic response, session rotation on confirm.
- Session rotation on login/signup (delete_many prior sessions).
- GDPR-lite: `GET /api/account/export` (Content-Disposition JSON), `DELETE /api/account/delete` (cascades 9 collections).
- `POST /api/client-errors` for ErrorBoundary telemetry (10/min/IP).
- Structured JSON logging via `log_event()` — auth.login.ok/fail, password.reset.*, account.export/delete, client.error, ratelimit.exceeded.
- Pydantic `ConfigDict(str_strip_whitespace=True)` + length caps on all new bodies.
- `TTL index` on `password_reset_tokens.expires_at`.

### Frontend
- `<ErrorBoundary>` wraps App → reports to `/api/client-errors`.
- Custom `/NotFound` (404) and `/ServerError` (500) editorial pages.
- `/terms` and `/privacy` — 10 numbered sections, mono metadata line, vendor table listing Emergent Auth, Anthropic Claude, MongoDB, Pixabay CDN, PostHog, Google Fonts.
- `/forgot-password` + `/reset-password` — brand-matched auth pages with `sonner` toasts.
- Profile page → Account section with **Export JSON** and **Delete account** cards (confirm-DELETE input).
- Global SEO via `react-helmet-async` — meta, OG, Twitter, robots/sitemap, favicon.svg, apple-touch-icon, manifest.json.
- Skip-to-content link (`data-testid="skip-to-content"`), improved focus-visible, `prefers-reduced-motion` extended.
- Global `sonner` `<Toaster />` (top-right, dark, brand borders).
- Mobile: `overflow-x: hidden` on html/body; iOS-safe `font-size: 16px` on inputs at ≤640px to prevent zoom.

### Test status (iteration_9)
- Backend: **14/14 pytest PASS**
- Frontend: **100% Phase 3.5 test-ids present + flows working**
- Regression: Focus + Mentor + Streaks unaffected.


---

## Phase 4 — Content Layer (2026-07-09)

### Backend
- **Syllabus** — force-reseeds if empty. 16 papers (F1-F4, I1-I6, P1-P6) with 200+ canonical ICAI chapters, each with `weightage_pct` + `estimated_hours`. Endpoints: `GET /api/syllabus`, `GET /api/syllabus/{paper_code}`, `GET /api/syllabus/progress`, `POST /api/syllabus/progress`. Upsert semantics keyed by (user_id, chapter_id).
- **Regulatory Radar** — 28 seeded alerts (5 critical, 12 moderate, 11 info) spanning last 90 days. `GET /api/radar/alerts` (level+impact+days filter, personalised for auth users), `GET /api/radar/alerts/{id}`, `POST /api/radar/alerts/{id}/dismiss`, `GET /api/radar/summary` (60s in-memory cache).
- **Content Hub** — 20 substantive editorial posts (700-1500 words each) with hero_gradient, author, tags, level_filter, read_minutes. `GET /api/content/posts`, `GET /api/content/posts/{slug}` (+ related), `GET /api/content/digest` (5min cache).
- **Weekly Recap** — `GET /api/recap/weekly` computes 7-day focus_minutes (with prev-week delta %), top_subject, chapters_completed, mentor_asks, badges_earned, regulatory_critical_unread, next_week_focus suggestions.
- Account export/delete cascades new collections (user_syllabus_progress, user_dismissed_alerts).
- 5 new mongo indexes; run_seed seeds demo I1=4-mastered + I2=6-in-progress.

### Frontend
- **/syllabus** — editorial per-paper accordion with radial progress rings, chapter status control (NOT/PROGRESS/REVISED/MASTERED), notes editor, filter chips, green pulse animation on state change.
- **/radar** — timeline layout with mono dates, impact badges (CRITICAL glow), source, title, body, chapter-chip links to /syllabus, dismiss with slide-out animation.
- **/hub** — editorial magazine layout (hero + secondary + grid). Tag filter chips.
- **/hub/:slug** — post detail with hero-gradient banner, ReactMarkdown + remark-gfm rendering (italic serif h2s, violet blockquote, mono code), sticky TOC on desktop, related posts.
- **Dashboard** — 4 new bento cards: SyllabusCard (top 3 papers + progress rings), RadarCard (unread count + latest 3 with critical glow), HubCard (today's pick), RecapCard (weekly focus + delta + top subject).
- **Sidebar** — 3 new links: Syllabus (BookOpen), Radar (Radio), Hub (Newspaper).

### Test status (iteration_10)
- Backend: **22/22 pytest PASS**
- Frontend: **95%** — only unmet testid `syllabus-empty-onboarding` is unreachable because ProtectedRoute redirects null-level users to /onboarding first (correct UX; spec conflict flagged, no code change needed).
- Regression: All Phase 1-3.5 flows intact; account export includes syllabus_progress + dismissed_alerts.
- HubPost fix applied by tester: `<title>{`${post.title} · …`}</title>` template literal to avoid Helmet children-array crash.


---

## Phase 4.5 fix pass + Phase 5 — Assessment Engine (2026-07-13)

### Phase 4 fixes shipped
- Radar `/summary.unread_count` — cache invalidation on `POST /radar/alerts/{id}/dismiss` (pop user's key from `_RADAR_SUMMARY_CACHE`).
- Content posts count bumped to 22, 6 tagged `Foundation`.
- `/content/posts?tag=X` now drops the auto user-level constraint (explicit tag intent wins). Explicit `?level=X` still combines with `?tag`.
- Radar chapter chips now link `/syllabus?paper=X&chapter=Y`. Syllabus page reads params, auto-expands paper, scrolls chapter row into view with acid-green box-shadow glow that fades after 2.5s.

### Phase 5 — Assessment Engine
- **Backend**: `question_bank` (~90 real ICAI-style Q's), `mock_tests` (8 seeded across F2/I3/I4/I5/P1/P4/P5), `mock_attempts`, `mock_answers`, `flashcard_decks` (10), `flashcards` (~150), `user_flashcard_progress`. New indexes across all Phase 5 collections. Account export/delete cascades now cover `mock_attempts`, `mock_answers`, `user_flashcard_progress`.
- **Endpoints**: `GET /mocks`, `POST /mocks/{id}/start`, `POST /mocks/attempts/{aid}/answer`, `POST /mocks/attempts/{aid}/submit` (10/min limit), `GET /mocks/attempts/history`, `GET /mocks/attempts/{aid}`, `GET /flashcards/decks`, `GET /flashcards/decks/{id}/queue`, `POST /flashcards/review` (60/min), `GET /flashcards/stats`.
- **SM-2 lite**: grade 0 → repetitions=0, interval=0; grade ≥1 → repetitions++, ease adjusts, interval grows 1 → 3/6 → prev × ease. Verified: grade=3 on new card → reps=1, interval=1, ease>2.5, +5 XP.
- **XP**: mock submit +50/+100/+150 based on 0/70/85% thresholds. Flashcard review +5 for good/easy, +2 for hard, 0 for again.
- **Seed**: demo has 3 submitted attempts (scores 22/46/42), 40 flashcard progress rows (12 due, 12 mastered, 16 future).
- **Frontend**: `/mocks` editorial index with difficulty dots + best-score column, `/mocks/{id}/attempt` full-viewport test UI with sticky timer + question navigator + keyboard nav + auto-save, `/mocks/results/{aid}` score band + topic breakdown + collapsible question review + next-action chips, `/flashcards` deck picker + review mode with SPACE flip + 1/2/3/4 grade shortcuts.
- **Dashboard**: 2 new bento cards (MocksCard with best score, FlashcardsCard with due-today count).
- **Sidebar**: Mocks (FileCheck2) + Flashcards (Layers) icons added between Hub and Analytics.

### Test status
- iteration_11: 15/17 pytest — 2 real bugs found (export missing new collections, tag filter AND with auto level).
- iteration_12: 13/13 PASS. `retest_needed: false`.
- Frontend was 100% in iter11 and unchanged in iter12.

### Phase 6 — Articleship Toolkit + Community + Weak-topic Automation

**Split from server.py (was 3.4k lines):**
- `/app/backend/routes_articleship.py` (417 lines) — firms, reviews, articleship profile, leave records, practical logs, practical→syllabus correlations, firm-match
- `/app/backend/routes_community.py` (399 lines) — categories, threads, replies, upvote/downvote, study groups, mocked CA verification
- Included in `server.py` via `app.include_router(articleship_router)` / `community_router` + custom `Phase6RateLimitMiddleware` for 5-reviews/24h and 30-POSTs/min buckets.

**New Mongo collections + indexes:**
`firms`, `firm_reviews`, `articleship_profile` (unique on user_id), `leave_records`, `practical_logs`, `forum_categories`, `forum_threads`, `forum_replies`, `forum_votes` (unique {user_id, target_type, target_id}), `study_groups`, `study_group_members` (unique {group_slug, user_id}), `verification_requests`.

**Endpoints:**
- Firms: `GET /firms`, `GET /firms/{slug}`, `POST /firms/{slug}/reviews`
- Articleship: `GET/PUT /articleship/me`, `GET/POST /articleship/leave`, `GET/POST /articleship/practical-log`, `GET /articleship/practical-to-syllabus`, `GET /articleship/firm-match`
- Community: `GET /community/categories`, `GET /community/categories/{slug}/threads`, `POST /community/threads`, `GET /community/threads/{tid}`, `POST /community/threads/{tid}/replies`, `POST /community/vote`
- Study groups: `GET/POST /community/study-groups`, `GET /community/study-groups/{slug}`, `POST /community/study-groups/{slug}/join|leave`
- Mocked CA verify: `POST /verify/ca` — any 6-digit number → `is_verified_ca: true` + logs to `verification_requests`

**Level segmentation:** level-kind categories require the user's `journey_level` to be at or above the category's `level_key` (order: Aspiring<Foundation<Intermediate<Articleship<Final<Qualified CA). Verified CAs bypass this.

**Weak-topic → Flashcard auto-schedule:** `POST /mocks/attempts/{aid}/submit` now returns `auto_scheduled_flashcards`. On submit with weak topics, up to 15 flashcards from the same `paper_code` get pulled forward: new cards created as due-today, existing future-due cards moved to today, already-due cards tagged with `auto_scheduled_from_mock`. Mastered cards (`repetitions>=4`) never touched.

**New frontend pages (11):** `/firms`, `/firms/:slug`, `/articleship`, `/articleship/log`, `/firm-match`, `/community`, `/community/:slug`, `/community/threads/:thread_id`, `/study-groups`, `/study-groups/:slug`. Dashboard has a Phase-6 bento shortcut row. Sidebar has Building2 (firms), Briefcase (articleship), MessagesSquare (community) icons.

**Seeded (idempotent):** 41 firms, 62 hand-authored reviews, 9 forum categories (6 level + 3 cross), 14 threads with ~40 replies, 5 study groups (demo auto-joined to 2), demo articleship profile at Grant Thornton Bharat with 3 leave records + 5 practical logs.

**Test iteration 13:** 43/44 backend PASS (1 by-design skip), 100% frontend. Overall success 97.7% backend / 100% frontend. RCA'd + fixed: I3 seed-exhaustion (already-due cards now counted in auto_scheduled). `is_verified_ca` resets on `/api/seed` for deterministic tests.

**MOCKED (documented):** `/api/verify/ca` — production would call ICAI membership register API. Currently accepts any 6-digit numeric string.
