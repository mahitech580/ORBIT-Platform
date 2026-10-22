"""Regression tests for JSON serialization edge cases accepted by PostgreSQL NUMERIC."""
import unittest
from decimal import Decimal

import app as orbit


class JsonSerializationBoundaryTests(unittest.TestCase):
    def test_non_finite_decimal_values_become_null(self):
        for value in (Decimal("NaN"), Decimal("Infinity"), Decimal("-Infinity")):
            with self.subTest(value=str(value)):
                self.assertIsNone(orbit.json_safe(value))

    def test_finite_decimal_that_overflows_float_does_not_emit_infinity(self):
        value = orbit.json_safe(Decimal("1e10000"))
        self.assertIsNone(value)

    def test_large_but_representable_decimal_remains_numeric(self):
        self.assertEqual(orbit.json_safe(Decimal("1e300")), 1e300)

    def test_nested_overflowing_decimal_is_sanitized(self):
        self.assertEqual(orbit.json_safe({"metrics": [Decimal("1e10000")]}), {"metrics": [None]})


if __name__ == "__main__":
    unittest.main()
