"""Public API metadata stays explicit about deployment capabilities."""
import unittest

import app as orbit


class MetadataEndpointTests(unittest.TestCase):
    def setUp(self):
        self.client = orbit.app.test_client()

    def test_metadata_declares_supported_and_unimplemented_capabilities(self):
        response = self.client.get("/api/meta")
        self.assertEqual(response.status_code, 200)
        payload = response.get_json()
        self.assertEqual(payload["name"], "ORBIT Platform")
        self.assertTrue(payload["version"])
        self.assertIs(payload["capabilities"]["project_management"], True)
        self.assertIs(payload["capabilities"]["deployment_tracking"], True)
        self.assertIs(payload["capabilities"]["metrics_reporting"], True)
        self.assertIs(payload["capabilities"]["cloud_resource_provisioning"], False)
        self.assertIs(payload["capabilities"]["build_execution"], False)

    def test_metadata_does_not_require_a_bearer_token(self):
        response = self.client.get("/api/meta")
        self.assertEqual(response.status_code, 200)
\n
    def test_metadata_response_contains_content_security_policy(self):
        response = self.client.get("/api/meta")
        self.assertEqual(
            response.headers.get("Content-Security-Policy"),
            "default-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'",
        )
