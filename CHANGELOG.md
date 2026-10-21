# Changelog

## Unreleased — 2026-10-21

- Add a server-generated `X-Request-ID` to API responses and include the reference in unexpected-error logs.
- Prevent browser and proxy caching of API responses containing private workspace data.
- Normalize non-finite PostgreSQL decimal values to JSON `null` instead of emitting non-standard JSON numbers.
- Extract ISO telemetry timestamp parsing, normalize offsets to UTC, and reject date-only timestamps.
- Improve backup redaction for quoted credentials, passphrases, and bearer assignments.
- Reject oversized workspace backup imports before per-record validation.
- Recover malformed demo browser state, repair next-ID counters, and retain current-tab changes when storage is blocked or quota-limited.
- Add regression tests for authentication boundaries, timestamp parsing, request IDs, health/readiness behavior, browser persistence, exports, and backup validation.
- Document API contracts, security boundaries, and repeatable local test commands.

## Release notes

ORBIT records project metadata, deployment intent, instance metadata, and submitted telemetry. It does not currently run build jobs or provision cloud resources. GitHub Pages remains browser-demo mode until the API deployment is configured and verified.
