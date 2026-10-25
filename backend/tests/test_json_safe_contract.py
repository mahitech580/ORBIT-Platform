"""End-to-end contract for recursively normalized JSON response payloads."""
import json
import unittest
from datetime import date, datetime, timezone
from decimal import Decimal

import app as orbit


class JsonSafeContractTests(unittest.TestCase):
    def test_mixed_database_values_produce_strict_json_payload(self):
        payload = {
            "money": Decimal("12.50"),
            "date": date(2026, 10, 25),
            "created_at": datetime(2026, 10, 25, 12, 30, tzinfo=timezone.utc),
            "values": [Decimal("Infinity"), {"amount": Decimal("2.75")}],
        }
        normalized = orbit.json_safe(payload)
        encoded = json.dumps(normalized, allow_nan=False)
        decoded = json.loads(encoded)
        self.assertEqual(decoded["money"], 12.5)
        self.assertEqual(decoded["date"], "2026-10-25")
        self.assertEqual(decoded["created_at"], "2026-10-25T12:30:00+00:00")
        self.assertIsNone(decoded["values"][0])
        self.assertEqual(decoded["values"][1]["amount"], 2.75)

    def test_json_safe_regression_case_001(self):
        value = "case_001"
        normalized = orbit.json_safe(value)
        encoded = json.dumps(normalized, allow_nan=False)
        self.assertEqual(json.loads(encoded), "case_001")


if __name__ == "__main__":
    unittest.main()
