"""Database environment settings must be parsed without silent truncation."""
import unittest

import app as orbit


class IntegerSettingTests(unittest.TestCase):
    def test_missing_setting_uses_default(self):
        self.assertEqual(orbit.parse_integer_setting("DB_PORT", None, 5432), 5432)

    def test_blank_setting_uses_default(self):
        self.assertEqual(orbit.parse_integer_setting("DB_PORT", "   ", 5432), 5432)

    def test_numeric_string_is_parsed(self):
        self.assertEqual(orbit.parse_integer_setting("DB_PORT", "6432", 5432, maximum=65535), 6432)

    def test_integer_value_is_preserved(self):
        self.assertEqual(orbit.parse_integer_setting("DB_PORT", 6432, 5432, maximum=65535), 6432)

    def test_boolean_is_not_accepted_as_integer(self):
        with self.assertRaisesRegex(RuntimeError, "DB_PORT must be an integer"):
            orbit.parse_integer_setting("DB_PORT", True, 5432, maximum=65535)


    def test_minimum_port_is_accepted(self):
        self.assertEqual(orbit.parse_integer_setting("DB_PORT", "1", 5432, maximum=65535), 1)


    def test_maximum_port_is_accepted(self):
        self.assertEqual(orbit.parse_integer_setting("DB_PORT", "65535", 5432, maximum=65535), 65535)


if __name__ == "__main__":
    unittest.main()
