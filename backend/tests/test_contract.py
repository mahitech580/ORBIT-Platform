"""Fast, database-free contract tests for ORBIT's security and JSON primitives."""
import unittest
from datetime import datetime, timezone
from decimal import Decimal

import app as orbit


class PasswordContractTests(unittest.TestCase):
    def test_new_password_hash_round_trip(self):
        value = orbit.hash_password("a-unique-test-password")
        self.assertNotEqual(value, "a-unique-test-password")
        self.assertTrue(orbit.verify_password("a-unique-test-password", value))
        self.assertFalse(orbit.verify_password("incorrect", value))

    def test_legacy_sha256_hash_can_be_verified(self):
        import hashlib
        digest = hashlib.sha256(b"legacy-password").hexdigest()
        self.assertTrue(orbit.verify_password("legacy-password", digest))
        self.assertFalse(orbit.verify_password("wrong-password", digest))

    def test_invalid_hash_does_not_authenticate(self):
        self.assertFalse(orbit.verify_password("anything", "$2b$10$not-a-real-hash"))


class SerializationContractTests(unittest.TestCase):
    def test_decimal_and_datetime_values_are_json_friendly(self):
        timestamp = datetime(2026, 10, 12, 12, 0, tzinfo=timezone.utc)
        result = orbit.json_safe({
            "cpu": Decimal("12.50"),
            "timestamp": timestamp,
            "nested": [Decimal("2.00")],
        })
        self.assertEqual(result["cpu"], 12.5)
        self.assertEqual(result["timestamp"], "2026-10-12T12:00:00+00:00")
        self.assertEqual(result["nested"], [2.0])


class DatabaseConnectionContractTests(unittest.TestCase):
    def test_render_database_url_uses_production_tls(self):
        from unittest.mock import patch
        with patch.object(orbit, "DATABASE_URL", "postgresql://user:pass@example.test/orbit"), \
             patch.object(orbit, "IS_PRODUCTION", True), \
             patch.object(orbit.psycopg2, "connect") as connect:
            orbit.get_db()
        connect.assert_called_once_with(
            "postgresql://user:pass@example.test/orbit",
            connect_timeout=orbit.DATABASE["connect_timeout"],
            sslmode="require",
        )

    def test_explicit_sslmode_overrides_production_default(self):
        from unittest.mock import patch
        with patch.object(orbit, "DATABASE_URL", "postgresql://user:pass@example.test/orbit"), \
             patch.object(orbit, "IS_PRODUCTION", True), \
             patch.dict(orbit.os.environ, {"DB_SSLMODE": "verify-full"}), \
             patch.object(orbit.psycopg2, "connect") as connect:
            orbit.get_db()
        self.assertEqual(connect.call_args.kwargs["sslmode"], "verify-full")


class HealthContractTests(unittest.TestCase):
    def test_health_reports_database_outage(self):
        original = orbit.get_db

        def fail_connection():
            raise RuntimeError("simulated connection failure")

        orbit.app.config["TESTING"] = True
        orbit.get_db = fail_connection
        try:
            with orbit.app.app_context():
                response, status_code = orbit.health()
            self.assertEqual(status_code, 503)
            self.assertEqual(response.get_json()["database"], "unavailable")
        finally:
            orbit.get_db = original

class MetricsIngestionContractTests(unittest.TestCase):
    def setUp(self):
        self.client = orbit.app.test_client()
        self.original_owned_project = orbit.owned_project
        self.original_db_execute = orbit.db_execute
        self.original_testing = orbit.app.config.get("TESTING", False)
        self.calls = []
        self.lookups = []
        orbit.app.config["TESTING"] = True

        def owned_project(project_id, user_id):
            self.lookups.append((project_id, user_id))
            return {"id": project_id, "name": "Contract project"} if project_id == 12 else None

        def db_execute(query, params=(), returning=False):
            self.calls.append((query, params, returning))
            if "INSERT INTO metrics" not in query or not returning:
                return []
            timestamp = params[6].isoformat() if params[6] else "2026-10-14T09:00:00"
            return [{
                "id": 91, "project_id": params[0], "cpu_usage": params[1],
                "memory_usage": params[2], "requests_total": params[3],
                "errors_total": params[4], "response_time_ms": params[5],
                "timestamp": timestamp
            }]

        orbit.owned_project = owned_project
        orbit.db_execute = db_execute
        self.token = orbit.issue_token({"id": 7, "email": "metrics@example.test"})

    def tearDown(self):
        orbit.owned_project = self.original_owned_project
        orbit.db_execute = self.original_db_execute
        orbit.app.config["TESTING"] = self.original_testing

    def post_metric(self, payload, authenticated=True):
        headers = {"Content-Type": "application/json"}
        if authenticated:
            headers["Authorization"] = "Bearer " + self.token
        return self.client.post("/api/metrics/12", json=payload, headers=headers)

    def test_ingestion_requires_bearer_token(self):
        response = self.post_metric({"cpu_usage": 12.5}, authenticated=False)
        self.assertEqual(response.status_code, 401)
        self.assertEqual(self.calls, [])

    def test_inserts_owned_metric_and_converts_timestamp_to_utc(self):
        response = self.post_metric({
            "cpu_usage": 28.5, "memory_usage": 768, "requests_total": 1200,
            "errors_total": 4, "response_time_ms": 125.5,
            "timestamp": "2026-10-14T08:00:00+05:30"
        })
        self.assertEqual(response.status_code, 201, response.get_json())
        body = response.get_json()
        self.assertEqual(body["metric"]["project_id"], 12)
        self.assertEqual(body["metric"]["timestamp"], "2026-10-14T02:30:00")
        self.assertEqual(self.lookups, [(12, 7)])
        query, params, returning = self.calls[0]
        self.assertIn("INSERT INTO metrics", query)
        self.assertTrue(returning)
        self.assertEqual(params[:6], (12, 28.5, 768, 1200, 4, 125.5))

    def test_rejects_invalid_measurements_without_writing(self):
        invalid_payloads = [
            {"cpu_usage": 101}, {"cpu_usage": -1}, {"cpu_usage": float("nan")},
            {"memory_usage": 1.2}, {"requests_total": -1},
            {"requests_total": 1, "errors_total": 2}, {},
            {"cpu_usage": 12, "timestamp": "not-a-timestamp"}
        ]
        for payload in invalid_payloads:
            with self.subTest(payload=payload):
                before = len(self.calls)
                response = self.post_metric(payload)
                self.assertEqual(response.status_code, 400, (payload, response.get_json()))
                self.assertEqual(len(self.calls), before)

    def test_unowned_project_returns_404_without_writing(self):
        response = self.client.post("/api/metrics/99", json={"cpu_usage": 10},
            headers={"Authorization": "Bearer " + self.token})
        self.assertEqual(response.status_code, 404)
        self.assertEqual(self.calls, [])

    def test_metadata_advertises_ingestion_not_cloud_deployment(self):
        response = self.client.get("/api/meta")
        self.assertEqual(response.status_code, 200)
        capabilities = response.get_json()["capabilities"]
        self.assertTrue(capabilities["telemetry_ingestion"])
        self.assertFalse(capabilities["build_execution"])
        self.assertFalse(capabilities["cloud_resource_provisioning"])


if __name__ == "__main__":
    unittest.main()
