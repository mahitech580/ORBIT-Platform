"""The API enforces its configured request-body size limit."""
import unittest

import app as orbit


class RequestSizeLimitTests(unittest.TestCase):
    def setUp(self):
        self.client = orbit.app.test_client()

    def test_oversized_authentication_payload_returns_json_413(self):
        payload = b'{"password":"' + (b'x' * (1024 * 1024)) + b'"}'
        response = self.client.post("/api/auth/login", data=payload, content_type="application/json")
        self.assertEqual(response.status_code, 413)
        self.assertEqual(response.get_json()["error"], "Request body is too large.")
        self.assertEqual(response.headers.get("Cache-Control"), "no-store")
        self.assertTrue(response.headers.get("X-Request-ID"))
\n
    def test_oversized_request_keeps_content_security_policy_header(self):
        payload = b'{"password":"' + (b'x' * (1024 * 1024)) + b'"}'
        response = self.client.post("/api/auth/login", data=payload, content_type="application/json")
        self.assertEqual(response.status_code, 413)
        self.assertEqual(
            response.headers.get("Content-Security-Policy"),
            "default-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'",
        )
