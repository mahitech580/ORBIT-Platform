# ORBIT Platform 2.0

ORBIT is a project operations workspace built with React, Vite, Flask, and PostgreSQL. Version 2.0 focuses on safer account handling, user-scoped project data, reliable local configuration, usable project management, and honest deployment-status reporting.

## What it does

- Account registration and sign-in with signed, expiring JWTs.
- Private owner-scoped team and project inventory.
- Create, inspect, update, archive, and delete projects.
- Record deployments with project, version, branch, and status history.
- View recorded CPU, memory, request, error, and response-time measurements.
- Export a versioned JSON workspace backup for projects, deployments, teams, and instances, with credential-like fields removed.
- Export the currently filtered project inventory or deployment history as spreadsheet-safe UTF-8 CSV, with formula-leading cells neutralized.
- Export selected-project telemetry measurements to CSV with explicit units and spreadsheet formula protection.
- Export teams and instance metadata to CSV with spreadsheet formula protection.
- Search teams by name, description, or owner and search instances by name, project, type, status, or deployment ID; CSV exports follow the current filtered list. Team sorting supports name, creation time, or owner; instance sorting supports name, creation time, or status. Instance records can additionally be filtered by status, project, and type. The Metrics view supports 24-hour, 7-day, 30-day, and all-returned time-window filters; CSV downloads match the visible range.
- Health endpoint that checks the PostgreSQL connection instead of assuming it is available.
- Responsive operations interface with search and filtering.
- Repeatable database bootstrap schema and a documented compatibility audit.

## Important capability boundary

ORBIT 2.0 records deployment intent and status. It does **not** build source code, execute deployment jobs, provision cloud infrastructure, or collect live telemetry by itself. Those capabilities require a worker/runner, a cloud-provider adapter, and a metrics ingestion pipeline, which are not in this repository yet. The interface calls this out instead of implying a recorded row is a real cloud deployment.

## Technology

- Frontend: React 18, Vite, Axios
- Backend: Python 3.10+, Flask, PyJWT, psycopg2, Werkzeug password hashing
- Database: PostgreSQL 14+
- API: JSON over HTTP with Bearer-token authentication

## Hosted application

The [ORBIT Platform frontend](https://mahitech580.github.io/ORBIT-Platform/) is published on GitHub Pages and calls the Flask API hosted separately on Render. The Pages build uses `VITE_DEMO_MODE=false`, so project, team, deployment, instance, and metrics screens use the server API rather than silently falling back to browser-local demo data.

- API base: `https://orbit-platform-api-mahitech580.onrender.com/api`
- Health: `https://orbit-platform-api-mahitech580.onrender.com/health`
- Registration and sign-in create/use accounts in the hosted PostgreSQL database.
- Deployment records are tracking records only. ORBIT does not build source code or provision cloud infrastructure, and sample-looking metrics are not live telemetry unless ingested from a real collector.

Render's free web service may spin down when idle and take time to wake. **Render Free PostgreSQL expires 30 days after creation and does not include backups**. Treat the free database as a temporary prototype environment; upgrade it or arrange exports before storing data you need to keep. See [Render's free-instance limitations](https://render.com/docs/free).

## Local setup

Prerequisites: Python 3.10+, Node.js 18+, npm, and PostgreSQL 14+.

1. Create a PostgreSQL database named orbit.
2. Copy .env.example to .env and set your local database password and a unique development secret.
3. Create the tables and indexes with `psql -U postgres -d orbit -f database/schema.sql`.
4. For the optional local demo account and sample projects, run `psql -U postgres -d orbit -f database/seed_demo.sql`. Do not seed demo records into a public production database.
5. Install backend packages with `pip install -r backend/requirements.txt`.
6. Start the API locally with `python backend/app.py` from the repository root.
7. In a second terminal, install frontend packages from `frontend` with `npm install`, then run `npm run dev`.
8. Open http://localhost:3000.

The backend uses the variables in .env when python-dotenv is installed, as listed in requirements.txt. The frontend calls /api by default and uses the Vite proxy in development. Set VITE_API_URL to an absolute API base only when the frontend and API are intentionally hosted separately.

## Deploying the backend to Render

The repository can run as a Render Python web service in the same Singapore region as its PostgreSQL database. Configure these settings when connecting the repository:

- Build command: `pip install -r backend/requirements.txt`
- Start command: `python backend/init_db.py && gunicorn --chdir backend --bind 0.0.0.0:$PORT --workers 1 --threads 8 --timeout 60 app:app`
- Health check path: `/health`
- Environment: `APP_ENV=production`, `ENABLE_DEMO_AUTH=false`, `CORS_ORIGINS=https://mahitech580.github.io`, `DB_CONNECT_TIMEOUT=5`, and a strong random `SECRET_KEY`.
- Set `DATABASE_URL` to the private connection string from the Render PostgreSQL instance. The app prefers `DATABASE_URL`; it enforces TLS for production connections unless `DB_SSLMODE` explicitly overrides it.
- At service startup, `backend/init_db.py` retries temporary connection failures and idempotently creates tables and indexes from `database/schema.sql`. Demo seed data is kept in the separate `database/seed_demo.sql` file and is not automatically inserted in production.
- The GitHub Pages action builds the frontend with `VITE_API_URL` and `VITE_HEALTH_URL` pointing at the hosted service and `VITE_DEMO_MODE=false`.

If the service URL changes, update both Vite variables in `.github/workflows/pages.yml` before publishing the frontend.

## Local demo account

When APP_ENV is not production and ENABLE_DEMO_AUTH is enabled, use:

- Email: demo@orbit.local
- Password: demo123

The seed schema includes this account and sample projects. Demo authentication is a local-development convenience. Disable it in production by setting APP_ENV=production and ENABLE_DEMO_AUTH=false, and configure a strong, unique SECRET_KEY.

## Configuration

- APP_ENV: development or production. Production mode requires SECRET_KEY and disables demo sign-in by default.
- SECRET_KEY: signing key for JWTs. Never commit a production value.
- ENABLE_DEMO_AUTH: enables the fixed demo credentials; use false outside local development.
- DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD: PostgreSQL connection settings.
- DB_CONNECT_TIMEOUT: connection timeout in seconds.
- DB_SSLMODE: optional PostgreSQL SSL mode.
- CORS_ORIGINS: comma-separated list of browser origins allowed to call the API.
- FLASK_DEBUG: set to 1 only for local development.
- FLASK_HOST and PORT: local server bind address and port.
- VITE_API_URL: optional frontend API base; defaults to /api.

The .env.example file is a starter configuration, not a production secret store.

## Workspace backups

Use **Settings → Workspace backup → Export JSON** to download the records currently loaded by the workspace. The versioned backup includes project, deployment, team, and instance records with a count summary. Fields whose names resemble credentials (passwords, tokens, API keys, cookies, and similar values) are omitted recursively. Authentication state is never passed to the exporter. Treat the file as operational data even after filtering, because project descriptions and execution metadata may still be sensitive.

## Workspace backups

Use **Settings → Workspace backup → Export JSON** to download the currently loaded project, deployment, team and instance records. In browser-demo mode, **Restore browser demo → Choose JSON file** validates the format and record relationships before asking for confirmation. Restore replaces the current demo user's workspace records and remaps IDs so references remain consistent. Metrics are not included, and restore is intentionally unavailable for server-backed accounts; the feature does not write imported data into a production database. Credential-like fields are omitted recursively, but operational descriptions and generated metadata may still be sensitive.

## API overview

Public endpoints:
- GET /health and GET /api/health — app version and actual PostgreSQL connectivity/readiness.
- GET /api/meta — capability declaration and version.
- POST /api/auth/register — create a user and private default team.
- POST /api/auth/login — issue a JWT.

Bearer-token endpoints:
- GET /api/auth/me — current database account.
- GET /api/projects — list projects in teams owned by the signed-in user.
- POST /api/projects — create a project in an owned team.
- GET, PUT, DELETE /api/projects/:id — read and manage an owned project.
- POST /api/projects/:id/deploy — record a deployment request.
- GET /api/deployments and GET /api/deployments/:id — owned deployment history.
- GET /api/metrics/:project_id — last 100 recorded measurements and summary values.
- POST /api/metrics/:project_id — validate and store measurements from an authenticated user who owns the project.
- GET, POST /api/instances — list or record workspace instances associated with a project.
- GET, POST /api/teams — list or create teams owned by the signed-in user.

Responses use JSON. Expected validation errors return an explanatory 4xx response; unexpected server errors return a generic message and are logged server-side.

## Telemetry ingestion

The API accepts an authenticated `POST /api/metrics/:project_id` request and inserts accepted measurements into the PostgreSQL `metrics` table. The Metrics page refreshes every 15, 30, or 60 seconds while visible, and when the tab regains focus. This displays fresh database records; it does not create observations by itself. Connect an app/monitoring agent to send actual readings. The GitHub Pages app calls the Render API, while browser-demo mode continues to use sample data.

See [`docs/TELEMETRY_INGESTION.md`](docs/TELEMETRY_INGESTION.md) for a working curl example, field constraints, and expected HTTP responses.

## Security notes

- Production startup fails when SECRET_KEY is missing.
- Passwords for registered accounts use Werkzeug PBKDF2-SHA256 hashing.
- Existing 64-character SHA-256 password hashes are verified for compatibility and re-hashed after a successful login.
- API routes require a valid Bearer token.
- Project, deployment, team, metric, and instance reads are scoped to the requesting user’s owned teams.
- CORS defaults to local development origins and can be configured explicitly.
- Database errors and stack traces are not returned to the browser.
- The sample login is meant for local development only.

## Compatibility and investigation notes

See docs/REVERSE_ENGINEERING.md for the observed 1.x behavior, issues confirmed from source, compatibility decisions, and the manual verification matrix. The changes preserve the existing principal screen concepts and response keys while adding clearer validation, private project scoping, session recovery, and an explicit boundary around cloud operations.

## Validation

The GitHub Actions workflow runs the database-free backend contract tests and builds the frontend production bundle. For local checks, install the backend dependencies, then run the following from the repository root:

    python -m compileall -q backend
    cd backend
    python -m unittest discover -s tests -v
    cd ../frontend
    npm ci
    npm run build

Database-free backend tests now cover password hashing, JSON serialization, production database TLS configuration, database-health failure behavior, and authenticated metric-ingestion validation. A real PostgreSQL integration smoke test still needs to run against the hosted database.

## Roadmap

1. Add a deployment runner interface with dry-run and queued-job states.
2. Integrate a provider adapter only after credentials, permissions, and resource cleanup are defined.
3. Connect a monitoring agent to the authenticated metrics-ingestion endpoint and define retention policies.
4. Add unit/integration tests against a disposable PostgreSQL database.
5. Add CI checks for Python linting, frontend builds, migration validation, and API regression tests.

## License

No license file was present in the inspected repository at the time of this release. Add a license before redistributing ORBIT if you intend to grant reuse rights.
