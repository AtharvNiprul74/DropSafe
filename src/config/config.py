"""
Configuration Loader
Loads project settings and file paths.
"""

import json
from pathlib import Path

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

PROJECT_NAME = SETTINGS["project"]["name"]

PROJECT_VERSION = SETTINGS["project"]["version"]

# ==========================================================
# GENERATION
# ==========================================================

RANDOM_SEED = SETTINGS["generation"]["random_seed"]

DEFAULT_STUDENT_COUNT = SETTINGS["generation"]["default_student_count"]

# ==========================================================
# STUDENT
# ==========================================================

MIN_AGE = SETTINGS["student"]["min_age"]

MAX_AGE = SETTINGS["student"]["max_age"]

# ==========================================================
# ATTENDANCE
# ==========================================================

MIN_ATTENDANCE = SETTINGS["attendance"]["min"]

MAX_ATTENDANCE = SETTINGS["attendance"]["max"]

# ==========================================================
# MARKS
# ==========================================================

MAX_MSE = SETTINGS["marks"]["mse_max"]

MAX_ISE = SETTINGS["marks"]["ise_max"]

MAX_SEE = SETTINGS["marks"]["see_max"]

# ==========================================================
# GRADE POINTS
# ==========================================================

GRADE_POINTS = SETTINGS["grade_points"]

# ==========================================================
# RISK LABELS
# ==========================================================

LOW_RISK = SETTINGS["risk_labels"]["low"]

MEDIUM_RISK = SETTINGS["risk_labels"]["medium"]

HIGH_RISK = SETTINGS["risk_labels"]["high"]

# ==========================================================
# PROFILE DISTRIBUTION
# ==========================================================

PROFILE_DISTRIBUTION = SETTINGS["profiles"]

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