"""Contract tests for portable, strict JSON normalization of database values."""
import json
import math
import unittest
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal

import app as orbit


class JsonSafeContractTests(unittest.TestCase):
    def assert_strict_json_round_trip(self, value, expected):
        normalized = orbit.json_safe(value)
        encoded = json.dumps(normalized, allow_nan=False)
        self.assertEqual(json.loads(encoded), expected)

    def test_mixed_database_values_produce_strict_json_payload(self):
        payload = {
            "money": Decimal("12.50"),
            "date": date(2026, 10, 25),
            "created_at": datetime(2026, 10, 25, 12, 30, tzinfo=timezone.utc),
            "values": [Decimal("Infinity"), {"amount": Decimal("2.75")}],
        }
        self.assert_strict_json_round_trip(
            payload,
            {
                "money": 12.5,
                "date": "2026-10-25",
                "created_at": "2026-10-25T12:30:00+00:00",
                "values": [None, {"amount": 2.75}],
            },
        )

    def test_json_native_primitives_are_preserved(self):
        for value in (None, True, False, 0, -1, 1.25, "", "ORBIT ✓"):
            with self.subTest(value=value):
                self.assertEqual(orbit.json_safe(value), value)

    def test_nested_tuples_are_normalized_to_lists(self):
        self.assertEqual(
            orbit.json_safe({"outer": (1, {"inner": (2, 3)})}),
            {"outer": [1, {"inner": [2, 3]}]},
        )

    def test_finite_decimal_is_converted_to_number(self):
        self.assertEqual(orbit.json_safe(Decimal("123.450")), 123.45)

    def test_decimal_nan_and_infinities_become_null(self):
        for value in (Decimal("NaN"), Decimal("sNaN"), Decimal("Infinity"), Decimal("-Infinity")):
            with self.subTest(value=str(value)):
                self.assertIsNone(orbit.json_safe(value))

    def test_decimal_float_overflow_becomes_null(self):
        self.assertIsNone(orbit.json_safe(Decimal("1e10000")))

    def test_decimal_underflow_to_zero_becomes_null(self):
        self.assertIsNone(orbit.json_safe(Decimal("1e-10000")))

    def test_naive_datetime_is_explicitly_utc(self):
        value = datetime(2026, 10, 25, 12, 30)
        self.assertEqual(orbit.json_safe(value), "2026-10-25T12:30:00+00:00")

    def test_offset_datetime_is_converted_to_utc(self):
        value = datetime(2026, 10, 25, 14, 30, tzinfo=timezone(timedelta(hours=2)))
        self.assertEqual(orbit.json_safe(value), "2026-10-25T12:30:00+00:00")

    def test_date_is_iso_formatted(self):
        self.assertEqual(orbit.json_safe(date(2026, 10, 25)), "2026-10-25")

    def test_finite_floats_remain_strict_json_compatible(self):
        for value in (0.0, -0.0, 1.5, -2.75, math.pi):
            with self.subTest(value=value):
                self.assert_strict_json_round_trip(value, value)

    def test_non_decimal_non_finite_float_is_not_silently_rewritten(self):
        # The API normalizer specifically protects PostgreSQL Decimal values.
        # Other Python floats retain their standard JSON encoder behavior.
        self.assertTrue(math.isnan(orbit.json_safe(float("nan"))))


if __name__ == "__main__":
    unittest.main()
