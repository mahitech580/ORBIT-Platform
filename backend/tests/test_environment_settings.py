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


    def test_zero_port_is_rejected(self):
        with self.assertRaisesRegex(RuntimeError, "DB_PORT must be 1 to 65535"):
            orbit.parse_integer_setting("DB_PORT", "0", 5432, maximum=65535)


    def test_negative_port_is_rejected(self):
        with self.assertRaisesRegex(RuntimeError, "DB_PORT must be 1 to 65535"):
            orbit.parse_integer_setting("DB_PORT", "-1", 5432, maximum=65535)


    def test_port_above_maximum_is_rejected(self):
        with self.assertRaisesRegex(RuntimeError, "DB_PORT must be 1 to 65535"):
            orbit.parse_integer_setting("DB_PORT", "65536", 5432, maximum=65535)


    def test_decimal_port_text_is_rejected(self):
        with self.assertRaisesRegex(RuntimeError, "DB_PORT must be an integer"):
            orbit.parse_integer_setting("DB_PORT", "5432.0", 5432, maximum=65535)


    def test_non_numeric_port_text_is_rejected(self):
        with self.assertRaisesRegex(RuntimeError, "DB_PORT must be an integer"):
            orbit.parse_integer_setting("DB_PORT", "postgres", 5432, maximum=65535)


    def test_float_value_is_rejected_without_truncation(self):
        with self.assertRaisesRegex(RuntimeError, "DB_PORT must be an integer"):
            orbit.parse_integer_setting("DB_PORT", 5432.9, 5432, maximum=65535)


    def test_timeout_minimum_is_accepted(self):
        self.assertEqual(orbit.parse_integer_setting("DB_CONNECT_TIMEOUT", "1", 5, maximum=300), 1)


    def test_timeout_maximum_is_accepted(self):
        self.assertEqual(orbit.parse_integer_setting("DB_CONNECT_TIMEOUT", "300", 5, maximum=300), 300)


    def test_zero_timeout_is_rejected(self):
        with self.assertRaisesRegex(RuntimeError, "DB_CONNECT_TIMEOUT must be 1 to 300"):
            orbit.parse_integer_setting("DB_CONNECT_TIMEOUT", "0", 5, maximum=300)


    def test_timeout_above_maximum_is_rejected(self):
        with self.assertRaisesRegex(RuntimeError, "DB_CONNECT_TIMEOUT must be 1 to 300"):
            orbit.parse_integer_setting("DB_CONNECT_TIMEOUT", "301", 5, maximum=300)


    def test_negative_timeout_is_rejected(self):
        with self.assertRaisesRegex(RuntimeError, "DB_CONNECT_TIMEOUT must be 1 to 300"):
            orbit.parse_integer_setting("DB_CONNECT_TIMEOUT", "-2", 5, maximum=300)


    def test_underscore_in_port_text_is_rejected(self):
        with self.assertRaisesRegex(RuntimeError, "DB_PORT must be an integer"):
            orbit.parse_integer_setting("DB_PORT", "5_432", 5432, maximum=65535)


    def test_fullwidth_port_digits_are_rejected(self):
        with self.assertRaisesRegex(RuntimeError, "DB_PORT must be an integer"):
            orbit.parse_integer_setting("DB_PORT", "５４３２", 5432, maximum=65535)


if __name__ == "__main__":
    unittest.main()
