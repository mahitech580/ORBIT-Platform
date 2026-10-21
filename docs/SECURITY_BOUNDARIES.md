# Security boundaries and operational checklist

## Current protections

- Production startup requires an explicitly configured SECRET_KEY and a database URL or complete DB_* connection settings.
- JWTs use HS256, include an expiry, and are validated as positive integer user identifiers. Invalid/expired sessions return 401.
- Passwords for registered users use Werkzeug PBKDF2-SHA256 hashing. A successful login upgrades compatible legacy SHA-256 hashes.
- API reads and writes are scoped through ownership joins. Instance records must reference a deployment belonging to the same project.
- Request bodies are capped at 1 MiB. IDs, text fields, telemetry values, and supported project domains are validated before database writes.
- API responses set baseline browser-security headers. CORS is limited to configured origins with the published ORBIT Pages origin retained.
- Backup exports drop credential-like field names and redact known secret formats from free text. CSV builders neutralize formula-leading cells.

## Important limitations

- The GitHub Pages build is browser-demo mode. Its local-storage token is a demo identifier, not a server-authenticated session; demo data is stored in the visitor's browser.
- The API does not execute deployment jobs or provision infrastructure. Deployment rows are tracking records only.
- There is no distributed login rate limiter, external identity provider, secrets manager, or cloud provider adapter in this repository.
- The temporary free PostgreSQL instance documented in README.md is not a production data store and may have no backups.
- Data in project descriptions and exported records can remain sensitive even after credential-like values are removed.

## Production checklist

1. Set APP_ENV=production, a unique high-entropy SECRET_KEY, ENABLE_DEMO_AUTH=false, a private DATABASE_URL, and explicit CORS_ORIGINS.
2. Use a managed database plan with backups, retention, access controls, and a tested recovery procedure.
3. Keep secrets out of source, sample data, issue comments, logs, and workspace exports.
4. Apply the Render Blueprint and verify GET /health from the deployed service before switching Pages out of demo mode.
5. Send actual telemetry only from authenticated, authorized producers; define source identity, rate limits, retention, and timestamp policy before opening ingestion broadly.
6. Review security-relevant dependency updates and run backend unit/integration plus frontend utility/build tests before release.
7. Confirm the UI describes demo/local-only behavior correctly and does not imply that recording a deployment performs a real cloud deployment.