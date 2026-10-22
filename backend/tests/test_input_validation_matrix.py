"""Broad regression matrix for user input, telemetry, and timestamp boundaries."""
import unittest
from datetime import datetime
from decimal import Decimal

from werkzeug.exceptions import BadRequest

import app as orbit


class InputValidationMatrixTests(unittest.TestCase):
    """Exercise input helpers directly without requiring a live database."""

    def run_helper(self, callback, *args, **kwargs):
        with orbit.app.test_request_context("/", method="POST", json={}):
            return callback(*args, **kwargs)

    def assert_bad_request(self, callback, *args, **kwargs):
        with self.assertRaises(BadRequest):
            self.run_helper(callback, *args, **kwargs)

    def test_optional_blank_text_is_allowed_and_normalized(self):
        self.assertEqual(self.run_helper(orbit.read_string, {"label": "  "}, "label"), "")

    def test_positive_integer_string_with_leading_zeroes_is_normalized(self):
        self.assertEqual(self.run_helper(orbit.positive_int, "0007", "ID"), 7)

    def test_metric_timestamp_accepts_fractional_seconds(self):
        value = self.run_helper(orbit.parse_metric_timestamp, "2026-10-22T12:34:56.123456Z")
        self.assertEqual(value, datetime(2026, 10, 22, 12, 34, 56, 123456))

    def test_read_string_rejects_tuple_values(self):
        self.assert_bad_request(orbit.read_string, {"label": ("a", "b")}, "label")

    def test_read_string_rejects_dictionary_values(self):
        self.assert_bad_request(orbit.read_string, {"label": {"nested": "value"}}, "label")
