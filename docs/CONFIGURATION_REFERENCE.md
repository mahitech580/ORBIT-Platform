# ORBIT configuration reference

All settings below are read when the Flask application module is imported. After changing environment variables, restart the API process so the new values are applied.

## Database

| Setting | Default outside production | Accepted values |
| --- | --- | --- |
| `DATABASE_URL` | Empty | PostgreSQL connection URL; takes precedence over individual `DB_*` settings |
| `DB_HOST` | `localhost` | Database host name or address |
| `DB_NAME` | `orbit` | Database name |
| `DB_USER` | `postgres` | Database user |
| `DB_PASSWORD` | `password` | Local-development password only; set a real value in any shared environment |
| `DB_PORT` | `5432` | ASCII decimal integer from 1 through 65535 |
| `DB_CONNECT_TIMEOUT` | `5` seconds | Integer from 1 through 300 seconds |
| `DB_SSLMODE` | Driver defaults locally; `require` for production URLs | Explicit PostgreSQL SSL mode override |

Invalid non-empty `DB_PORT` and `DB_CONNECT_TIMEOUT` values fail application startup with a setting-specific error. The parser rejects signs, decimals, non-ASCII digits, booleans, and float coercion instead of silently changing a value.

In production, configure either `DATABASE_URL` or all of `DB_HOST`, `DB_NAME`, `DB_USER`, and `DB_PASSWORD`. Do not rely on local-development fallbacks.

## Application and authentication

| Setting | Behavior |
| --- | --- |
| `APP_ENV` | Set to `production` or `prod` to enable production checks |
| `SECRET_KEY` | Required in production; use a long random secret and never commit it |
| `ENABLE_DEMO_AUTH` | Boolean flag accepting `true`, `false`, `yes`, `no`, `on`, `off`, `1`, or `0` |
| `CORS_ORIGINS` | Comma-separated list of allowed browser origins; the published GitHub Pages origin is retained by the current app configuration |
| `FLASK_DEBUG` | Local development only; do not enable the debugger in a public deployment |

If `ENABLE_DEMO_AUTH` is unset or blank, the default is enabled outside production and disabled in production. An unknown non-empty value fails startup so a typo cannot silently change the deployment's authentication mode.

## Safe operating practices

- Keep credentials in the hosting platform's secret/environment settings rather than source control.
- Use a disposable PostgreSQL database for integration tests; the integration suite truncates application tables.
- Disable demo authentication and set a strong `SECRET_KEY` before public deployment.
- Re-run the backend unit and PostgreSQL integration workflow after changing database or authentication configuration.
- A passing build does not prove that the deployed database is reachable; use `/health` for runtime readiness.
