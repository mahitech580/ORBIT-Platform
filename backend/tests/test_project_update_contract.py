"""Project updates report deletion/ownership races instead of false success."""
import unittest
from unittest.mock import patch

import app as orbit


class ProjectUpdateContractTests(unittest.TestCase):
    def setUp(self):
        self.client = orbit.app.test_client()
        self.token = orbit.issue_token({"id": 17, "email": "owner@example.test"})
        self.headers = {"Authorization": "Bearer " + self.token}
        self.current = {
            "id": 7,
            "name": "Before",
            "description": "",
            "runtime": "python",
            "status": "active",
        }

    def test_update_returns_not_found_if_project_disappears_before_write(self):
        with patch.object(orbit, "owned_project", return_value=self.current), \
             patch.object(orbit, "db_execute", return_value=[]) as execute:
            response = self.client.put(
                "/api/projects/7",
                headers=self.headers,
                json={"name": "After"},
            )

        self.assertEqual(response.status_code, 404)
        execute.assert_called_once()
        self.assertTrue(execute.call_args.kwargs["returning"])
        self.assertIn("RETURNING p.id", execute.call_args.args[0])

    def test_update_returns_the_row_from_its_atomic_write(self):
        updated = {
            "id": 7,
            "team_id": 3,
            "name": "After",
            "description": "",
            "runtime": "python",
            "status": "active",
            "created_at": "2026-10-31T12:00:00+00:00",
            "updated_at": "2026-11-01T12:00:00+00:00",
            "team_name": "Default Team",
        }
        with patch.object(orbit, "owned_project", return_value=self.current) as owned, \
             patch.object(orbit, "db_execute", return_value=[updated]) as execute:
            response = self.client.put(
                "/api/projects/7",
                headers=self.headers,
                json={"name": "After"},
            )

        self.assertEqual(response.status_code, 200, response.get_json())
        self.assertEqual(response.get_json()["project"], updated)
        self.assertEqual(owned.call_count, 1)
        self.assertTrue(execute.call_args.kwargs["returning"])
        self.assertIn("t.name AS team_name", execute.call_args.args[0])


if __name__ == "__main__":
    unittest.main()
