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

    def test_metric_validation_rejects_numeric_strings(self):
        self.assert_bad_request(orbit.read_metric_value, {"cpu_usage": "12.5"}, "cpu_usage", maximum=100)

    def test_metric_validation_rejects_nan(self):
        self.assert_bad_request(orbit.read_metric_value, {"cpu_usage": float("nan")}, "cpu_usage", maximum=100)

    def test_metric_validation_rejects_negative_infinity(self):
        self.assert_bad_request(orbit.read_metric_value, {"response_time_ms": float("-inf")}, "response_time_ms", maximum=999999.99)

    def test_response_time_accepts_exact_decimal_maximum(self):
        self.assertEqual(self.run_helper(orbit.read_metric_value, {"response_time_ms": 999999.99}, "response_time_ms", maximum=999999.99), 999999.99)

    def test_response_time_rejects_value_above_supported_maximum(self):
        self.assert_bad_request(orbit.read_metric_value, {"response_time_ms": 1000000}, "response_time_ms", maximum=999999.99)

    def test_negative_zero_is_accepted_as_nonnegative_measurement(self):
        self.assertEqual(self.run_helper(orbit.read_metric_value, {"response_time_ms": -0.0}, "response_time_ms", maximum=999999.99), -0.0)

    def test_nonproduction_database_configuration_can_use_local_defaults(self):
        orbit.validate_database_configuration(False, "", {})

    def test_production_database_configuration_accepts_explicit_database_url(self):
        orbit.validate_database_configuration(True, "postgresql://orbit:example@db.example/orbit", {})

    def test_production_database_configuration_accepts_all_explicit_db_fields(self):
        environment = {"DB_HOST": "db.internal", "DB_NAME": "orbit", "DB_USER": "orbit_user", "DB_PASSWORD": "test-only"}
        orbit.validate_database_configuration(True, "", environment)

    def test_production_database_configuration_rejects_missing_password(self):
        environment = {"DB_HOST": "db.internal", "DB_NAME": "orbit", "DB_USER": "orbit_user"}
        with self.assertRaises(RuntimeError):
            orbit.validate_database_configuration(True, "", environment)

    def test_metadata_response_uses_server_generated_request_id(self):
        response = orbit.app.test_client().get("/api/meta")
        self.assertRegex(response.headers["X-Request-ID"], r"^[a-f0-9]{32}$")

    def test_caller_supplied_request_id_is_not_trusted(self):
        response = orbit.app.test_client().get("/api/meta", headers={"X-Request-ID": "caller-controlled-id"})
        self.assertRegex(response.headers["X-Request-ID"], r"^[a-f0-9]{32}$")
        self.assertNotEqual(response.headers["X-Request-ID"], "caller-controlled-id")

    def test_successive_responses_receive_distinct_request_ids(self):
        client = orbit.app.test_client()
        first = client.get("/api/meta").headers["X-Request-ID"]
        second = client.get("/api/meta").headers["X-Request-ID"]
        self.assertNotEqual(first, second)

    def test_validation_error_keeps_no_store_and_request_id_headers(self):
        response = orbit.app.test_client().post("/api/auth/register", json=[])
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.headers.get("Cache-Control"), "no-store")
        self.assertRegex(response.headers["X-Request-ID"], r"^[a-f0-9]{32}$")

    def test_non_object_json_registration_body_returns_400(self):
        response = orbit.app.test_client().post("/api/auth/register", json=["not", "an", "object"])
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.get_json()["status"], 400)

    def test_non_object_json_registration_body_returns_400(self):
        response = orbit.app.test_client().post("/api/auth/register", json=["not", "an", "object"])
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.get_json()["status"], 400)

    def test_malformed_json_registration_body_returns_400(self):
        response = orbit.app.test_client().post("/api/auth/register", data="{bad json", content_type="application/json")
        self.assertEqual(response.status_code, 400)
        self.assertIn("JSON object", response.get_json()["error"])

    def test_registration_rejects_invalid_email_before_database_access(self):
        response = orbit.app.test_client().post("/api/auth/register", json={"email": "not-an-email", "username": "valid_user", "password": "correct-horse"})
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.get_json()["error"], "Enter a valid email address.")

    def test_registration_rejects_reserved_demo_email(self):
        response = orbit.app.test_client().post("/api/auth/register", json={"email": orbit.DEMO_EMAIL, "username": "valid_user", "password": "correct-horse"})
        self.assertEqual(response.status_code, 400)
        self.assertIn("reserved", response.get_json()["error"])

    def test_registration_rejects_username_outside_allowed_pattern(self):
        response = orbit.app.test_client().post("/api/auth/register", json={"email": "valid@example.test", "username": "bad name", "password": "correct-horse"})
        self.assertEqual(response.status_code, 400)
        self.assertIn("Username must be", response.get_json()["error"])

    def test_registration_rejects_password_below_eight_characters(self):
        response = orbit.app.test_client().post("/api/auth/register", json={"email": "valid@example.test", "username": "valid_user", "password": "short7"})
        self.assertEqual(response.status_code, 400)
        self.assertIn("at least 8 characters", response.get_json()["error"])

    def test_login_rejects_missing_password_before_database_access(self):
        response = orbit.app.test_client().post("/api/auth/login", json={"email": "person@example.test"})
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.get_json()["error"], "Password is required.")

    def test_registration_rejects_missing_email_before_database_access(self):
        response = orbit.app.test_client().post("/api/auth/register", json={"username": "valid_user", "password": "correct-horse"})
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.get_json()["error"], "Email is required.")

    def test_unknown_api_path_returns_json_404_with_request_id(self):
        response = orbit.app.test_client().get("/api/path-that-does-not-exist")
        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.get_json()["status"], 404)
        self.assertRegex(response.headers["X-Request-ID"], r"^[a-f0-9]{32}$")

    def test_wrong_method_returns_json_405_with_no_store_header(self):
        response = orbit.app.test_client().post("/api/meta", json={})
        self.assertEqual(response.status_code, 405)
        self.assertEqual(response.get_json()["status"], 405)
        self.assertEqual(response.headers.get("Cache-Control"), "no-store")

    def test_token_guard_rejects_missing_authorization_header(self):
        guarded = orbit.token_required(lambda: "protected")
        with orbit.app.test_request_context("/"):
            result = guarded()
        self.assertEqual(result[1], 401)
        self.assertEqual(result[0].get_json()["error"], "A Bearer token is required.")

    def test_token_guard_rejects_basic_authorization_scheme(self):
        guarded = orbit.token_required(lambda: "protected")
        with orbit.app.test_request_context("/", headers={"Authorization": "Basic abc"}):
            result = guarded()
        self.assertEqual(result[1], 401)

    def test_token_guard_rejects_malformed_bearer_token(self):
        guarded = orbit.token_required(lambda: "protected")
        with orbit.app.test_request_context("/", headers={"Authorization": "Bearer not-a-jwt"}):
            result = guarded()
        self.assertEqual(result[1], 401)
        self.assertIn("invalid or expired", result[0].get_json()["error"])

    def test_token_guard_rejects_bearer_scheme_without_token(self):
        guarded = orbit.token_required(lambda: "protected")
        with orbit.app.test_request_context("/", headers={"Authorization": "Bearer   "}):
            result = guarded()
        self.assertEqual(result[1], 401)

    def test_token_guard_rejects_boolean_user_id_claim(self):
        token = orbit.jwt.encode({"user_id": True}, orbit.SECRET_KEY, algorithm="HS256")
        guarded = orbit.token_required(lambda: "protected")
        with orbit.app.test_request_context("/", headers={"Authorization": "Bearer " + token}):
            result = guarded()
        self.assertEqual(result[1], 401)

    def test_token_guard_rejects_zero_user_id_claim(self):
        token = orbit.jwt.encode({"user_id": 0}, orbit.SECRET_KEY, algorithm="HS256")
        guarded = orbit.token_required(lambda: "protected")
        with orbit.app.test_request_context("/", headers={"Authorization": "Bearer " + token}):
            result = guarded()
        self.assertEqual(result[1], 401)

    def test_token_guard_rejects_expired_jwt(self):
        token = orbit.jwt.encode({"user_id": 7, "exp": 1}, orbit.SECRET_KEY, algorithm="HS256")
        guarded = orbit.token_required(lambda: "protected")
        with orbit.app.test_request_context("/", headers={"Authorization": "Bearer " + token}):
            result = guarded()
        self.assertEqual(result[1], 401)

    def test_token_guard_accepts_case_insensitive_bearer_scheme(self):
        token = orbit.issue_token({"id": 7, "email": "user@example.test"})
        guarded = orbit.token_required(lambda: "protected")
        with orbit.app.test_request_context("/", headers={"Authorization": "bearer " + token}):
            result = guarded()
        self.assertEqual(result, "protected")

    def test_token_guard_trims_trailing_whitespace_from_token(self):
        token = orbit.issue_token({"id": 7, "email": "user@example.test"})
        guarded = orbit.token_required(lambda: "protected")
        with orbit.app.test_request_context("/", headers={"Authorization": "Bearer " + token + "  "}):
            result = guarded()
        self.assertEqual(result, "protected")

    def test_token_guard_rejects_decimal_string_user_id_claim(self):
        token = orbit.jwt.encode({"user_id": "7.0"}, orbit.SECRET_KEY, algorithm="HS256")
        guarded = orbit.token_required(lambda: "protected")
        with orbit.app.test_request_context("/", headers={"Authorization": "Bearer " + token}):
            result = guarded()
        self.assertEqual(result[1], 401)

    def test_token_guard_rejects_user_id_above_serial_range(self):
        token = orbit.jwt.encode({"user_id": 2147483648}, orbit.SECRET_KEY, algorithm="HS256")
        guarded = orbit.token_required(lambda: "protected")
        with orbit.app.test_request_context("/", headers={"Authorization": "Bearer " + token}):
            result = guarded()
        self.assertEqual(result[1], 401)

    def test_api_response_sets_nosniff_content_type_header(self):
        response = orbit.app.test_client().get("/api/meta")
        self.assertEqual(response.headers.get("X-Content-Type-Options"), "nosniff")
