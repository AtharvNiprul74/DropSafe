import sys
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src"
if str(SRC) not in sys.path:
    sys.path.insert(0, str(SRC))

from config import config


class ConfigLoadingTests(unittest.TestCase):
    def test_config_uses_fallbacks_when_keys_are_missing(self):
        self.assertEqual(config.PROJECT_NAME, "DropSafe")
        self.assertEqual(config.PROJECT_VERSION, "1.0.0")
        self.assertEqual(config.DEFAULT_STUDENT_COUNT, 500)
        self.assertEqual(config.MIN_ATTENDANCE, 35)
        self.assertEqual(config.MAX_ATTENDANCE, 100)


if __name__ == "__main__":
    unittest.main()
