# ORBIT telemetry ingestion

The API persists measurements to PostgreSQL in the `metrics` table. The Metrics page polls the selected project's latest records every 15, 30, or 60 seconds while visible (based on Settings) and refreshes on tab focus.

## Send real measurements

Register/sign in to ORBIT and use the returned JWT. The authenticated account must own the project ID supplied in the URL.

```bash
export ORBIT_API_URL="https://orbit-platform-api-mahitech580.onrender.com"
export ORBIT_TOKEN="YOUR_JWT"
export ORBIT_PROJECT_ID="YOUR_OWNED_PROJECT_ID"

curl --fail-with-body --request POST "$ORBIT_API_URL/api/metrics/$ORBIT_PROJECT_ID" --header "Authorization: Bearer $ORBIT_TOKEN" --header "Content-Type: application/json" --data '{"cpu_usage":28.5,"memory_usage":768,"requests_total":1200,"errors_total":4,"response_time_ms":125.5,"timestamp":"2026-10-14T08:00:00Z"}'
```

The numbers are only an example payload. Replace them with readings from your own application or monitoring agent. Fields are optional, but send at least one of `cpu_usage`, `memory_usage`, `requests_total`, `errors_total`, or `response_time_ms`.

- `cpu_usage`: finite numeric percentage from 0 through 100.
- `memory_usage`: non-negative integer megabytes.
- `requests_total` and `errors_total`: non-negative integers. If both are supplied, errors cannot exceed requests.
- `response_time_ms`: non-negative finite milliseconds within the SQL column's numeric range.
- `timestamp`: optional ISO-8601 time. Offsets are normalized to UTC before storage; omit it to use the database insertion time.

A successful insert returns HTTP 201 and the stored row. Invalid payloads return 400; missing or invalid Bearer auth returns 401; unknown or unowned projects return 404; database write errors return 503.

## Important boundary

ORBIT stores the measurements that a trusted client submits; it does not collect metrics from project runtimes automatically. No fake readings are created by the ingestion endpoint. GitHub Pages sample data remains separate from the server-backed API.
