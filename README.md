# Portfolio

An immersive portfolio site with a secure admin dashboard, built as a monorepo:

- **Frontend** — React 19 · TypeScript · Tailwind CSS · GSAP · Lenis (inertia scroll) · React Router · TanStack Query
- **Backend** — Python · FastAPI · SQLAlchemy · JWT auth
- **Ops** — multi-stage Dockerfiles, nginx, Docker Compose, GitHub Actions CI/CD

Palette `#084d6e` (background) · `#DCCBB5` (accent) · `#D8DAD6` (text). Headings in **Space Grotesk**, body in **DM Sans**
(both self-hosted via Fontsource — no Google Fonts requests).

> The demo content (Alex Morgan, the five projects, the artwork) is **fictional placeholder data**. Keep
> `SEED_DEMO_DATA=true` on the first start (the profile editor needs an existing profile), then replace everything from
> the admin dashboard.

## Features

| Area                  | What you get                                                                                                                                                                                         |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Home**              | 3D perspective project list (a "drum" whose vanishing point follows the scroll), spiral-staircase entrance, 3D→flat hover with outline→fill text, cursor-following preview, inertia scrolling         |
| **Transitions**       | PJAX-style: a curtain wipes over the page, the router swaps routes with no reload, then reveals the new page                                                                                         |
| **Case studies**      | `/projects/:slug` with client link, credits, tags, swipe/drag/keyboard carousel, and a "next project" flow that wraps from the last project to the first                                              |
| **Profile**           | `/profile` — stack, experience and education as structured bullet lists, plus a **résumé button that opens the PDF link you set by hand** in the admin (Drive, Dropbox, or a file in `frontend/public`)                                                       |
| **About overlay**     | "01 about" opens an overlay that is **already in the DOM** (hidden + `inert`); circular reveal and outline→fill typography. Focus-trapped, `Esc` closes                                              |
| **i18n**              | pt-BR (default), en, es, it, fr, ru, zh, ja. Browser language auto-detected, falls back to pt-BR, choice persisted. Top-right switcher. Project/profile **content** is translated server-side too    |
| **Easter egg**        | Click the pulsing dot next to the logo (or type ↑↑↓↓←→←→BA) to cycle five colour themes across the whole site                                                                                        |
| **Analytics**         | First-party, cookie-free traffic dashboard in the admin: pageviews, visitors, top pages/projects, referrers, devices, browsers, site language, résumé downloads, period-over-period deltas. No raw IPs stored; bots, Do-Not-Track and your own browser are ignored |
| **AI translation**    | "Translate from pt-BR" in the profile and project editors, powered by the Claude API (optional, needs `ANTHROPIC_API_KEY`); "Copy without translating" always works |
| **Admin**             | `/admin` — project CRUD (create, edit, publish toggle, reorder, delete, image upload), 8-language content editor, profile editor                                                                     |
| **Accessibility**     | Skip link, keyboard-operable menus/carousel/dialog, `prefers-reduced-motion` disables smoothing & 3D motion, real links for every project                                                            |

## Quick start

### Docker (production-style)

```bash
cp .env.example .env        # then set SECRET_KEY and ADMIN_PASSWORD (min. 12 chars)
docker compose up --build -d
# → http://localhost:8080        (admin at /admin)
```

The API **refuses to start in production with default secrets**. For plain-HTTP testing on a non-`localhost` address set
`COOKIE_SECURE=false` (browsers do accept `Secure` cookies on `http://localhost`).

### Local development

```bash
make install          # backend venv + frontend deps
make dev-api          # terminal 1 → http://localhost:8000   (docs at /docs in development)
make dev-web          # terminal 2 → http://localhost:5173   (proxies /api and /uploads to :8000)
```

Development defaults: admin user `admin` / password `change-me-admin` (a fresh database is created and seeded under
`backend/data/`). `make test` and `make lint` run everything CI runs.

## Repository layout

```
.
├── backend/                  FastAPI service (layered architecture)
│   ├── app/
│   │   ├── core/             config, security (bcrypt/JWT), DB session, rate limiter, middleware
│   │   ├── api/v1/           routers: auth · public · admin · health     (+ deps.py)
│   │   ├── models/           SQLAlchemy entities: User, Project, Profile
│   │   ├── schemas/          Pydantic request/response models & validation
│   │   ├── crud/             persistence functions (no business rules)
│   │   ├── services/         auth, localization, uploads, translation (Claude), analytics
│   │   └── db/               init + demo seed data
│   ├── tests/                pytest suite
│   └── Dockerfile            multi-stage (builder → runtime), non-root
├── frontend/
│   ├── src/
│   │   ├── components/       Header, LanguageSwitcher, AboutOverlay, Carousel, SplitText …
│   │   ├── features/         home (3D list) · project · profile · admin · i18n · theme · scroll · transitions
│   │   ├── hooks/ services/  data hooks · typed API client
│   │   ├── locales/          8 message catalogues (pt-BR is the typed source of truth)
│   │   ├── styles/ types/
│   └── Dockerfile            multi-stage (deps → build → unprivileged nginx)
├── docker/                   nginx.conf, security-headers.conf
├── docker-compose.yml
└── .github/                  workflows/ci.yml · dependabot.yml
```

## How the interesting parts work

**3D list without layout thrash** (`frontend/src/features/home/`). The list renders as two layers with identical row
boxes: a decorative, `pointer-events: none` layer whose rows get 3D transforms, and a **flat layer of real `<a>` links**
that owns all hover, focus and click handling. Because hit-testing never depends on transformed geometry, a row that
flattens under the cursor can't flicker, and clicks always land where you see the row. `perspective-origin` is set every
frame to `scrollY + viewportHeight/2 − stageTop` so the vanishing point stays at the viewer's eye line. All geometry is
*measured* only on resize/font-load; the per-frame loop only *writes* (`transform`, `opacity`, `perspective-origin`) from
cached numbers and the Lenis scroll value, and skips frames where nothing changed. The maths lives in a pure function
(`rowTransform.ts`) that is unit-tested.

**i18n.** A small custom provider (no i18next): `pt-BR.ts` defines the message shape, other locales are type-checked
against it and **lazy-loaded**. Content from the API is requested per language (`?lang=`), with fallback to pt-BR field by
field. The admin UI itself is English-only.

**Résumé.** Nothing is generated: *Profile → Résumé link* in the admin takes a URL (or a same-origin path such as
`/curriculo.pdf`). The profile page shows a button only when it is set, and clicks are counted by the analytics.

## Security model

- **Passwords**: bcrypt (cost 12); unknown usernames still burn a bcrypt round (no timing oracle); same error for every login failure.
- **Tokens**: short-lived (15 min) access JWT held **in memory only**; 7-day refresh JWT in an **`HttpOnly; SameSite=Strict; Secure`** cookie scoped to `/api/v1/auth`, rotated on use. Algorithms are pinned; token type is checked. Sign-out bumps a per-user `token_version`, revoking every outstanding token.
- **Rate limiting**: per-IP sliding window — login 5/min, refresh 30/min, translate 10/min, API 120/min — plus nginx `limit_req`. nginx *overwrites* `X-Forwarded-For`, so a client can't spoof its way around the limiter.
- **Validation**: every body goes through strict Pydantic models (`extra="forbid"`, length limits). URLs must be `http(s)` or a same-origin path, so `javascript:`/`data:` links can't be stored. Validation errors never echo submitted values.
- **Uploads**: type is sniffed from magic bytes (not filename/MIME), SVG is refused, names are random, size is enforced while streaming.
- **Headers**: CSP (`script-src 'self'`), `X-Frame-Options`, `nosniff`, `Referrer-Policy`, HSTS (production), `Permissions-Policy`. CORS allow-list with credentials; trusted-host check; API docs disabled in production.
- **Containers**: non-root users, `no-new-privileges`, all capabilities dropped, backend port not published.
- **Fail-safe config**: `ENVIRONMENT=production` refuses to boot with default/short secrets or wildcard CORS.

## Configuration

See `.env.example` and `backend/app/core/config.py`. The essentials:

| Variable                   | Default                       | Notes                                                |
| -------------------------- | ----------------------------- | ---------------------------------------------------- |
| `SECRET_KEY`               | *(dev placeholder)*           | **Required in production**, ≥ 32 chars               |
| `ADMIN_USERNAME/PASSWORD`  | `admin` / *(dev placeholder)* | Creates the first admin if no user exists; ≥ 12 chars in production |
| `DATABASE_URL`             | SQLite under `data/`          | Any SQLAlchemy URL                                   |
| `CORS_ORIGINS`             | `http://localhost:5173`       | Comma separated                                      |
| `ALLOWED_HOSTS`            | `*`                           | Set to your domain(s) in production                  |
| `SEED_DEMO_DATA`           | `true`                        | Seeds only an *empty* database                       |
| `ANTHROPIC_API_KEY`        | *(empty = translation off)*   | Create at console.anthropic.com; billed per call     |
| `TRANSLATION_MODEL`        | `claude-opus-5-5`             | e.g. `claude-haiku-5-5` for cheaper/faster           |
| `ANALYTICS_TIMEZONE`       | `UTC`                         | e.g. `America/Sao_Paulo` (day boundaries in charts)  |
| `DOMAIN`                   | *(prod profile only)*         | Public domain for the Caddy HTTPS proxy              |

## Testing & CI/CD

```bash
make test     # pytest (49) + vitest (54)
make lint     # ruff · mypy --strict · eslint · tsc · prettier
```

`.github/workflows/ci.yml` runs on every push/PR: backend (ruff, mypy, pytest + coverage) → frontend (eslint, prettier,
tsc, vitest, build) → advisory dependency audit → **Docker build + smoke test** (boots the whole Compose stack, checks
SPA fallback, API through nginx, no generated-PDF endpoint, and that the admin API rejects anonymous calls) →
publish images to GHCR on `main`/tags. An opt-in `deploy` job (SSH + `docker compose pull`) is enabled with the
repository variable `DEPLOY_ENABLED=true`.

## Deploying to your own domain

`docker compose --profile prod up -d --build` adds a Caddy container that serves your domain over HTTPS with
automatic Let's Encrypt certificates. The full walkthrough — choosing a host (and why Vercel isn't a fit for the
backend), pointing a Namecheap domain at a VPS, backups and troubleshooting — is in **[docs/DEPLOY.md](docs/DEPLOY.md)**
(Portuguese).

## Privacy of the analytics

Page views are recorded by the site's own backend: no cookies, no localStorage ID, no raw IP. A visitor is an HMAC of
IP + User-Agent keyed with a **daily-rotating** salt, so it can't be reversed or linked across days (the same person on
two days counts as two visitors). Only the referrer hostname is kept, only the site's real routes are accepted, and
events older than `ANALYTICS_RETENTION_DAYS` (default 400) are purged at startup.

## Known limitations

- **SQLite + `create_all`**, no migrations. Fine for a personal site; for schema evolution add Alembic, and for
  multiple replicas switch `DATABASE_URL` to Postgres (add a driver such as `psycopg`).
- **Rate limiting is per process.** The image runs a single worker by design; with several replicas rely on the nginx
  limits or move the store to Redis.
- **Admin dashboard is English-only** (the public site is fully localized).
- The home-page behaviour is an interpretation of the brief (3D list, spiral entry, flat hit areas, PJAX transitions),
  not a pixel clone of any existing site.
- Tested in Chromium. Firefox/Safari are not covered by automated tests (the code uses standard CSS 3D transforms,
  `clip-path` and `IntersectionObserver`).
