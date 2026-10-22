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

    def test_read_string_rejects_set_values(self):
        self.assert_bad_request(orbit.read_string, {"label": {"a"}}, "label")

    def test_read_string_rejects_byte_values(self):
        self.assert_bad_request(orbit.read_string, {"label": b"binary"}, "label")

    def test_read_string_rejects_float_values(self):
        self.assert_bad_request(orbit.read_string, {"label": 1.5}, "label")

    def test_read_string_rejects_null_when_default_is_null(self):
        self.assert_bad_request(orbit.read_string, {"label": None}, "label", default=None)

    def test_read_string_trims_carriage_return_and_newline(self):
        self.assertEqual(self.run_helper(orbit.read_string, {"label": "\r\n Orbit \t"}, "label"), "Orbit")

    def test_read_string_accepts_empty_text_with_zero_length_limit(self):
        self.assertEqual(self.run_helper(orbit.read_string, {"label": ""}, "label", max_length=0), "")

    def test_read_string_rejects_nonempty_text_with_zero_length_limit(self):
        self.assert_bad_request(orbit.read_string, {"label": "x"}, "label", max_length=0)

    def test_read_string_error_label_expands_underscores(self):
        with orbit.app.test_request_context("/", method="POST", json={}):
            with self.assertRaises(BadRequest) as caught:
                orbit.read_string({"service_name": False}, "service_name")
        self.assertEqual(caught.exception.description, "Service name must be text.")

    def test_positive_int_accepts_maximum_as_decimal_text(self):
        self.assertEqual(self.run_helper(orbit.positive_int, "2147483647", "ID"), 2147483647)

    def test_positive_int_trims_multiple_ascii_whitespace_characters(self):
        self.assertEqual(self.run_helper(orbit.positive_int, " \t23\n", "ID"), 23)

    def test_positive_int_rejects_explicit_plus_sign(self):
        self.assert_bad_request(orbit.positive_int, "+1", "ID")

    def test_positive_int_rejects_negative_decimal_text(self):
        self.assert_bad_request(orbit.positive_int, "-1", "ID")

    def test_positive_int_rejects_integral_float(self):
        self.assert_bad_request(orbit.positive_int, 7.0, "ID")

    def test_positive_int_rejects_decimal_objects(self):
        self.assert_bad_request(orbit.positive_int, Decimal("7"), "ID")

    def test_positive_int_rejects_binary_numeric_text(self):
        self.assert_bad_request(orbit.positive_int, b"7", "ID")

    def test_positive_int_rejects_huge_decimal_text(self):
        self.assert_bad_request(orbit.positive_int, "9" * 100, "ID")

    def test_positive_int_accepts_maximum_as_decimal_text(self):
        self.assertEqual(self.run_helper(orbit.positive_int, "2147483647", "ID"), 2147483647)

    def test_positive_int_rejects_numeric_text_with_trailing_suffix(self):
        self.assert_bad_request(orbit.positive_int, "23items", "ID")

    def test_positive_int_rejects_empty_text(self):
        self.assert_bad_request(orbit.positive_int, "", "ID")

    def test_positive_int_rejects_whitespace_only_text(self):
        self.assert_bad_request(orbit.positive_int, " \t\n", "ID")

    def test_positive_int_rejects_none(self):
        self.assert_bad_request(orbit.positive_int, None, "ID")

    def test_positive_int_rejects_list_values(self):
        self.assert_bad_request(orbit.positive_int, [1], "ID")

    def test_positive_int_rejects_identifier_above_serial_maximum(self):
        self.assert_bad_request(orbit.positive_int, 2147483648, "ID")

    def test_read_password_preserves_nonblank_outer_whitespace(self):
        value = self.run_helper(orbit.read_password, {"password": "  keep spaces  "})
        self.assertEqual(value, "  keep spaces  ")

    def test_read_password_rejects_whitespace_only_content(self):
        self.assert_bad_request(orbit.read_password, {"password": "        "})

    def test_read_password_rejects_list_content(self):
        self.assert_bad_request(orbit.read_password, {"password": ["not", "text"]})

    def test_read_password_accepts_single_character_at_helper_boundary(self):
        self.assertEqual(self.run_helper(orbit.read_password, {"password": "x"}), "x")

    def test_read_password_accepts_exact_unicode_character_limit(self):
        value = "界" * 1024
        self.assertEqual(self.run_helper(orbit.read_password, {"password": value}), value)

    def test_metric_timestamp_accepts_space_separator(self):
        value = self.run_helper(orbit.parse_metric_timestamp, "2026-10-22 12:34:56")
        self.assertEqual(value, datetime(2026, 10, 22, 12, 34, 56))

    def test_metric_timestamp_rejects_impossible_calendar_date(self):
        self.assert_bad_request(orbit.parse_metric_timestamp, "2026-02-30T12:00:00Z")

    def test_metric_timestamp_rejects_invalid_month(self):
        self.assert_bad_request(orbit.parse_metric_timestamp, "2026-13-01T12:00:00")

    def test_metric_timestamp_rejects_hour_outside_clock_range(self):
        self.assert_bad_request(orbit.parse_metric_timestamp, "2026-10-22T25:00:00")

    def test_metric_timestamp_rejects_invalid_minutes(self):
        self.assert_bad_request(orbit.parse_metric_timestamp, "2026-10-22T12:60:00")

    def test_metric_timestamp_rejects_invalid_seconds(self):
        self.assert_bad_request(orbit.parse_metric_timestamp, "2026-10-22T12:34:61")

    def test_metric_timestamp_rejects_unknown_timezone_text(self):
        self.assert_bad_request(orbit.parse_metric_timestamp, "2026-10-22T12:00:00UTC")

    def test_metric_timestamp_rejects_trailing_garbage(self):
        self.assert_bad_request(orbit.parse_metric_timestamp, "2026-10-22T12:00:00Zjunk")

    def test_metric_timestamp_normalizes_offset_into_next_day(self):
        value = self.run_helper(orbit.parse_metric_timestamp, "2026-10-22T23:45:00-02:00")
        self.assertEqual(value, datetime(2026, 10, 23, 1, 45, 0))

    def test_optional_metric_missing_value_returns_none(self):
        self.assertIsNone(self.run_helper(orbit.read_metric_value, {}, "cpu_usage", maximum=100))

    def test_optional_metric_explicit_null_returns_none(self):
        self.assertIsNone(self.run_helper(orbit.read_metric_value, {"cpu_usage": None}, "cpu_usage", maximum=100))

    def test_cpu_measurement_accepts_zero(self):
        self.assertEqual(self.run_helper(orbit.read_metric_value, {"cpu_usage": 0}, "cpu_usage", maximum=100), 0)

    def test_cpu_measurement_accepts_exact_upper_bound(self):
        self.assertEqual(self.run_helper(orbit.read_metric_value, {"cpu_usage": 100}, "cpu_usage", maximum=100), 100)

    def test_cpu_measurement_rejects_value_above_hundred(self):
        self.assert_bad_request(orbit.read_metric_value, {"cpu_usage": 100.01}, "cpu_usage", maximum=100)

    def test_cpu_measurement_rejects_negative_value(self):
        self.assert_bad_request(orbit.read_metric_value, {"cpu_usage": -0.01}, "cpu_usage", maximum=100)

    def test_production_database_validator_rejects_none_for_required_settings(self):
        environment = {"DB_HOST": None, "DB_NAME": None, "DB_USER": None, "DB_PASSWORD": None}
        with self.assertRaises(RuntimeError):
            orbit.validate_database_configuration(True, "", environment)

    def test_integer_metric_normalizes_whole_float_to_int(self):
        value = self.run_helper(orbit.read_metric_value, {"requests_total": 12.0}, "requests_total", integer=True, maximum=orbit.POSTGRES_INTEGER_MAX)
        self.assertEqual(value, 12)
        self.assertIsInstance(value, int)

    def test_integer_metric_rejects_fractional_float(self):
        self.assert_bad_request(orbit.read_metric_value, {"requests_total": 12.5}, "requests_total", integer=True, maximum=orbit.POSTGRES_INTEGER_MAX)

    def test_integer_metric_accepts_postgres_serial_maximum(self):
        value = self.run_helper(orbit.read_metric_value, {"memory_usage": orbit.POSTGRES_INTEGER_MAX}, "memory_usage", integer=True, maximum=orbit.POSTGRES_INTEGER_MAX)
        self.assertEqual(value, 2147483647)

    def test_integer_metric_rejects_value_above_postgres_serial_maximum(self):
        self.assert_bad_request(orbit.read_metric_value, {"memory_usage": 2147483648}, "memory_usage", integer=True, maximum=orbit.POSTGRES_INTEGER_MAX)

    def test_metric_validation_rejects_boolean_numbers(self):
        self.assert_bad_request(orbit.read_metric_value, {"cpu_usage": True}, "cpu_usage", maximum=100)

    def test_metric_validation_rejects_decimal_objects(self):
        self.assert_bad_request(orbit.read_metric_value, {"cpu_usage": Decimal("1.25")}, "cpu_usage", maximum=100)
