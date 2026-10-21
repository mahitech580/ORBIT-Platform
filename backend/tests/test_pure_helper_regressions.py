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
