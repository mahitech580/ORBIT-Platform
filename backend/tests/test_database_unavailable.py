"""Database connection failures must return service-unavailable responses with correlation IDs."""
import unittest
from unittest.mock import patch

import app as orbit


class DatabaseUnavailableTests(unittest.TestCase):
    def setUp(self):
        self.client = orbit.app.test_client()
        self.token = orbit.issue_token({"id": 7, "email": "database@example.test"})
        self.auth = {"Authorization": "Bearer " + self.token}

    def test_protected_workspace_route_returns_503_for_connection_outage(self):
        with patch.object(orbit, "db_fetch_all", side_effect=orbit.psycopg2.OperationalError("database offline")):
            with self.assertLogs(orbit.app.logger, level="ERROR") as captured:
                response = self.client.get("/api/projects", headers=self.auth)

        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.get_json()["status"], 503)
        self.assertEqual(response.get_json()["error"], "The database is temporarily unavailable.")
        self.assertEqual(response.headers.get("Cache-Control"), "no-store")
        self.assertIn(response.headers["X-Request-ID"], "\n".join(captured.output))

    def test_registration_database_failure_log_contains_request_id(self):
        with patch.object(orbit, "get_db", side_effect=orbit.psycopg2.OperationalError("database offline")):
            with self.assertLogs(orbit.app.logger, level="ERROR") as captured:
                response = self.client.post("/api/auth/register", json={
                    "email": "new@example.test",
                    "username": "new_member",
                    "password": "correct-horse-battery-42"
                })

        self.assertEqual(response.status_code, 503)
        self.assertIn(response.headers["X-Request-ID"], "\n".join(captured.output))

    def test_login_database_failure_log_contains_request_id(self):
        with patch.object(orbit, "db_fetch_all", side_effect=orbit.psycopg2.OperationalError("database offline")):
            with self.assertLogs(orbit.app.logger, level="ERROR") as captured:
                response = self.client.post("/api/auth/login", json={
                    "email": "existing@example.test",
                    "password": "correct-horse-battery-42"
                })

        self.assertEqual(response.status_code, 503)
        self.assertIn(response.headers["X-Request-ID"], "\n".join(captured.output))


if __name__ == "__main__":
    unittest.main()
