"""Cross-origin responses are limited to the configured public app and local dev origins."""
import unittest

import app as orbit


class CorsPolicyTests(unittest.TestCase):
    def setUp(self):
        self.client = orbit.app.test_client()

    def test_published_pages_origin_is_allowed_for_api_requests(self):
        response = self.client.get("/api/meta", headers={"Origin": "https://mahitech580.github.io"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.headers.get("Access-Control-Allow-Origin"), "https://mahitech580.github.io")

    def test_untrusted_origin_is_not_reflected(self):
        response = self.client.get("/api/meta", headers={"Origin": "https://untrusted.example"})
        self.assertNotEqual(response.headers.get("Access-Control-Allow-Origin"), "https://untrusted.example")

    def test_preflight_allows_authorization_for_the_published_app(self):
        response = self.client.options("/api/projects", headers={
            "Origin": "https://mahitech580.github.io",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "authorization,content-type"
        })
        self.assertEqual(response.headers.get("Access-Control-Allow-Origin"), "https://mahitech580.github.io")
        allowed = response.headers.get("Access-Control-Allow-Headers", "").lower()
        self.assertIn("authorization", allowed)
        self.assertIn("content-type", allowed)
\n
    def test_cors_allowed_response_keeps_security_policy_headers(self):
        response = self.client.get("/api/meta", headers={"Origin": "https://mahitech580.github.io"})
        self.assertEqual(response.headers.get("Access-Control-Allow-Origin"), "https://mahitech580.github.io")
        self.assertEqual(response.headers.get("Content-Security-Policy", "").split(";")[0], "default-src 'none'")
