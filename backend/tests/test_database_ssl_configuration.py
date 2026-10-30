"""PostgreSQL connections must not silently downgrade TLS in production."""
import unittest
from unittest.mock import patch

import app as orbit


class DatabaseSslConfigurationTests(unittest.TestCase):
    def test_production_rejects_tls_downgrade_modes(self):
        for mode in ("disable", "allow", "prefer"):
            with self.subTest(mode=mode):
                with self.assertRaisesRegex(RuntimeError, "must require TLS"):
                    orbit.validate_database_sslmode(True, mode)

    def test_production_accepts_tls_enforcing_modes(self):
        for mode in ("require", "verify-ca", "verify-full"):
            with self.subTest(mode=mode):
                self.assertEqual(orbit.validate_database_sslmode(True, mode), mode)

    def test_development_can_explicitly_use_non_tls_modes(self):
        self.assertEqual(orbit.validate_database_sslmode(False, "disable"), "disable")

    def test_unknown_ssl_modes_are_rejected(self):
        with self.assertRaisesRegex(RuntimeError, "valid PostgreSQL SSL mode"):
            orbit.validate_database_sslmode(False, "sometimes")

    def test_production_import_rejects_insecure_ssl_configuration_before_connecting(self):
        import os
        from pathlib import Path
        import subprocess
        import sys

        environment = os.environ.copy()
        environment.update({
            "APP_ENV": "production",
            "SECRET_KEY": "R7!mQ2#vN9$kL4@xP6%zT1^cB8&hD3*e",
            "DATABASE_URL": "postgresql://user:pass@example.test/orbit",
            "DB_SSLMODE": "disable",
        })
        result = subprocess.run(
            [sys.executable, "-c", "import app"],
            cwd=Path(__file__).resolve().parents[1],
            env=environment,
            capture_output=True,
            text=True,
            check=False,
        )
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("Production DB_SSLMODE must require TLS", result.stderr)
        self.assertNotIn("NameError", result.stderr)

    def test_database_url_connection_cannot_override_production_tls_with_disable(self):
        with patch.object(orbit, "DATABASE_URL", "postgresql://user:pass@example.test/orbit"), \
             patch.object(orbit, "IS_PRODUCTION", True), \
             patch.dict(orbit.os.environ, {"DB_SSLMODE": "disable"}), \
             patch.object(orbit.psycopg2, "connect") as connect:
            with self.assertRaisesRegex(RuntimeError, "must require TLS"):
                orbit.get_db()
        connect.assert_not_called()

    def test_production_defaults_to_tls_when_sslmode_is_missing_or_blank(self):
        for value in (None, "", "   "):
            with self.subTest(value=value):
                self.assertEqual(orbit.resolve_database_sslmode(True, value), "require")

    def test_development_keeps_libpq_default_when_sslmode_is_missing_or_blank(self):
        for value in (None, "", "   "):
            with self.subTest(value=value):
                self.assertIsNone(orbit.resolve_database_sslmode(False, value))

    def test_direct_database_connection_defaults_to_tls_in_production(self):
        database_settings = {
            "host": "db.example.test",
            "database": "orbit",
            "user": "orbit",
            "password": "test-only",
            "port": 5432,
            "connect_timeout": 5,
            "options": orbit.POSTGRES_SESSION_OPTIONS,
        }
        with patch.object(orbit, "DATABASE_URL", ""), \
             patch.object(orbit, "IS_PRODUCTION", True), \
             patch.dict(orbit.os.environ, {"DB_SSLMODE": " "}), \
             patch.object(orbit, "DATABASE", database_settings), \
             patch.object(orbit.psycopg2, "connect") as connect:
            orbit.get_db()
        self.assertEqual(connect.call_args.kwargs["sslmode"], "require")

    def test_database_url_connection_defaults_to_tls_in_production(self):
        database_url = "postgresql://user:pass@example.test/orbit"
        with patch.object(orbit, "DATABASE_URL", database_url), \
             patch.object(orbit, "IS_PRODUCTION", True), \
             patch.dict(orbit.os.environ, {"DB_SSLMODE": " "}), \
             patch.object(orbit.psycopg2, "connect") as connect:
            orbit.get_db()
        self.assertEqual(connect.call_args.args[0], database_url)
        self.assertEqual(connect.call_args.kwargs["sslmode"], "require")

    def test_direct_and_url_connections_identify_the_application(self):
        with patch.object(orbit, "DATABASE_URL", ""), \
             patch.object(orbit.psycopg2, "connect") as direct_connect:
            orbit.get_db()
        self.assertEqual(
            direct_connect.call_args.kwargs["application_name"],
            orbit.POSTGRES_APPLICATION_NAME,
        )

        with patch.object(orbit, "DATABASE_URL", "postgresql://user:pass@example.test/orbit"), \
             patch.object(orbit.psycopg2, "connect") as url_connect:
            orbit.get_db()
        self.assertEqual(
            url_connect.call_args.kwargs["application_name"],
            orbit.POSTGRES_APPLICATION_NAME,
        )


if __name__ == "__main__":
    unittest.main()
