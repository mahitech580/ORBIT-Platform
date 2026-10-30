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


if __name__ == "__main__":
    unittest.main()
