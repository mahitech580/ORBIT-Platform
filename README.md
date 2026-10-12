# ORBIT Platform 2.0

ORBIT is a project operations workspace built with React, Vite, Flask, and PostgreSQL. Version 2.0 focuses on safer account handling, user-scoped project data, reliable local configuration, usable project management, and honest deployment-status reporting.

## What it does

- Account registration and sign-in with signed, expiring JWTs.
- Private owner-scoped team and project inventory.
- Create, inspect, update, archive, and delete projects.
- Record deployments with project, version, branch, and status history.
- View recorded CPU, memory, request, error, and response-time measurements.
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

## Local setup

Prerequisites: Python 3.10+, Node.js 18+, npm, and PostgreSQL 14+.

1. Create a PostgreSQL database named orbit.
2. Copy .env.example to .env and set your local database password and development secret.
3. Run the schema against the database using psql -U postgres -d orbit -f database/schema.sql.
4. Install backend packages using pip install -r backend/requirements.txt.
5. Start the backend from the backend directory with python app.py.
6. In a second terminal, install frontend packages from the frontend directory with npm install, then run npm run dev.
7. Open http://localhost:3000.

The backend uses the variables in .env when python-dotenv is installed, as listed in requirements.txt. The frontend calls /api by default and uses the Vite proxy in development. Set VITE_API_URL to an absolute API base only when the frontend and API are intentionally hosted separately.

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

## API overview

Public endpoints:
- GET /health — app version and actual database readiness.
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
- GET /api/metrics/:project_id — last 100 recorded measurements and safe summary values.
- GET, POST /api/instances — list or record workspace instances associated with a project.
- GET, POST /api/teams — list or create teams owned by the signed-in user.

Responses use JSON. Expected validation errors return an explanatory 4xx response; unexpected server errors return a generic message and are logged server-side.

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

## Roadmap

1. Add a deployment runner interface with dry-run and queued-job states.
2. Integrate a provider adapter only after credentials, permissions, and resource cleanup are defined.
3. Add a metrics ingestion endpoint or agent with source timestamps and retention.
4. Add unit/integration tests against a disposable PostgreSQL database.
5. Add CI checks for Python linting, frontend builds, migration validation, and API regression tests.

## License

No license file was present in the inspected repository at the time of this release. Add a license before redistributing ORBIT if you intend to grant reuse rights.
