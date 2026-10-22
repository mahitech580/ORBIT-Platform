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

    def test_tiny_positive_decimal_underflow_becomes_null(self):
        self.assertIsNone(orbit.json_safe(Decimal("1e-10000")))

    def test_tiny_negative_decimal_underflow_becomes_null(self):
        self.assertIsNone(orbit.json_safe(Decimal("-1e-10000")))

    def test_negative_finite_decimal_keeps_sign(self):
        self.assertEqual(orbit.json_safe(Decimal("-12.50")), -12.5)

    def test_large_representable_decimal_remains_finite(self):
        self.assertEqual(orbit.json_safe(Decimal("1e308")), 1e308)

    def test_decimal_zero_remains_numeric_zero(self):
        self.assertEqual(orbit.json_safe(Decimal("0")), 0.0)
