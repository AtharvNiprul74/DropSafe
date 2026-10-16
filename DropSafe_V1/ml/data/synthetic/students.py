
from pathlib import Path
from datetime import date, datetime, timezone

import random
import uuid

import pandas as pd


# ============================================================
# Paths
# ============================================================

BASE_DIR = Path(__file__).resolve().parents[2]

RAW_DIR = BASE_DIR / "data" / "raw"

PROGRAMS_FILE = RAW_DIR / "learning_programs.csv"
OUTPUT_FILE = RAW_DIR / "students.csv"

REPORT_DIR = BASE_DIR / "data" / "synthetic"
REPORT_FILE = REPORT_DIR / "students.md"


# ============================================================
# Configuration
# ============================================================

SEED = 46
ROW_COUNT = 1000

random.seed(SEED)


# ============================================================
# Schema-supported values
# ============================================================

GENDERS = [
    "MALE",
    "FEMALE",
    "OTHER",
]

# Supported student lifecycle statuses.
STATUSES = [
    "ACTIVE",
    "GRADUATED",
    "TRANSFERRED",
    "ARCHIVED",
]


# ============================================================
# Utility functions
# ============================================================

def generate_uuid():
    """Generate a UUIDv7-compatible identifier for synthetic data."""
    timestamp_ms = int(
        datetime.now(timezone.utc).timestamp() * 1000
    )

    random_bits = uuid.uuid4().int

    value = (
        (timestamp_ms & ((1 << 48) - 1)) << 80
        | (0x7 << 76)
        | (
            ((random_bits >> 64) & ((1 << 12) - 1))
            << 64
        )
        | (0b10 << 62)
        | (random_bits & ((1 << 62) - 1))
    )

    return str(uuid.UUID(int=value))


def utc_now():
    """Return the current UTC timestamp."""
    return datetime.now(
        timezone.utc
    ).replace(
        microsecond=0
    ).isoformat()


def load_organization_ids():
    """Load valid organization IDs from learning_programs.csv."""
    if not PROGRAMS_FILE.exists():
        raise FileNotFoundError(
            f"{PROGRAMS_FILE} not found. "
            "Generate learning programs first."
        )

    programs = pd.read_csv(
        PROGRAMS_FILE,
        dtype=str,
    )

    if "organization_id" not in programs.columns:
        raise ValueError(
            "learning_programs.csv is missing organization_id."
        )

    organization_ids = (
        programs["organization_id"]
        .dropna()
        .str.strip()
        .loc[lambda values: values.ne("")]
        .unique()
        .tolist()
    )

    if not organization_ids:
        raise ValueError(
            "No valid organization IDs found in learning_programs.csv."
        )

    return organization_ids


# ============================================================
# Synthetic student information
# ============================================================

FIRST_NAMES = [
    "Aarav",
    "Vivaan",
    "Aditya",
    "Arjun",
    "Atharv",
    "Ishaan",
    "Kabir",
    "Reyansh",
    "Vihaan",
    "Rohan",
    "Ananya",
    "Aadhya",
    "Diya",
    "Ira",
    "Ishita",
    "Kavya",
    "Meera",
    "Myra",
    "Nisha",
    "Saanvi",
]

MIDDLE_NAMES = [
    "Raj",
    "Kumar",
    "Dev",
    "Prakash",
    "Vijay",
    "Amit",
    "Ravi",
    "Anil",
    "Shiv",
    "Arun",
]

LAST_NAMES = [
    "Patil",
    "Sharma",
    "Deshmukh",
    "Joshi",
    "Kulkarni",
    "Pawar",
    "Jadhav",
    "More",
    "Chavan",
    "Singh",
    "Verma",
    "Gupta",
]


# ============================================================
# Student generation helpers
# ============================================================

def generate_date_of_birth(index):
    """
    Generate a synthetic date of birth.

    Generated students are approximately 16–30 years old.
    """
    year = 1996 + (index % 15)
    month = (index % 12) + 1
    day = (index % 28) + 1

    return date(
        year,
        month,
        day,
    ).isoformat()


def generate_email(first_name, last_name, index):
    """Generate a deterministic synthetic email address."""
    return (
        f"{first_name.lower()}."
        f"{last_name.lower()}."
        f"{index + 1:04d}"
        "@example.edu"
    )


def generate_phone(index):
    """
    Generate a synthetic placeholder phone number.

    This value is for development data only.
    """
    return (
        f"+919000"
        f"{index // 1000:02d}"
        f"{index % 1000:03d}"
    )


# ============================================================
# Synthetic dataset generation
# ============================================================

def generate_students(organization_ids, count=ROW_COUNT):
    """
    Generate synthetic student identity records.

    Organization IDs are selected from learning_programs.csv
    so students can be related to academic data belonging to
    the same organization.
    """
    if not organization_ids:
        raise ValueError(
            "organization_ids cannot be empty."
        )

    rows = []

    for index in range(count):
        first_name = random.choice(FIRST_NAMES)
        middle_name = random.choice(MIDDLE_NAMES)
        last_name = random.choice(LAST_NAMES)

        now = utc_now()

        row = {
            "id": generate_uuid(),
            "organization_id": random.choice(
                organization_ids
            ),
            "first_name": first_name,
            "middle_name": middle_name,
            "last_name": last_name,
            "date_of_birth": generate_date_of_birth(index),
            "gender": random.choice(GENDERS),
            "email": generate_email(
                first_name,
                last_name,
                index,
            ),
            "phone": generate_phone(index),
            "status": random.choice(STATUSES),
            "created_at": now,
            "updated_at": now,
            "created_by": None,
            "updated_by": None,
        }

        rows.append(row)

    return pd.DataFrame(rows)


# ============================================================
# Validation
# ============================================================

def validate_dataset(df, organization_ids):
    """Validate the generated students dataset."""

    required_columns = [
        "id",
        "organization_id",
        "first_name",
        "middle_name",
        "last_name",
        "date_of_birth",
        "gender",
        "email",
        "phone",
        "status",
        "created_at",
        "updated_at",
        "created_by",
        "updated_by",
    ]

    missing_columns = [
        column
        for column in required_columns
        if column not in df.columns
    ]

    results = {
        "missing_columns": missing_columns,
        "rows": len(df),
        "columns": len(df.columns),
        "missing_values": int(df.isnull().sum().sum()),
        "duplicate_rows": int(df.duplicated().sum()),
        "duplicate_ids": int(df["id"].duplicated().sum()),
        "duplicate_emails": int(df["email"].duplicated().sum()),
    }

    results["empty_first_names"] = int(
        df["first_name"]
        .fillna("")
        .astype(str)
        .str.strip()
        .eq("")
        .sum()
    )

    results["empty_last_names"] = int(
        df["last_name"]
        .fillna("")
        .astype(str)
        .str.strip()
        .eq("")
        .sum()
    )

    results["invalid_gender"] = int(
        (~df["gender"].isin(GENDERS)).sum()
    )

    results["invalid_status"] = int(
        (~df["status"].isin(STATUSES)).sum()
    )

    parsed_dob = pd.to_datetime(
        df["date_of_birth"],
        errors="coerce",
    )

    results["invalid_date_of_birth"] = int(
        parsed_dob.isna().sum()
    )

    today = pd.Timestamp(
        datetime.now(timezone.utc).date()
    )

    results["future_date_of_birth"] = int(
        (parsed_dob > today).sum()
    )

    results["invalid_email_format"] = int(
        (
            ~df["email"]
            .astype(str)
            .str.match(
                r"^[^@\s]+@[^@\s]+\.[^@\s]+$",
                na=False,
            )
        ).sum()
    )

    results["invalid_phone_format"] = int(
        (
            ~df["phone"]
            .astype(str)
            .str.match(
                r"^\+91\d{10}$",
                na=False,
            )
        ).sum()
    )

    valid_organizations = set(
        map(str, organization_ids)
    )

    results["invalid_organization_references"] = int(
        (
            ~df["organization_id"]
            .astype(str)
            .isin(valid_organizations)
        ).sum()
    )

    results["validation_passed"] = (
        len(missing_columns) == 0
        and results["duplicate_rows"] == 0
        and results["duplicate_ids"] == 0
        and results["duplicate_emails"] == 0
        and results["empty_first_names"] == 0
        and results["empty_last_names"] == 0
        and results["invalid_gender"] == 0
        and results["invalid_status"] == 0
        and results["invalid_date_of_birth"] == 0
        and results["future_date_of_birth"] == 0
        and results["invalid_email_format"] == 0
        and results["invalid_phone_format"] == 0
        and results["invalid_organization_references"] == 0
    )

    return results


# ============================================================
# Markdown report
# ============================================================

def create_report(df, validation, organization_count):
    """Create the students dataset validation report."""

    REPORT_DIR.mkdir(
        parents=True,
        exist_ok=True,
    )

    validation_result = (
        "PASS"
        if validation["validation_passed"]
        else "FAIL"
    )

    missing_columns = (
        ", ".join(validation["missing_columns"])
        if validation["missing_columns"]
        else "None"
    )

    structure = [
        ("id", "UUID", "Yes", "Student identifier"),
        ("organization_id", "UUID", "Yes", "Organization identifier"),
        ("first_name", "String", "Yes", "Student first name"),
        ("middle_name", "String", "No", "Student middle name"),
        ("last_name", "String", "Yes", "Student last name"),
        ("date_of_birth", "Date", "No", "Student date of birth"),
        ("gender", "String", "No", "Student gender"),
        ("email", "String", "No", "Student email address"),
        ("phone", "String", "No", "Student phone number"),
        ("status", "String", "Yes", "Student lifecycle status"),
        ("created_at", "Timestamp", "Yes", "Creation timestamp"),
        ("updated_at", "Timestamp", "Yes", "Last update timestamp"),
        ("created_by", "UUID", "No", "Creating user"),
        ("updated_by", "UUID", "No", "Updating user"),
    ]

    report = [
        "# Students Dataset Validation\n",
        "\n## 1. Dataset Identification\n",
        "\n**Dataset:** `students.csv`\n",
        "\n**Dataset type:** Synthetic development dataset\n",
        f"\n**Generated records:** {len(df)}\n",
        f"\n**Random seed:** {SEED}\n",
        f"\n**Organization IDs sourced from:** `learning_programs.csv` "
        f"({organization_count} unique organizations)\n",
        "\n> Synthetic data only. Do not treat this dataset as real "
        "student or production data.\n",
        "\n---\n",
        "\n## 2. Dataset Structure\n",
        "\n| Column | Data Type | Required | Description |\n",
        "|---|---|---|---|\n",
    ]

    for column, data_type, required, description in structure:
        report.append(
            f"| `{column}` | {data_type} | {required} | "
            f"{description} |\n"
        )

    report.extend([
        "\n---\n",
        "\n## 3. Required Columns\n",
    ])

    for column in [
        "id", "organization_id", "first_name", "middle_name",
        "last_name", "date_of_birth", "gender", "email", "phone",
        "status", "created_at", "updated_at", "created_by", "updated_by",
    ]:
        report.append(f"- `{column}`\n")

    report.extend([
        "\n### Missing Required Columns\n\n",
        f"{missing_columns}\n",
        "\n---\n",
        "\n## 4. Missing Value Analysis\n",
        f"\nTotal missing cells: **{validation['missing_values']}**\n",
        "\n`created_by` and `updated_by` are intentionally null. "
        "Other nullable identity fields are supported by the schema, "
        "although this generator currently supplies values for them.\n",
        "\n---\n",
        "\n## 5. Duplicate Record Analysis\n",
        f"\n- Duplicate complete rows: **{validation['duplicate_rows']}**\n",
        f"- Duplicate IDs: **{validation['duplicate_ids']}**\n",
        f"- Duplicate email addresses: **{validation['duplicate_emails']}**\n",
        "\n---\n",
        "\n## 6. Data Type Analysis\n",
        "\nPandas-detected data types:\n\n```text\n",
        df.dtypes.to_string(),
        "\n```\n",
        "\nDate of birth values are additionally parsed with datetime validation.\n",
        "\n---\n",
        "\n## 7. Invalid Value Analysis\n",
        f"\n- Invalid gender values: **{validation['invalid_gender']}**\n",
        f"- Invalid status values: **{validation['invalid_status']}**\n",
        f"- Invalid dates of birth: **{validation['invalid_date_of_birth']}**\n",
        f"- Future dates of birth: **{validation['future_date_of_birth']}**\n",
        f"- Invalid email formats: **{validation['invalid_email_format']}**\n",
        f"- Invalid phone formats: **{validation['invalid_phone_format']}**\n",
        f"- Invalid organization references: "
        f"**{validation['invalid_organization_references']}**\n",
        "\nAllowed gender values: `MALE`, `FEMALE`, `OTHER`.\n",
        "\nAllowed lifecycle statuses: `ACTIVE`, `GRADUATED`, "
        "`TRANSFERRED`, `ARCHIVED`.\n",
        "\n---\n",
        "\n## 8. Target / Risk Label\n",
        "\nNo target or risk label is present in the `students` dataset. "
        "No risk label, dropout prediction, attendance, assessment, "
        "or academic-performance columns were created.\n",
        "\n---\n",
        "\n## 9. Academic Features\n",
        "\nThis is a student identity/master dataset, not an academic "
        "performance dataset. It contains identity, organization, "
        "demographic, contact, and lifecycle information. Academic "
        "features must come from enrollment, academic record, "
        "attendance, and assessment datasets.\n",
        "\n---\n",
        "\n## 10. Validation Result\n",
        "\n| Check | Result |\n",
        "|---|---|\n",
    ])

    checks = [
        ("Required columns", not validation["missing_columns"]),
        ("Duplicate rows", validation["duplicate_rows"] == 0),
        ("Duplicate IDs", validation["duplicate_ids"] == 0),
        ("Unique emails", validation["duplicate_emails"] == 0),
        ("First names", validation["empty_first_names"] == 0),
        ("Last names", validation["empty_last_names"] == 0),
        ("Gender values", validation["invalid_gender"] == 0),
        ("Status values", validation["invalid_status"] == 0),
        ("Date of birth", validation["invalid_date_of_birth"] == 0),
        ("No future dates of birth", validation["future_date_of_birth"] == 0),
        ("Email format", validation["invalid_email_format"] == 0),
        ("Phone format", validation["invalid_phone_format"] == 0),
        (
            "Organization references",
            validation["invalid_organization_references"] == 0,
        ),
    ]

    for check_name, passed in checks:
        report.append(
            f"| {check_name} | {'PASS' if passed else 'FAIL'} |\n"
        )

    report.extend([
        f"\n### Overall Result\n\n**{validation_result}**\n",
        "\n---\n",
        "\n## 11. Model Training\n",
        "\n**No model training was performed.** This task only "
        "generates and validates synthetic development data.\n",
        "\n---\n",
        "\n## 12. Conclusion\n",
        f"\nThe dataset contains {len(df)} synthetic student records. "
        "Organization IDs are selected from `learning_programs.csv` "
        "to support consistent organization-level relationships with "
        "downstream academic datasets. No academic performance or risk "
        "labels were invented.\n",
    ])

    REPORT_FILE.write_text(
        "".join(report),
        encoding="utf-8",
    )


# ============================================================
# Main
# ============================================================

def main():
    """Generate, validate, and document the students dataset."""

    print("=" * 70)
    print("DropSafe - Students Synthetic Dataset")
    print("=" * 70)

    print("\nLoading organization IDs...")
    organization_ids = load_organization_ids()
    print(f"Organizations loaded: {len(organization_ids)}")

    print("\nGenerating students...")
    df = generate_students(
        organization_ids,
        ROW_COUNT,
    )

    RAW_DIR.mkdir(
        parents=True,
        exist_ok=True,
    )

    df.to_csv(
        OUTPUT_FILE,
        index=False,
    )

    print("\nValidating dataset...")
    validation = validate_dataset(
        df,
        organization_ids,
    )

    create_report(
        df,
        validation,
        len(organization_ids),
    )

    print(f"\nRows generated: {len(df)}")
    print(f"Columns generated: {len(df.columns)}")
    print(f"CSV: {OUTPUT_FILE}")
    print(f"Report: {REPORT_FILE}")

    print("\nValidation:")
    for key, value in validation.items():
        if key not in {"missing_columns", "validation_passed"}:
            print(f"  {key}: {value}")

    print(
        "\nOverall validation: "
        f"{'PASS' if validation['validation_passed'] else 'FAIL'}"
    )

    print("\nNo model training performed.")


# ============================================================
# Script entry point
# ============================================================

if __name__ == "__main__":
    main()
