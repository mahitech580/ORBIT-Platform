"""Archived projects cannot accept new deployment records."""
import unittest
from unittest.mock import patch

import app as orbit


class ArchivedProjectDeploymentTests(unittest.TestCase):
    def setUp(self):
        self.client = orbit.app.test_client()
        self.token = orbit.issue_token({"id": 17, "email": "owner@example.test"})
        self.headers = {"Authorization": "Bearer " + self.token}

    def test_archived_project_returns_conflict_without_writing_a_deployment(self):
        with patch.object(orbit, "owned_project", return_value={"id": 7, "status": "archived"}), \
             patch.object(orbit, "db_execute") as execute:
            response = self.client.post("/api/projects/7/deploy", headers=self.headers, json={})

        self.assertEqual(response.status_code, 409)
        self.assertIn("archived", response.get_json()["error"].lower())
        execute.assert_not_called()

    def test_active_project_can_still_create_a_deployment_record(self):
        row = {
            "id": 12,
            "project_id": 7,
            "version": "1.0.0",
            "status": "in-progress",
            "branch": "main",
            "created_at": "2026-10-31T12:00:00+00:00",
        }
        with patch.object(orbit, "owned_project", return_value={"id": 7, "status": "active"}), \
             patch.object(orbit, "db_execute", return_value=[row]) as execute:
            response = self.client.post("/api/projects/7/deploy", headers=self.headers, json={})

        self.assertEqual(response.status_code, 201, response.get_json())
        self.assertEqual(response.get_json()["deployment"]["id"], 12)
        execute.assert_called_once()


if __name__ == "__main__":
    unittest.main()
