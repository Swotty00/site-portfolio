# Portfolio API

FastAPI backend for the portfolio. See the [root README](../README.md) for architecture, security model and deployment.

```bash
python3 -m venv .venv && . .venv/bin/activate
pip install -e ".[dev]"
uvicorn app.main:app --reload       # http://localhost:8000/docs
pytest                              # 49 tests
ruff check . && ruff format --check . && mypy app
```

## Endpoints (`/api/v1`)

| Method | Path                      | Auth | Purpose                                              |
| ------ | ------------------------- | ---- | ---------------------------------------------------- |
| GET    | `/health`                 | –    | Liveness + DB check                                  |
| GET    | `/locales`                | –    | Supported languages                                  |
| GET    | `/projects?lang=`         | –    | Published projects, localized (fallback pt-BR)       |
| GET    | `/projects/{slug}?lang=`  | –    | Detail + cycling `next` / `previous`                 |
| GET    | `/profile?lang=`          | –    | Localized profile                                    |
| GET    | `/resume.pdf?lang=`       | –    | Generated PDF résumé                                 |
| POST   | `/auth/login`             | –    | Returns access token, sets refresh cookie            |
| POST   | `/auth/refresh`           | cookie | Rotates tokens                                     |
| POST   | `/auth/logout`            | cookie | Revokes all tokens for the user                    |
| GET    | `/auth/me`                | Bearer | Current user                                       |
| GET/POST/PATCH/DELETE | `/admin/projects[/{id}]` | Bearer | Project CRUD                       |
| POST   | `/admin/projects/reorder` | Bearer | Set display order                                  |
| GET/PUT | `/admin/profile`         | Bearer | Profile metadata + translations                    |
| POST   | `/admin/uploads`          | Bearer | Image upload (PNG/JPEG/WebP/GIF/AVIF, ≤ 5 MB)      |

PDF generation needs Pango at runtime (`apt install libpango-1.0-0 libpangoft2-1.0-0 libharfbuzz-subset0`); without it
the endpoint answers `503` and the rest of the API keeps working.
