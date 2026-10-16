from pathlib import Path

import pandas as pd


# ============================================================
# Paths
# ============================================================

BASE_DIR = Path(__file__).resolve().parents[2]
RAW_DIR = BASE_DIR / "data" / "raw"
PROCESSED_DIR = BASE_DIR / "data" / "processed"
REPORT_DIR = BASE_DIR / "data" / "synthetic"

VALIDATION_REPORT_FILE = REPORT_DIR / "validation_summary.md"
EVIDENCE_REPORT_FILE = REPORT_DIR / "enrollment_evidence.md"
EVIDENCE_OUTPUT_FILE = PROCESSED_DIR / "enrollment_evidence.csv"


# ============================================================
# Dataset order (PRD §27 dependency order, items 10-19 and
# 23-24; import tables 20-22 are backend runtime records and
# are not generated as CSVs)
# ============================================================

DATASETS = [
    "learning_programs",
    "learning_levels",
    "academic_periods",
    "learning_components",
    "students",
    "student_identifiers",
    "enrollments",
    "academic_records",
    "attendance_records",
    "assessment_records",
    "chatbot_conversations",
    "chatbot_messages",
]

REQUIRED_COLUMNS = {
    "learning_programs": [
        "id", "organization_id", "program_code", "name",
        "duration", "status",
    ],
    "learning_levels": [
        "id", "organization_id", "learning_program_id",
        "level_number", "name", "status",
    ],
    "academic_periods": [
        "id", "organization_id", "learning_level_id",
        "period_code", "name", "start_date", "end_date", "status",
    ],
    "learning_components": [
        "id", "organization_id", "academic_period_id",
        "component_code", "name", "component_type",
        "maximum_marks", "passing_marks", "status",
    ],
    "students": [
        "id", "organization_id", "status",
    ],
    "student_identifiers": [
        "id", "organization_id", "student_id", "identifier_type",
        "identifier_value", "is_primary", "status",
    ],
    "enrollments": [
        "id", "organization_id", "student_id",
        "academic_period_id", "enrollment_date", "status",
    ],
    "academic_records": [
        "id", "organization_id", "enrollment_id",
        "learning_component_id", "academic_status",
    ],
    "attendance_records": [
        "id", "organization_id", "academic_record_id",
        "learning_component_id", "attended_sessions",
        "total_sessions",
    ],
    "assessment_records": [
        "id", "organization_id", "academic_record_id",
        "learning_component_id", "obtained_marks",
        "maximum_marks",
    ],
    "chatbot_conversations": [
        "id", "organization_id", "student_id", "enrollment_id",
        "source", "status", "started_at", "completed_at",
    ],
    "chatbot_messages": [
        "id", "organization_id", "conversation_id",
        "sender_type", "message_text", "message_timestamp",
    ],
}


# ============================================================
# Schema-supported values (PRD §8, §11, §20)
# ============================================================

PROGRAM_STATUSES = ["ACTIVE", "INACTIVE", "ARCHIVED"]
LEVEL_STATUSES = ["ACTIVE", "INACTIVE", "ARCHIVED"]
PERIOD_STATUSES = ["PLANNED", "ACTIVE", "COMPLETED", "ARCHIVED"]
COMPONENT_STATUSES = ["ACTIVE", "INACTIVE", "ARCHIVED"]
COMPONENT_TYPES = [
    "SUBJECT", "COURSE", "MODULE", "UNIT", "COMPETENCY", "OTHER",
]
STUDENT_STATUSES = ["ACTIVE", "GRADUATED", "TRANSFERRED", "ARCHIVED"]
IDENTIFIER_STATUSES = ["ACTIVE", "ARCHIVED"]
IDENTIFIER_TYPES = [
    "PRN", "ROLL_NUMBER", "ADMISSION_NUMBER",
    "REGISTRATION_NUMBER", "ENROLLMENT_NUMBER", "STUDENT_ID",
]
ENROLLMENT_STATUSES = [
    "ACTIVE", "COMPLETED", "WITHDRAWN", "TRANSFERRED", "ARCHIVED",
]
ACADEMIC_RECORD_STATUSES = [
    "ACTIVE", "COMPLETED", "WITHDRAWN", "ARCHIVED",
]
CONVERSATION_SOURCES = ["WEB", "MOBILE", "WHATSAPP"]
CONVERSATION_STATUSES = ["ACTIVE", "COMPLETED", "ARCHIVED"]
SENDER_TYPES = ["STUDENT", "BOT", "SYSTEM"]

# PRD §8: derived values must not be stored in source evidence
# tables. PRD §11: behaviour domain stores raw evidence only.
FORBIDDEN_DERIVED_COLUMNS = {
    "attendance_records": [
        "attendance_percentage", "attendance_pct",
        "percentage", "overall_percentage",
    ],
    "assessment_records": [
        "gpa", "cgpa", "percentage", "overall_percentage",
    ],
    "chatbot_conversations": [
        "sentiment", "sentiment_score", "behaviour_score",
        "engagement_score", "summary", "stress",
    ],
    "chatbot_messages": [
        "sentiment", "sentiment_score", "behaviour_score",
        "engagement_score", "summary", "stress",
    ],
}

# PRD §8/§9/§11: no AI values or risk labels in source evidence.
RISK_COLUMNS = [
    "risk_label", "dropout_risk", "risk_score",
    "prediction", "predicted_risk",
]


# ============================================================
# Evidence layer output columns
# ============================================================

EVIDENCE_COLUMNS = [
    "enrollment_id",
    "organization_id",
    "student_id",
    "academic_period_id",
    "enrollment_status",
    "enrollment_date",
    "academic_record_id",
    "academic_status",
    "learning_component_id",
    "attended_sessions",
    "total_sessions",
    "obtained_marks",
    "assessment_maximum_marks",
    "component_passing_marks",
    "component_maximum_marks",
    "conversation_count",
    "has_conversation_evidence",
    "has_academic_record",
    "has_attendance_evidence",
    "has_assessment_evidence",
    "evidence_sufficient",
]


# ============================================================
# Load helpers
# ============================================================

def load_datasets():
    datasets = {}
    missing_files = []

    for name in DATASETS:
        path = RAW_DIR / f"{name}.csv"
        if not path.exists():
            missing_files.append(str(path))
            continue
        df = pd.read_csv(path, dtype=str)
        if df.empty:
            raise ValueError(f"{name}.csv is empty.")
        datasets[name] = df

    if missing_files:
        raise FileNotFoundError(
            "Missing datasets (generate them first):\n"
            + "\n".join(missing_files)
        )

    missing_columns = {}
    for name, required in REQUIRED_COLUMNS.items():
        absent = [
            column
            for column in required
            if column not in datasets[name].columns
        ]
        if absent:
            missing_columns[name] = absent

    if missing_columns:
        raise ValueError(
            f"Datasets missing required columns: {missing_columns}"
        )

    return datasets


def empty_count(df, column):
    return int(
        df[column]
        .fillna("")
        .astype(str)
        .str.strip()
        .eq("")
        .sum()
    )


def invalid_enum(df, column, allowed):
    return int(
        (~df[column].fillna("").isin(allowed)).sum()
    )


def numeric_series(df, column):
    return pd.to_numeric(df[column], errors="coerce")


def timestamp_checks(df):
    checks = {}
    created = None
    updated = None

    if "created_at" in df.columns:
        created = pd.to_datetime(
            df["created_at"], errors="coerce", utc=True
        )
        checks["invalid_created_timestamps"] = int(created.isna().sum())

    if "updated_at" in df.columns:
        updated = pd.to_datetime(
            df["updated_at"], errors="coerce", utc=True
        )
        checks["invalid_updated_timestamps"] = int(updated.isna().sum())

    if created is not None and updated is not None:
        checks["updated_before_created"] = int(
            (updated < created).fillna(False).sum()
        )

    return checks


def mismatch_count(df, reference_column, org_column, parent_org_map):
    expected = df[reference_column].map(parent_org_map)
    actual = df[org_column]
    mismatch = expected.notna() & (expected != actual)
    return int(mismatch.sum())


# ============================================================
# Intrinsic checks (single-dataset, PRD §8 / §11 / §34)
# ============================================================

def intrinsic_checks(datasets):
    results = {}

    # --------------------------------------------------------
    # learning_programs
    # --------------------------------------------------------
    df = datasets["learning_programs"]
    checks = timestamp_checks(df)
    checks["empty_ids"] = empty_count(df, "id")
    checks["duplicate_ids"] = int(df["id"].duplicated().sum())
    checks["duplicate_program_codes"] = int(
        df.duplicated(["organization_id", "program_code"]).sum()
    )
    checks["empty_program_codes"] = empty_count(df, "program_code")
    checks["empty_names"] = empty_count(df, "name")
    checks["invalid_statuses"] = invalid_enum(
        df, "status", PROGRAM_STATUSES
    )
    duration = numeric_series(df, "duration")
    checks["invalid_duration"] = int(
        (duration.isna() | (duration <= 0)).sum()
    )
    results["learning_programs"] = {"rows": len(df), "checks": checks}

    # --------------------------------------------------------
    # learning_levels
    # --------------------------------------------------------
    df = datasets["learning_levels"]
    checks = timestamp_checks(df)
    checks["empty_ids"] = empty_count(df, "id")
    checks["duplicate_ids"] = int(df["id"].duplicated().sum())
    checks["duplicate_level_numbers"] = int(
        df.duplicated(
            ["organization_id", "learning_program_id", "level_number"]
        ).sum()
    )
    checks["duplicate_names"] = int(
        df.duplicated(
            ["organization_id", "learning_program_id", "name"]
        ).sum()
    )
    checks["empty_names"] = empty_count(df, "name")
    checks["invalid_statuses"] = invalid_enum(df, "status", LEVEL_STATUSES)
    level_number = numeric_series(df, "level_number")
    checks["invalid_level_numbers"] = int(
        (
            level_number.isna()
            | (level_number < 1)
            | (level_number % 1 != 0)
        ).sum()
    )
    results["learning_levels"] = {"rows": len(df), "checks": checks}

    # --------------------------------------------------------
    # academic_periods
    # --------------------------------------------------------
    df = datasets["academic_periods"]
    checks = timestamp_checks(df)
    checks["empty_ids"] = empty_count(df, "id")
    checks["duplicate_ids"] = int(df["id"].duplicated().sum())
    checks["duplicate_period_codes"] = int(
        df.duplicated(
            ["organization_id", "learning_level_id", "period_code"]
        ).sum()
    )
    checks["duplicate_names"] = int(
        df.duplicated(
            ["organization_id", "learning_level_id", "name"]
        ).sum()
    )
    checks["empty_period_codes"] = empty_count(df, "period_code")
    checks["empty_names"] = empty_count(df, "name")
    checks["invalid_statuses"] = invalid_enum(
        df, "status", PERIOD_STATUSES
    )

    starts = pd.to_datetime(df["start_date"], errors="coerce")
    ends = pd.to_datetime(df["end_date"], errors="coerce")
    checks["invalid_start_dates"] = int(starts.isna().sum())
    checks["invalid_end_dates"] = int(ends.isna().sum())
    checks["invalid_date_ranges"] = int(
        (starts.notna() & ends.notna() & (starts >= ends)).sum()
    )

    active_periods = df[df["status"] == "ACTIVE"]
    active_per_level = active_periods.groupby(
        ["organization_id", "learning_level_id"]
    ).size()
    checks["levels_with_multiple_active_periods"] = int(
        (active_per_level > 1).sum()
    )
    results["academic_periods"] = {"rows": len(df), "checks": checks}

    # --------------------------------------------------------
    # learning_components
    # --------------------------------------------------------
    df = datasets["learning_components"]
    checks = timestamp_checks(df)
    checks["empty_ids"] = empty_count(df, "id")
    checks["duplicate_ids"] = int(df["id"].duplicated().sum())
    checks["duplicate_component_codes"] = int(
        df.duplicated(
            ["organization_id", "academic_period_id", "component_code"]
        ).sum()
    )
    checks["duplicate_names"] = int(
        df.duplicated(
            ["organization_id", "academic_period_id", "name"]
        ).sum()
    )
    checks["empty_component_codes"] = empty_count(df, "component_code")
    checks["empty_names"] = empty_count(df, "name")
    checks["invalid_component_types"] = invalid_enum(
        df, "component_type", COMPONENT_TYPES
    )
    checks["invalid_statuses"] = invalid_enum(
        df, "status", COMPONENT_STATUSES
    )
    maximum = numeric_series(df, "maximum_marks")
    passing = numeric_series(df, "passing_marks")
    checks["invalid_maximum_marks"] = int(
        (maximum.isna() | (maximum <= 0)).sum()
    )
    checks["invalid_passing_marks"] = int(
        (passing.isna() | (passing < 0)).sum()
    )
    checks["passing_marks_exceed_maximum"] = int(
        (passing.notna() & maximum.notna() & (passing > maximum)).sum()
    )
    results["learning_components"] = {"rows": len(df), "checks": checks}

    # --------------------------------------------------------
    # students
    # --------------------------------------------------------
    df = datasets["students"]
    checks = timestamp_checks(df)
    checks["empty_ids"] = empty_count(df, "id")
    checks["duplicate_ids"] = int(df["id"].duplicated().sum())
    checks["invalid_statuses"] = invalid_enum(
        df, "status", STUDENT_STATUSES
    )
    results["students"] = {"rows": len(df), "checks": checks}

    # --------------------------------------------------------
    # student_identifiers
    # --------------------------------------------------------
    df = datasets["student_identifiers"]
    checks = timestamp_checks(df)
    checks["empty_ids"] = empty_count(df, "id")
    checks["duplicate_ids"] = int(df["id"].duplicated().sum())
    checks["duplicate_identifier_values"] = int(
        df.duplicated(
            ["organization_id", "identifier_type", "identifier_value"]
        ).sum()
    )
    checks["duplicate_student_type_pairs"] = int(
        df.duplicated(["student_id", "identifier_type"]).sum()
    )
    checks["empty_identifier_values"] = empty_count(
        df, "identifier_value"
    )
    checks["invalid_identifier_types"] = invalid_enum(
        df, "identifier_type", IDENTIFIER_TYPES
    )
    checks["invalid_statuses"] = invalid_enum(
        df, "status", IDENTIFIER_STATUSES
    )

    primary = df["is_primary"].fillna("").astype(str).str.lower()
    checks["invalid_primary_flags"] = int(
        (~primary.isin(["true", "false"])).sum()
    )
    primary_counts = (
        df[primary == "true"].groupby("student_id").size()
    )
    checks["students_with_multiple_primary_identifiers"] = int(
        (primary_counts > 1).sum()
    )
    results["student_identifiers"] = {"rows": len(df), "checks": checks}

    # --------------------------------------------------------
    # enrollments
    # --------------------------------------------------------
    df = datasets["enrollments"]
    checks = timestamp_checks(df)
    checks["empty_ids"] = empty_count(df, "id")
    checks["duplicate_ids"] = int(df["id"].duplicated().sum())
    checks["duplicate_student_period_pairs"] = int(
        df.duplicated(
            ["organization_id", "student_id", "academic_period_id"]
        ).sum()
    )
    checks["empty_student_ids"] = empty_count(df, "student_id")
    checks["empty_period_ids"] = empty_count(df, "academic_period_id")
    checks["invalid_statuses"] = invalid_enum(
        df, "status", ENROLLMENT_STATUSES
    )

    enrollment_dates = pd.to_datetime(
        df["enrollment_date"], errors="coerce"
    )
    checks["invalid_enrollment_dates"] = int(
        enrollment_dates.isna().sum()
    )

    if "completion_date" in df.columns:
        completion_dates = pd.to_datetime(
            df["completion_date"], errors="coerce"
        )
        checks["invalid_completion_dates"] = int(
            (df["completion_date"].notna() & completion_dates.isna()).sum()
        )
        checks["completion_before_enrollment"] = int(
            (
                df["completion_date"].notna()
                & (completion_dates < enrollment_dates)
            ).sum()
        )
    results["enrollments"] = {"rows": len(df), "checks": checks}

    # --------------------------------------------------------
    # academic_records
    # --------------------------------------------------------
    df = datasets["academic_records"]
    checks = timestamp_checks(df)
    checks["empty_ids"] = empty_count(df, "id")
    checks["duplicate_ids"] = int(df["id"].duplicated().sum())
    checks["empty_enrollment_ids"] = empty_count(df, "enrollment_id")
    checks["empty_component_ids"] = empty_count(
        df, "learning_component_id"
    )
    checks["invalid_academic_statuses"] = invalid_enum(
        df, "academic_status", ACADEMIC_RECORD_STATUSES
    )
    results["academic_records"] = {"rows": len(df), "checks": checks}

    # --------------------------------------------------------
    # attendance_records
    # --------------------------------------------------------
    df = datasets["attendance_records"]
    checks = timestamp_checks(df)
    checks["empty_ids"] = empty_count(df, "id")
    checks["duplicate_ids"] = int(df["id"].duplicated().sum())
    checks["duplicate_business_keys"] = int(
        df.duplicated(
            [
                "organization_id",
                "academic_record_id",
                "learning_component_id",
            ]
        ).sum()
    )
    attended = numeric_series(df, "attended_sessions")
    total = numeric_series(df, "total_sessions")
    checks["invalid_attended_sessions"] = int(
        (attended.isna() | (attended < 0) | (attended % 1 != 0)).sum()
    )
    checks["invalid_total_sessions"] = int(
        (total.isna() | (total <= 0) | (total % 1 != 0)).sum()
    )
    checks["attendance_exceeds_total"] = int(
        (attended.notna() & total.notna() & (attended > total)).sum()
    )
    results["attendance_records"] = {"rows": len(df), "checks": checks}

    # --------------------------------------------------------
    # assessment_records
    # --------------------------------------------------------
    df = datasets["assessment_records"]
    checks = timestamp_checks(df)
    checks["empty_ids"] = empty_count(df, "id")
    checks["duplicate_ids"] = int(df["id"].duplicated().sum())
    checks["duplicate_business_keys"] = int(
        df.duplicated(
            [
                "organization_id",
                "academic_record_id",
                "learning_component_id",
            ]
        ).sum()
    )
    obtained = numeric_series(df, "obtained_marks")
    maximum = numeric_series(df, "maximum_marks")
    checks["invalid_obtained_marks"] = int(
        (obtained.isna() | (obtained < 0)).sum()
    )
    checks["invalid_maximum_marks"] = int(
        (maximum.isna() | (maximum <= 0)).sum()
    )
    checks["obtained_marks_exceed_maximum"] = int(
        (obtained.notna() & maximum.notna() & (obtained > maximum)).sum()
    )
    results["assessment_records"] = {"rows": len(df), "checks": checks}

    # --------------------------------------------------------
    # chatbot_conversations (PRD §11)
    # --------------------------------------------------------
    df = datasets["chatbot_conversations"]
    checks = timestamp_checks(df)
    checks["empty_ids"] = empty_count(df, "id")
    checks["duplicate_ids"] = int(df["id"].duplicated().sum())
    checks["empty_student_ids"] = empty_count(df, "student_id")
    checks["invalid_sources"] = invalid_enum(
        df, "source", CONVERSATION_SOURCES
    )
    checks["invalid_statuses"] = invalid_enum(
        df, "status", CONVERSATION_STATUSES
    )

    started = pd.to_datetime(
        df["started_at"], errors="coerce", utc=True
    )
    completed = pd.to_datetime(
        df["completed_at"], errors="coerce", utc=True
    )
    has_completion = df["completed_at"].notna()
    checks["invalid_started_timestamps"] = int(started.isna().sum())
    checks["invalid_completed_timestamps"] = int(
        (has_completion & completed.isna()).sum()
    )
    checks["completed_before_started"] = int(
        (has_completion & (completed < started)).sum()
    )
    checks["active_conversations_with_completion"] = int(
        ((df["status"] == "ACTIVE") & has_completion).sum()
    )
    checks["completed_conversations_without_completion"] = int(
        (
            df["status"].isin(["COMPLETED", "ARCHIVED"])
            & ~has_completion
        ).sum()
    )
    results["chatbot_conversations"] = {
        "rows": len(df), "checks": checks,
    }

    # --------------------------------------------------------
    # chatbot_messages (PRD §11)
    # --------------------------------------------------------
    df = datasets["chatbot_messages"]
    checks = timestamp_checks(df)
    checks["empty_ids"] = empty_count(df, "id")
    checks["duplicate_ids"] = int(df["id"].duplicated().sum())
    checks["empty_conversation_ids"] = empty_count(
        df, "conversation_id"
    )
    checks["invalid_sender_types"] = invalid_enum(
        df, "sender_type", SENDER_TYPES
    )
    checks["empty_message_texts"] = int(
        df["message_text"]
        .fillna("")
        .astype(str)
        .str.strip()
        .eq("")
        .sum()
    )
    message_ts = pd.to_datetime(
        df["message_timestamp"], errors="coerce", utc=True
    )
    checks["invalid_message_timestamps"] = int(
        message_ts.isna().sum()
    )
    results["chatbot_messages"] = {"rows": len(df), "checks": checks}

    return results


# ============================================================
# Cross-dataset checks
# ============================================================

def cross_dataset_checks(datasets):
    checks = {}
    warnings = {}

    programs = datasets["learning_programs"]
    levels = datasets["learning_levels"]
    periods = datasets["academic_periods"]
    components = datasets["learning_components"]
    students = datasets["students"]
    identifiers = datasets["student_identifiers"]
    enrollments = datasets["enrollments"]
    records = datasets["academic_records"]
    attendance = datasets["attendance_records"]
    assessments = datasets["assessment_records"]
    conversations = datasets["chatbot_conversations"]
    messages = datasets["chatbot_messages"]

    # --------------------------------------------------------
    # Reference validity
    # --------------------------------------------------------

    program_ids = set(programs["id"])
    level_ids = set(levels["id"])
    period_ids = set(periods["id"])
    component_ids = set(components["id"])
    student_ids = set(students["id"])
    enrollment_ids = set(enrollments["id"])
    record_ids = set(records["id"])
    conversation_ids = set(conversations["id"])

    checks["levels_invalid_program_references"] = int(
        (~levels["learning_program_id"].isin(program_ids)).sum()
    )
    checks["periods_invalid_level_references"] = int(
        (~periods["learning_level_id"].isin(level_ids)).sum()
    )
    checks["components_invalid_period_references"] = int(
        (~components["academic_period_id"].isin(period_ids)).sum()
    )
    checks["identifiers_invalid_student_references"] = int(
        (~identifiers["student_id"].isin(student_ids)).sum()
    )
    checks["enrollments_invalid_student_references"] = int(
        (~enrollments["student_id"].isin(student_ids)).sum()
    )
    checks["enrollments_invalid_period_references"] = int(
        (~enrollments["academic_period_id"].isin(period_ids)).sum()
    )
    checks["records_invalid_enrollment_references"] = int(
        (~records["enrollment_id"].isin(enrollment_ids)).sum()
    )
    checks["records_invalid_component_references"] = int(
        (~records["learning_component_id"].isin(component_ids)).sum()
    )
    checks["attendance_invalid_record_references"] = int(
        (~attendance["academic_record_id"].isin(record_ids)).sum()
    )
    checks["attendance_invalid_component_references"] = int(
        (~attendance["learning_component_id"].isin(component_ids)).sum()
    )
    checks["assessments_invalid_record_references"] = int(
        (~assessments["academic_record_id"].isin(record_ids)).sum()
    )
    checks["assessments_invalid_component_references"] = int(
        (~assessments["learning_component_id"].isin(component_ids)).sum()
    )
    checks["conversations_invalid_student_references"] = int(
        (~conversations["student_id"].isin(student_ids)).sum()
    )

    linked_conversations = conversations[
        conversations["enrollment_id"].notna()
    ]
    checks["conversations_invalid_enrollment_references"] = int(
        (
            ~linked_conversations["enrollment_id"].isin(
                enrollment_ids
            )
        ).sum()
    )
    checks["messages_invalid_conversation_references"] = int(
        (~messages["conversation_id"].isin(conversation_ids)).sum()
    )

    # --------------------------------------------------------
    # Organization isolation through parent chains
    # (PRD §5, §22, §11)
    # --------------------------------------------------------

    program_org = dict(
        zip(programs["id"], programs["organization_id"])
    )
    level_org = dict(zip(levels["id"], levels["organization_id"]))
    period_org = dict(zip(periods["id"], periods["organization_id"]))
    component_org = dict(
        zip(components["id"], components["organization_id"])
    )
    student_org = dict(zip(students["id"], students["organization_id"]))
    enrollment_org = dict(
        zip(enrollments["id"], enrollments["organization_id"])
    )
    record_org = dict(zip(records["id"], records["organization_id"]))
    conversation_org = dict(
        zip(conversations["id"], conversations["organization_id"])
    )
    enrollment_student = dict(
        zip(enrollments["id"], enrollments["student_id"])
    )

    checks["levels_organization_mismatches"] = mismatch_count(
        levels, "learning_program_id", "organization_id", program_org
    )
    checks["periods_organization_mismatches"] = mismatch_count(
        periods, "learning_level_id", "organization_id", level_org
    )
    checks["components_organization_mismatches"] = mismatch_count(
        components, "academic_period_id", "organization_id", period_org
    )
    checks["identifiers_organization_mismatches"] = mismatch_count(
        identifiers, "student_id", "organization_id", student_org
    )
    checks["enrollments_student_organization_mismatches"] = (
        mismatch_count(
            enrollments, "student_id", "organization_id", student_org
        )
    )
    checks["enrollments_period_organization_mismatches"] = (
        mismatch_count(
            enrollments,
            "academic_period_id",
            "organization_id",
            period_org,
        )
    )
    checks["records_enrollment_organization_mismatches"] = (
        mismatch_count(
            records, "enrollment_id", "organization_id", enrollment_org
        )
    )
    checks["records_component_organization_mismatches"] = (
        mismatch_count(
            records,
            "learning_component_id",
            "organization_id",
            component_org,
        )
    )
    checks["attendance_record_organization_mismatches"] = (
        mismatch_count(
            attendance,
            "academic_record_id",
            "organization_id",
            record_org,
        )
    )
    checks["attendance_component_organization_mismatches"] = (
        mismatch_count(
            attendance,
            "learning_component_id",
            "organization_id",
            component_org,
        )
    )
    checks["assessments_record_organization_mismatches"] = (
        mismatch_count(
            assessments,
            "academic_record_id",
            "organization_id",
            record_org,
        )
    )
    checks["assessments_component_organization_mismatches"] = (
        mismatch_count(
            assessments,
            "learning_component_id",
            "organization_id",
            component_org,
        )
    )
    checks["conversations_student_organization_mismatches"] = (
        mismatch_count(
            conversations,
            "student_id",
            "organization_id",
            student_org,
        )
    )
    checks["messages_conversation_organization_mismatches"] = (
        mismatch_count(
            messages,
            "conversation_id",
            "organization_id",
            conversation_org,
        )
    )

    # Conversations: linked enrollment must belong to the same
    # student and organization (PRD §11).
    linked_enrollment_org = linked_conversations["enrollment_id"].map(
        enrollment_org
    )
    checks["conversations_enrollment_organization_mismatches"] = int(
        (
            linked_enrollment_org.notna()
            & (
                linked_enrollment_org
                != linked_conversations["organization_id"]
            )
        ).sum()
    )
    linked_enrollment_student = (
        linked_conversations["enrollment_id"].map(enrollment_student)
    )
    checks["conversations_enrollment_student_mismatches"] = int(
        (
            linked_enrollment_student.notna()
            & (
                linked_enrollment_student
                != linked_conversations["student_id"]
            )
        ).sum()
    )

    # --------------------------------------------------------
    # Chain consistency
    # --------------------------------------------------------

    enrollment_period = dict(
        zip(enrollments["id"], enrollments["academic_period_id"])
    )
    component_period = dict(
        zip(components["id"], components["academic_period_id"])
    )
    record_component = dict(
        zip(records["id"], records["learning_component_id"])
    )

    expected_period = records["enrollment_id"].map(enrollment_period)
    actual_period = records["learning_component_id"].map(component_period)
    checks["records_period_mismatches"] = int(
        (
            expected_period.notna()
            & actual_period.notna()
            & (expected_period != actual_period)
        ).sum()
    )

    expected_component = attendance["academic_record_id"].map(
        record_component
    )
    checks["attendance_component_mismatches"] = int(
        (
            expected_component.notna()
            & (expected_component != attendance["learning_component_id"])
        ).sum()
    )

    expected_component = assessments["academic_record_id"].map(
        record_component
    )
    checks["assessments_component_mismatches"] = int(
        (
            expected_component.notna()
            & (expected_component != assessments["learning_component_id"])
        ).sum()
    )

    # --------------------------------------------------------
    # Coverage
    # --------------------------------------------------------

    checks["records_duplicate_per_enrollment"] = int(
        records["enrollment_id"].duplicated().sum()
    )
    checks["enrollments_without_academic_records"] = int(
        len(enrollment_ids - set(records["enrollment_id"]))
    )

    periods_with_components = set(components["academic_period_id"])
    checks["enrollments_without_component_coverage"] = int(
        (
            ~enrollments["academic_period_id"].isin(
                periods_with_components
            )
        ).sum()
    )

    # PRD §11: a conversation contains one or more messages.
    checks["conversations_without_messages"] = int(
        len(conversation_ids - set(messages["conversation_id"]))
    )

    # --------------------------------------------------------
    # Chatbot message ordering and bounds (PRD §11)
    # --------------------------------------------------------

    message_keys = messages["conversation_id"]
    message_ts = pd.to_datetime(
        messages["message_timestamp"], errors="coerce", utc=True
    )
    prev_ts = message_ts.groupby(message_keys).shift(1)
    checks["messages_non_monotonic_within_conversation"] = int(
        (prev_ts.notna() & (message_ts <= prev_ts)).sum()
    )

    conversation_started = dict(
        zip(
            conversations["id"],
            pd.to_datetime(
                conversations["started_at"],
                errors="coerce",
                utc=True,
            ),
        )
    )
    conversation_completed = dict(
        zip(
            conversations["id"],
            pd.to_datetime(
                conversations["completed_at"],
                errors="coerce",
                utc=True,
            ),
        )
    )
    mapped_start = message_keys.map(conversation_started)
    mapped_end = message_keys.map(conversation_completed)

    checks["messages_before_conversation_start"] = int(
        (
            message_ts.notna()
            & mapped_start.notna()
            & (message_ts < mapped_start)
        ).sum()
    )
    checks["messages_after_conversation_end"] = int(
        (
            message_ts.notna()
            & mapped_end.notna()
            & (message_ts > mapped_end)
        ).sum()
    )

    # --------------------------------------------------------
    # Conversations inside linked enrollment windows
    # --------------------------------------------------------

    enrollment_start = dict(
        zip(
            enrollments["id"],
            pd.to_datetime(
                enrollments["enrollment_date"],
                errors="coerce",
                utc=True,
            ),
        )
    )
    period_end = dict(
        zip(
            periods["id"],
            pd.to_datetime(
                periods["end_date"], errors="coerce", utc=True
            ),
        )
    )
    linked_started = pd.to_datetime(
        linked_conversations["started_at"],
        errors="coerce",
        utc=True,
    )
    linked_enrollment_start = (
        linked_conversations["enrollment_id"].map(enrollment_start)
    )
    linked_period_end = (
        linked_conversations["enrollment_id"]
        .map(enrollment_period)
        .map(period_end)
    )
    checks["conversations_outside_enrollment_window"] = int(
        (
            linked_enrollment_start.notna()
            & linked_period_end.notna()
            & (
                (linked_started < linked_enrollment_start)
                | (linked_started > linked_period_end)
            )
        ).sum()
    )

    # --------------------------------------------------------
    # Warnings: ACTIVE enrollments under ARCHIVED parents
    # --------------------------------------------------------

    period_level = dict(
        zip(periods["id"], periods["learning_level_id"])
    )
    level_program = dict(
        zip(levels["id"], levels["learning_program_id"])
    )
    level_status = dict(zip(levels["id"], levels["status"]))
    program_status = dict(zip(programs["id"], programs["status"]))

    enrollment_level = enrollments["academic_period_id"].map(
        period_level
    )
    enrollment_program = enrollment_level.map(level_program)
    enrollment_level_status = enrollment_level.map(level_status)
    enrollment_program_status = enrollment_program.map(program_status)
    active_enrollments = enrollments["status"] == "ACTIVE"

    warnings["active_enrollments_under_archived_program"] = int(
        (
            active_enrollments
            & (enrollment_program_status == "ARCHIVED")
        ).sum()
    )
    warnings["active_enrollments_under_archived_level"] = int(
        (
            active_enrollments
            & (enrollment_level_status == "ARCHIVED")
        ).sum()
    )

    # --------------------------------------------------------
    # Forbidden derived/AI columns (PRD §8, §9, §11)
    # --------------------------------------------------------

    for name, forbidden in FORBIDDEN_DERIVED_COLUMNS.items():
        present = [
            column
            for column in forbidden
            if column in datasets[name].columns
        ]
        checks[f"{name}_forbidden_derived_columns"] = len(present)

    for name in DATASETS:
        present = [
            column
            for column in RISK_COLUMNS
            if column in datasets[name].columns
        ]
        checks[f"{name}_risk_label_columns"] = len(present)

    return checks, warnings


# ============================================================
# Validation report
# ============================================================

def create_validation_report(
    datasets,
    intrinsic,
    cross,
    warnings,
    overall,
):
    REPORT_DIR.mkdir(parents=True, exist_ok=True)

    lines = []

    lines.append("# Consolidated Data Validation Summary\n\n")

    lines.append("## 1. Scope\n\n")
    lines.append(
        "Datasets validated in PRD §27 dependency order "
        "(items 10-19 and 23-24; import tables 20-22 are "
        "backend runtime records, not synthetic CSVs):\n\n"
    )
    for name in DATASETS:
        lines.append(
            f"- `{name}.csv` ({intrinsic[name]['rows']} rows)\n"
        )
    lines.append(
        "\n> Synthetic development data only. "
        "Not production data.\n\n---\n\n"
    )

    for name in DATASETS:
        lines.append(f"## {name}\n\n")
        lines.append("| Check | Count | Result |\n|---|---|---|\n")
        for check, value in intrinsic[name]["checks"].items():
            result = "PASS" if value == 0 else "FAIL"
            lines.append(f"| {check} | {value} | {result} |\n")
        lines.append("\n---\n\n")

    lines.append("## Cross-Dataset Checks\n\n")
    lines.append("| Check | Count | Result |\n|---|---|---|\n")
    for check, value in cross.items():
        result = "PASS" if value == 0 else "FAIL"
        lines.append(f"| {check} | {value} | {result} |\n")
    lines.append("\n---\n\n")

    lines.append("## Warnings (review, non-blocking)\n\n")
    if any(value != 0 for value in warnings.values()):
        for warning, value in warnings.items():
            lines.append(f"- {warning}: **{value}**\n")
        lines.append(
            "\nActive enrollments under ARCHIVED parents conflict "
            "with the §8 rule that archived programs/levels cannot "
            "accept enrollments.\n"
        )
    else:
        lines.append("None.\n")
    lines.append("\n---\n\n")

    lines.append(
        f"## Overall Result\n\n"
        f"**{'PASS' if overall else 'FAIL'}**\n\n---\n\n"
    )

    lines.append(
        "## Model Training\n\n"
        "**No model training was performed.** This task only "
        "validates synthetic development data.\n"
    )

    VALIDATION_REPORT_FILE.write_text(
        "".join(lines), encoding="utf-8"
    )


# ============================================================
# Evidence layer
# ============================================================

def build_evidence(datasets):
    """
    Build the per-enrollment evidence view (PRD §9, §14).

    One row per enrollment with the latest available academic
    evidence plus raw behavioural evidence availability.
    Raw evidence values only: no derived percentages, scores,
    summaries, or labels. Source CSVs are never modified
    (PRD §9, §11).
    """

    enrollments = datasets["enrollments"]
    records = datasets["academic_records"]
    attendance = datasets["attendance_records"]
    assessments = datasets["assessment_records"]
    components = datasets["learning_components"]
    conversations = datasets["chatbot_conversations"]

    if enrollments["id"].duplicated().any():
        raise ValueError(
            "enrollments.csv contains duplicate enrollment IDs."
        )
    if records["enrollment_id"].duplicated().any():
        raise ValueError(
            "academic_records.csv must contain exactly one "
            "record per enrollment."
        )
    if attendance["academic_record_id"].duplicated().any():
        raise ValueError(
            "attendance_records.csv contains duplicate "
            "academic-record references."
        )
    if assessments["academic_record_id"].duplicated().any():
        raise ValueError(
            "assessment_records.csv contains duplicate "
            "academic-record references."
        )

    evidence = enrollments[
        [
            "id",
            "organization_id",
            "student_id",
            "academic_period_id",
            "status",
            "enrollment_date",
        ]
    ].rename(
        columns={"id": "enrollment_id", "status": "enrollment_status"}
    )

    records_view = records[
        ["id", "enrollment_id", "learning_component_id", "academic_status"]
    ].rename(columns={"id": "academic_record_id"})

    attendance_view = attendance[
        ["academic_record_id", "attended_sessions", "total_sessions"]
    ]

    assessments_view = assessments[
        ["academic_record_id", "obtained_marks", "maximum_marks"]
    ].rename(columns={"maximum_marks": "assessment_maximum_marks"})

    components_view = components[
        ["id", "passing_marks", "maximum_marks"]
    ].rename(
        columns={
            "id": "learning_component_id",
            "passing_marks": "component_passing_marks",
            "maximum_marks": "component_maximum_marks",
        }
    )

    evidence = evidence.merge(
        records_view, on="enrollment_id", how="left"
    )
    evidence = evidence.merge(
        attendance_view, on="academic_record_id", how="left"
    )
    evidence = evidence.merge(
        assessments_view, on="academic_record_id", how="left"
    )
    evidence = evidence.merge(
        components_view, on="learning_component_id", how="left"
    )

    if len(evidence) != len(enrollments):
        raise ValueError(
            "Evidence join produced an unexpected row count."
        )

    # Raw behavioural evidence availability: count of
    # conversations linked to this enrollment. This is a raw
    # evidence tally only — no engagement or sentiment score.
    linked_conversations = conversations[
        conversations["enrollment_id"].notna()
    ]
    conversation_counts = (
        linked_conversations.groupby("enrollment_id").size().to_dict()
    )
    evidence["conversation_count"] = (
        evidence["enrollment_id"]
        .map(conversation_counts)
        .fillna(0)
        .astype(int)
    )
    evidence["has_conversation_evidence"] = (
        evidence["conversation_count"] > 0
    )

    evidence["has_academic_record"] = evidence[
        "academic_record_id"
    ].notna()

    evidence["has_attendance_evidence"] = (
        evidence["attended_sessions"].notna()
        & evidence["total_sessions"].notna()
    )

    evidence["has_assessment_evidence"] = (
        evidence["obtained_marks"].notna()
        & evidence["assessment_maximum_marks"].notna()
    )

    # Placeholder sufficiency rule: attendance AND assessment
    # evidence present. Behavioural evidence is NOT yet part of
    # this rule; the exact sufficiency definition is not frozen
    # by the PRD (§30, §37, §36 Q6) and must be approved before
    # this flag is used to gate predictions.
    evidence["evidence_sufficient"] = (
        evidence["has_attendance_evidence"]
        & evidence["has_assessment_evidence"]
    )

    return evidence[EVIDENCE_COLUMNS]


def create_evidence_report(evidence):
    REPORT_DIR.mkdir(parents=True, exist_ok=True)

    total = len(evidence)
    with_record = int(evidence["has_academic_record"].sum())
    with_attendance = int(evidence["has_attendance_evidence"].sum())
    with_assessment = int(evidence["has_assessment_evidence"].sum())
    with_conversations = int(evidence["has_conversation_evidence"].sum())
    sufficient = int(evidence["evidence_sufficient"].sum())

    attendance_only = int(
        (
            evidence["has_attendance_evidence"]
            & ~evidence["has_assessment_evidence"]
        ).sum()
    )
    assessment_only = int(
        (
            ~evidence["has_attendance_evidence"]
            & evidence["has_assessment_evidence"]
        ).sum()
    )
    neither = int(
        (
            ~evidence["has_attendance_evidence"]
            & ~evidence["has_assessment_evidence"]
        ).sum()
    )

    lines = [
        "# Enrollment Evidence Layer\n\n",
        "## 1. Dataset Identification\n\n",
        "- **Output:** `data/processed/enrollment_evidence.csv`\n",
        "- **Input datasets:** `enrollments.csv`, "
        "`academic_records.csv`, `attendance_records.csv`, "
        "`assessment_records.csv`, `learning_components.csv`, "
        "`chatbot_conversations.csv`\n",
        f"- **Enrollments covered:** {total}\n",
        f"- **Organizations covered:** "
        f"{evidence['organization_id'].nunique()}\n",
        "\n> Synthetic development data only. "
        "Not production data.\n\n---\n\n",
        "## 2. Evidence Availability\n\n",
        "| Measure | Count |\n|---|---|\n",
        f"| Enrollments with academic record | {with_record} |\n",
        f"| Enrollments with attendance evidence | "
        f"{with_attendance} |\n",
        f"| Enrollments with assessment evidence | "
        f"{with_assessment} |\n",
        f"| Enrollments with linked conversation evidence | "
        f"{with_conversations} |\n",
        f"| Enrollments with sufficient evidence "
        f"(attendance AND assessment only) | {sufficient} |\n",
        "\n---\n\n",
        "## 3. Insufficiency Breakdown (academic evidence)\n\n",
        "| Reason | Count |\n|---|---|\n",
        f"| Attendance evidence only | {attendance_only} |\n",
        f"| Assessment evidence only | {assessment_only} |\n",
        f"| Neither | {neither} |\n",
        "\n---\n\n",
        "## 4. PRD Compliance Notes\n\n",
        "- This layer stores raw evidence values only "
        "(session counts, marks, conversation counts). "
        "Attendance percentage, marks percentage, sentiment, "
        "behaviour scores, and engagement scores are derived "
        "later during feature engineering (PRD §8, §9, §11).\n",
        "- No risk label, prediction, or AI-generated value is "
        "present in this file.\n",
        "- Source CSVs in `data/raw` are read-only for this "
        "script (PRD §9, §11).\n",
        "- `evidence_sufficient` does NOT include behavioural "
        "evidence yet; the exact sufficiency definition is not "
        "frozen by the PRD (§30, §37; §36 Q6) and requires an "
        "approved decision before predictions are gated on it.\n",
        "- Unlinked conversations (no enrollment reference, "
        "PRD §11) are not reflected in this per-enrollment "
        "view; student-level behavioural aggregation is a "
        "pending feature-engineering decision.\n",
        "\n---\n\n",
        "## 5. Downstream Use\n\n",
        "This file is the input for feature engineering and "
        "Student Snapshot building (PRD §13, §14). Enrollments "
        "without sufficient evidence must not receive a "
        "prediction (PRD §30).\n",
        "\n---\n\n",
        "## 6. Model Training\n\n",
        "**No model training was performed.**\n",
    ]

    EVIDENCE_REPORT_FILE.write_text(
        "".join(lines), encoding="utf-8"
    )

    return {
        "total": total,
        "with_record": with_record,
        "with_attendance": with_attendance,
        "with_assessment": with_assessment,
        "with_conversations": with_conversations,
        "sufficient": sufficient,
        "attendance_only": attendance_only,
        "assessment_only": assessment_only,
        "neither": neither,
    }


# ============================================================
# Main
# ============================================================

def main():
    print("=" * 70)
    print("DropSafe - Consolidated Data Validation + Evidence Layer")
    print("=" * 70)

    print("\nLoading datasets in PRD §27 dependency order...")
    datasets = load_datasets()

    for name in DATASETS:
        print(f"  {name}: {len(datasets[name])} rows")

    print("\nRunning intrinsic checks...")
    intrinsic = intrinsic_checks(datasets)

    print("Running cross-dataset checks...")
    cross, warnings = cross_dataset_checks(datasets)

    failed = {}
    for name in DATASETS:
        for check, value in intrinsic[name]["checks"].items():
            if value != 0:
                failed[f"{name}:{check}"] = value
    for check, value in cross.items():
        if value != 0:
            failed[f"cross:{check}"] = value

    overall = len(failed) == 0

    create_validation_report(
        datasets,
        intrinsic,
        cross,
        warnings,
        overall,
    )

    print("\nPer-dataset results:")
    for name in DATASETS:
        dataset_failures = [
            check
            for check, value in intrinsic[name]["checks"].items()
            if value != 0
        ]
        status = "FAIL" if dataset_failures else "PASS"
        print(f"  {name}: {status}")

    if failed:
        print("\nFailed checks:")
        for check, value in failed.items():
            print(f"  {check}: {value}")

    if any(value != 0 for value in warnings.values()):
        print("\nWarnings (review, non-blocking):")
        for warning, value in warnings.items():
            if value != 0:
                print(f"  {warning}: {value}")

    print(
        f"\nOverall validation: {'PASS' if overall else 'FAIL'}"
    )
    print(f"Validation report: {VALIDATION_REPORT_FILE}")

    if not overall:
        raise SystemExit(
            "Consolidated validation failed. Evidence layer was "
            "NOT built. Review the validation report first."
        )

    print("\nBuilding evidence layer...")

    evidence = build_evidence(datasets)

    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    evidence.to_csv(EVIDENCE_OUTPUT_FILE, index=False)

    summary = create_evidence_report(evidence)

    print(f"\nEvidence rows generated: {len(evidence)}")
    print(f"Columns generated: {len(evidence.columns)}")
    print(f"CSV: {EVIDENCE_OUTPUT_FILE}")
    print(f"Evidence report: {EVIDENCE_REPORT_FILE}")

    print("\nEvidence availability:")
    print(f"  With academic record: {summary['with_record']}")
    print(f"  With attendance: {summary['with_attendance']}")
    print(f"  With assessment: {summary['with_assessment']}")
    print(
        f"  With linked conversations: "
        f"{summary['with_conversations']}"
    )
    print(f"  Sufficient (attendance AND assessment): "
          f"{summary['sufficient']}")

    print("\nInsufficiency breakdown (academic):")
    print(f"  Attendance only: {summary['attendance_only']}")
    print(f"  Assessment only: {summary['assessment_only']}")
    print(f"  Neither: {summary['neither']}")

    print(
        "\nSource CSVs were not modified. "
        "No model training performed."
    )


# ============================================================
# Script entry point
# ============================================================

if __name__ == "__main__":
    main()