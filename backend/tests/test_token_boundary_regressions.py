"""Route-level regressions for malformed and expired bearer tokens."""
import unittest
from datetime import datetime, timedelta, timezone

import jwt

import app as orbit


class BearerTokenBoundaryTests(unittest.TestCase):
    def setUp(self):
        self.client = orbit.app.test_client()

    def token(self, **claims):
        payload = {"exp": datetime.now(timezone.utc) + timedelta(minutes=5), **claims}
        return jwt.encode(payload, orbit.SECRET_KEY, algorithm="HS256")

    def test_missing_authorization_header_is_unauthorized(self):
        response = self.client.get("/api/auth/me")
        self.assertEqual(response.status_code, 401)

    def test_malformed_token_is_unauthorized(self):
        response = self.client.get("/api/auth/me", headers={"Authorization": "Bearer not-a-jwt"})
        self.assertEqual(response.status_code, 401)

    def test_expired_token_is_unauthorized(self):
        expired = jwt.encode(
            {"user_id": 1, "exp": datetime.now(timezone.utc) - timedelta(seconds=1)},
            orbit.SECRET_KEY,
            algorithm="HS256",
        )
        response = self.client.get("/api/auth/me", headers={"Authorization": "Bearer " + expired})
        self.assertEqual(response.status_code, 401)

    def test_non_positive_user_claim_is_unauthorized_not_bad_request(self):
        token = self.token(user_id=0)
        response = self.client.get("/api/auth/me", headers={"Authorization": "Bearer " + token})
        self.assertEqual(response.status_code, 401)

    def test_non_integer_user_claim_is_unauthorized(self):
        token = self.token(user_id=1.5)
        response = self.client.get("/api/auth/me", headers={"Authorization": "Bearer " + token})
        self.assertEqual(response.status_code, 401)

    def test_bearer_scheme_is_case_insensitive(self):
        response = self.client.get("/api/auth/me", headers={"Authorization": "bEaReR invalid"})
        self.assertEqual(response.status_code, 401)
