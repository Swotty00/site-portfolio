# syntax=docker/dockerfile:1.7
# ---------------------------------------------------------------------------------------------
# Backend image: FastAPI. Two stages:
#   builder - resolves and installs Python dependencies into a virtualenv
#   runtime - slim image with only the venv and the app code (pure Python: no system packages)
# ---------------------------------------------------------------------------------------------
ARG PYTHON_VERSION=3.12

FROM python:${PYTHON_VERSION}-slim-bookworm AS builder
ENV PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1
WORKDIR /build
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:${PATH}"

# Only pyproject.toml is copied first, so this (slow) layer is cached until dependencies change.
COPY pyproject.toml ./
RUN python -c "import tomllib; print('\n'.join(tomllib.load(open('pyproject.toml','rb'))['project']['dependencies']))" > requirements.txt \
 && pip install -r requirements.txt


FROM python:${PYTHON_VERSION}-slim-bookworm AS runtime

ENV PATH="/opt/venv/bin:${PATH}" \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    ENVIRONMENT=production \
    DATABASE_URL=sqlite:////data/portfolio.db \
    UPLOAD_DIR=/data/uploads

# Unprivileged user; /data is the only writable location (mount a volume there).
RUN groupadd --system --gid 10001 app \
 && useradd --system --uid 10001 --gid app --home-dir /app --shell /usr/sbin/nologin app \
 && mkdir -p /data /app && chown -R app:app /data /app

COPY --from=builder /opt/venv /opt/venv
WORKDIR /app
COPY --chown=app:app app ./app

USER app
VOLUME ["/data"]
EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8000/api/v1/health', timeout=4).status == 200 else 1)"

# One worker by default: the rate limiter is in-memory and SQLite prefers a single writer.
# Scale with WEB_CONCURRENCY only after moving to Postgres/Redis (see README).
# --proxy-headers makes the client IP come from the reverse proxy (see FORWARDED_ALLOW_IPS).
CMD ["sh", "-c", "exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers ${WEB_CONCURRENCY:-1} --proxy-headers"]
