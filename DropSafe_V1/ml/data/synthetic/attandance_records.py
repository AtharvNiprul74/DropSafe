
from pathlib import Path
from datetime import datetime, timezone
import random
import uuid

import pandas as pd


# --------------------------------------------------
# Configuration
# --------------------------------------------------

BASE_DIR = Path(__file__).resolve().parents[2]
RAW_DIR = BASE_DIR / "data" / "raw"
REPORT_DIR = BASE_DIR / "data" / "synthetic"

ACADEMIC_RECORDS_FILE = RAW_DIR / "academic_records.csv"
COMPONENTS_FILE = RAW_DIR / "learning_components.csv"

OUTPUT_FILE = RAW_DIR / "attendance_records.csv"
REPORT_FILE = REPORT_DIR / "attendance_records.md"

SEED = 48
random.seed(SEED)


# --------------------------------------------------
# Utility functions
# --------------------------------------------------

def generate_uuid():
    """Generate a unique UUID for a synthetic attendance record."""
    return str(uuid.uuid4())


def utc_now():
    """Return a UTC timestamp in ISO 8601 format."""
    return datetime.now(timezone.utc).replace(
        microsecond=0
    ).isoformat()


def load_csv(file_path, dataset_name):
    """Load a required CSV file using string values."""
    if not file_path.exists():
        raise FileNotFoundError(
            f"{file_path} not found. "
            f"Generate the {dataset_name} dataset first."
        )

    df = pd.read_csv(file_path, dtype=str)

    if df.empty:
        raise ValueError(
            f"{dataset_name} dataset is empty: {file_path}"
        )

    return df


def require_columns(df, required_columns, dataset_name):
    """Check that a source dataset contains required columns."""
    missing = [
        column
        for column in required_columns
        if column not in df.columns
    ]

    if missing:
        raise ValueError(
            f"{dataset_name} is missing required columns: "
            f"{', '.join(missing)}"
        )


# --------------------------------------------------
# Load source datasets
# --------------------------------------------------

def load_source_datasets():
    academic_records = load_csv(
        ACADEMIC_RECORDS_FILE,
        "academic_records",
    )

    components = load_csv(
        COMPONENTS_FILE,
        "learning_components",
    )

    require_columns(
        academic_records,
        [
            "id",
            "organization_id",
            "learning_component_id",
        ],
        "academic_records.csv",
    )

    require_columns(
        components,
        [
            "id",
            "organization_id",
            "academic_period_id",
        ],
        "learning_components.csv",
    )

    for df, columns in [
        (
            academic_records,
            [
                "id",
                "organization_id",
                "learning_component_id",
            ],
        ),
        (
            components,
            [
                "id",
                "organization_id",
                "academic_period_id",
            ],
        ),
    ]:
        for column in columns:
            df[column] = df[column].fillna("").str.strip()

    return academic_records, components


# --------------------------------------------------
# Generate attendance records
# --------------------------------------------------

def generate_attendance_records(
    academic_records,
    components,
):
    """
    Generate one synthetic attendance record per academic record.

    The component and organization must match the academic record.
    Attendance counts are evidence values, not percentages.
    """

    if academic_records["id"].eq("").any():
        raise ValueError(
            "academic_records.csv contains empty record IDs."
        )

    if academic_records["id"].duplicated().any():
        raise ValueError(
            "academic_records.csv contains duplicate record IDs."
        )

    if components["id"].eq("").any():
        raise ValueError(
            "learning_components.csv contains empty component IDs."
        )

    if components["id"].duplicated().any():
        raise ValueError(
            "learning_components.csv contains duplicate component IDs."
        )

    component_lookup = components.set_index(
        "id"
    ).to_dict("index")

    rows = []
    invalid_records = []

    for _, academic_record in academic_records.iterrows():
        academic_record_id = academic_record["id"]
        organization_id = academic_record["organization_id"]
        component_id = academic_record["learning_component_id"]

        component = component_lookup.get(component_id)

        if component is None:
            invalid_records.append(
                f"{academic_record_id}: missing component {component_id}"
            )
            continue

        if component["organization_id"] != organization_id:
            invalid_records.append(
                f"{academic_record_id}: organization mismatch"
            )
            continue

        # Synthetic session counts.
        # These values represent attendance evidence only.
        total_sessions = random.randint(10, 60)
        attended_sessions = random.randint(0, total_sessions)

        now = utc_now()

        rows.append({
            "id": generate_uuid(),
            "organization_id": organization_id,
            "academic_record_id": academic_record_id,
            "learning_component_id": component_id,
            "attended_sessions": attended_sessions,
            "total_sessions": total_sessions,
            # No import_sessions dataset exists in the current schema.
            "import_session_id": None,
            "created_at": now,
            "updated_at": now,
        })

    if invalid_records:
        examples = "; ".join(invalid_records[:5])
        raise ValueError(
            f"Could not generate attendance records for "
            f"{len(invalid_records)} academic records. "
            f"Examples: {examples}"
        )

    return pd.DataFrame(
        rows,
        columns=[
            "id",
            "organization_id",
            "academic_record_id",
            "learning_component_id",
            "attended_sessions",
            "total_sessions",
            "import_session_id",
            "created_at",
            "updated_at",
        ],
    )


# --------------------------------------------------
# Validate attendance records
# --------------------------------------------------

def validate_dataset(
    df,
    academic_records,
    components,
):
    required_columns = [
        "id",
        "organization_id",
        "academic_record_id",
        "learning_component_id",
        "attended_sessions",
        "total_sessions",
        "import_session_id",
        "created_at",
        "updated_at",
    ]

    missing_columns = [
        column
        for column in required_columns
        if column not in df.columns
    ]

    results = {
        "rows": len(df),
        "columns": len(df.columns),
        "missing_required_columns": missing_columns,
        "missing_values": int(df.isnull().sum().sum()),
        "duplicate_rows": int(df.duplicated().sum()),
        "duplicate_ids": int(df["id"].duplicated().sum()),
    }

    results["empty_required_values"] = int(
        sum(
            df[column]
            .fillna("")
            .astype(str)
            .str.strip()
            .eq("")
            .sum()
            for column in [
                "id",
                "organization_id",
                "academic_record_id",
                "learning_component_id",
                "created_at",
                "updated_at",
            ]
        )
    )

    # Convert session counts to numeric values for validation.
    attended = pd.to_numeric(
        df["attended_sessions"],
        errors="coerce",
    )

    total = pd.to_numeric(
        df["total_sessions"],
        errors="coerce",
    )

    results["invalid_attended_session_values"] = int(
        (
            attended.isna()
            | (attended < 0)
            | (attended % 1 != 0)
        ).sum()
    )

    results["invalid_total_session_values"] = int(
        (
            total.isna()
            | (total <= 0)
            | (total % 1 != 0)
        ).sum()
    )

    results["attendance_exceeds_total"] = int(
        (
            attended.notna()
            & total.notna()
            & (attended > total)
        ).sum()
    )

    # Foreign-key checks.
    academic_record_ids = set(academic_records["id"])
    component_ids = set(components["id"])

    results["invalid_academic_record_references"] = int(
        (~df["academic_record_id"].isin(academic_record_ids)).sum()
    )

    results["invalid_component_references"] = int(
        (~df["learning_component_id"].isin(component_ids)).sum()
    )

    academic_lookup = academic_records.set_index(
        "id"
    ).to_dict("index")

    component_lookup = components.set_index(
        "id"
    ).to_dict("index")

    results["organization_mismatches"] = 0
    results["component_mismatches"] = 0

    for _, record in df.iterrows():
        academic_record = academic_lookup.get(
            record["academic_record_id"]
        )

        component = component_lookup.get(
            record["learning_component_id"]
        )

        if academic_record is None or component is None:
            continue

        if (
            record["organization_id"]
            != academic_record["organization_id"]
            or record["organization_id"]
            != component["organization_id"]
        ):
            results["organization_mismatches"] += 1

        if (
            record["learning_component_id"]
            != academic_record["learning_component_id"]
        ):
            results["component_mismatches"] += 1

    # Enforce uniqueness of the schema-defined business key.
    business_key = [
        "organization_id",
        "academic_record_id",
        "learning_component_id",
    ]

    results["duplicate_business_keys"] = int(
        df.duplicated(subset=business_key).sum()
    )

    # Validate timestamps.
    created = pd.to_datetime(
        df["created_at"],
        errors="coerce",
        utc=True,
    )

    updated = pd.to_datetime(
        df["updated_at"],
        errors="coerce",
        utc=True,
    )

    results["invalid_created_timestamps"] = int(
        created.isna().sum()
    )

    results["invalid_updated_timestamps"] = int(
        updated.isna().sum()
    )

    results["updated_before_created"] = int(
        (updated < created).fillna(False).sum()
    )

    # import_session_id is nullable by design.
    # No import-session dataset is available to validate against.
    results["non_null_import_session_ids"] = int(
        df["import_session_id"].notna().sum()
    )

    results["record_count_matches_academic_records"] = (
        len(df) == len(academic_records)
    )

    results["validation_passed"] = all([
        not missing_columns,
        results["duplicate_rows"] == 0,
        results["duplicate_ids"] == 0,
        results["empty_required_values"] == 0,
        results["invalid_attended_session_values"] == 0,
        results["invalid_total_session_values"] == 0,
        results["attendance_exceeds_total"] == 0,
        results["invalid_academic_record_references"] == 0,
        results["invalid_component_references"] == 0,
        results["organization_mismatches"] == 0,
        results["component_mismatches"] == 0,
        results["duplicate_business_keys"] == 0,
        results["invalid_created_timestamps"] == 0,
        results["invalid_updated_timestamps"] == 0,
        results["updated_before_created"] == 0,
        results["record_count_matches_academic_records"],
    ])

    return results


# --------------------------------------------------
# Create Markdown validation report
# --------------------------------------------------

def create_report(
    df,
    validation,
    academic_records,
    components,
):
    REPORT_DIR.mkdir(parents=True, exist_ok=True)

    overall_result = (
        "PASS"
        if validation["validation_passed"]
        else "FAIL"
    )

    structure = [
        (
            "id",
            "UUID",
            "Yes",
            "Unique attendance-record identifier",
        ),
        (
            "organization_id",
            "UUID",
            "Yes",
            "Organization identifier",
        ),
        (
            "academic_record_id",
            "UUID",
            "Yes",
            "Related academic record",
        ),
        (
            "learning_component_id",
            "UUID",
            "Yes",
            "Related learning component",
        ),
        (
            "attended_sessions",
            "Integer",
            "Yes",
            "Number of sessions attended",
        ),
        (
            "total_sessions",
            "Integer",
            "Yes",
            "Total number of sessions",
        ),
        (
            "import_session_id",
            "UUID",
            "No",
            "Optional import-session reference",
        ),
        (
            "created_at",
            "Timestamp",
            "Yes",
            "Record creation timestamp",
        ),
        (
            "updated_at",
            "Timestamp",
            "Yes",
            "Last record update timestamp",
        ),
    ]

    lines = [
        "# Attendance Records Dataset Validation\n",
        "\n## 1. Dataset Identification\n",
        "\n- **Dataset:** `attendance_records.csv`\n",
        "- **Dataset type:** Synthetic development dataset\n",
        f"- **Generated records:** {len(df)}\n",
        f"- **Random seed:** {SEED}\n",
        "- **Source datasets:** `academic_records.csv`, "
        "`learning_components.csv`\n",
        "\n> Synthetic data only. This is not production attendance data.\n",
        "\n---\n",
        "\n## 2. Dataset Structure\n",
        "\n| Column | Data Type | Required | Description |\n",
        "|---|---|---|---|\n",
    ]

    for column, data_type, required, description in structure:
        lines.append(
            f"| `{column}` | {data_type} | {required} | "
            f"{description} |\n"
        )

    lines.extend([
        "\n---\n",
        "\n## 3. Source Dataset Counts\n",
        f"\n- Academic records: **{len(academic_records)}**\n",
        f"- Learning components: **{len(components)}**\n",
        f"- Attendance records generated: **{len(df)}**\n",
        "\nOne attendance record is generated for each academic record. "
        "The component and organization must match the academic record.\n",
        "\n---\n",
        "\n## 4. Missing Value Analysis\n",
        f"\nTotal missing cells: **{validation['missing_values']}**\n",
        "\n`import_session_id` is intentionally null because the "
        "current dataset plan does not include an import-sessions "
        "source dataset. This nullable field is not treated as an error.\n",
        "\n---\n",
        "\n## 5. Duplicate Analysis\n",
        f"\n- Duplicate complete rows: **{validation['duplicate_rows']}**\n",
        f"- Duplicate IDs: **{validation['duplicate_ids']}**\n",
        f"- Duplicate business keys: "
        f"**{validation['duplicate_business_keys']}**\n",
        "\nThe business key consists of organization, academic record, "
        "and learning component.\n",
        "\n---\n",
        "\n## 6. Data Type Analysis\n",
        "\nPandas-detected data types:\n\n```text\n",
        df.dtypes.to_string(),
        "\n```\n",
        "\nSession counts are additionally checked for integer values.\n",
        "\n---\n",
        "\n## 7. Invalid Value and Relationship Analysis\n",
        f"\n- Empty required values: "
        f"**{validation['empty_required_values']}**\n",
        f"- Invalid attended-session values: "
        f"**{validation['invalid_attended_session_values']}**\n",
        f"- Invalid total-session values: "
        f"**{validation['invalid_total_session_values']}**\n",
        f"- Attended sessions greater than total: "
        f"**{validation['attendance_exceeds_total']}**\n",
        f"- Invalid academic-record references: "
        f"**{validation['invalid_academic_record_references']}**\n",
        f"- Invalid component references: "
        f"**{validation['invalid_component_references']}**\n",
        f"- Organization mismatches: "
        f"**{validation['organization_mismatches']}**\n",
        f"- Component mismatches: "
        f"**{validation['component_mismatches']}**\n",
        f"- Invalid creation timestamps: "
        f"**{validation['invalid_created_timestamps']}**\n",
        f"- Invalid update timestamps: "
        f"**{validation['invalid_updated_timestamps']}**\n",
        f"- Updates before creation: "
        f"**{validation['updated_before_created']}**\n",
        "\nValidation rules:\n",
        "- `total_sessions` must be greater than zero.\n",
        "- `attended_sessions` must be a non-negative integer.\n",
        "- `attended_sessions` must not exceed `total_sessions`.\n",
        "- Organization and component references must be consistent.\n",
        "\n---\n",
        "\n## 8. Target / Risk Label\n",
        "\nNo target or risk label is present in this dataset. "
        "No dropout prediction or risk classification was created.\n",
        "\n---\n",
        "\n## 9. Academic Features\n",
        "\nThe dataset stores raw attendance evidence as session counts. "
        "Attendance percentages can be derived later during feature "
        "engineering, for example by dividing attended sessions by "
        "total sessions. No derived percentage is stored in this CSV.\n",
        "\n---\n",
        "\n## 10. Validation Results\n",
        "\n| Check | Result |\n",
        "|---|---|\n",
    ])

    checks = [
        (
            "Required columns",
            not validation["missing_required_columns"],
        ),
        ("Duplicate rows", validation["duplicate_rows"] == 0),
        ("Duplicate IDs", validation["duplicate_ids"] == 0),
        (
            "Unique business keys",
            validation["duplicate_business_keys"] == 0,
        ),
        (
            "Attended session counts",
            validation["invalid_attended_session_values"] == 0,
        ),
        (
            "Total session counts",
            validation["invalid_total_session_values"] == 0,
        ),
        (
            "Attended does not exceed total",
            validation["attendance_exceeds_total"] == 0,
        ),
        (
            "Academic-record references",
            validation["invalid_academic_record_references"] == 0,
        ),
        (
            "Component references",
            validation["invalid_component_references"] == 0,
        ),
        (
            "Organization consistency",
            validation["organization_mismatches"] == 0,
        ),
        (
            "Component consistency",
            validation["component_mismatches"] == 0,
        ),
        (
            "Creation timestamps",
            validation["invalid_created_timestamps"] == 0,
        ),
        (
            "Update timestamps",
            validation["invalid_updated_timestamps"] == 0,
        ),
        (
            "Chronological timestamps",
            validation["updated_before_created"] == 0,
        ),
        (
            "Record count",
            validation["record_count_matches_academic_records"],
        ),
    ]

    for name, passed in checks:
        lines.append(
            f"| {name} | {'PASS' if passed else 'FAIL'} |\n"
        )

    lines.extend([
        f"\n### Overall Validation: **{overall_result}**\n",
        "\n---\n",
        "\n## 11. Model Training\n",
        "\n**No model training was performed.** This task only "
        "generates and validates synthetic attendance evidence.\n",
        "\n---\n",
        "\n## 12. Conclusion\n",
        f"\nThe generator created {len(df)} synthetic attendance "
        "records from {len(academic_records)} academic records. "
        "Raw session counts are retained, relationships are checked, "
        "and risk labels or derived percentages are not invented.\n",
    ])

    REPORT_FILE.write_text(
        "".join(lines),
        encoding="utf-8",
    )


# --------------------------------------------------
# Main entry point
# --------------------------------------------------

def main():
    print("=" * 70)
    print("DropSafe - Attendance Records Synthetic Dataset")
    print("=" * 70)

    print("\nLoading source datasets...")
    academic_records, components = load_source_datasets()

    print(f"Academic records loaded: {len(academic_records)}")
    print(f"Learning components loaded: {len(components)}")

    print("\nGenerating attendance records...")
    df = generate_attendance_records(
        academic_records,
        components,
    )

    RAW_DIR.mkdir(parents=True, exist_ok=True)
    df.to_csv(OUTPUT_FILE, index=False)

    print("\nValidating attendance records...")
    validation = validate_dataset(
        df,
        academic_records,
        components,
    )

    create_report(
        df,
        validation,
        academic_records,
        components,
    )

    print(f"\nRows generated: {len(df)}")
    print(f"Columns generated: {len(df.columns)}")
    print(f"CSV saved to: {OUTPUT_FILE}")
    print(f"Report saved to: {REPORT_FILE}")

    print("\nValidation results:")
    for key, value in validation.items():
        if key not in {
            "missing_required_columns",
            "validation_passed",
        }:
            print(f"  {key}: {value}")

    print(
        "\nOverall validation: "
        f"{'PASS' if validation['validation_passed'] else 'FAIL'}"
    )

    if not validation["validation_passed"]:
        raise SystemExit(
            "Attendance validation failed. "
            "Review the report before proceeding."
        )

    print("\nNo model training performed.")


if __name__ == "__main__":
    main()
