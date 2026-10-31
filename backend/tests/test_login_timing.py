"""Unknown and legacy login failures must perform a password KDF before responding."""
import hashlib
import unittest
from unittest.mock import patch

import app as orbit


class LoginTimingTests(unittest.TestCase):
    def setUp(self):
        self.client = orbit.app.test_client()

    def test_unknown_email_runs_the_dummy_password_hash(self):
        password = "correct-horse-battery-42"
        with patch.object(orbit, "db_fetch_all", return_value=[]), \
             patch.object(orbit, "verify_password", wraps=orbit.verify_password) as verify:
            response = self.client.post("/api/auth/login", json={
                "email": "missing@example.test",
                "password": password
            })

        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.get_json()["error"], "Invalid email or password.")
        verify.assert_called_once_with(password, orbit.DUMMY_PASSWORD_HASH)

    def test_wrong_password_for_legacy_hash_runs_the_dummy_kdf(self):
        password = "wrong-password"
        legacy_hash = hashlib.sha256(b"the-real-password").hexdigest()
        with patch.object(orbit, "db_fetch_all", return_value=[{
            "id": 8,
            "email": "legacy@example.test",
            "username": "legacy",
            "password_hash": legacy_hash,
            "first_name": "",
            "last_name": ""
        }]), patch.object(orbit, "verify_password", wraps=orbit.verify_password) as verify:
            response = self.client.post("/api/auth/login", json={
                "email": "legacy@example.test",
                "password": password
            })

        self.assertEqual(response.status_code, 401)
        self.assertEqual(verify.call_args_list[0].args, (password, legacy_hash))
        self.assertEqual(verify.call_args_list[1].args, (password, orbit.DUMMY_PASSWORD_HASH))

    def test_wrong_password_for_modern_hash_does_not_run_a_second_kdf(self):
        with patch.object(orbit, "db_fetch_all", return_value=[{
            "id": 9,
            "email": "modern@example.test",
            "username": "modern",
            "password_hash": "pbkdf2:sha256:600000$test-salt$test-digest",
            "first_name": "",
            "last_name": ""
        }]), patch.object(orbit, "verify_password", return_value=False) as verify:
            response = self.client.post("/api/auth/login", json={
                "email": "modern@example.test",
                "password": "wrong-password"
            })

        self.assertEqual(response.status_code, 401)
        verify.assert_called_once()

    def test_dummy_hash_is_a_valid_nonmatching_pbkdf2_hash(self):
        self.assertTrue(orbit.DUMMY_PASSWORD_HASH.startswith("pbkdf2:sha256:600000$"))
        self.assertFalse(orbit.verify_password("not-the-dummy-password", orbit.DUMMY_PASSWORD_HASH))


if __name__ == "__main__":
    unittest.main()
