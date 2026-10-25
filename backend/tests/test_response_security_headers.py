"""Browser-facing security header contract tests for ORBIT API responses."""
import unittest

import app as orbit


class ResponseSecurityHeaderTests(unittest.TestCase):
    def setUp(self):
        self.client = orbit.app.test_client()

    def test_content_security_policy_blocks_unneeded_resources(self):
        response = self.client.get("/api/meta")
        self.assertEqual(response.headers.get("Content-Security-Policy"), "default-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'")

    def test_cross_domain_policy_header_disables_legacy_cross_domain_access(self):
        response = self.client.get("/api/meta")
        self.assertEqual(response.headers.get("X-Permitted-Cross-Domain-Policies"), "none")

    def test_cross_origin_opener_policy_is_same_origin(self):
        response = self.client.get("/api/meta")
        self.assertEqual(response.headers.get("Cross-Origin-Opener-Policy"), "same-origin")

    def test_health_response_includes_security_headers(self):
        response = self.client.get("/api/health")
        self.assertIn(response.status_code, (200, 503))
        self.assertEqual(response.headers.get("X-Content-Type-Options"), "nosniff")
        self.assertEqual(response.headers.get("Cache-Control"), "no-store")


if __name__ == "__main__":
    unittest.main()

    def test_meta_response_disables_caching(self):
        response = self.client.get("/api/meta")
        self.assertEqual(response.headers.get("Cache-Control"), "no-store")

    def test_meta_response_sets_pragma_no_cache(self):
        response = self.client.get("/api/meta")
        self.assertEqual(response.headers.get("Pragma"), "no-cache")

    def test_meta_response_denies_frames(self):
        response = self.client.get("/api/meta")
        self.assertEqual(response.headers.get("X-Frame-Options"), "DENY")

    def test_meta_response_sets_referrer_policy(self):
        response = self.client.get("/api/meta")
        self.assertEqual(response.headers.get("Referrer-Policy"), "no-referrer")

    def test_meta_response_restricts_browser_capabilities(self):
        response = self.client.get("/api/meta")
        self.assertEqual(response.headers.get("Permissions-Policy"), "camera=(), microphone=(), geolocation=()")

    def test_meta_response_uses_nosniff(self):
        response = self.client.get("/api/meta")
        self.assertEqual(response.headers.get("X-Content-Type-Options"), "nosniff")

    def test_request_id_is_32_character_hex(self):
        response = self.client.get("/api/meta")
        self.assertRegex(response.headers.get("X-Request-ID", ""), r"^[a-f0-9]{32}$")
