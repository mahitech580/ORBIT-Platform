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
