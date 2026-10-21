"""Focused regression tests for API validation and serialization helpers."""
import hashlib
import unittest
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal

import jwt
from werkzeug.exceptions import BadRequest

import app as orbit


class OrbitPureHelperRegressionTests(unittest.TestCase):
    """Exercise pure helpers without requiring an external PostgreSQL instance."""

    def run_in_request(self, callback, *args, **kwargs):
        with orbit.app.test_request_context("/", method="POST", json={}):
            return callback(*args, **kwargs)

    pass

    def test_read_string_trims_outer_whitespace(self):
        value = self.run_in_request(orbit.read_string, {"name": "  Atlas  "}, "name", required=True)
        self.assertEqual(value, "Atlas")

    def test_read_string_uses_default_for_missing_key(self):
        value = self.run_in_request(orbit.read_string, {}, "description", default="notes")
        self.assertEqual(value, "notes")

    def test_read_string_uses_default_for_null_value(self):
        value = self.run_in_request(orbit.read_string, {"description": None}, "description", default="notes")
        self.assertEqual(value, "notes")

    def test_read_string_rejects_integer_payload(self):
        with self.assertRaises(BadRequest):
            self.run_in_request(orbit.read_string, {"name": 123}, "name")

    def test_read_string_rejects_boolean_payload(self):
        with self.assertRaises(BadRequest):
            self.run_in_request(orbit.read_string, {"name": True}, "name")

    def test_read_string_rejects_required_blank_value(self):
        with self.assertRaises(BadRequest):
            self.run_in_request(orbit.read_string, {"name": "   "}, "name", required=True)

    def test_read_string_accepts_exact_maximum_length(self):
        self.assertEqual(self.run_in_request(orbit.read_string, {"name": "abcd"}, "name", max_length=4), "abcd")

    def test_read_string_rejects_value_over_maximum_length(self):
        with self.assertRaises(BadRequest):
            self.run_in_request(orbit.read_string, {"name": "abcde"}, "name", max_length=4)

    def test_read_string_preserves_internal_whitespace(self):
        value = self.run_in_request(orbit.read_string, {"name": "Orbit   Platform"}, "name")
        self.assertEqual(value, "Orbit   Platform")

    def test_read_password_rejects_missing_value(self):
        with self.assertRaises(BadRequest):
            self.run_in_request(orbit.read_password, {})

    def test_read_password_rejects_empty_value(self):
        with self.assertRaises(BadRequest):
            self.run_in_request(orbit.read_password, {"password": ""})

    def test_read_password_rejects_non_text_value(self):
        with self.assertRaises(BadRequest):
            self.run_in_request(orbit.read_password, {"password": 12345678})

    def test_read_password_accepts_exact_length_limit(self):
        value = "x" * 1024
        self.assertEqual(self.run_in_request(orbit.read_password, {"password": value}), value)

    def test_read_password_rejects_over_length_limit(self):
        with self.assertRaises(BadRequest):
            self.run_in_request(orbit.read_password, {"password": "x" * 1025})

    def test_positive_int_accepts_smallest_positive_integer(self):
        self.assertEqual(self.run_in_request(orbit.positive_int, 1, "ID"), 1)

    def test_positive_int_accepts_trimmed_ascii_integer_string(self):
        self.assertEqual(self.run_in_request(orbit.positive_int, " 42 ", "ID"), 42)

    def test_positive_int_rejects_boolean_true(self):
        with self.assertRaises(BadRequest):
            self.run_in_request(orbit.positive_int, True, "ID")

    def test_positive_int_rejects_boolean_false(self):
        with self.assertRaises(BadRequest):
            self.run_in_request(orbit.positive_int, False, "ID")

    def test_positive_int_rejects_zero(self):
        with self.assertRaises(BadRequest):
            self.run_in_request(orbit.positive_int, 0, "ID")

    def test_positive_int_rejects_negative_values(self):
        with self.assertRaises(BadRequest):
            self.run_in_request(orbit.positive_int, -1, "ID")

    def test_positive_int_rejects_float_even_when_integral(self):
        with self.assertRaises(BadRequest):
            self.run_in_request(orbit.positive_int, 2.0, "ID")

    def test_positive_int_rejects_decimal_notation_string(self):
        with self.assertRaises(BadRequest):
            self.run_in_request(orbit.positive_int, "2.0", "ID")
