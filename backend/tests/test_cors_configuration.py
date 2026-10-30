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
