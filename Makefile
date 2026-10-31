.PHONY: help install dev-api dev-web test lint format build up down

help:           ## List targets
	@grep -E '^[a-z-]+:.*##' $(MAKEFILE_LIST) | sed 's/:.*##/ -/'

install:        ## Install backend (venv) and frontend dependencies
	cd backend && python3 -m venv .venv && . .venv/bin/activate && pip install -e ".[dev]"
	cd frontend && npm ci

dev-api:        ## Run the API with auto-reload on :8000
	cd backend && . .venv/bin/activate && uvicorn app.main:app --reload --port 8000

dev-web:        ## Run the Vite dev server on :5173 (proxies /api to :8000)
	cd frontend && npm run dev

test:           ## Run all tests
	cd backend && . .venv/bin/activate && pytest
	cd frontend && npm test

lint:           ## Lint, type-check and format-check everything
	cd backend && . .venv/bin/activate && ruff check . && ruff format --check . && mypy app
	cd frontend && npm run lint && npm run typecheck && npm run format:check

format:         ## Auto-format everything
	cd backend && . .venv/bin/activate && ruff format . && ruff check --fix .
	cd frontend && npm run format

build:          ## Production build of the frontend bundle
	cd frontend && npm run build

up:             ## Build and start the production stack (needs .env)
	docker compose up --build -d

down:           ## Stop the stack
	docker compose down
