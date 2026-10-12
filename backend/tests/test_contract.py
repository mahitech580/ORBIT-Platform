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


if __name__ == "__main__":
    unittest.main()
