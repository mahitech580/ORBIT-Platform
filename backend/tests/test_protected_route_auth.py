"""Protected workspace routes must not leak records to anonymous callers."""
import unittest

import app as orbit


class ProtectedRouteAuthenticationTests(unittest.TestCase):
    def setUp(self):
        self.client = orbit.app.test_client()

    def test_workspace_routes_require_bearer_authentication(self):
        paths = [
            "/api/auth/me",
            "/api/projects",
            "/api/projects/1",
            "/api/deployments",
            "/api/deployments/1",
            "/api/metrics/1",
            "/api/instances",
            "/api/teams"
        ]
        for path in paths:
            with self.subTest(path=path):
                response = self.client.get(path)
                self.assertEqual(response.status_code, 401)
                self.assertIsInstance(response.get_json().get("error"), str)
                self.assertTrue(response.headers.get("X-Request-ID"))

    def test_invalid_bearer_syntax_is_rejected_before_route_execution(self):
        for header in ("", "Basic abc", "Bearer", "Bearer   "):
            with self.subTest(header=header):
                response = self.client.get("/api/projects", headers={"Authorization": header})
                self.assertEqual(response.status_code, 401)
\n
    def test_anonymous_route_rejection_keeps_security_and_diagnostic_headers(self):
        response = self.client.get("/api/projects")
        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.headers.get("Cache-Control"), "no-store")
        self.assertEqual(response.headers.get("X-Content-Type-Options"), "nosniff")
        self.assertRegex(response.headers.get("X-Request-ID", ""), r"^[a-f0-9]{32}$")
