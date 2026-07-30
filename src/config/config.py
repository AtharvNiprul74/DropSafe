"""
Configuration Loader
Loads project settings and file paths.
"""

import json
from pathlib import Path


def _get_nested(mapping: dict, *keys, default=None):
    """Safely retrieve a nested value from a settings mapping."""

    current = mapping

    for key in keys:
        if not isinstance(current, dict) or key not in current:
            return default
        current = current[key]

    return current


# ==========================================================
# PROJECT DIRECTORIES
# ==========================================================

PROJECT_ROOT = Path(__file__).resolve().parent.parent

CONFIG_DIR = PROJECT_ROOT / "config"

DATA_DIR = PROJECT_ROOT / "data"

INPUT_DIR = DATA_DIR / "input"

GENERATED_DIR = DATA_DIR / "generated"

PROCESSED_DIR = DATA_DIR / "processed"

# ==========================================================
# SETTINGS FILE
# ==========================================================

SETTINGS_FILE = CONFIG_DIR / "settings.json"

with open(SETTINGS_FILE, "r", encoding="utf-8") as file:
    SETTINGS = json.load(file)

# ==========================================================
# PROJECT
# ==========================================================

PROJECT_NAME = _get_nested(SETTINGS, "project", "name", default="DropSafe")

PROJECT_VERSION = _get_nested(SETTINGS, "project", "version", default="1.0.0")

# ==========================================================
# GENERATION
# ==========================================================

GENERATION_SETTINGS = SETTINGS.get("generation", {})
STUDENT_SETTINGS = SETTINGS.get("student", {})
ATTENDANCE_SETTINGS = SETTINGS.get("attendance", {})
MARKS_SETTINGS = SETTINGS.get("marks", {})

RANDOM_SEED = GENERATION_SETTINGS.get("random_seed", 42)

DEFAULT_STUDENT_COUNT = GENERATION_SETTINGS.get(
    "default_student_count",
    GENERATION_SETTINGS.get("number_of_students", 500),
)

# ==========================================================
# STUDENT
# ==========================================================

MIN_AGE = STUDENT_SETTINGS.get("min_age", GENERATION_SETTINGS.get("minimum_age", 18))

MAX_AGE = STUDENT_SETTINGS.get("max_age", GENERATION_SETTINGS.get("maximum_age", 24))

# ==========================================================
# ATTENDANCE
# ==========================================================

MIN_ATTENDANCE = ATTENDANCE_SETTINGS.get(
    "minimum",
    ATTENDANCE_SETTINGS.get("min", 35),
)

MAX_ATTENDANCE = ATTENDANCE_SETTINGS.get(
    "maximum",
    ATTENDANCE_SETTINGS.get("max", 100),
)

# ==========================================================
# MARKS
# ==========================================================

MAX_MSE = MARKS_SETTINGS.get("mse_max", MARKS_SETTINGS.get("cie_max", 30))

MAX_ISE = MARKS_SETTINGS.get("ise_max", MARKS_SETTINGS.get("cie_max", 30))

MAX_SEE = MARKS_SETTINGS.get("see_max", MARKS_SETTINGS.get("see_max", 70))

# ==========================================================
# GRADE POINTS
# ==========================================================

GRADE_POINTS = SETTINGS.get("grade_points", {})

# ==========================================================
# RISK LABELS
# ==========================================================

LOW_RISK = _get_nested(SETTINGS, "risk_labels", "low", default="Low")

MEDIUM_RISK = _get_nested(SETTINGS, "risk_labels", "medium", default="Medium")

HIGH_RISK = _get_nested(SETTINGS, "risk_labels", "high", default="High")

# ==========================================================
# PROFILE DISTRIBUTION
# ==========================================================

PROFILE_DISTRIBUTION = SETTINGS.get("profiles", {})

# ==========================================================
# INPUT FILES
# ==========================================================

DEPARTMENTS_FILE = INPUT_DIR / "departments.csv"

CURRICULUM_FILE = INPUT_DIR / "curriculum.csv"

SEMESTER_COURSES_FILE = INPUT_DIR / "semester_courses.csv"

MENTORS_FILE = INPUT_DIR / "mentors.csv"

STUDENT_PROFILES_FILE = INPUT_DIR / "student_profiles.csv"

# ==========================================================
# GENERATED FILES
# ==========================================================

STUDENTS_FILE = GENERATED_DIR / "students.csv"

REGISTRATIONS_FILE = GENERATED_DIR / "course_registrations.csv"

MARKS_FILE = GENERATED_DIR / "marks.csv"

GRADES_FILE = GENERATED_DIR / "grades.csv"

ACADEMIC_RECORDS_FILE = GENERATED_DIR / "academic_records.csv"

PREDICTIONS_FILE = GENERATED_DIR / "predictions.csv"