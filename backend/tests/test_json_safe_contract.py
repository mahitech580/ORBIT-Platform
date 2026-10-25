"""End-to-end contract for recursively normalized JSON response payloads."""
import json
import unittest
from datetime import date, datetime, timezone
from decimal import Decimal

import app as orbit


class JsonSafeContractTests(unittest.TestCase):
    def test_mixed_database_values_produce_strict_json_payload(self):
        payload = {
            "money": Decimal("12.50"),
            "date": date(2026, 10, 25),
            "created_at": datetime(2026, 10, 25, 12, 30, tzinfo=timezone.utc),
            "values": [Decimal("Infinity"), {"amount": Decimal("2.75")}],
        }
        normalized = orbit.json_safe(payload)
        encoded = json.dumps(normalized, allow_nan=False)
        decoded = json.loads(encoded)
        self.assertEqual(decoded["money"], 12.5)
        self.assertEqual(decoded["date"], "2026-10-25")
        self.assertEqual(decoded["created_at"], "2026-10-25T12:30:00+00:00")
        self.assertIsNone(decoded["values"][0])
        self.assertEqual(decoded["values"][1]["amount"], 2.75)

    def test_json_safe_regression_case_001(self):
        value = "case_001"
        normalized = orbit.json_safe(value)
        encoded = json.dumps(normalized, allow_nan=False)
        self.assertEqual(json.loads(encoded), "case_001")

    def test_json_safe_regression_case_002(self):
        value = 2
        normalized = orbit.json_safe(value)
        encoded = json.dumps(normalized, allow_nan=False)
        self.assertEqual(json.loads(encoded), 2)

    def test_json_safe_regression_case_003(self):
        value = 0.3
        normalized = orbit.json_safe(value)
        encoded = json.dumps(normalized, allow_nan=False)
        self.assertEqual(json.loads(encoded), 0.3)

    def test_json_safe_regression_case_004(self):
        value = [4, "item_004"]
        normalized = orbit.json_safe(value)
        encoded = json.dumps(normalized, allow_nan=False)
        self.assertEqual(json.loads(encoded), [4, "item_004"])

    def test_json_safe_regression_case_005(self):
        value = {"index": 5, "enabled": false}
        normalized = orbit.json_safe(value)
        encoded = json.dumps(normalized, allow_nan=False)
        self.assertEqual(json.loads(encoded), {"index": 5, "enabled": false})

    def test_json_safe_regression_case_006(self):
        value = ({"index": 6, "values": (6, 7)})
        normalized = orbit.json_safe(value)
        encoded = json.dumps(normalized, allow_nan=False)
        self.assertEqual(json.loads(encoded), {"index": 6, "values": [6, 7]})

    def test_json_safe_regression_case_007(self):
        value = [{"index": 7}, [{"nested": 8}]]
        normalized = orbit.json_safe(value)
        encoded = json.dumps(normalized, allow_nan=False)
        self.assertEqual(json.loads(encoded), [{"index": 7}, [{"nested": 8}]])

    def test_json_safe_regression_case_008(self):
        value = {"outer": {"inner": {"value": 8}}}
        normalized = orbit.json_safe(value)
        encoded = json.dumps(normalized, allow_nan=False)
        self.assertEqual(json.loads(encoded), {"outer": {"inner": {"value": 8}}})

    def test_json_safe_regression_case_009(self):
        value = [True, False, None, 9]
        normalized = orbit.json_safe(value)
        encoded = json.dumps(normalized, allow_nan=False)
        self.assertEqual(json.loads(encoded), [true, false, null, 9])

    def test_json_safe_regression_case_010(self):
        value = {"unicode": "ORBIT-010-✓", "count": 10}
        normalized = orbit.json_safe(value)
        encoded = json.dumps(normalized, allow_nan=False)
        self.assertEqual(json.loads(encoded), {"unicode": "ORBIT-010-✓", "count": 10})

    def test_json_safe_regression_case_011(self):
        value = "case_011"
        normalized = orbit.json_safe(value)
        encoded = json.dumps(normalized, allow_nan=False)
        self.assertEqual(json.loads(encoded), "case_011")

    def test_json_safe_regression_case_012(self):
        value = 12
        normalized = orbit.json_safe(value)
        encoded = json.dumps(normalized, allow_nan=False)
        self.assertEqual(json.loads(encoded), 12)

    def test_json_safe_regression_case_013(self):
        value = 1.3
        normalized = orbit.json_safe(value)
        encoded = json.dumps(normalized, allow_nan=False)
        self.assertEqual(json.loads(encoded), 1.3)

    def test_json_safe_regression_case_014(self):
        value = [14, "item_014"]
        normalized = orbit.json_safe(value)
        encoded = json.dumps(normalized, allow_nan=False)
        self.assertEqual(json.loads(encoded), [14, "item_014"])

    def test_json_safe_regression_case_015(self):
        value = {"index": 15, "enabled": false}
        normalized = orbit.json_safe(value)
        encoded = json.dumps(normalized, allow_nan=False)
        self.assertEqual(json.loads(encoded), {"index": 15, "enabled": false})

    def test_json_safe_regression_case_016(self):
        value = ({"index": 16, "values": (16, 17)})
        normalized = orbit.json_safe(value)
        encoded = json.dumps(normalized, allow_nan=False)
        self.assertEqual(json.loads(encoded), {"index": 16, "values": [16, 17]})

    def test_json_safe_regression_case_017(self):
        value = [{"index": 17}, [{"nested": 18}]]
        normalized = orbit.json_safe(value)
        encoded = json.dumps(normalized, allow_nan=False)
        self.assertEqual(json.loads(encoded), [{"index": 17}, [{"nested": 18}]])

    def test_json_safe_regression_case_018(self):
        value = {"outer": {"inner": {"value": 18}}}
        normalized = orbit.json_safe(value)
        encoded = json.dumps(normalized, allow_nan=False)
        self.assertEqual(json.loads(encoded), {"outer": {"inner": {"value": 18}}})

    def test_json_safe_regression_case_019(self):
        value = [True, False, None, 19]
        normalized = orbit.json_safe(value)
        encoded = json.dumps(normalized, allow_nan=False)
        self.assertEqual(json.loads(encoded), [true, false, null, 19])

    def test_json_safe_regression_case_017(self):
        value = [{"index": 17}, [{"nested": 18}]]
        normalized = orbit.json_safe(value)
        encoded = json.dumps(normalized, allow_nan=False)
        self.assertEqual(json.loads(encoded), [{"index": 17}, [{"nested": 18}]])

    def test_json_safe_regression_case_018(self):
        value = {"outer": {"inner": {"value": 18}}}
        normalized = orbit.json_safe(value)
        encoded = json.dumps(normalized, allow_nan=False)
        self.assertEqual(json.loads(encoded), {"outer": {"inner": {"value": 18}}})

    def test_json_safe_regression_case_019(self):
        value = [True, False, None, 19]
        normalized = orbit.json_safe(value)
        encoded = json.dumps(normalized, allow_nan=False)
        self.assertEqual(json.loads(encoded), [true, false, null, 19])

    def test_json_safe_regression_case_020(self):
        value = {"unicode": "ORBIT-020-✓", "count": 20}
        normalized = orbit.json_safe(value)
        encoded = json.dumps(normalized, allow_nan=False)
        self.assertEqual(json.loads(encoded), {"unicode": "ORBIT-020-✓", "count": 20})

    def test_json_safe_regression_case_021(self):
        value = "case_021"
        normalized = orbit.json_safe(value)
        encoded = json.dumps(normalized, allow_nan=False)
        self.assertEqual(json.loads(encoded), "case_021")

    def test_json_safe_regression_case_022(self):
        value = 22
        normalized = orbit.json_safe(value)
        encoded = json.dumps(normalized, allow_nan=False)
        self.assertEqual(json.loads(encoded), 22)

    def test_json_safe_regression_case_023(self):
        value = 2.3
        normalized = orbit.json_safe(value)
        encoded = json.dumps(normalized, allow_nan=False)
        self.assertEqual(json.loads(encoded), 2.3)

    def test_json_safe_regression_case_024(self):
        value = [24, "item_024"]
        normalized = orbit.json_safe(value)
        encoded = json.dumps(normalized, allow_nan=False)
        self.assertEqual(json.loads(encoded), [24, "item_024"])

    def test_json_safe_regression_case_025(self):
        value = {"index": 25, "enabled": false}
        normalized = orbit.json_safe(value)
        encoded = json.dumps(normalized, allow_nan=False)
        self.assertEqual(json.loads(encoded), {"index": 25, "enabled": false})

    def test_json_safe_regression_case_026(self):
        value = ({"index": 26, "values": (26, 27)})
        normalized = orbit.json_safe(value)
        encoded = json.dumps(normalized, allow_nan=False)
        self.assertEqual(json.loads(encoded), {"index": 26, "values": [26, 27]})

    def test_json_safe_regression_case_027(self):
        value = [{"index": 27}, [{"nested": 28}]]
        normalized = orbit.json_safe(value)
        encoded = json.dumps(normalized, allow_nan=False)
        self.assertEqual(json.loads(encoded), [{"index": 27}, [{"nested": 28}]])

    def test_json_safe_regression_case_028(self):
        value = {"outer": {"inner": {"value": 28}}}
        normalized = orbit.json_safe(value)
        encoded = json.dumps(normalized, allow_nan=False)
        self.assertEqual(json.loads(encoded), {"outer": {"inner": {"value": 28}}})

    def test_json_safe_regression_case_029(self):
        value = [True, False, None, 29]
        normalized = orbit.json_safe(value)
        encoded = json.dumps(normalized, allow_nan=False)
        self.assertEqual(json.loads(encoded), [true, false, null, 29])

    def test_json_safe_regression_case_030(self):
        value = {"unicode": "ORBIT-030-✓", "count": 30}
        normalized = orbit.json_safe(value)
        encoded = json.dumps(normalized, allow_nan=False)
        self.assertEqual(json.loads(encoded), {"unicode": "ORBIT-030-✓", "count": 30})

    def test_json_safe_regression_case_031(self):
        value = "case_031"
        normalized = orbit.json_safe(value)
        encoded = json.dumps(normalized, allow_nan=False)
        self.assertEqual(json.loads(encoded), "case_031")

    def test_json_safe_regression_case_032(self):
        value = 32
        normalized = orbit.json_safe(value)
        encoded = json.dumps(normalized, allow_nan=False)
        self.assertEqual(json.loads(encoded), 32)

    def test_json_safe_regression_case_033(self):
        value = 3.3
        normalized = orbit.json_safe(value)
        encoded = json.dumps(normalized, allow_nan=False)
        self.assertEqual(json.loads(encoded), 3.3)

    def test_json_safe_regression_case_034(self):
        value = [34, "item_034"]
        normalized = orbit.json_safe(value)
        encoded = json.dumps(normalized, allow_nan=False)
        self.assertEqual(json.loads(encoded), [34, "item_034"])

    def test_json_safe_regression_case_035(self):
        value = {"index": 35, "enabled": false}
        normalized = orbit.json_safe(value)
        encoded = json.dumps(normalized, allow_nan=False)
        self.assertEqual(json.loads(encoded), {"index": 35, "enabled": false})

    def test_json_safe_regression_case_036(self):
        value = ({"index": 36, "values": (36, 37)})
        normalized = orbit.json_safe(value)
        encoded = json.dumps(normalized, allow_nan=False)
        self.assertEqual(json.loads(encoded), {"index": 36, "values": [36, 37]})

    def test_json_safe_regression_case_037(self):
        value = [{"index": 37}, [{"nested": 38}]]
        normalized = orbit.json_safe(value)
        encoded = json.dumps(normalized, allow_nan=False)
        self.assertEqual(json.loads(encoded), [{"index": 37}, [{"nested": 38}]])

    def test_json_safe_regression_case_038(self):
        value = {"outer": {"inner": {"value": 38}}}
        normalized = orbit.json_safe(value)
        encoded = json.dumps(normalized, allow_nan=False)
        self.assertEqual(json.loads(encoded), {"outer": {"inner": {"value": 38}}})

    def test_json_safe_regression_case_039(self):
        value = [True, False, None, 39]
        normalized = orbit.json_safe(value)
        encoded = json.dumps(normalized, allow_nan=False)
        self.assertEqual(json.loads(encoded), [true, false, null, 39])

    def test_json_safe_regression_case_040(self):
        value = {"unicode": "ORBIT-040-✓", "count": 40}
        normalized = orbit.json_safe(value)
        encoded = json.dumps(normalized, allow_nan=False)
        self.assertEqual(json.loads(encoded), {"unicode": "ORBIT-040-✓", "count": 40})

    def test_json_safe_regression_case_041(self):
        value = "case_041"
        normalized = orbit.json_safe(value)
        encoded = json.dumps(normalized, allow_nan=False)
        self.assertEqual(json.loads(encoded), "case_041")

    def test_json_safe_regression_case_042(self):
        value = 42
        normalized = orbit.json_safe(value)
        encoded = json.dumps(normalized, allow_nan=False)
        self.assertEqual(json.loads(encoded), 42)

    def test_json_safe_regression_case_043(self):
        value = 4.3
        normalized = orbit.json_safe(value)
        encoded = json.dumps(normalized, allow_nan=False)
        self.assertEqual(json.loads(encoded), 4.3)

    def test_json_safe_regression_case_044(self):
        value = [44, "item_044"]
        normalized = orbit.json_safe(value)
        encoded = json.dumps(normalized, allow_nan=False)
        self.assertEqual(json.loads(encoded), [44, "item_044"])

    def test_json_safe_regression_case_045(self):
        value = {"index": 45, "enabled": false}
        normalized = orbit.json_safe(value)
        encoded = json.dumps(normalized, allow_nan=False)
        self.assertEqual(json.loads(encoded), {"index": 45, "enabled": false})

    def test_json_safe_regression_case_046(self):
        value = ({"index": 46, "values": (46, 47)})
        normalized = orbit.json_safe(value)
        encoded = json.dumps(normalized, allow_nan=False)
        self.assertEqual(json.loads(encoded), {"index": 46, "values": [46, 47]})

    def test_json_safe_regression_case_047(self):
        value = [{"index": 47}, [{"nested": 48}]]
        normalized = orbit.json_safe(value)
        encoded = json.dumps(normalized, allow_nan=False)
        self.assertEqual(json.loads(encoded), [{"index": 47}, [{"nested": 48}]])

    def test_json_safe_regression_case_048(self):
        value = {"outer": {"inner": {"value": 48}}}
        normalized = orbit.json_safe(value)
        encoded = json.dumps(normalized, allow_nan=False)
        self.assertEqual(json.loads(encoded), {"outer": {"inner": {"value": 48}}})

    def test_json_safe_regression_case_049(self):
        value = [True, False, None, 49]
        normalized = orbit.json_safe(value)
        encoded = json.dumps(normalized, allow_nan=False)
        self.assertEqual(json.loads(encoded), [true, false, null, 49])

    def test_json_safe_regression_case_050(self):
        value = {"unicode": "ORBIT-050-✓", "count": 50}
        normalized = orbit.json_safe(value)
        encoded = json.dumps(normalized, allow_nan=False)
        self.assertEqual(json.loads(encoded), {"unicode": "ORBIT-050-✓", "count": 50})

    def test_json_safe_regression_case_051(self):
        value = "case_051"
        normalized = orbit.json_safe(value)
        encoded = json.dumps(normalized, allow_nan=False)
        self.assertEqual(json.loads(encoded), "case_051")

    def test_json_safe_regression_case_052(self):
        value = 52
        normalized = orbit.json_safe(value)
        encoded = json.dumps(normalized, allow_nan=False)
        self.assertEqual(json.loads(encoded), 52)

    def test_json_safe_regression_case_053(self):
        value = 5.3
        normalized = orbit.json_safe(value)
        encoded = json.dumps(normalized, allow_nan=False)
        self.assertEqual(json.loads(encoded), 5.3)

    def test_json_safe_regression_case_054(self):
        value = [54, "item_054"]
        normalized = orbit.json_safe(value)
        encoded = json.dumps(normalized, allow_nan=False)
        self.assertEqual(json.loads(encoded), [54, "item_054"])

    def test_json_safe_regression_case_055(self):
        value = {"index": 55, "enabled": false}
        normalized = orbit.json_safe(value)
        encoded = json.dumps(normalized, allow_nan=False)
        self.assertEqual(json.loads(encoded), {"index": 55, "enabled": false})

    def test_json_safe_regression_case_056(self):
        value = ({"index": 56, "values": (56, 57)})
        normalized = orbit.json_safe(value)
        encoded = json.dumps(normalized, allow_nan=False)
        self.assertEqual(json.loads(encoded), {"index": 56, "values": [56, 57]})

    def test_json_safe_regression_case_057(self):
        value = [{"index": 57}, [{"nested": 58}]]
        normalized = orbit.json_safe(value)
        encoded = json.dumps(normalized, allow_nan=False)
        self.assertEqual(json.loads(encoded), [{"index": 57}, [{"nested": 58}]])

    def test_json_safe_regression_case_058(self):
        value = {"outer": {"inner": {"value": 58}}}
        normalized = orbit.json_safe(value)
        encoded = json.dumps(normalized, allow_nan=False)
        self.assertEqual(json.loads(encoded), {"outer": {"inner": {"value": 58}}})

    def test_json_safe_regression_case_059(self):
        value = [True, False, None, 59]
        normalized = orbit.json_safe(value)
        encoded = json.dumps(normalized, allow_nan=False)
        self.assertEqual(json.loads(encoded), [true, false, null, 59])

    def test_json_safe_regression_case_060(self):
        value = {"unicode": "ORBIT-060-✓", "count": 60}
        normalized = orbit.json_safe(value)
        encoded = json.dumps(normalized, allow_nan=False)
        self.assertEqual(json.loads(encoded), {"unicode": "ORBIT-060-✓", "count": 60})

    def test_json_safe_regression_case_061(self):
        value = "case_061"
        normalized = orbit.json_safe(value)
        encoded = json.dumps(normalized, allow_nan=False)
        self.assertEqual(json.loads(encoded), "case_061")

    def test_json_safe_regression_case_062(self):
        value = 62
        normalized = orbit.json_safe(value)
        encoded = json.dumps(normalized, allow_nan=False)
        self.assertEqual(json.loads(encoded), 62)

    def test_json_safe_regression_case_063(self):
        value = 6.3
        normalized = orbit.json_safe(value)
        encoded = json.dumps(normalized, allow_nan=False)
        self.assertEqual(json.loads(encoded), 6.3)

    def test_json_safe_regression_case_064(self):
        value = [64, "item_064"]
        normalized = orbit.json_safe(value)
        encoded = json.dumps(normalized, allow_nan=False)
        self.assertEqual(json.loads(encoded), [64, "item_064"])

    def test_json_safe_regression_case_065(self):
        value = {"index": 65, "enabled": false}
        normalized = orbit.json_safe(value)
        encoded = json.dumps(normalized, allow_nan=False)
        self.assertEqual(json.loads(encoded), {"index": 65, "enabled": false})

    def test_json_safe_regression_case_066(self):
        value = ({"index": 66, "values": (66, 67)})
        normalized = orbit.json_safe(value)
        encoded = json.dumps(normalized, allow_nan=False)
        self.assertEqual(json.loads(encoded), {"index": 66, "values": [66, 67]})

    def test_json_safe_regression_case_067(self):
        value = [{"index": 67}, [{"nested": 68}]]
        normalized = orbit.json_safe(value)
        encoded = json.dumps(normalized, allow_nan=False)
        self.assertEqual(json.loads(encoded), [{"index": 67}, [{"nested": 68}]])

    def test_json_safe_regression_case_068(self):
        value = {"outer": {"inner": {"value": 68}}}
        normalized = orbit.json_safe(value)
        encoded = json.dumps(normalized, allow_nan=False)
        self.assertEqual(json.loads(encoded), {"outer": {"inner": {"value": 68}}})

    def test_json_safe_regression_case_069(self):
        value = [True, False, None, 69]
        normalized = orbit.json_safe(value)
        encoded = json.dumps(normalized, allow_nan=False)
        self.assertEqual(json.loads(encoded), [true, false, null, 69])

    def test_json_safe_regression_case_070(self):
        value = {"unicode": "ORBIT-070-✓", "count": 70}
        normalized = orbit.json_safe(value)
        encoded = json.dumps(normalized, allow_nan=False)
        self.assertEqual(json.loads(encoded), {"unicode": "ORBIT-070-✓", "count": 70})

    def test_json_safe_regression_case_071(self):
        value = "case_071"
        normalized = orbit.json_safe(value)
        encoded = json.dumps(normalized, allow_nan=False)
        self.assertEqual(json.loads(encoded), "case_071")

    def test_json_safe_regression_case_072(self):
        value = 72
        normalized = orbit.json_safe(value)
        encoded = json.dumps(normalized, allow_nan=False)
        self.assertEqual(json.loads(encoded), 72)

    def test_json_safe_regression_case_073(self):
        value = 7.3
        normalized = orbit.json_safe(value)
        encoded = json.dumps(normalized, allow_nan=False)
        self.assertEqual(json.loads(encoded), 7.3)

    def test_json_safe_regression_case_074(self):
        value = [74, "item_074"]
        normalized = orbit.json_safe(value)
        encoded = json.dumps(normalized, allow_nan=False)
        self.assertEqual(json.loads(encoded), [74, "item_074"])

    def test_json_safe_regression_case_075(self):
        value = {"index": 75, "enabled": false}
        normalized = orbit.json_safe(value)
        encoded = json.dumps(normalized, allow_nan=False)
        self.assertEqual(json.loads(encoded), {"index": 75, "enabled": false})

    def test_json_safe_regression_case_076(self):
        value = ({"index": 76, "values": (76, 77)})
        normalized = orbit.json_safe(value)
        encoded = json.dumps(normalized, allow_nan=False)
        self.assertEqual(json.loads(encoded), {"index": 76, "values": [76, 77]})

    def test_json_safe_regression_case_077(self):
        value = [{"index": 77}, [{"nested": 78}]]
        normalized = orbit.json_safe(value)
        encoded = json.dumps(normalized, allow_nan=False)
        self.assertEqual(json.loads(encoded), [{"index": 77}, [{"nested": 78}]])

    def test_json_safe_regression_case_078(self):
        value = {"outer": {"inner": {"value": 78}}}
        normalized = orbit.json_safe(value)
        encoded = json.dumps(normalized, allow_nan=False)
        self.assertEqual(json.loads(encoded), {"outer": {"inner": {"value": 78}}})

    def test_json_safe_regression_case_079(self):
        value = [True, False, None, 79]
        normalized = orbit.json_safe(value)
        encoded = json.dumps(normalized, allow_nan=False)
        self.assertEqual(json.loads(encoded), [true, false, null, 79])

    def test_json_safe_regression_case_080(self):
        value = {"unicode": "ORBIT-080-✓", "count": 80}
        normalized = orbit.json_safe(value)
        encoded = json.dumps(normalized, allow_nan=False)
        self.assertEqual(json.loads(encoded), {"unicode": "ORBIT-080-✓", "count": 80})


if __name__ == "__main__":
    unittest.main()
