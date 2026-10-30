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


if __name__ == "__main__":
    unittest.main()
