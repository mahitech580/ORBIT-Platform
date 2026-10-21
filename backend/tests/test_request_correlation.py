"""Regression tests for request correlation on normal and error responses."""
import re
import unittest

import app as orbit


class RequestCorrelationTests(unittest.TestCase):
    def setUp(self):
        self.client = orbit.app.test_client()

    def test_metadata_response_has_server_generated_request_id(self):
        response = self.client.get("/api/meta")
        self.assertEqual(response.status_code, 200)
        self.assertRegex(response.headers.get("X-Request-ID", ""), r"^[0-9a-f]{32}$")

    def test_each_request_gets_a_fresh_request_id(self):
        first = self.client.get("/api/meta")
        second = self.client.get("/api/meta")
        self.assertNotEqual(first.headers.get("X-Request-ID"), second.headers.get("X-Request-ID"))

    def test_unknown_route_error_includes_request_id(self):
        response = self.client.get("/api/route-that-does-not-exist")
        self.assertEqual(response.status_code, 404)
        self.assertRegex(response.headers.get("X-Request-ID", ""), r"^[0-9a-f]{32}$")

    def test_caller_cannot_override_request_id_with_a_header(self):
        response = self.client.get("/api/meta", headers={"X-Request-ID": "caller-controlled"})
        self.assertEqual(response.status_code, 200)
        self.assertNotEqual(response.headers.get("X-Request-ID"), "caller-controlled")
        self.assertRegex(response.headers.get("X-Request-ID", ""), r"^[0-9a-f]{32}$")


    def test_api_responses_are_not_cached_by_browsers_or_shared_proxies(self):
        response = self.client.get("/api/meta")
        self.assertEqual(response.headers.get("Cache-Control"), "no-store")
        self.assertEqual(response.headers.get("Pragma"), "no-cache")
