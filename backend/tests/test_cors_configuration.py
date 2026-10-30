import unittest
import app as orbit

class CorsConfigurationTests(unittest.TestCase):
    def test_production_default_is_pages_only(self):
        self.assertEqual(orbit.parse_cors_origins(None, is_production=True), ["https://mahitech580.github.io"])

    def test_development_default_keeps_localhost(self):
        self.assertIn("http://localhost:3000", orbit.parse_cors_origins(None))

    def test_wildcard_is_rejected(self):
        with self.assertRaisesRegex(RuntimeError, "wildcard"):
            orbit.parse_cors_origins("*")

    def test_paths_and_credentials_are_rejected(self):
        for origin in ("https://example.com/api", "https://user:pass@example.com"):
            with self.assertRaises(RuntimeError):
                orbit.parse_cors_origins(origin)

    def test_explicit_production_allowlist_is_authoritative(self):
        self.assertEqual(
            orbit.parse_cors_origins("https://api.example.test", is_production=True),
            ["https://api.example.test"],
        )

    def test_production_rejects_insecure_http_origins(self):
        with self.assertRaisesRegex(RuntimeError, "must use HTTPS"):
            orbit.parse_cors_origins("http://api.example.test", is_production=True)

    def test_production_accepts_https_while_development_keeps_http_localhost(self):
        self.assertEqual(
            orbit.parse_cors_origins("https://api.example.test", is_production=True),
            ["https://api.example.test"],
        )
        self.assertEqual(
            orbit.parse_cors_origins("http://localhost:3000", is_production=False),
            ["http://localhost:3000"],
        )

    def test_explicit_allowlist_includes_only_the_origins_that_were_configured(self):
        self.assertEqual(
            orbit.parse_cors_origins("https://api.example.test, https://mahitech580.github.io"),
            ["https://api.example.test", "https://mahitech580.github.io"],
        )
