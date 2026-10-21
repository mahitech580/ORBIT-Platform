"""Health endpoints report database readiness rather than assuming availability."""
import unittest
from unittest.mock import patch

import app as orbit


class HealthyCursor:
    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_value, traceback):
        return False

    def execute(self, query, params=()):
        self.query = query

    def fetchone(self):
        return (1,)


class HealthyConnection:
    def cursor(self, *args, **kwargs):
        return HealthyCursor()

    def close(self):
        pass


class HealthEndpointTests(unittest.TestCase):
    def setUp(self):
        self.client = orbit.app.test_client()

    def test_health_reports_connected_database_when_select_one_succeeds(self):
        with patch.object(orbit, "get_db", return_value=HealthyConnection()):
            response = self.client.get("/health")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()["status"], "ok")
        self.assertEqual(response.get_json()["database"], "connected")
        self.assertIn("version", response.get_json())

    def test_health_reports_service_degraded_when_database_is_unavailable(self):
        with patch.object(orbit, "get_db", side_effect=RuntimeError("database offline")):
            response = self.client.get("/health")
        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.get_json()["status"], "degraded")
        self.assertEqual(response.get_json()["database"], "unavailable")

    def test_api_health_alias_has_the_same_readiness_contract(self):
        with patch.object(orbit, "get_db", return_value=HealthyConnection()):
            response = self.client.get("/api/health")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()["database"], "connected")
