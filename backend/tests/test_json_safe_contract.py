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

    def test_json_safe_regression_case_002(self):
        value = 2
        normalized = orbit.json_safe(value)
        encoded = json.dumps(normalized, allow_nan=False)
        self.assertEqual(json.loads(encoded), 2)

    def test_json_safe_regression_case_003(self):
        value = 0.3
        normalized = orbit.json_safe(value)
        encoded = json.dumps(normalized, allow_nan=False)
        self.assertEqual(json.loads(encoded), 0.3)

    def test_json_safe_regression_case_004(self):
        value = [4, "item_004"]
        normalized = orbit.json_safe(value)
        encoded = json.dumps(normalized, allow_nan=False)
        self.assertEqual(json.loads(encoded), [4, "item_004"])

    def test_json_safe_regression_case_005(self):
        value = {"index": 5, "enabled": false}
        normalized = orbit.json_safe(value)
        encoded = json.dumps(normalized, allow_nan=False)
        self.assertEqual(json.loads(encoded), {"index": 5, "enabled": false})

    def test_json_safe_regression_case_006(self):
        value = ({"index": 6, "values": (6, 7)})
        normalized = orbit.json_safe(value)
        encoded = json.dumps(normalized, allow_nan=False)
        self.assertEqual(json.loads(encoded), {"index": 6, "values": [6, 7]})

    def test_json_safe_regression_case_007(self):
        value = [{"index": 7}, [{"nested": 8}]]
        normalized = orbit.json_safe(value)
        encoded = json.dumps(normalized, allow_nan=False)
        self.assertEqual(json.loads(encoded), [{"index": 7}, [{"nested": 8}]])

    def test_json_safe_regression_case_008(self):
        value = {"outer": {"inner": {"value": 8}}}
        normalized = orbit.json_safe(value)
        encoded = json.dumps(normalized, allow_nan=False)
        self.assertEqual(json.loads(encoded), {"outer": {"inner": {"value": 8}}})

    def test_json_safe_regression_case_009(self):
        value = [True, False, None, 9]
        normalized = orbit.json_safe(value)
        encoded = json.dumps(normalized, allow_nan=False)
        self.assertEqual(json.loads(encoded), [true, false, null, 9])

    def test_json_safe_regression_case_010(self):
        value = {"unicode": "ORBIT-010-✓", "count": 10}
        normalized = orbit.json_safe(value)
        encoded = json.dumps(normalized, allow_nan=False)
        self.assertEqual(json.loads(encoded), {"unicode": "ORBIT-010-✓", "count": 10})

    def test_json_safe_regression_case_011(self):
        value = "case_011"
        normalized = orbit.json_safe(value)
        encoded = json.dumps(normalized, allow_nan=False)
        self.assertEqual(json.loads(encoded), "case_011")

    def test_json_safe_regression_case_012(self):
        value = 12
        normalized = orbit.json_safe(value)
        encoded = json.dumps(normalized, allow_nan=False)
        self.assertEqual(json.loads(encoded), 12)


if __name__ == "__main__":
    unittest.main()
