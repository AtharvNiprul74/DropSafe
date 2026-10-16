
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

ENROLLMENTS_FILE = RAW_DIR / "enrollments.csv"
COMPONENTS_FILE = RAW_DIR / "learning_components.csv"
PERIODS_FILE = RAW_DIR / "academic_periods.csv"

OUTPUT_FILE = RAW_DIR / "academic_records.csv"
REPORT_FILE = REPORT_DIR / "academic_records.md"

SEED = 47
random.seed(SEED)

ACADEMIC_STATUSES = [
    "ACTIVE",
    "COMPLETED",
    "WITHDRAWN",
    "ARCHIVED",
]


# --------------------------------------------------
# Utility functions
# --------------------------------------------------

def generate_uuid():
    """Generate a UUID for a synthetic academic record."""
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
    """Ensure an input dataset has its required columns."""
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
    enrollments = load_csv(
        ENROLLMENTS_FILE,
        "enrollments",
    )

    components = load_csv(
        COMPONENTS_FILE,
        "learning_components",
    )

    periods = load_csv(
        PERIODS_FILE,
        "academic_periods",
    )

    require_columns(
        enrollments,
        [
            "id",
            "organization_id",
            "academic_period_id",
        ],
        "enrollments.csv",
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

    require_columns(
        periods,
        [
            "id",
            "organization_id",
        ],
        "academic_periods.csv",
    )

    # Normalize identifiers for reliable foreign-key comparisons.
    for df, columns in [
        (
            enrollments,
            ["id", "organization_id", "academic_period_id"],
        ),
        (
            components,
            ["id", "organization_id", "academic_period_id"],
        ),
        (
            periods,
            ["id", "organization_id"],
        ),
    ]:
        for column in columns:
            df[column] = df[column].fillna("").str.strip()

    return enrollments, components, periods


# --------------------------------------------------
# Academic status generation
# --------------------------------------------------

def derive_academic_status(enrollment):
    """
    Derive an academic status from the enrollment status
    when that status is available.

    TRANSFERRED enrollments map to ARCHIVED because
    TRANSFERRED is not an allowed academic-record status.
    """
    enrollment_status = str(
        enrollment.get("status", "")
    ).strip().upper()

    status_mapping = {
        "ACTIVE": "ACTIVE",
        "COMPLETED": "COMPLETED",
        "WITHDRAWN": "WITHDRAWN",
        "TRANSFERRED": "ARCHIVED",
        "ARCHIVED": "ARCHIVED",
    }

    if enrollment_status in status_mapping:
        return status_mapping[enrollment_status]

    # If the source status is absent or unsupported, use
    # a valid academic status without inventing a risk label.
    return random.choice(ACADEMIC_STATUSES)


# --------------------------------------------------
# Generate academic records
# --------------------------------------------------

def generate_academic_records(
    enrollments,
    components,
    periods,
):
    """
    Generate one academic record per enrollment.

    The selected learning component must belong to the same
    organization and academic period as the enrollment.
    """

    # Verify enrollment references point to valid periods.
    period_lookup = periods.set_index("id").to_dict("index")

    invalid_periods = enrollments[
        ~enrollments["academic_period_id"].isin(
            set(periods["id"])
        )
    ]

    if not invalid_periods.empty:
        raise ValueError(
            f"{len(invalid_periods)} enrollments reference "
            "academic periods that do not exist."
        )

    # Ensure source identifiers are usable and unique.
    if enrollments["id"].eq("").any():
        raise ValueError(
            "enrollments.csv contains empty enrollment IDs."
        )

    if enrollments["id"].duplicated().any():
        raise ValueError(
            "enrollments.csv contains duplicate enrollment IDs."
        )

    if components["id"].eq("").any():
        raise ValueError(
            "learning_components.csv contains empty component IDs."
        )

    if components["id"].duplicated().any():
        raise ValueError(
            "learning_components.csv contains duplicate component IDs."
        )

    if periods["id"].duplicated().any():
        raise ValueError(
            "academic_periods.csv contains duplicate period IDs."
        )

    # Verify each enrollment's organization matches its period.
    for _, enrollment in enrollments.iterrows():
        period = period_lookup[enrollment["academic_period_id"]]

        if (
            enrollment["organization_id"]
            != period["organization_id"]
        ):
            raise ValueError(
                "Organization mismatch between enrollment "
                f"{enrollment['id']} and its academic period."
            )

    # Keep only components with valid parent-period relationships.
    valid_period_ids = set(periods["id"])
    valid_organizations = set(periods["organization_id"])

    valid_components = components[
        components["academic_period_id"].isin(valid_period_ids)
        & components["organization_id"].isin(valid_organizations)
        & components["id"].ne("")
        & components["organization_id"].ne("")
        & components["academic_period_id"].ne("")
    ].copy()

    # Confirm each component belongs to the organization
    # recorded on its academic period.
    period_organization = periods.set_index(
        "id"
    )["organization_id"].to_dict()

    valid_components = valid_components[
        valid_components.apply(
            lambda component: (
                period_organization.get(
                    component["academic_period_id"]
                )
                == component["organization_id"]
            ),
            axis=1,
        )
    ]

    # Group components by organization and academic period.
    component_groups = {}

    for _, component in valid_components.iterrows():
        key = (
            component["organization_id"],
            component["academic_period_id"],
        )

        component_groups.setdefault(key, []).append(
            component["id"]
        )

    rows = []
    unmatched_enrollments = []

    for _, enrollment in enrollments.iterrows():
        organization_id = enrollment["organization_id"]
        academic_period_id = enrollment["academic_period_id"]

        key = (
            organization_id,
            academic_period_id,
        )

        matching_components = component_groups.get(key, [])

        if not matching_components:
            unmatched_enrollments.append(enrollment["id"])
            continue

        now = utc_now()

        rows.append({
            "id": generate_uuid(),
            "organization_id": organization_id,
            "enrollment_id": enrollment["id"],
            "learning_component_id": random.choice(
                matching_components
            ),
            "academic_status": derive_academic_status(
                enrollment
            ),
            "last_evidence_update_at": None,
            "created_at": now,
            "updated_at": now,
        })

    if unmatched_enrollments:
        examples = ", ".join(unmatched_enrollments[:5])

        raise ValueError(
            f"{len(unmatched_enrollments)} enrollments have no "
            "matching learning component in the same organization "
            f"and academic period. Example enrollment IDs: {examples}"
        )

    return pd.DataFrame(
        rows,
        columns=[
            "id",
            "organization_id",
            "enrollment_id",
            "learning_component_id",
            "academic_status",
            "last_evidence_update_at",
            "created_at",
            "updated_at",
        ],
    )


# --------------------------------------------------
# Validate the generated dataset
# --------------------------------------------------

def validate_dataset(df, enrollments, components, periods):
    required_columns = [
        "id",
        "organization_id",
        "enrollment_id",
        "learning_component_id",
        "academic_status",
        "last_evidence_update_at",
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
        "duplicate_enrollment_records": int(
            df["enrollment_id"].duplicated().sum()
        ),
    }

    results["empty_required_values"] = int(
        sum(
            df[column].fillna("").astype(str).str.strip().eq("").sum()
            for column in [
                "id",
                "organization_id",
                "enrollment_id",
                "learning_component_id",
                "academic_status",
                "created_at",
                "updated_at",
            ]
        )
    )

    results["invalid_academic_statuses"] = int(
        (~df["academic_status"].isin(ACADEMIC_STATUSES)).sum()
    )

    enrollment_ids = set(enrollments["id"])
    component_ids = set(components["id"])

    results["invalid_enrollment_references"] = int(
        (~df["enrollment_id"].isin(enrollment_ids)).sum()
    )

    results["invalid_component_references"] = int(
        (~df["learning_component_id"].isin(component_ids)).sum()
    )

    enrollment_lookup = enrollments.set_index(
        "id"
    ).to_dict("index")

    component_lookup = components.set_index(
        "id"
    ).to_dict("index")

    results["organization_mismatches"] = 0
    results["academic_period_mismatches"] = 0
    results["invalid_enrollment_period_references"] = int(
        (
            ~enrollments["academic_period_id"].isin(
                set(periods["id"])
            )
        ).sum()
    )

    for _, record in df.iterrows():
        enrollment = enrollment_lookup.get(
            record["enrollment_id"]
        )
        component = component_lookup.get(
            record["learning_component_id"]
        )

        if enrollment is None or component is None:
            continue

        if (
            record["organization_id"]
            != enrollment["organization_id"]
            or record["organization_id"]
            != component["organization_id"]
        ):
            results["organization_mismatches"] += 1

        if (
            enrollment["academic_period_id"]
            != component["academic_period_id"]
        ):
            results["academic_period_mismatches"] += 1

    # Validate timestamp values and chronological order.
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

    evidence_updates = pd.to_datetime(
        df["last_evidence_update_at"],
        errors="coerce",
        utc=True,
    )

    results["invalid_evidence_timestamps"] = int(
        (
            df["last_evidence_update_at"].notna()
            & evidence_updates.isna()
        ).sum()
    )

    # One academic record per enrollment, as specified.
    results["enrollment_coverage_mismatches"] = int(
        len(set(df["enrollment_id"]))
        != len(enrollments)
    )

    results["validation_passed"] = all([
        not missing_columns,
        results["duplicate_rows"] == 0,
        results["duplicate_ids"] == 0,
        results["duplicate_enrollment_records"] == 0,
        results["empty_required_values"] == 0,
        results["invalid_academic_statuses"] == 0,
        results["invalid_enrollment_references"] == 0,
        results["invalid_component_references"] == 0,
        results["organization_mismatches"] == 0,
        results["academic_period_mismatches"] == 0,
        results["invalid_enrollment_period_references"] == 0,
        results["invalid_created_timestamps"] == 0,
        results["invalid_updated_timestamps"] == 0,
        results["updated_before_created"] == 0,
        results["invalid_evidence_timestamps"] == 0,
        results["enrollment_coverage_mismatches"] == 0,
        len(df) == len(enrollments),
    ])

    return results


# --------------------------------------------------
# Create the Markdown validation report
# --------------------------------------------------

def create_report(
    df,
    validation,
    enrollments,
    components,
):
    REPORT_DIR.mkdir(parents=True, exist_ok=True)

    result = (
        "PASS"
        if validation["validation_passed"]
        else "FAIL"
    )

    structure = [
        (
            "id",
            "UUID",
            "Yes",
            "Unique academic-record identifier",
        ),
        (
            "organization_id",
            "UUID",
            "Yes",
            "Organization identifier",
        ),
        (
            "enrollment_id",
            "UUID",
            "Yes",
            "Related enrollment",
        ),
        (
            "learning_component_id",
            "UUID",
            "Yes",
            "Related learning component",
        ),
        (
            "academic_status",
            "Enum",
            "Yes",
            "Academic-record lifecycle status",
        ),
        (
            "last_evidence_update_at",
            "Timestamp",
            "No",
            "Timestamp of the last evidence update",
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
        "# Academic Records Dataset Validation\n",
        "\n## 1. Dataset Identification\n",
        "\n- **Dataset:** `academic_records.csv`\n",
        "- **Dataset type:** Synthetic development dataset\n",
        f"- **Generated records:** {len(df)}\n",
        f"- **Random seed:** {SEED}\n",
        "- **Source datasets:** `enrollments.csv`, "
        "`learning_components.csv`, `academic_periods.csv`\n",
        "\n> This dataset contains synthetic data only. "
        "It is not production student data.\n",
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
        f"\n- Enrollments: **{len(enrollments)}**\n",
        f"- Learning components: **{len(components)}**\n",
        f"- Academic records generated: **{len(df)}**\n",
        "\nEach enrollment receives exactly one academic record. "
        "Each record references one learning component from the "
        "same organization and academic period as its enrollment.\n",
        "\n---\n",
        "\n## 4. Missing Value Analysis\n",
        f"\nTotal missing cells: **{validation['missing_values']}**\n",
        "\n`last_evidence_update_at` is intentionally null because "
        "no evidence-update event is simulated at generation time. "
        "Nullable fields are not automatically treated as errors.\n",
        "\n---\n",
        "\n## 5. Duplicate Analysis\n",
        f"\n- Duplicate complete rows: **{validation['duplicate_rows']}**\n",
        f"- Duplicate IDs: **{validation['duplicate_ids']}**\n",
        "- Duplicate enrollment records: "
        f"**{validation['duplicate_enrollment_records']}**\n",
        "\n---\n",
        "\n## 6. Data Type Analysis\n",
        "\nPandas-detected data types:\n\n```text\n",
        df.dtypes.to_string(),
        "\n```\n",
        "\nTimestamp columns are additionally parsed and validated.\n",
        "\n---\n",
        "\n## 7. Relationship and Invalid Value Analysis\n",
        f"\n- Empty required values: "
        f"**{validation['empty_required_values']}**\n",
        f"- Invalid academic statuses: "
        f"**{validation['invalid_academic_statuses']}**\n",
        f"- Invalid enrollment references: "
        f"**{validation['invalid_enrollment_references']}**\n",
        f"- Invalid component references: "
        f"**{validation['invalid_component_references']}**\n",
        f"- Organization mismatches: "
        f"**{validation['organization_mismatches']}**\n",
        f"- Academic-period mismatches: "
        f"**{validation['academic_period_mismatches']}**\n",
        f"- Invalid enrollment period references: "
        f"**{validation['invalid_enrollment_period_references']}**\n",
        f"- Invalid creation timestamps: "
        f"**{validation['invalid_created_timestamps']}**\n",
        f"- Invalid update timestamps: "
        f"**{validation['invalid_updated_timestamps']}**\n",
        f"- Updates before creation: "
        f"**{validation['updated_before_created']}**\n",
        f"- Invalid evidence timestamps: "
        f"**{validation['invalid_evidence_timestamps']}**\n",
        f"- Enrollment coverage mismatches: "
        f"**{validation['enrollment_coverage_mismatches']}**\n",
        "\nAllowed academic statuses: `ACTIVE`, `COMPLETED`, "
        "`WITHDRAWN`, `ARCHIVED`.\n",
        "\n---\n",
        "\n## 8. Target / Risk Label\n",
        "\nNo target or risk label is defined in this dataset. "
        "No dropout-risk label, prediction, or model output was added.\n",
        "\n---\n",
        "\n## 9. Academic Features\n",
        "\nThis dataset provides record-level relationships and "
        "lifecycle status. Attendance and assessment evidence must "
        "come from their respective datasets. Percentages, risk "
        "scores, and predictions are not stored here.\n",
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
            "One record per enrollment",
            validation["duplicate_enrollment_records"] == 0
            and validation["enrollment_coverage_mismatches"] == 0,
        ),
        (
            "Academic status values",
            validation["invalid_academic_statuses"] == 0,
        ),
        (
            "Enrollment references",
            validation["invalid_enrollment_references"] == 0,
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
            "Academic-period consistency",
            validation["academic_period_mismatches"] == 0,
        ),
        (
            "Enrollment period references",
            validation["invalid_enrollment_period_references"] == 0,
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
            "Evidence timestamps",
            validation["invalid_evidence_timestamps"] == 0,
        ),
    ]

    for name, passed in checks:
        lines.append(
            f"| {name} | {'PASS' if passed else 'FAIL'} |\n"
        )

    lines.extend([
        f"\n### Overall Validation: **{result}**\n",
        "\n---\n",
        "\n## 11. Model Training\n",
        "\n**No model training was performed.** This task only "
        "generates and validates synthetic data.\n",
        "\n---\n",
        "\n## 12. Conclusion\n",
        f"\nThe generator produced {len(df)} academic records "
        "from {len(enrollments)} enrollments. Each record has "
        "one enrollment and one learning-component reference. "
        "Risk labels and derived performance metrics were not "
        "invented.\n",
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
    print("DropSafe - Academic Records Synthetic Dataset")
    print("=" * 70)

    print("\nLoading source datasets...")
    enrollments, components, periods = load_source_datasets()

    print(f"Enrollments loaded: {len(enrollments)}")
    print(f"Learning components loaded: {len(components)}")
    print(f"Academic periods loaded: {len(periods)}")

    print("\nGenerating academic records...")
    df = generate_academic_records(
        enrollments,
        components,
        periods,
    )

    RAW_DIR.mkdir(parents=True, exist_ok=True)
    df.to_csv(OUTPUT_FILE, index=False)

    print("\nValidating generated records...")
    validation = validate_dataset(
        df,
        enrollments,
        components,
        periods,
    )

    create_report(
        df,
        validation,
        enrollments,
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
            "Academic records validation failed. "
            "Review the validation report before proceeding."
        )

    print("\nNo model training performed.")


if __name__ == "__main__":
    main()
