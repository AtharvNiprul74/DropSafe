from pathlib import Path
from datetime import datetime, timezone
import random
import uuid

import pandas as pd


BASE_DIR = Path(__file__).resolve().parents[2]
RAW_DIR = BASE_DIR / "data" / "raw"
REPORT_DIR = BASE_DIR / "data" / "synthetic"

STUDENTS_FILE = RAW_DIR / "students.csv"
OUTPUT_FILE = RAW_DIR / "student_identifiers.csv"
REPORT_FILE = REPORT_DIR / "student_identifiers.md"

SEED = 47
ROW_COUNT = 1000

random.seed(SEED)

IDENTIFIER_TYPES = [
    "PRN",
    "ROLL_NUMBER",
    "ADMISSION_NUMBER",
]

STATUSES = ["ACTIVE", "ARCHIVED"]


def generate_uuid():
    """Generate a UUIDv7-compatible identifier."""

    timestamp_ms = int(
        datetime.now(timezone.utc).timestamp() * 1000
    )
    random_bits = uuid.uuid4().int

    value = (
        ((timestamp_ms & ((1 << 48) - 1)) << 80)
        | (0x7 << 76)
        | (((random_bits >> 64) & 0xFFF) << 64)
        | (0b10 << 62)
        | (random_bits & ((1 << 62) - 1))
    )

    return str(uuid.UUID(int=value))


def utc_now():
    return datetime.now(timezone.utc).replace(
        microsecond=0
    ).isoformat()


def load_students():
    if not STUDENTS_FILE.exists():
        raise FileNotFoundError(
            "students.csv not found. Run students.py first."
        )

    students = pd.read_csv(STUDENTS_FILE)

    required = ["id", "organization_id"]
    missing = [column for column in required if column not in students]

    if missing:
        raise ValueError(
            f"students.csv is missing columns: {missing}"
        )

    if students.empty:
        raise ValueError("students.csv contains no records.")

    if students["id"].isna().any():
        raise ValueError("Student IDs contain missing values.")

    if students["id"].duplicated().any():
        raise ValueError("Student IDs must be unique.")

    return students


def generate_identifiers(students, count=ROW_COUNT):
    if count > len(students):
        raise ValueError(
            f"Requested {count} identifiers, but only "
            f"{len(students)} students are available. "
            "This generator creates one identifier per student."
        )

    selected = students.iloc[:count]
    rows = []

    for index, (_, student) in enumerate(selected.iterrows()):
        identifier_type = IDENTIFIER_TYPES[index % len(IDENTIFIER_TYPES)]

        # One identifier per student makes every generated
        # identifier the primary identifier for that student.
        row = {
            "id": generate_uuid(),
            "organization_id": student["organization_id"],
            "student_id": student["id"],
            "identifier_type": identifier_type,
            "identifier_value": f"DS-{identifier_type}-{index + 1:06d}",
            "is_primary": True,
            "status": "ACTIVE",
            "created_at": utc_now(),
            "updated_at": utc_now(),
            "created_by": None,
            "updated_by": None,
        }

        rows.append(row)

    return pd.DataFrame(rows)


def validate_dataset(df, students):
    required = [
        "id", "organization_id", "student_id",
        "identifier_type", "identifier_value",
        "is_primary", "status", "created_at",
        "updated_at", "created_by", "updated_by",
    ]

    missing_columns = [
        column for column in required if column not in df.columns
    ]

    valid_student_ids = set(students["id"].astype(str))

    student_org_map = dict(
        zip(
            students["id"].astype(str),
            students["organization_id"].astype(str),
        )
    )

    expected_orgs = df["student_id"].astype(str).map(student_org_map)

    results = {
        "rows": len(df),
        "columns": len(df.columns),
        "missing_columns": missing_columns,
        "missing_values": int(df.isna().sum().sum()),
        "duplicate_rows": int(df.duplicated().sum()),
        "duplicate_ids": int(df["id"].duplicated().sum()),
        "duplicate_identifier_values": int(
            df.duplicated(
                subset=[
                    "organization_id",
                    "identifier_type",
                    "identifier_value",
                ]
            ).sum()
        ),
        "duplicate_student_type_pairs": int(
            df.duplicated(
                subset=["student_id", "identifier_type"]
            ).sum()
        ),
        "invalid_identifier_types": int(
            (~df["identifier_type"].isin(IDENTIFIER_TYPES)).sum()
        ),
        "invalid_statuses": int(
            (~df["status"].isin(STATUSES)).sum()
        ),
        "invalid_primary_flags": int(
            (~df["is_primary"].isin([True, False])).sum()
        ),
        "empty_identifier_values": int(
            df["identifier_value"]
            .astype(str).str.strip().eq("").sum()
        ),
        "invalid_student_references": int(
            (~df["student_id"].astype(str).isin(valid_student_ids)).sum()
        ),
        "organization_mismatches": int(
            (expected_orgs != df["organization_id"].astype(str)).sum()
        ),
    }

    # Every generated identifier is primary. Validate that no
    # student has more than one primary identifier.
    primary_counts = (
        df[df["is_primary"] == True]
        .groupby("student_id")
        .size()
    )
    results["students_with_multiple_primary_identifiers"] = int(
        (primary_counts > 1).sum()
    )

    checks = [
        not results["missing_columns"],
        results["duplicate_rows"] == 0,
        results["duplicate_ids"] == 0,
        results["duplicate_identifier_values"] == 0,
        results["duplicate_student_type_pairs"] == 0,
        results["invalid_identifier_types"] == 0,
        results["invalid_statuses"] == 0,
        results["invalid_primary_flags"] == 0,
        results["empty_identifier_values"] == 0,
        results["invalid_student_references"] == 0,
        results["organization_mismatches"] == 0,
        results["students_with_multiple_primary_identifiers"] == 0,
    ]

    results["validation_passed"] = all(checks)

    return results


def create_report(df, students, validation):
    REPORT_DIR.mkdir(parents=True, exist_ok=True)

    lines = [
        "# Student Identifiers Dataset Validation\n\n",
        "## 1. Dataset Identification\n\n",
        "**Dataset:** `student_identifiers.csv`  \n",
        "**Type:** Synthetic development data  \n",
        f"**Rows:** {len(df)}  \n",
        f"**Parent dataset:** `students.csv` ({len(students)} rows)  \n",
        f"**Random seed:** {SEED}\n\n",
        "> All records are synthetic and must not be treated as production data.\n\n",
        "## 2. Dataset Structure\n\n",
        "| Column | Meaning |\n|---|---|\n",
        "| `id` | Identifier record UUID |\n",
        "| `organization_id` | Owning organization |\n",
        "| `student_id` | Referenced student |\n",
        "| `identifier_type` | PRN, roll number, or admission number |\n",
        "| `identifier_value` | Institution-specific identifier |\n",
        "| `is_primary` | Whether this is the student's primary identifier |\n",
        "| `status` | ACTIVE or ARCHIVED |\n",
        "| `created_at` | Creation timestamp |\n",
        "| `updated_at` | Last update timestamp |\n",
        "| `created_by` | Creating user, nullable |\n",
        "| `updated_by` | Updating user, nullable |\n\n",
        "## 3. Missing Values and Data Types\n\n",
        f"- Total missing cells: {validation['missing_values']}\n",
        "- `created_by` and `updated_by` are nullable by schema.\n\n",
        "Detected data types:\n\n```text\n",
        df.dtypes.to_string(),
        "\n```\n\n",
        "## 4. Duplicate Analysis\n\n",
        f"- Duplicate complete rows: {validation['duplicate_rows']}\n",
        f"- Duplicate IDs: {validation['duplicate_ids']}\n",
        f"- Duplicate organization/type/value keys: {validation['duplicate_identifier_values']}\n",
        f"- Duplicate student/type pairs: {validation['duplicate_student_type_pairs']}\n\n",
        "## 5. Relationship and Value Validation\n\n",
        f"- Invalid student references: {validation['invalid_student_references']}\n",
        f"- Organization mismatches: {validation['organization_mismatches']}\n",
        f"- Invalid identifier types: {validation['invalid_identifier_types']}\n",
        f"- Invalid statuses: {validation['invalid_statuses']}\n",
        f"- Invalid primary flags: {validation['invalid_primary_flags']}\n",
        f"- Empty identifier values: {validation['empty_identifier_values']}\n",
        f"- Students with multiple primary identifiers: {validation['students_with_multiple_primary_identifiers']}\n\n",
        "Allowed identifier types: `PRN`, `ROLL_NUMBER`, `ADMISSION_NUMBER`.  \n",
        "Allowed statuses: `ACTIVE`, `ARCHIVED`.\n\n",
        "## 6. Target / Risk Label\n\n",
        "No target or risk label is defined in this dataset. "
        "Student identifiers are identity attributes, not academic risk features.\n\n",
        "## 7. Validation Summary\n\n",
        f"**Overall validation: {'PASS' if validation['validation_passed'] else 'FAIL'}**\n\n",
        "## 8. Model Training\n\n",
        "**No model training was performed.** This task only generates and validates synthetic data.\n",
    ]

    REPORT_FILE.write_text("".join(lines), encoding="utf-8")


def main():
    print("=" * 65)
    print("DropSafe - Student Identifiers Synthetic Dataset")
    print("=" * 65)

    students = load_students()
    df = generate_identifiers(students)

    RAW_DIR.mkdir(parents=True, exist_ok=True)
    df.to_csv(OUTPUT_FILE, index=False)

    validation = validate_dataset(df, students)
    create_report(df, students, validation)

    print(f"\nRows generated: {len(df)}")
    print(f"Columns generated: {len(df.columns)}")
    print(f"CSV: {OUTPUT_FILE}")
    print(f"Report: {REPORT_FILE}")
    print(f"Missing values: {validation['missing_values']}")
    print(f"Duplicate rows: {validation['duplicate_rows']}")
    print(f"Duplicate IDs: {validation['duplicate_ids']}")
    print(
        "Invalid student references: "
        f"{validation['invalid_student_references']}"
    )
    print(
        "Organization mismatches: "
        f"{validation['organization_mismatches']}"
    )
    print(
        "Overall validation: "
        f"{'PASS' if validation['validation_passed'] else 'FAIL'}"
    )
    print("No model training performed.")


if __name__ == "__main__":
    main()
