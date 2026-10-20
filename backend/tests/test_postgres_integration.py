"""End-to-end tests against an ephemeral real PostgreSQL database.

These tests are enabled only in CI when ORBIT_RUN_POSTGRES_INTEGRATION=1.
They must never target the hosted production database.
"""
import os
from pathlib import Path
import unittest

import app as orbit


RUN_POSTGRES_INTEGRATION = os.getenv("ORBIT_RUN_POSTGRES_INTEGRATION") == "1"
REPOSITORY_ROOT = Path(__file__).resolve().parents[2]
SCHEMA_PATH = REPOSITORY_ROOT / "database" / "schema.sql"


@unittest.skipUnless(RUN_POSTGRES_INTEGRATION, "requires the isolated PostgreSQL CI service")
class RealPostgresWorkflowTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        schema_sql = SCHEMA_PATH.read_text(encoding="utf-8")
        connection = orbit.get_db()
        try:
            with connection:
                with connection.cursor() as cursor:
                    cursor.execute(schema_sql)
        finally:
            connection.close()
        cls.original_testing = orbit.app.config.get("TESTING", False)
        orbit.app.config["TESTING"] = True

    @classmethod
    def tearDownClass(cls):
        orbit.app.config["TESTING"] = cls.original_testing

    def test_schema_bootstrap_can_run_twice_without_duplicate_constraints(self):
        schema_sql = SCHEMA_PATH.read_text(encoding="utf-8")
        connection = orbit.get_db()
        try:
            with connection:
                with connection.cursor() as cursor:
                    cursor.execute(schema_sql)
                    cursor.execute(
                        "SELECT COUNT(*) FROM pg_constraint "
                        "WHERE conname = %s AND conrelid = 'metrics'::regclass",
                        ("metrics_measurements_valid",),
                    )
                    self.assertEqual(cursor.fetchone()[0], 1)
        finally:
            connection.close()

    def setUp(self):
        self.client = orbit.app.test_client()
        connection = orbit.get_db()
        try:
            with connection:
                with connection.cursor() as cursor:
                    cursor.execute(
                        "TRUNCATE TABLE metrics, logs, instances, deployments, "
                        "projects, teams, users RESTART IDENTITY CASCADE"
                    )
        finally:
            connection.close()

    def register(self, email, username):
        response = self.client.post("/api/auth/register", json={
            "email": email,
            "username": username,
            "password": "correct-horse-battery-42",
            "first_name": "Integration"
        })
        self.assertEqual(response.status_code, 201, response.get_json())
        body = response.get_json()
        self.assertTrue(body["token"])
        return body

    @staticmethod
    def auth(token):
        return {"Authorization": "Bearer " + token}

    def test_api_field_max_lengths_round_trip_without_database_truncation(self):
        user = self.register("long-fields@example.test", "long_fields_user")
        headers = self.auth(user["token"])
        project_response = self.client.post("/api/projects", headers=headers, json={
            "name": "Long field limits project",
            "runtime": "python"
        })
        self.assertEqual(project_response.status_code, 201, project_response.get_json())
        project_id = project_response.get_json()["project"]["id"]

        version = "v" * 80
        branch = "b" * 200
        deployment_response = self.client.post(
            f"/api/projects/{project_id}/deploy",
            headers=headers,
            json={"version": version, "branch": branch},
        )
        self.assertEqual(deployment_response.status_code, 201, deployment_response.get_json())
        deployment = deployment_response.get_json()["deployment"]
        self.assertEqual(deployment["version"], version)
        self.assertEqual(deployment["branch"], branch)

        instance_type = "i" * 80
        instance_response = self.client.post("/api/instances", headers=headers, json={
            "project_id": project_id,
            "deployment_id": deployment["id"],
            "name": "max-supported-instance",
            "instance_type": instance_type,
        })
        self.assertEqual(instance_response.status_code, 201, instance_response.get_json())
        self.assertEqual(instance_response.get_json()["instance"]["instance_type"], instance_type)

    def test_register_project_deployment_instance_and_metric_round_trip(self):
        registered = self.register("integration@example.test", "integration_user")
        token = registered["token"]

        login = self.client.post("/api/auth/login", json={
            "email": "integration@example.test",
            "password": "correct-horse-battery-42"
        })
        self.assertEqual(login.status_code, 200, login.get_json())
        self.assertEqual(login.get_json()["user"]["id"], registered["user"]["id"])

        teams = self.client.get("/api/teams", headers=self.auth(token))
        self.assertEqual(teams.status_code, 200, teams.get_json())
        self.assertEqual(len(teams.get_json()["teams"]), 1)

        project_response = self.client.post("/api/projects", headers=self.auth(token), json={
            "name": "PostgreSQL integration project",
            "description": "Created by the isolated CI end-to-end test",
            "runtime": "python"
        })
        self.assertEqual(project_response.status_code, 201, project_response.get_json())
        project = project_response.get_json()["project"]
        project_id = project["id"]

        deploy_response = self.client.post(
            f"/api/projects/{project_id}/deploy",
            headers=self.auth(token),
            json={"version": "2.1.0-test", "branch": "integration-test"}
        )
        self.assertEqual(deploy_response.status_code, 201, deploy_response.get_json())
        deployment = deploy_response.get_json()["deployment"]
        self.assertEqual(deployment["project_id"], project_id)

        instance_response = self.client.post("/api/instances", headers=self.auth(token), json={
            "project_id": project_id,
            "name": "integration-instance",
            "instance_type": "test-small",
            "deployment_id": deployment["id"]
        })
        self.assertEqual(instance_response.status_code, 201, instance_response.get_json())
        self.assertEqual(instance_response.get_json()["instance"]["project_id"], project_id)

        metric_response = self.client.post(
            f"/api/metrics/{project_id}",
            headers=self.auth(token),
            json={
                "cpu_usage": 23.75,
                "memory_usage": 512,
                "requests_total": 80,
                "errors_total": 3,
                "response_time_ms": 47.25,
                "timestamp": "2026-10-14T12:00:00+05:30"
            }
        )
        self.assertEqual(metric_response.status_code, 201, metric_response.get_json())
        stored_metric = metric_response.get_json()["metric"]
        self.assertEqual(stored_metric["project_id"], project_id)
        self.assertEqual(stored_metric["cpu_usage"], 23.75)
        self.assertEqual(stored_metric["timestamp"], "2026-10-14T06:30:00")

        metrics_response = self.client.get(f"/api/metrics/{project_id}", headers=self.auth(token))
        self.assertEqual(metrics_response.status_code, 200, metrics_response.get_json())
        metrics_body = metrics_response.get_json()
        self.assertEqual(len(metrics_body["metrics"]), 1)
        self.assertEqual(metrics_body["metrics"][0]["id"], stored_metric["id"])
        self.assertEqual(metrics_body["summary"]["avg_cpu"], 23.75)
        self.assertEqual(metrics_body["summary"]["avg_memory"], 512)
        self.assertEqual(metrics_body["summary"]["total_requests"], 80)

        deployments = self.client.get("/api/deployments", headers=self.auth(token))
        self.assertEqual(deployments.status_code, 200, deployments.get_json())
        self.assertEqual(deployments.get_json()["deployments"][0]["project_name"], "PostgreSQL integration project")

        instances = self.client.get("/api/instances", headers=self.auth(token))
        self.assertEqual(instances.status_code, 200, instances.get_json())
        self.assertEqual(instances.get_json()["instances"][0]["name"], "integration-instance")

    def test_postgres_rejects_invalid_metric_values_outside_the_api(self):
        registered = self.register("constraints@example.test", "constraints_user")
        created = self.client.post("/api/projects", headers=self.auth(registered["token"]), json={
            "name": "Constraint test project",
            "runtime": "python"
        })
        self.assertEqual(created.status_code, 201, created.get_json())
        project_id = created.get_json()["project"]["id"]

        invalid_rows = [
            ("cpu above 100", project_id, 101, 0, 0, 0, 0),
            ("negative memory", project_id, 0, -1, 0, 0, 0),
            ("negative requests", project_id, 0, 0, -1, 0, 0),
            ("negative errors", project_id, 0, 0, 0, -1, 0),
            ("negative response time", project_id, 0, 0, 0, 0, -1),
            ("errors greater than requests", project_id, 0, 0, 2, 3, 0),
        ]
        connection = orbit.get_db()
        try:
            for label, project_id, cpu, memory, requests, errors, response_time in invalid_rows:
                with self.subTest(label=label):
                    try:
                        with connection.cursor() as cursor:
                            with self.assertRaises(orbit.psycopg2.errors.CheckViolation):
                                cursor.execute(
                                    "INSERT INTO metrics "
                                    "(project_id, cpu_usage, memory_usage, requests_total, "
                                    "errors_total, response_time_ms) "
                                    "VALUES (%s, %s, %s, %s, %s, %s)",
                                    (project_id, cpu, memory, requests, errors, response_time),
                                )
                    finally:
                        connection.rollback()
        finally:
            connection.close()

    def test_instance_api_rejects_deployment_from_another_project(self):
        user = self.register("instance-api-link@example.test", "instance_api_link_user")
        headers = self.auth(user["token"])
        first_project = self.client.post("/api/projects", headers=headers, json={
            "name": "API source project", "runtime": "python"
        })
        second_project = self.client.post("/api/projects", headers=headers, json={
            "name": "API target project", "runtime": "python"
        })
        self.assertEqual(first_project.status_code, 201, first_project.get_json())
        self.assertEqual(second_project.status_code, 201, second_project.get_json())
        first_id = first_project.get_json()["project"]["id"]
        second_id = second_project.get_json()["project"]["id"]
        deployment = self.client.post(
            f"/api/projects/{first_id}/deploy",
            headers=headers,
            json={"version": "1.0.0", "branch": "main"},
        )
        self.assertEqual(deployment.status_code, 201, deployment.get_json())

        response = self.client.post("/api/instances", headers=headers, json={
            "project_id": second_id,
            "deployment_id": deployment.get_json()["deployment"]["id"],
            "name": "invalid-cross-project-worker",
            "instance_type": "test-small",
        })
        self.assertEqual(response.status_code, 400, response.get_json())
        instances = self.client.get("/api/instances", headers=headers)
        self.assertEqual(instances.status_code, 200, instances.get_json())
        self.assertEqual(instances.get_json()["instances"], [])

    def test_database_rejects_instance_linked_to_another_projects_deployment(self):
        user = self.register("instance-link@example.test", "instance_link_user")
        headers = self.auth(user["token"])
        first_project = self.client.post("/api/projects", headers=headers, json={
            "name": "First project", "runtime": "python"
        })
        second_project = self.client.post("/api/projects", headers=headers, json={
            "name": "Second project", "runtime": "python"
        })
        self.assertEqual(first_project.status_code, 201, first_project.get_json())
        self.assertEqual(second_project.status_code, 201, second_project.get_json())
        first_id = first_project.get_json()["project"]["id"]
        second_id = second_project.get_json()["project"]["id"]

        deployment = self.client.post(
            f"/api/projects/{first_id}/deploy",
            headers=headers,
            json={"version": "1.0.0", "branch": "main"},
        )
        self.assertEqual(deployment.status_code, 201, deployment.get_json())
        deployment_id = deployment.get_json()["deployment"]["id"]

        connection = orbit.get_db()
        try:
            with connection.cursor() as cursor:
                with self.assertRaises(orbit.psycopg2.errors.ForeignKeyViolation):
                    cursor.execute(
                        "INSERT INTO instances (deployment_id, project_id, name, instance_type) "
                        "VALUES (%s, %s, %s, %s)",
                        (deployment_id, second_id, "cross-project-worker", "test-small"),
                    )
            connection.rollback()
        finally:
            connection.close()

    def test_a_different_user_cannot_read_or_write_another_users_project_metrics(self):
        owner = self.register("owner@example.test", "integration_owner")
        stranger = self.register("stranger@example.test", "integration_stranger")
        created = self.client.post("/api/projects", headers=self.auth(owner["token"]), json={
            "name": "Private project",
            "runtime": "python"
        })
        self.assertEqual(created.status_code, 201, created.get_json())
        project_id = created.get_json()["project"]["id"]

        read_response = self.client.get(
            f"/api/metrics/{project_id}",
            headers=self.auth(stranger["token"])
        )
        self.assertEqual(read_response.status_code, 404)

        write_response = self.client.post(
            f"/api/metrics/{project_id}",
            headers=self.auth(stranger["token"]),
            json={"cpu_usage": 5}
        )
        self.assertEqual(write_response.status_code, 404)

        owner_metrics = self.client.get(
            f"/api/metrics/{project_id}",
            headers=self.auth(owner["token"])
        )
        self.assertEqual(owner_metrics.status_code, 200, owner_metrics.get_json())
        self.assertEqual(owner_metrics.get_json()["metrics"], [])


if __name__ == "__main__":
    unittest.main()
