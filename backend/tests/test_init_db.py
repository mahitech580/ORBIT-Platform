"""The production schema initializer retries only transient PostgreSQL connection failures."""
import unittest
from unittest.mock import MagicMock, patch

import psycopg2
import init_db


class InitializeDatabaseTests(unittest.TestCase):
    @staticmethod
    def connection():
        connection = MagicMock()
        cursor = MagicMock()
        connection.__enter__.return_value = connection
        connection.cursor.return_value.__enter__.return_value = cursor
        return connection, cursor

    def test_initializes_schema_and_closes_connection_on_success(self):
        connection, cursor = self.connection()
        with patch.object(init_db, "get_db", return_value=connection), \
             patch.object(init_db.time, "sleep") as sleep:
            init_db.initialize_schema()

        self.assertTrue(cursor.execute.called)
        self.assertIn("CREATE TABLE IF NOT EXISTS users", cursor.execute.call_args.args[0])
        connection.close.assert_called_once_with()
        sleep.assert_not_called()

    def test_retries_a_transient_connection_failure_then_initializes(self):
        connection, cursor = self.connection()
        with patch.object(
            init_db,
            "get_db",
            side_effect=[psycopg2.OperationalError("database starting"), connection],
        ) as get_db, patch.object(init_db.time, "sleep") as sleep:
            init_db.initialize_schema()

        self.assertEqual(get_db.call_count, 2)
        sleep.assert_called_once_with(2)
        self.assertTrue(cursor.execute.called)
        connection.close.assert_called_once_with()

    def test_stops_after_twelve_transient_failures_with_bounded_backoff(self):
        failures = [psycopg2.OperationalError("database unavailable") for _ in range(12)]
        with patch.object(init_db, "get_db", side_effect=failures) as get_db, \
             patch.object(init_db.time, "sleep") as sleep:
            with self.assertRaisesRegex(RuntimeError, "after 12 attempts"):
                init_db.initialize_schema()

        self.assertEqual(get_db.call_count, 12)
        self.assertEqual(
            [call.args[0] for call in sleep.call_args_list],
            [2, 4, 6, 8, 10, 10, 10, 10, 10, 10, 10],
        )

    def test_does_not_retry_schema_or_programming_errors(self):
        connection, cursor = self.connection()
        cursor.execute.side_effect = ValueError("invalid schema statement")
        with patch.object(init_db, "get_db", return_value=connection) as get_db, \
             patch.object(init_db.time, "sleep") as sleep:
            with self.assertRaisesRegex(ValueError, "invalid schema statement"):
                init_db.initialize_schema()

        get_db.assert_called_once_with()
        sleep.assert_not_called()
        connection.close.assert_called_once_with()


if __name__ == "__main__":
    unittest.main()
