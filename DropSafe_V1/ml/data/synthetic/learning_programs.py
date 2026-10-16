from pathlib import Path
from datetime import datetime, timezone
import random
import uuid

import pandas as pd


# ============================================================
# Paths
# ============================================================

BASE_DIR = Path(__file__).resolve().parents[2]

RAW_DIR = BASE_DIR / "data" / "raw"
OUTPUT_FILE = RAW_DIR / "learning_programs.csv"

REPORT_DIR = BASE_DIR / "data" / "synthetic"
REPORT_FILE = REPORT_DIR / "learning_programs.md"


# ============================================================
# Configuration
# ============================================================

SEED = 42
ROW_COUNT = 500

random.seed(SEED)


# ============================================================
# Schema-supported values
# ============================================================

STATUSES = [
    "ACTIVE",
    "INACTIVE",
    "ARCHIVED",
]

PROGRAM_TYPES = [
    "Computer Science",
    "Information Technology",
    "Artificial Intelligence",
    "Data Science",
    "Software Engineering",
    "Cyber Security",
    "Electronics Engineering",
    "Mechanical Engineering",
    "Civil Engineering",
    "Business Administration",
]


# ============================================================
# Utility functions
# ============================================================

def generate_uuid():
    """
    Generate a UUID for synthetic development data.

    Note:
    The project database standard specifies UUID v7 identifiers.
    """
    timestamp_ms = int(
        datetime.now(timezone.utc).timestamp() * 1000
    )

    random_bits = uuid.uuid4().int

    value = (
        (timestamp_ms & ((1 << 48) - 1)) << 80
        | (0x7 << 76)
        | ((random_bits >> 64) & ((1 << 12) - 1)) << 64
        | (0b10 << 62)
        | (random_bits & ((1 << 62) - 1))
    )

    return str(uuid.UUID(int=value))


def utc_now():
    return datetime.now(timezone.utc).replace(
        microsecond=0
    ).isoformat()


# ============================================================
# Synthetic dataset generation
# ============================================================

def generate_learning_programs(count=ROW_COUNT):
    """
    Generate synthetic learning program records.
    """

    organization_id = generate_uuid()

    rows = []

    for index in range(1, count + 1):

        now = utc_now()

        program_type = random.choice(PROGRAM_TYPES)

        row = {
            "id": generate_uuid(),
            "organization_id": organization_id,
            "program_code": f"PROG-{index:04d}",
            "name": f"{program_type} Program {index}",
            "description": (
                f"Synthetic {program_type.lower()} "
                f"learning program {index}"
            ),
            "duration": random.randint(2, 8),
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

def validate_dataset(df):
    """
    Validate the generated learning_programs dataset.
    """

    required_columns = [
        "id",
        "organization_id",
        "program_code",
        "name",
        "description",
        "duration",
        "status",
        "created_at",
        "updated_at",
        "created_by",
        "updated_by",
    ]

    results = {}

    # --------------------------------------------------------
    # Required columns
    # --------------------------------------------------------

    missing_columns = [
        column
        for column in required_columns
        if column not in df.columns
    ]

    results["missing_columns"] = missing_columns

    # --------------------------------------------------------
    # Row / column counts
    # --------------------------------------------------------

    results["rows"] = len(df)
    results["columns"] = len(df.columns)

    # --------------------------------------------------------
    # Missing values
    # --------------------------------------------------------

    missing_values = int(
        df.isnull().sum().sum()
    )

    results["missing_values"] = missing_values

    # --------------------------------------------------------
    # Duplicate rows
    # --------------------------------------------------------

    duplicate_rows = int(
        df.duplicated().sum()
    )

    results["duplicate_rows"] = duplicate_rows

    # --------------------------------------------------------
    # Duplicate IDs
    # --------------------------------------------------------

    duplicate_ids = int(
        df["id"].duplicated().sum()
    )

    results["duplicate_ids"] = duplicate_ids

    # --------------------------------------------------------
    # Duplicate program codes
    # --------------------------------------------------------

    duplicate_program_codes = int(
        df["program_code"].duplicated().sum()
    )

    results["duplicate_program_codes"] = duplicate_program_codes

    # --------------------------------------------------------
    # Invalid duration
    # --------------------------------------------------------

    invalid_duration = int(
        (df["duration"] <= 0).sum()
    )

    results["invalid_duration"] = invalid_duration

    # --------------------------------------------------------
    # Invalid status
    # --------------------------------------------------------

    invalid_status = int(
        (~df["status"].isin(STATUSES)).sum()
    )

    results["invalid_status"] = invalid_status

    # --------------------------------------------------------
    # Empty required text fields
    # --------------------------------------------------------

    empty_program_codes = int(
        df["program_code"]
        .astype(str)
        .str.strip()
        .eq("")
        .sum()
    )

    empty_names = int(
        df["name"]
        .astype(str)
        .str.strip()
        .eq("")
        .sum()
    )

    results["empty_program_codes"] = empty_program_codes
    results["empty_names"] = empty_names

    # --------------------------------------------------------
    # Overall validation
    # --------------------------------------------------------

    results["validation_passed"] = (
        len(missing_columns) == 0
        and duplicate_rows == 0
        and duplicate_ids == 0
        and duplicate_program_codes == 0
        and invalid_duration == 0
        and invalid_status == 0
        and empty_program_codes == 0
        and empty_names == 0
    )

    return results


# ============================================================
# Markdown report
# ============================================================

def create_report(df, validation):
    """
    Create the learning programs validation report.
    """

    REPORT_DIR.mkdir(
        parents=True,
        exist_ok=True
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

    report = []

    report.append("# Learning Programs Dataset Validation\n")

    report.append("## 1. Dataset Identification\n")

    report.append("**Dataset:** `learning_programs.csv`\n")

    report.append("**Dataset type:** Synthetic development dataset\n")

    report.append(
        "**Purpose:** Provide development-time learning program "
        "records for testing the DropSafe academic data pipeline.\n"
    )

    report.append(
        f"**Generated records:** {len(df)}\n"
    )

    report.append(
        f"**Random seed:** {SEED}\n"
    )

    report.append(
        "> This dataset contains synthetic data only. It must not be "
        "treated as real student or production data.\n"
    )

    report.append("---\n")

    report.append("## 2. Dataset Structure\n")

    report.append(
        "| Column | Data Type | Required | Description |\n"
    )
    report.append(
        "|---|---|---|---|\n"
    )

    structure = [
        ("id", "UUID", "Yes", "Learning program identifier"),
        (
            "organization_id",
            "UUID",
            "Yes",
            "Organization identifier"
        ),
        (
            "program_code",
            "String",
            "Yes",
            "Program business code"
        ),
        (
            "name",
            "String",
            "Yes",
            "Learning program name"
        ),
        (
            "description",
            "String",
            "No",
            "Program description"
        ),
        (
            "duration",
            "Integer",
            "Yes",
            "Program duration"
        ),
        (
            "status",
            "String",
            "Yes",
            "Program lifecycle status"
        ),
        (
            "created_at",
            "Timestamp",
            "Yes",
            "Creation timestamp"
        ),
        (
            "updated_at",
            "Timestamp",
            "Yes",
            "Last update timestamp"
        ),
        (
            "created_by",
            "UUID",
            "No",
            "Creating user identifier"
        ),
        (
            "updated_by",
            "UUID",
            "No",
            "Updating user identifier"
        ),
    ]

    for column, data_type, required, description in structure:
        report.append(
            f"| `{column}` | {data_type} | {required} | "
            f"{description} |\n"
        )

    report.append("\n---\n")

    report.append("## 3. Required Columns\n")

    required_columns = [
        "id",
        "organization_id",
        "program_code",
        "name",
        "description",
        "duration",
        "status",
        "created_at",
        "updated_at",
        "created_by",
        "updated_by",
    ]

    for column in required_columns:
        report.append(f"- `{column}`\n")

    report.append("\n### Missing Required Columns\n")

    report.append(f"{missing_columns}\n")

    report.append("\n---\n")

    report.append("## 4. Missing Value Analysis\n")

    report.append(
        f"Total missing cells: **{validation['missing_values']}**\n"
    )

    report.append(
        "Nullable fields such as `description`, `created_by`, and "
        "`updated_by` may contain null values according to the "
        "source schema.\n"
    )

    report.append("\n---\n")

    report.append("## 5. Duplicate Record Analysis\n")

    report.append(
        f"### Duplicate complete rows\n\n"
        f"**{validation['duplicate_rows']}**\n"
    )

    report.append(
        f"### Duplicate IDs\n\n"
        f"**{validation['duplicate_ids']}**\n"
    )

    report.append(
        f"### Duplicate program codes\n\n"
        f"**{validation['duplicate_program_codes']}**\n"
    )

    report.append(
        "Program codes are expected to be unique within an "
        "organization.\n"
    )

    report.append("\n---\n")

    report.append("## 6. Data Type Analysis\n")

    report.append(
        "The generated dataset was inspected using pandas.\n"
    )

    report.append("```text\n")

    report.append(
        df.dtypes.to_string()
    )

    report.append("\n```\n")

    report.append(
        "The generated columns correspond to the expected logical "
        "schema types.\n"
    )

    report.append("\n---\n")

    report.append("## 7. Invalid Value Analysis\n")

    report.append(
        f"### Invalid duration\n\n"
        f"**{validation['invalid_duration']}**\n"
    )

    report.append(
        "All generated duration values must be greater than zero.\n"
    )

    report.append("### Invalid status\n")

    report.append(
        f"**{validation['invalid_status']}**\n"
    )

    report.append("Allowed statuses:\n")

    report.append("- `ACTIVE`\n")
    report.append("- `INACTIVE`\n")
    report.append("- `ARCHIVED`\n")

    report.append(
        f"\n### Empty program codes\n\n"
        f"**{validation['empty_program_codes']}**\n"
    )

    report.append(
        f"\n### Empty program names\n\n"
        f"**{validation['empty_names']}**\n"
    )

    report.append("\n---\n")

    report.append("## 8. Target / Risk Label\n")

    report.append(
        "No target or risk label is present in the "
        "`learning_programs` dataset.\n"
    )

    report.append(
        "There is no `risk_label`, `dropout_risk`, or prediction "
        "column.\n"
    )

    report.append(
        "No artificial risk label was created for this dataset.\n"
    )

    report.append("\n---\n")

    report.append("## 9. Academic Features\n")

    report.append(
        "The dataset provides academic structure rather than "
        "student performance evidence.\n"
    )

    report.append("Potential structural features include:\n")

    report.append("- Learning program identity\n")
    report.append("- Program code\n")
    report.append("- Program name\n")
    report.append("- Program duration\n")
    report.append("- Program lifecycle status\n")
    report.append("- Organization association\n")

    report.append(
        "\nThese are structural academic attributes and should not "
        "be treated as direct student-risk indicators.\n"
    )

    report.append("\n---\n")

    report.append("## 10. Validation Result\n")

    report.append("| Check | Result |\n")
    report.append("|---|---|\n")

    checks = [
        (
            "Required columns",
            "PASS"
            if not validation["missing_columns"]
            else "FAIL"
        ),
        (
            "Missing values",
            "REVIEW"
        ),
        (
            "Duplicate rows",
            "PASS"
            if validation["duplicate_rows"] == 0
            else "FAIL"
        ),
        (
            "Duplicate IDs",
            "PASS"
            if validation["duplicate_ids"] == 0
            else "FAIL"
        ),
        (
            "Duplicate program codes",
            "PASS"
            if validation["duplicate_program_codes"] == 0
            else "FAIL"
        ),
        (
            "Duration validation",
            "PASS"
            if validation["invalid_duration"] == 0
            else "FAIL"
        ),
        (
            "Status validation",
            "PASS"
            if validation["invalid_status"] == 0
            else "FAIL"
        ),
        (
            "Empty program code",
            "PASS"
            if validation["empty_program_codes"] == 0
            else "FAIL"
        ),
        (
            "Empty program name",
            "PASS"
            if validation["empty_names"] == 0
            else "FAIL"
        ),
    ]

    for check_name, result in checks:
        report.append(
            f"| {check_name} | {result} |\n"
        )

    report.append(
        f"\n### Overall Result\n\n**{validation_result}**\n"
    )

    report.append("\n---\n")

    report.append("## 11. Model Training\n")

    report.append(
        "**No model training was performed.**\n"
    )

    report.append(
        "This task only generates and validates synthetic "
        "development data.\n"
    )

    report.append("\n---\n")

    report.append("## 12. Conclusion\n")

    report.append(
        f"The `learning_programs` synthetic dataset contains "
        f"{len(df)} records and follows the available learning "
        "program schema structure.\n"
    )

    report.append(
        "The dataset is intended only for development, validation, "
        "and pipeline testing.\n"
    )

    REPORT_FILE.write_text(
        "".join(report),
        encoding="utf-8"
    )
   
def main():

    print("=" * 70)
    print("DropSafe - Learning Programs Synthetic Dataset")
    print("=" * 70)

    RAW_DIR.mkdir(
        parents=True,
        exist_ok=True
    )

    # Generate dataset
    df = generate_learning_programs()

    # Save CSV
    df.to_csv(
        OUTPUT_FILE,
        index=False
    )

    # Validate dataset
    validation = validate_dataset(df)

    # Create markdown report
    create_report(
        df,
        validation
    )

    # Console summary
    print(f"\nRows generated: {len(df)}")
    print(f"Columns generated: {len(df.columns)}")
    print(f"CSV: {OUTPUT_FILE}")
    print(f"Report: {REPORT_FILE}")

    print("\nValidation:")
    print(
        f"  Duplicate rows: "
        f"{validation['duplicate_rows']}"
    )
    print(
        f"  Duplicate IDs: "
        f"{validation['duplicate_ids']}"
    )
    print(
        f"  Duplicate program codes: "
        f"{validation['duplicate_program_codes']}"
    )
    print(
        f"  Invalid duration: "
        f"{validation['invalid_duration']}"
    )
    print(
        f"  Invalid status: "
        f"{validation['invalid_status']}"
    )

    print(
        "\nOverall validation: "
        f"{'PASS' if validation['validation_passed'] else 'FAIL'}"
    )

    print("\nNo model training performed.")


    
if __name__=="__main__":
    main()