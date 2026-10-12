# ORBIT compatibility audit and 2.0 behavior map

Audit target: ORBIT-Platform, default branch main, source inspected on 2026-10-12. The repository contains a React/Vite web client, Flask JSON API, and PostgreSQL schema. It contains no native executable or mobile client, so binary reverse engineering is not applicable to this target.

## Reconstructed component map

- frontend/src/App.jsx owns the selected screen, token storage, API calls, projects, deployments, and top-level error/loading state.
- frontend/src/components/Navigation.jsx switches between Dashboard, Projects, Deployments, and Metrics.
- frontend/src/pages/Login.jsx performs sign-in.
- frontend/src/pages/Projects.jsx creates and deletes projects; its original View button did not have an action.
- frontend/src/pages/Deployments.jsx creates deployment records and renders a timeline.
- frontend/src/pages/Metrics.jsx fetches the latest measurement rows for a selected project.
- backend/app.py implements the HTTP endpoints, JWT verification, SQL access, and deployment-record insert.
- database/schema.sql defines users, teams, projects, deployments, instances, metrics, and logs.
- frontend/vite.config.js defines the local development proxy; the original API client bypassed that proxy by using an absolute localhost URL.

## Observed 1.x behavior and concrete defects

1. The React API base was hard-coded to http://localhost:5000/api. That prevents a normal same-origin deployment from using the existing Vite /api proxy.
2. After sign-in, the original client immediately requested projects and deployments through an Axios instance captured before the token state updated. Its Authorization header could be stale on those first requests.
3. A persisted token survived refresh, but initial workspace data was not reloaded and the user object was not restored from storage.
4. Login had a fixed demo-only path. Registration wrote SHA-256 password hashes, but the normal login path did not query registered users. The seed hash was a placeholder bcrypt-looking string rather than a usable password hash.
5. All authenticated users could query or mutate project data by ID. SQL statements were parameterized, but access control did not consistently scope resources to the requesting user.
6. The health endpoint returned database=Connected without opening a connection or executing a query.
7. Metric aggregation divided by the count of non-null CPU or memory values without guarding for a zero count. Numeric database values could also include Decimal objects that do not consistently serialize as JSON.
8. The Projects View button was inert. Editing/searching/filtering were not implemented in the UI despite the update endpoint being present.
9. Deployment creation inserted an in-progress row. There was no worker, build execution, cloud SDK, task queue, or provider adapter to complete a real infrastructure deployment.
10. Metrics displayed empty database rows as a lack of data; there was no ingestion service collecting live telemetry.
11. The backend used a predictable fallback JWT secret, permissive CORS, and debug mode bound to all interfaces by default.

## 2.0 compatibility decisions

- Keep the existing major screen concepts and primary API paths, including GET/POST projects, project detail updates/deletes, deployment record creation, deployment reads, metrics, teams, and instances.
- Keep the existing token key for locally stored JWT compatibility and continue accepting the Bearer-token header.
- Keep core JSON keys such as projects, deployments, metrics, summary, success, message, and error.
- Make API URL configurable, defaulting to the relative /api path so the development proxy works.
- Load workspace data after the token has been applied to the persistent Axios client; clear invalid persisted sessions.
- Add registration that returns a usable token and creates the user's default team atomically.
- Hash new passwords with Werkzeug PBKDF2-SHA256; recognize legacy 64-character SHA-256 values and re-hash after successful authentication.
- Scope project and dependent-resource operations to teams owned by the authenticated user.
- Validate request shapes, lengths, runtimes, status values, and IDs before SQL writes.
- Make the health check test the database and return 503 when PostgreSQL is unavailable.
- Normalize Decimal and date/time values before JSON serialization and guard empty metric aggregates.
- Make project Details/Edit actions real and add search/status/runtime filters.
- Label deployment creation as record tracking rather than cloud provisioning. The existing repository did not contain the infrastructure needed to make claims of actual deployment execution.
- Keep the schema backward-compatible with current table columns and use IF NOT EXISTS for repeatable local bootstrap. Existing databases should still be backed up before schema changes.

## Manual verification matrix

These are test cases to run locally; they are not claimed as executed in this environment.

| Area | Procedure | Expected result |
| --- | --- | --- |
| Local health | Start API with PostgreSQL reachable; request GET /health | HTTP 200, database reports connected |
| Database outage | Stop PostgreSQL; request GET /health | HTTP 503, database reports unavailable |
| Demo auth | In development, sign in using the documented demo credentials | Token and demo user returned |
| Registration | Register a unique email and username with an 8+ character password | HTTP 201, token returned, default team created |
| Duplicate account | Register an existing email or username | HTTP 409, no stack trace returned |
| Project scope | Sign in as two users and query each user's project list | Each user sees only projects in teams they own |
| Project CRUD | Create, inspect, edit runtime/status, search, filter, then delete a project | API and visible inventory stay consistent |
| Deployment record | Record a version and branch for an owned project | Record appears in history; UI says no real cloud provisioning occurs |
| Metrics without rows | Request metrics for a project with no measurements | Empty metrics array and zero-valued summary, no division error |
| Expired token | Use an expired or malformed Bearer token | HTTP 401 and client returns to sign-in |
| Production config | Start with APP_ENV=production and no SECRET_KEY | Startup stops with an explicit configuration error |
| Frontend build | Run npm install then npm run build in frontend | Vite creates the production bundle without compile errors |
