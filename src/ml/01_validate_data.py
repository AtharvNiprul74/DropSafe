from pathlib import Path
import pandas as pd

# ==========================================================
# PATH CONFIGURATION
# ==========================================================

PROJECT_ROOT = Path(__file__).resolve().parents[2]

DATA_DIR = PROJECT_ROOT / "src" / "data" / "generated"

# ==========================================================
# LOAD DATASETS
# ==========================================================

students = pd.read_csv(DATA_DIR / "students.csv")
profiles = pd.read_csv(DATA_DIR / "student_profiles.csv")
registrations = pd.read_csv(DATA_DIR / "registrations.csv")
marks = pd.read_csv(DATA_DIR / "marks.csv")
academic = pd.read_csv(DATA_DIR / "academic_records.csv")

print("\n" + "=" * 80)
print("DROPSAFE DATA VALIDATION REPORT")
print("=" * 80)

# ==========================================================
# DATASET INFORMATION
# ==========================================================

print("\n[1] DATASET INFORMATION")
print("-" * 80)

datasets = {
    "Students": students,
    "Student Profiles": profiles,
    "Registrations": registrations,
    "Marks": marks,
    "Academic Records": academic
}

for name, df in datasets.items():
    print(f"{name:<22} Rows: {len(df):<6} Columns: {len(df.columns)}")

# ==========================================================
# PRIMARY KEY VALIDATION
# ==========================================================

print("\n[2] PRIMARY KEY VALIDATION")
print("-" * 80)

primary_keys = {
    "students.student_id":
        students["student_id"].is_unique,

    "student_profiles.student_id":
        profiles["student_id"].is_unique,

    "academic_records.student_id":
        academic["student_id"].is_unique,

    "registrations.registration_id":
        registrations["registration_id"].is_unique,

    "marks.registration_id":
        marks["registration_id"].is_unique
}

for key, value in primary_keys.items():
    status = "PASS" if value else "FAIL"
    print(f"{key:<40} {status}")

# ==========================================================
# DUPLICATE CHECK
# ==========================================================

print("\n[3] DUPLICATE ROW CHECK")
print("-" * 80)

for name, df in datasets.items():
    duplicates = df.duplicated().sum()
    print(f"{name:<22} {duplicates}")

# ==========================================================
# MISSING VALUES
# ==========================================================

print("\n[4] MISSING VALUE CHECK")
print("-" * 80)

for name, df in datasets.items():

    missing = df.isnull().sum().sum()

    print(f"{name:<22} {missing}")

# ==========================================================
# FOREIGN KEY VALIDATION
# ==========================================================

print("\n[5] FOREIGN KEY VALIDATION")
print("-" * 80)

invalid_registration_students = registrations[
    ~registrations["student_id"].isin(
        students["student_id"]
    )
]

print(
    f"Registrations referencing invalid students : "
    f"{len(invalid_registration_students)}"
)

invalid_marks = marks[
    ~marks["registration_id"].isin(
        registrations["registration_id"]
    )
]

print(
    f"Marks referencing invalid registrations    : "
    f"{len(invalid_marks)}"
)

# ==========================================================
# STUDENTS WITHOUT REGISTRATION
# ==========================================================

print("\n[6] STUDENTS WITHOUT REGISTRATION")
print("-" * 80)

students_without_registration = students[
    ~students["student_id"].isin(
        registrations["student_id"]
    )
]

print(f"Total : {len(students_without_registration)}")

if len(students_without_registration):

    print("\nStudent IDs:")

    for sid in students_without_registration["student_id"]:
        print(" ", sid)

# ==========================================================
# REGISTRATIONS WITHOUT MARKS
# ==========================================================

print("\n[7] REGISTRATIONS WITHOUT MARKS")
print("-" * 80)

registrations_without_marks = registrations[
    ~registrations["registration_id"].isin(
        marks["registration_id"]
    )
]

print(f"Total : {len(registrations_without_marks)}")

# ==========================================================
# REGISTRATIONS PER STUDENT
# ==========================================================

print("\n[8] REGISTRATIONS PER STUDENT")
print("-" * 80)

registration_stats = registrations.groupby(
    "student_id"
).size()

print(registration_stats.describe())

# ==========================================================
# COURSE DISTRIBUTION
# ==========================================================

if "course_code" in registrations.columns:

    print("\n[9] COURSE DISTRIBUTION")
    print("-" * 80)

    print(
        registrations["course_code"]
        .value_counts()
        .head(10)
    )

# ==========================================================
# FINAL SUMMARY
# ==========================================================

print("\n" + "=" * 80)
print("VALIDATION SUMMARY")
print("=" * 80)

errors = 0

if not students["student_id"].is_unique:
    errors += 1

if not profiles["student_id"].is_unique:
    errors += 1

if not academic["student_id"].is_unique:
    errors += 1

if not registrations["registration_id"].is_unique:
    errors += 1

if not marks["registration_id"].is_unique:
    errors += 1

errors += len(invalid_registration_students)
errors += len(invalid_marks)

print(f"Validation Errors : {errors}")
print(f"Students          : {len(students)}")
print(f"Registrations     : {len(registrations)}")
print(f"Marks             : {len(marks)}")
print(f"Students Without Registration : {len(students_without_registration)}")
print(f"Registrations Without Marks   : {len(registrations_without_marks)}")

if errors == 0:
    print("\nSTATUS : DATASET VALIDATION PASSED")
else:
    print("\nSTATUS : DATASET VALIDATION FAILED")

print("=" * 80)