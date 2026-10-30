"""Production-only authentication configuration must fail closed."""
import unittest

import app as orbit


class ProductionSecurityConfigurationTests(unittest.TestCase):
    def test_production_requires_at_least_32_secret_bytes(self):
        with self.assertRaisesRegex(RuntimeError, "at least 32 bytes"):
            orbit.validate_production_secret(True, "short")
        orbit.validate_production_secret(True, "R7!mQ2#vN9$kL4@xP6%zT1^cB8&hD3*e")

    def test_production_rejects_low_diversity_secrets(self):
        with self.assertRaisesRegex(RuntimeError, "diverse"):
            orbit.validate_production_secret(True, "a" * 32)
        with self.assertRaisesRegex(RuntimeError, "diverse"):
            orbit.validate_production_secret(True, "12345678901234567890123456789012")

    def test_production_rejects_known_placeholder_secret_values(self):
        with self.assertRaisesRegex(RuntimeError, "random secret"):
            orbit.validate_production_secret(True, "replace-with-a-long-random-local-secret")
        with self.assertRaisesRegex(RuntimeError, "random secret"):
            orbit.validate_production_secret(True, "development-only-" + "x" * 32)

    def test_nonproduction_can_use_the_documented_development_secret(self):
        orbit.validate_production_secret(False, "development-only-key")

    def test_production_cannot_enable_the_shared_demo_account(self):
        with self.assertRaisesRegex(RuntimeError, "ENABLE_DEMO_AUTH must be false"):
            orbit.validate_demo_auth_setting(True, True)
        orbit.validate_demo_auth_setting(True, False)

    def test_nonproduction_may_explicitly_enable_demo_auth(self):
        orbit.validate_demo_auth_setting(False, True)


if __name__ == "__main__":
    unittest.main()
