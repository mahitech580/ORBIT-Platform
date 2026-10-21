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

    def test_positive_int_rejects_non_ascii_decimal_digits(self):
        with self.assertRaises(BadRequest):
            self.run_in_request(orbit.positive_int, "١٢", "ID")

    def test_positive_int_rejects_whitespace_only_string(self):
        with self.assertRaises(BadRequest):
            self.run_in_request(orbit.positive_int, "   ", "ID")

    def test_positive_int_accepts_postgres_integer_maximum(self):
        self.assertEqual(self.run_in_request(orbit.positive_int, orbit.POSTGRES_INTEGER_MAX, "ID"), 2147483647)

    def test_positive_int_rejects_value_above_postgres_integer_maximum(self):
        with self.assertRaises(BadRequest):
            self.run_in_request(orbit.positive_int, 2147483648, "ID")

    def test_positive_int_rejects_arbitrary_object(self):
        with self.assertRaises(BadRequest):
            self.run_in_request(orbit.positive_int, object(), "ID")

    def test_json_safe_converts_decimal_to_json_number(self):
        self.assertEqual(orbit.json_safe(Decimal("12.50")), 12.5)

    def test_json_safe_converts_date_to_iso_format(self):
        self.assertEqual(orbit.json_safe(date(2026, 10, 21)), "2026-10-21")

    def test_json_safe_marks_naive_datetime_as_utc(self):
        value = datetime(2026, 10, 21, 12, 30, 0)
        self.assertEqual(orbit.json_safe(value), "2026-10-21T12:30:00+00:00")

    def test_json_safe_normalizes_offset_datetime_to_utc(self):
        value = datetime(2026, 10, 21, 18, 0, tzinfo=timezone(timedelta(hours=5, minutes=30)))
        self.assertEqual(orbit.json_safe(value), "2026-10-21T12:30:00+00:00")

    def test_json_safe_recurses_through_nested_containers(self):
        value = {"items": (Decimal("2.25"), [date(2026, 1, 2)])}
        self.assertEqual(orbit.json_safe(value), {"items": [2.25, ["2026-01-02"]]})

    def test_json_safe_preserves_ordinary_scalars(self):
        value = {"name": "Orbit", "active": True, "none": None, "count": 3}
        self.assertEqual(orbit.json_safe(value), value)

    def test_modern_password_hash_verifies_correct_password(self):
        hashed = orbit.hash_password("strong-password-123")
        self.assertTrue(orbit.verify_password("strong-password-123", hashed))

    def test_modern_password_hash_rejects_wrong_password(self):
        hashed = orbit.hash_password("strong-password-123")
        self.assertFalse(orbit.verify_password("wrong-password-123", hashed))

    def test_legacy_sha256_password_hash_is_still_verifiable(self):
        digest = hashlib.sha256(b"legacy-password").hexdigest()
        self.assertTrue(orbit.verify_password("legacy-password", digest))

    def test_password_verification_rejects_unknown_hash_scheme(self):
        self.assertFalse(orbit.verify_password("anything", "unknown$scheme$hash"))

    def test_password_verification_rejects_non_string_arguments(self):
        self.assertFalse(orbit.verify_password(None, "pbkdf2:sha256:600000$salt$hash"))
        self.assertFalse(orbit.verify_password("password", None))

    def test_public_user_combines_first_and_last_name(self):
        user = {"id": 7, "email": "a@example.com", "username": "atlas", "first_name": "Ada ", "last_name": "Lovelace "}
        self.assertEqual(orbit.public_user(user)["name"], "Ada Lovelace")

    def test_public_user_falls_back_to_username_when_names_are_blank(self):
        user = {"id": 8, "email": "a@example.com", "username": "atlas", "first_name": " ", "last_name": ""}
        self.assertEqual(orbit.public_user(user)["name"], "atlas")

    def test_public_user_falls_back_to_email_when_username_is_absent(self):
        user = {"id": 9, "email": "a@example.com", "first_name": "", "last_name": ""}
        self.assertEqual(orbit.public_user(user)["name"], "a@example.com")

    def test_issued_token_has_user_id_and_expiry_claims(self):
        token = orbit.issue_token({"id": 13, "email": "member@example.com"})
        claims = jwt.decode(token, orbit.SECRET_KEY, algorithms=["HS256"])
        self.assertEqual(claims["user_id"], 13)
        self.assertEqual(claims["email"], "member@example.com")
        self.assertGreater(claims["exp"], claims["iat"])

    def test_security_headers_are_added_to_response(self):
        response = orbit.add_browser_security_headers(orbit.app.response_class("ok"))
        self.assertEqual(response.headers["X-Content-Type-Options"], "nosniff")
        self.assertEqual(response.headers["X-Frame-Options"], "DENY")

    def test_security_headers_restrict_sensitive_browser_capabilities(self):
        response = orbit.add_browser_security_headers(orbit.app.response_class("ok"))
        self.assertIn("camera=()", response.headers["Permissions-Policy"])
        self.assertEqual(response.headers["Referrer-Policy"], "no-referrer")

    def test_nonproduction_database_validation_allows_local_defaults(self):
        self.assertIsNone(orbit.validate_database_configuration(False, "", {}))

    def test_production_database_validation_accepts_connection_url(self):
        self.assertIsNone(orbit.validate_database_configuration(True, "postgresql://db.example/orbit", {}))

    def test_production_database_validation_rejects_missing_configuration(self):
        with self.assertRaises(RuntimeError):
            orbit.validate_database_configuration(True, "", {})

    def test_production_database_validation_accepts_explicit_db_fields(self):
        env = {"DB_HOST": "db", "DB_NAME": "orbit", "DB_USER": "orbit_user", "DB_PASSWORD": "configured"}
        self.assertIsNone(orbit.validate_database_configuration(True, "", env))
