"""Metrics summaries distinguish absent measurements from real zero values."""
import unittest

import app as orbit


class MetricSummaryTests(unittest.TestCase):
    def test_empty_history_reports_missing_values(self):
        self.assertEqual(
            orbit.summarize_metric_rows([]),
            {"avg_cpu": None, "avg_memory": None, "total_requests": None},
        )

    def test_real_zero_measurements_remain_zero(self):
        self.assertEqual(
            orbit.summarize_metric_rows([{
                "cpu_usage": 0,
                "memory_usage": 0,
                "requests_total": 0,
            }]),
            {"avg_cpu": 0, "avg_memory": 0, "total_requests": 0},
        )

    def test_missing_fields_are_independent_of_recorded_fields(self):
        self.assertEqual(
            orbit.summarize_metric_rows([
                {"cpu_usage": None, "memory_usage": 512, "requests_total": None},
                {"cpu_usage": None, "memory_usage": None, "requests_total": 0},
            ]),
            {"avg_cpu": None, "avg_memory": 512, "total_requests": 0},
        )

    def test_request_totals_sum_only_present_counter_values(self):
        self.assertEqual(
            orbit.summarize_metric_rows([
                {"cpu_usage": 20, "memory_usage": None, "requests_total": 8},
                {"cpu_usage": 40, "memory_usage": None, "requests_total": None},
            ]),
            {"avg_cpu": 30, "avg_memory": None, "total_requests": 8},
        )

    def test_invalid_legacy_measurements_are_null_in_api_rows(self):
        source = {
            "id": 7,
            "cpu_usage": 101,
            "memory_usage": -1,
            "requests_total": 10,
            "errors_total": 11,
            "response_time_ms": 1000000,
            "timestamp": "2026-10-31T12:00:00",
        }
        sanitized = orbit.sanitize_metric_row(source)
        self.assertEqual(sanitized["cpu_usage"], None)
        self.assertEqual(sanitized["memory_usage"], None)
        self.assertEqual(sanitized["requests_total"], 10)
        self.assertEqual(sanitized["errors_total"], None)
        self.assertEqual(sanitized["response_time_ms"], None)
        self.assertEqual(sanitized["timestamp"], source["timestamp"])
        self.assertEqual(source["cpu_usage"], 101)

    def test_valid_legacy_measurements_are_preserved_in_api_rows(self):
        source = {
            "cpu_usage": 23.5,
            "memory_usage": 512,
            "requests_total": 80,
            "errors_total": 3,
            "response_time_ms": 47.25,
        }
        self.assertEqual(orbit.sanitize_metric_row(source), source)

    def test_invalid_legacy_measurements_are_ignored(self):
        self.assertEqual(
            orbit.summarize_metric_rows([
                {"cpu_usage": 101, "memory_usage": -1, "requests_total": -1},
                {"cpu_usage": float("nan"), "memory_usage": 2147483648, "requests_total": 2147483648},
                {"cpu_usage": 40, "memory_usage": 512, "requests_total": 8},
            ]),
            {"avg_cpu": 40, "avg_memory": 512, "total_requests": 8},
        )

    def test_non_finite_and_fractional_integer_measurements_are_unavailable(self):
        self.assertEqual(
            orbit.summarize_metric_rows([
                {"cpu_usage": float("inf"), "memory_usage": 10.5, "requests_total": 2.5},
            ]),
            {"avg_cpu": None, "avg_memory": None, "total_requests": None},
        )

    def test_boolean_measurements_are_not_counted_as_numbers(self):
        self.assertEqual(
            orbit.summarize_metric_rows([
                {"cpu_usage": True, "memory_usage": True, "requests_total": True},
            ]),
            {"avg_cpu": None, "avg_memory": None, "total_requests": None},
        )


if __name__ == "__main__":
    unittest.main()
