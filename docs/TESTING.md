# ORBIT validation and regression tests

Run commands from the repository root unless a section says otherwise.

## Continuous integration

- `.github/workflows/backend.yml` runs Python compilation, the unit suite, and the PostgreSQL integration suite against an isolated PostgreSQL 16 service on pushes to `main` and pull requests.
- `.github/workflows/pages.yml` runs the frontend tests and builds the GitHub Pages browser demo. A successful static-site build does not prove that the separately hosted API or database is reachable.

## Frontend tests

The frontend uses Node's built-in test runner; no browser test framework is required for the pure utility suites.

    cd frontend
    npm ci
    npm test
    npm run build

The tests cover browser-demo data persistence, project/deployment filters, telemetry time windows and summaries, CSV exports, credential redaction, and workspace-backup validation/restoration. Run one file while iterating:

    node --test src/utils/workspaceExport.test.js
    node --test src/utils/demoApi.test.js
    node --test src/utils/csvExport.security.test.js

## Backend tests

Install the backend requirements and execute the unit suite from backend:

    python -m pip install -r requirements.txt
    python -m compileall -q .
    python -m unittest discover -s tests -v

The isolated helper tests exercise input bounds, signed-token validation, password hashing compatibility, production database configuration, and UTC JSON serialization without requiring a live PostgreSQL connection. Configuration parsing also has focused tests in `tests/test_environment_settings.py`; shared CSV quoting and spreadsheet-formula protection are tested in `frontend/src/utils/csvExport.security.test.js`.

## PostgreSQL integration checks

The CI workflow provisions a disposable PostgreSQL 16 service. Do not point integration tests at a personal or hosted database.

Set the following variables for a local disposable test database before running the unittest command from backend:

- APP_ENV=test
- SECRET_KEY set to a unique throwaway test value
- DB_HOST=127.0.0.1 and DB_PORT=5432
- DB_NAME=orbit_test, DB_USER=postgres, DB_PASSWORD set to the local test password
- ORBIT_RUN_POSTGRES_INTEGRATION=1

The integration suite covers schema bootstrap repeatability, authentication contracts, project ownership, deployments, instance/project relationships, telemetry constraints, and SQL-backed routes. Use a disposable database because setup tests create and clear application tables.

## Safety notes

- Tests must never use the production SECRET_KEY, database URL, or user credentials.
- Keep demo seed data separate from production initialization.
- A green unit test run does not prove the hosted Render service is reachable; use the deployment health endpoint for that separate smoke test.
