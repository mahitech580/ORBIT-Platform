# Contributing to ORBIT Platform

## Development workflow

1. Create a focused branch for review unless a maintainer explicitly asks for direct commits to `main`.
2. Keep changes scoped to one behavior or a tightly related group.
3. Add or update a regression test when fixing a bug.
4. Update docs for user-visible behavior, route contracts, configuration, or deployment changes.
5. Run the relevant checks before requesting review.

## Local validation

Frontend, from `frontend/`:

    npm ci
    npm test
    npm run build

Backend, from `backend/`:

    python -m pip install -r requirements.txt
    python -m compileall -q .
    python -m unittest discover -s tests -v

Run PostgreSQL integration tests only against a disposable database. Never point tests at a live user or production database.

## Design principles

- Preserve owner-scoped access and validate request data at the API boundary.
- Keep demo-mode limitations visible; local storage is not a hosted database.
- Export only intended workspace records and redact credential-like material.
- Do not imply that deployment records execute cloud deployments.
- Prefer focused, reviewed commits over large unrelated changes.
