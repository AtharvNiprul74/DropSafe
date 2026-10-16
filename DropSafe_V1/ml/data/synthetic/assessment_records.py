
from pathlib import Path
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation
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

OUTPUT_FILE = RAW_DIR / "assessment_records.csv"
REPORT_FILE = REPORT_DIR / "assessment_records.md"

SEED = 49
random.seed(SEED)

# Used only when a component has no maximum_marks value.
DEFAULT_MAXIMUM_MARKS = Decimal("100.00")


# --------------------------------------------------
# Utility functions
# --------------------------------------------------

def generate_uuid():
    """Generate a unique UUID for a synthetic assessment record."""
    return str(uuid.uuid4())


def utc_now():
    """Return a UTC timestamp in ISO 8601 format."""
    return datetime.now(timezone.utc).replace(
        microsecond=0
    ).isoformat()


def load_csv(file_path, dataset_name):
    """Load a required CSV file as strings."""
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
    """Ensure the source dataset has all required columns."""
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


def parse_decimal(value):
    """Convert a non-empty value to Decimal, returning None if empty."""
    if value is None or pd.isna(value) or str(value).strip() == "":
        return None

    try:
        number = Decimal(str(value).strip())
    except (InvalidOperation, ValueError):
        raise ValueError(f"Invalid decimal value: {value!r}")

    if not number.is_finite():
        raise ValueError(f"Non-finite decimal value: {value!r}")

    return number


def format_decimal(value):
    """Format a Decimal as a two-decimal string."""
    return f"{value:.2f}"


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
            "maximum_marks",
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
                "maximum_marks",
            ],
        ),
    ]:
        for column in columns:
            df[column] = df[column].fillna("").str.strip()

    return academic_records, components


# --------------------------------------------------
# Generate assessment records
# --------------------------------------------------

def generate_assessment_records(
    academic_records,
    components,
):
    """
    Generate one assessment record per academic record.

    Each assessment uses the same organization and component
    as its academic record.

    If a component's maximum_marks is null, a synthetic maximum
    of 100.00 is used for that assessment only. The source component
    dataset is not modified.
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
    fallback_maximum_count = 0

    for _, academic_record in academic_records.iterrows():
        academic_record_id = academic_record["id"]
        organization_id = academic_record["organization_id"]
        component_id = academic_record["learning_component_id"]

        component = component_lookup.get(component_id)

        if component is None:
            invalid_records.append(
                f"{academic_record_id}: component {component_id} not found"
            )
            continue

        if component["organization_id"] != organization_id:
            invalid_records.append(
                f"{academic_record_id}: organization mismatch"
            )
            continue

        try:
            maximum_marks = parse_decimal(
                component.get("maximum_marks")
            )
        except ValueError as error:
            invalid_records.append(
                f"{academic_record_id}: {error}"
            )
            continue

        if maximum_marks is None:
            maximum_marks = DEFAULT_MAXIMUM_MARKS
            fallback_maximum_count += 1

        if maximum_marks <= 0:
            invalid_records.append(
                f"{academic_record_id}: maximum marks must be positive"
            )
            continue

        # Generate a synthetic mark from zero through the maximum.
        # Two decimal places support DECIMAL-style schema fields.
        obtained_cents = random.randint(
            0,
            int(maximum_marks * 100),
        )
        obtained_marks = Decimal(obtained_cents) / Decimal("100")

        now = utc_now()

        rows.append({
            "id": generate_uuid(),
            "organization_id": organization_id,
            "academic_record_id": academic_record_id,
            "learning_component_id": component_id,
            "obtained_marks": format_decimal(obtained_marks),
            "maximum_marks": format_decimal(maximum_marks),
            # Nullable because no grading-outcome enum or mapping
            # is assumed by this generator.
            "grading_outcome": None,
            # No import-sessions source dataset is available.
            "import_session_id": None,
            "created_at": now,
            "updated_at": now,
        })

    if invalid_records:
        examples = "; ".join(invalid_records[:5])
        raise ValueError(
            f"Could not generate {len(invalid_records)} assessment "
            f"records. Examples: {examples}"
        )

    result = pd.DataFrame(
        rows,
        columns=[
            "id",
            "organization_id",
            "academic_record_id",
            "learning_component_id",
            "obtained_marks",
            "maximum_marks",
            "grading_outcome",
            "import_session_id",
            "created_at",
            "updated_at",
        ],
    )

    result.attrs["fallback_maximum_count"] = fallback_maximum_count

    return result


# --------------------------------------------------
# Validate assessment records
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
        "obtained_marks",
        "maximum_marks",
        "grading_outcome",
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
        "duplicate_academic_records": int(
            df["academic_record_id"].duplicated().sum()
        ),
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
                "obtained_marks",
                "maximum_marks",
                "created_at",
                "updated_at",
            ]
        )
    )

    # Marks must be valid decimal values.
    obtained = pd.to_numeric(
        df["obtained_marks"],
        errors="coerce",
    )

    maximum = pd.to_numeric(
        df["maximum_marks"],
        errors="coerce",
    )

    results["invalid_obtained_marks"] = int(
        (
            obtained.isna()
            | (obtained < 0)
        ).sum()
    )

    results["invalid_maximum_marks"] = int(
        (
            maximum.isna()
            | (maximum <= 0)
        ).sum()
    )

    results["obtained_marks_exceed_maximum"] = int(
        (
            obtained.notna()
            & maximum.notna()
            & (obtained > maximum)
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

    # Nullable fields are permitted by the schema.
    results["non_null_grading_outcomes"] = int(
        df["grading_outcome"].notna().sum()
    )

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
        results["duplicate_academic_records"] == 0,
        results["duplicate_business_keys"] == 0,
        results["empty_required_values"] == 0,
        results["invalid_obtained_marks"] == 0,
        results["invalid_maximum_marks"] == 0,
        results["obtained_marks_exceed_maximum"] == 0,
        results["invalid_academic_record_references"] == 0,
        results["invalid_component_references"] == 0,
        results["organization_mismatches"] == 0,
        results["component_mismatches"] == 0,
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
    fallback_maximum_count,
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
            "Unique assessment-record identifier",
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
            "obtained_marks",
            "Decimal",
            "Yes",
            "Marks obtained",
        ),
        (
            "maximum_marks",
            "Decimal",
            "Yes",
            "Maximum marks for this assessment",
        ),
        (
            "grading_outcome",
            "Nullable",
            "No",
            "Optional grading outcome",
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
        "# Assessment Records Dataset Validation\n",
        "\n## 1. Dataset Identification\n",
        "\n- **Dataset:** `assessment_records.csv`\n",
        "- **Dataset type:** Synthetic development dataset\n",
        f"- **Generated records:** {len(df)}\n",
        f"- **Random seed:** {SEED}\n",
        "- **Source datasets:** `academic_records.csv`, "
        "`learning_components.csv`\n",
        "\n> Synthetic data only. This is not production assessment data.\n",
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
        f"- Assessment records generated: **{len(df)}**\n",
        "\nOne assessment record is generated per academic record. "
        "The organization and component must match the academic record.\n",
        "\n---\n",
        "\n## 4. Missing Value Analysis\n",
        f"\nTotal missing cells: **{validation['missing_values']}**\n",
        f"\n- Records using a fallback maximum mark because the component "
        f"maximum was null: **{fallback_maximum_count}**\n",
        "\nWhen a component's `maximum_marks` is null, the generator "
        "uses 100.00 for that synthetic assessment only. The source "
        "component CSV is not changed. This is an explicit synthetic "
        "assumption, not a value inferred from the source schema.\n",
        "\n`grading_outcome` and `import_session_id` are intentionally "
        "null. The schema permits these fields to be nullable, and no "
        "grading-outcome mapping or import-session source dataset is "
        "assumed by this generator.\n",
        "\n---\n",
        "\n## 5. Duplicate Analysis\n",
        f"\n- Duplicate complete rows: **{validation['duplicate_rows']}**\n",
        f"- Duplicate IDs: **{validation['duplicate_ids']}**\n",
        "- Duplicate academic-record references: "
        f"**{validation['duplicate_academic_records']}**\n",
        "- Duplicate business keys: "
        f"**{validation['duplicate_business_keys']}**\n",
        "\n---\n",
        "\n## 6. Data Type Analysis\n",
        "\nPandas-detected data types:\n\n```text\n",
        df.dtypes.to_string(),
        "\n```\n",
        "\nMarks are additionally converted to numeric values for validation.\n",
        "\n---\n",
        "\n## 7. Invalid Value and Relationship Analysis\n",
        f"\n- Empty required values: "
        f"**{validation['empty_required_values']}**\n",
        f"- Invalid obtained marks: "
        f"**{validation['invalid_obtained_marks']}**\n",
        f"- Invalid maximum marks: "
        f"**{validation['invalid_maximum_marks']}**\n",
        f"- Obtained marks exceeding maximum: "
        f"**{validation['obtained_marks_exceed_maximum']}**\n",
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
        "- `obtained_marks` must be greater than or equal to zero.\n",
        "- `maximum_marks` must be greater than zero.\n",
        "- `obtained_marks` must not exceed `maximum_marks`.\n",
        "- Organization and component references must be consistent.\n",
        "\n---\n",
        "\n## 8. Target / Risk Label\n",
        "\nNo target or risk label is present in this dataset. "
        "No dropout-risk classification, prediction, or model output "
        "was created.\n",
        "\n---\n",
        "\n## 9. Academic Features\n",
        "\nThis dataset stores raw assessment evidence. A marks "
        "percentage can be derived later during feature engineering "
        "using obtained marks divided by maximum marks. No percentage "
        "or risk score is stored in this CSV.\n",
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
            "One record per academic record",
            validation["duplicate_academic_records"] == 0
            and validation["record_count_matches_academic_records"],
        ),
        (
            "Unique business keys",
            validation["duplicate_business_keys"] == 0,
        ),
        (
            "Obtained marks",
            validation["invalid_obtained_marks"] == 0,
        ),
        (
            "Maximum marks",
            validation["invalid_maximum_marks"] == 0,
        ),
        (
            "Obtained marks do not exceed maximum",
            validation["obtained_marks_exceed_maximum"] == 0,
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
        "generates and validates synthetic assessment evidence.\n",
        "\n---\n",
        "\n## 12. Conclusion\n",
        f"\nThe generator created {len(df)} synthetic assessment "
        "records from {len(academic_records)} academic records. "
        "Mark ranges and relationships were validated, and no "
        "derived percentages or risk labels were invented.\n",
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
    print("DropSafe - Assessment Records Synthetic Dataset")
    print("=" * 70)

    print("\nLoading source datasets...")
    academic_records, components = load_source_datasets()

    print(f"Academic records loaded: {len(academic_records)}")
    print(f"Learning components loaded: {len(components)}")

    print("\nGenerating assessment records...")
    df = generate_assessment_records(
        academic_records,
        components,
    )

    fallback_maximum_count = df.attrs.get(
        "fallback_maximum_count",
        0,
    )

    RAW_DIR.mkdir(parents=True, exist_ok=True)
    df.to_csv(OUTPUT_FILE, index=False)

    print("\nValidating assessment records...")
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
        fallback_maximum_count,
    )

    print(f"\nRows generated: {len(df)}")
    print(f"Columns generated: {len(df.columns)}")
    print(
        "Fallback maximum marks used: "
        f"{fallback_maximum_count}"
    )
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
            "Assessment validation failed. "
            "Review the report before proceeding."
        )

    print("\nNo model training performed.")


if __name__ == "__main__":
    main()
