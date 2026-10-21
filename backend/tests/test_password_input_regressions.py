"""Regression coverage for password request values."""
import unittest

from werkzeug.exceptions import BadRequest

import app as orbit


class PasswordInputRegressionTests(unittest.TestCase):
    def read_password(self, payload):
        with orbit.app.test_request_context("/", method="POST", json=payload):
            return orbit.read_password(payload)

    def test_rejects_password_that_contains_only_whitespace(self):
        with self.assertRaises(BadRequest):
            self.read_password({"password": "       "})

    def test_preserves_intentional_surrounding_spaces_for_nonblank_passwords(self):
        password = "  real phrase  "
        self.assertEqual(self.read_password({"password": password}), password)

    def test_rejects_null_password(self):
        with self.assertRaises(BadRequest):
            self.read_password({"password": None})
