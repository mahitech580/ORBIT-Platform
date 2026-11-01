"""Instance records are inserted only against locked, owned project deployments."""
import unittest
from unittest.mock import patch

import app as orbit


class InstanceCreationContractTests(unittest.TestCase):
    def setUp(self):
        self.client = orbit.app.test_client()
        self.token = orbit.issue_token({"id": 17, "email": "owner@example.test"})
        self.headers = {"Authorization": "Bearer " + self.token}
        self.payload = {
            "project_id": 7,
            "deployment_id": 12,
            "name": "api-worker",
            "instance_type": "small",
        }

    def test_instance_insert_locks_the_owned_project_and_matching_deployment(self):
        row = {
            "id": 31,
            "deployment_id": 12,
            "project_id": 7,
            "name": "api-worker",
            "instance_type": "small",
            "status": "running",
        }
        with patch.object(orbit, "owned_project") as owned, \
             patch.object(orbit, "db_execute", return_value=[row]) as execute:
            response = self.client.post("/api/instances", headers=self.headers, json=self.payload)

        self.assertEqual(response.status_code, 201, response.get_json())
        self.assertEqual(response.get_json()["instance"], row)
        owned.assert_not_called()
        query, params = execute.call_args.args[:2]
        self.assertIn("FOR UPDATE OF p", query)
        self.assertIn("FOR UPDATE OF d", query)
        self.assertEqual(params, (7, 17, 12, 12, "api-worker", "small", "running"))

    def test_missing_or_foreign_deployment_is_rejected_without_insert(self):
        with patch.object(orbit, "owned_project", return_value={"id": 7}), \
             patch.object(orbit, "db_execute", return_value=[]) as execute:
            response = self.client.post("/api/instances", headers=self.headers, json=self.payload)

        self.assertEqual(response.status_code, 400)
        self.assertIn("deployment", response.get_json()["error"].lower())
        execute.assert_called_once()

    def test_missing_or_unowned_project_remains_not_found(self):
        with patch.object(orbit, "owned_project", return_value=None), \
             patch.object(orbit, "db_execute", return_value=[]) as execute:
            response = self.client.post("/api/instances", headers=self.headers, json=self.payload)

        self.assertEqual(response.status_code, 404)
        execute.assert_called_once()


if __name__ == "__main__":
    unittest.main()
