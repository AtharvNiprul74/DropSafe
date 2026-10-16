from pathlib import Path
from datetime import datetime, timedelta, timezone
import random
import uuid

import pandas as pd


# ============================================================
# Paths
# ============================================================

BASE_DIR = Path(__file__).resolve().parents[2]
RAW_DIR = BASE_DIR / "data" / "raw"
REPORT_DIR = BASE_DIR / "data" / "synthetic"

STUDENTS_FILE = RAW_DIR / "students.csv"
ENROLLMENTS_FILE = RAW_DIR / "enrollments.csv"
PERIODS_FILE = RAW_DIR / "academic_periods.csv"

OUTPUT_FILE = RAW_DIR / "chatbot_conversations.csv"
REPORT_FILE = REPORT_DIR / "chatbot_conversations.md"


# ============================================================
# Configuration
# ============================================================

SEED = 50
random.seed(SEED)

# PRD §11: source enum allows WEB, MOBILE, WHATSAPP.
# V1 product interaction is WhatsApp (PRD §11). §36 Q5 stays
# open for the schema; synthetic data uses WHATSAPP only.
SOURCES = ["WEB", "MOBILE", "WHATSAPP"]
V1_SOURCE = "WHATSAPP"

# PRD §11 lifecycle: ACTIVE -> COMPLETED -> ARCHIVED
STATUSES = ["ACTIVE", "COMPLETED", "ARCHIVED"]
STATUS_WEIGHTS = [10, 80, 10]

LINK_PROBABILITY = 0.8
MIN_CONVERSATIONS_PER_STUDENT = 1
MAX_CONVERSATIONS_PER_STUDENT = 5
MIN_SESSION_MINUTES = 10
MAX_SESSION_MINUTES = 180

# PRD §11: the behaviour domain stores raw evidence only.
FORBIDDEN_COLUMNS = [
    "sentiment", "sentiment_score", "behaviour_score",
    "engagement_score", "summary", "risk_label",
    "risk_score", "prediction", "predicted_risk", "stress",
]


# ============================================================
# Utility functions
# ============================================================

def generate_uuid():
    timestamp_ms = int(datetime.now(timezone.utc).timestamp() * 1000)
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
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def isoformat_utc(value):
    return value.replace(microsecond=0).isoformat()


def parse_utc_date(value):
    parsed = datetime.fromisoformat(str(value)[:10])
    return parsed.replace(tzinfo=timezone.utc)


def parse_utc_timestamp(value):
    return datetime.fromisoformat(str(value))


def load_csv(path, required):
    if not path.exists():
        raise FileNotFoundError(f"Missing {path}")
    df = pd.read_csv(path, dtype=str)
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise ValueError(f"{path.name} is missing columns: {missing}")
    if df.empty:
        raise ValueError(f"{path.name} is empty.")
    return df


def empty_count(df, column):
    return int(
        df[column].fillna("").astype(str).str.strip().eq("").sum()
    )


def random_datetime(start_dt, end_dt):
    span = (end_dt - start_dt).total_seconds()
    if span <= 0:
        return start_dt
    return start_dt + timedelta(seconds=random.uniform(0, span))


# ============================================================
# Load sources and build enrollment windows
# ============================================================

def load_sources():
    students = load_csv(STUDENTS_FILE, ["id", "organization_id"])
    enrollments = load_csv(
        ENROLLMENTS_FILE,
        [
            "id", "organization_id", "student_id",
            "academic_period_id", "enrollment_date",
        ],
    )
    periods = load_csv(
        PERIODS_FILE,
        ["id", "organization_id", "start_date", "end_date"],
    )
    return students, enrollments, periods


def build_windows(enrollments, periods):
    period_start = {}
    period_end = {}
    for _, period in periods.iterrows():
        pid = str(period["id"])
        period_start[pid] = parse_utc_date(period["start_date"])
        period_end[pid] = parse_utc_date(period["end_date"])

    enrollment_windows = {}
    enrollments_by_student = {}
    for _, enrollment in enrollments.iterrows():
        eid = str(enrollment["id"])
        sid = str(enrollment["student_id"])
        org = str(enrollment["organization_id"])
        start = parse_utc_date(enrollment["enrollment_date"])
        end = period_end.get(
            str(enrollment["academic_period_id"]), start
        )
        if end < start:
            end = start
        enrollment_windows[eid] = (start, end)
        enrollments_by_student.setdefault((org, sid), []).append(eid)

    global_start = min(period_start.values())
    global_end = max(period_end.values())

    return (
        enrollment_windows,
        enrollments_by_student,
        global_start,
        global_end,
    )


# ============================================================
# Generation
# ============================================================

def generate_conversations(
    students,
    enrollment_windows,
    enrollments_by_student,
    global_start,
    global_end,
):
    """
    Generate synthetic chatbot conversation records.

    PRD §11 rules encoded:
    - Belongs to one Organization and one Student.
    - May optionally reference an Enrollment of the same student.
    - V1 source is WHATSAPP.
    - Lifecycle: ACTIVE -> COMPLETED -> ARCHIVED.
    - No AI summaries, sentiment, or scores stored here.
    """

    rows = []

    for _, student in students.iterrows():
        student_id = str(student["id"])
        organization_id = str(student["organization_id"])

        student_enrollment_ids = enrollments_by_student.get(
            (organization_id, student_id), []
        )

        count = random.randint(
            MIN_CONVERSATIONS_PER_STUDENT,
            MAX_CONVERSATIONS_PER_STUDENT,
        )

        for _ in range(count):
            enrollment_id = None
            window_start = global_start
            window_end = global_end

            if (
                student_enrollment_ids
                and random.random() < LINK_PROBABILITY
            ):
                enrollment_id = random.choice(student_enrollment_ids)
                window_start, window_end = enrollment_windows[
                    enrollment_id
                ]

            status = random.choices(
                STATUSES, weights=STATUS_WEIGHTS, k=1
            )[0]

            # Ongoing conversations start in the recent part of
            # the window so ACTIVE status stays plausible.
            if status == "ACTIVE":
                span = (window_end - window_start).total_seconds()
                if span > 0:
                    window_start = window_end - timedelta(
                        seconds=span * 0.1
                    )

            started_at = random_datetime(window_start, window_end)

            completed_at = None
            if status in {"COMPLETED", "ARCHIVED"}:
                completed_at = started_at + timedelta(
                    minutes=random.randint(
                        MIN_SESSION_MINUTES, MAX_SESSION_MINUTES
                    )
                )

            now = utc_now()

            rows.append({
                "id": generate_uuid(),
                "organization_id": organization_id,
                "student_id": student_id,
                "enrollment_id": enrollment_id,
                "source": V1_SOURCE,
                "status": status,
                "started_at": isoformat_utc(started_at),
                "completed_at": (
                    isoformat_utc(completed_at)
                    if completed_at
                    else None
                ),
                "created_at": now,
                "updated_at": now,
                "created_by": None,
                "updated_by": None,
            })

    return pd.DataFrame(rows)


# ============================================================
# Validation
# ============================================================

def validate(df, students, enrollments, periods):
    student_ids = set(students["id"].astype(str))
    student_org = dict(
        zip(
            students["id"].astype(str),
            students["organization_id"].astype(str),
        )
    )
    enrollment_ids = set(enrollments["id"].astype(str))
    enrollment_org = dict(
        zip(
            enrollments["id"].astype(str),
            enrollments["organization_id"].astype(str),
        )
    )
    enrollment_student = dict(
        zip(
            enrollments["id"].astype(str),
            enrollments["student_id"].astype(str),
        )
    )
    enrollment_period = dict(
        zip(
            enrollments["id"].astype(str),
            enrollments["academic_period_id"].astype(str),
        )
    )
    enrollment_start = dict(
        zip(
            enrollments["id"].astype(str),
            pd.to_datetime(
                enrollments["enrollment_date"],
                errors="coerce",
                utc=True,
            ),
        )
    )
    period_end = dict(
        zip(
            periods["id"].astype(str),
            pd.to_datetime(
                periods["end_date"], errors="coerce", utc=True
            ),
        )
    )

    started = pd.to_datetime(
        df["started_at"], errors="coerce", utc=True
    )
    completed = pd.to_datetime(
        df["completed_at"], errors="coerce", utc=True
    )
    has_completion = df["completed_at"].notna()
    created = pd.to_datetime(
        df["created_at"], errors="coerce", utc=True
    )
    updated = pd.to_datetime(
        df["updated_at"], errors="coerce", utc=True
    )

    mapped_student_org = df["student_id"].astype(str).map(
        student_org
    )

    linked = df[df["enrollment_id"].notna()]
    linked_started = pd.to_datetime(
        linked["started_at"], errors="coerce", utc=True
    )
    linked_enrollment_start = (
        linked["enrollment_id"].astype(str).map(enrollment_start)
    )
    linked_period_end = (
        linked["enrollment_id"]
        .astype(str)
        .map(enrollment_period)
        .map(period_end)
    )
    linked_enrollment_org = (
        linked["enrollment_id"].astype(str).map(enrollment_org)
    )
    linked_enrollment_student = (
        linked["enrollment_id"].astype(str).map(enrollment_student)
    )

    results = {
        "rows": len(df),
        "duplicate_ids": int(df["id"].duplicated().sum()),
        "empty_ids": empty_count(df, "id"),
        "empty_student_ids": empty_count(df, "student_id"),
        "invalid_student_references": int(
            (~df["student_id"].astype(str).isin(student_ids)).sum()
        ),
        "invalid_enrollment_references": int(
            (
                ~linked["enrollment_id"]
                .astype(str)
                .isin(enrollment_ids)
            ).sum()
        ),
        "student_organization_mismatches": int(
            (
                mapped_student_org.notna()
                & (
                    mapped_student_org
                    != df["organization_id"].astype(str)
                )
            ).sum()
        ),
        "enrollment_organization_mismatches": int(
            (
                linked_enrollment_org.notna()
                & (
                    linked_enrollment_org
                    != linked["organization_id"].astype(str)
                )
            ).sum()
        ),
        "enrollment_student_mismatches": int(
            (
                linked_enrollment_student.notna()
                & (
                    linked_enrollment_student
                    != linked["student_id"].astype(str)
                )
            ).sum()
        ),
        "invalid_sources": int((~df["source"].isin(SOURCES)).sum()),
        "invalid_statuses": int((~df["status"].isin(STATUSES)).sum()),
        "invalid_started_timestamps": int(started.isna().sum()),
        "invalid_completed_timestamps": int(
            (has_completion & completed.isna()).sum()
        ),
        "completed_before_started": int(
            (has_completion & (completed < started)).sum()
        ),
        "active_conversations_with_completion": int(
            ((df["status"] == "ACTIVE") & has_completion).sum()
        ),
        "completed_conversations_without_completion": int(
            (
                df["status"].isin(["COMPLETED", "ARCHIVED"])
                & ~has_completion
            ).sum()
        ),
        "conversations_outside_enrollment_window": int(
            (
                linked_enrollment_start.notna()
                & linked_period_end.notna()
                & (
                    (linked_started < linked_enrollment_start)
                    | (linked_started > linked_period_end)
                )
            ).sum()
        ),
        "invalid_created_timestamps": int(created.isna().sum()),
        "invalid_updated_timestamps": int(updated.isna().sum()),
        "updated_before_created": int(
            (updated < created).fillna(False).sum()
        ),
        "forbidden_columns_present": len(
            [c for c in FORBIDDEN_COLUMNS if c in df.columns]
        ),
    }
    results["validation_passed"] = all(
        value == 0
        for key, value in results.items()
        if key not in {"rows", "validation_passed"}
    )
    return results


# ============================================================
# Markdown report
# ============================================================

def create_report(df, validation):
    REPORT_DIR.mkdir(parents=True, exist_ok=True)

    source_counts = df["source"].value_counts().to_dict()
    status_counts = df["status"].value_counts().to_dict()
    linked_count = int(df["enrollment_id"].notna().sum())

    lines = [
        "# Chatbot Conversations Synthetic Dataset\n\n",
        "## 1. Dataset Identification\n\n",
        "- **Dataset:** `chatbot_conversations.csv`\n",
        "- **Dataset type:** Synthetic development dataset\n",
        f"- **Generated records:** {len(df)}\n",
        f"- **Random seed:** {SEED}\n",
        "- **Source datasets:** `students.csv`, "
        "`enrollments.csv`, `academic_periods.csv`\n",
        "\n> Synthetic data only. Raw chatbot conversations are "
        "highly sensitive and access-controlled (PRD §11, §17, "
        "§22).\n\n---\n\n",
        "## 2. Dataset Structure\n\n",
        "| Column | Data Type | Required | Description |\n",
        "|---|---|---|---|\n",
        "| `id` | UUID | Yes | Conversation identifier |\n",
        "| `organization_id` | UUID | Yes | Owning organization |\n",
        "| `student_id` | UUID | Yes | Participating student |\n",
        "| `enrollment_id` | UUID | No | Optional enrollment "
        "reference (PRD §11) |\n",
        "| `source` | Enum | Yes | WEB / MOBILE / WHATSAPP |\n",
        "| `status` | Enum | Yes | ACTIVE / COMPLETED / "
        "ARCHIVED |\n",
        "| `started_at` | Timestamp | Yes | Conversation start "
        "(synthetic schema assumption) |\n",
        "| `completed_at` | Timestamp | No | Conversation "
        "completion |\n",
        "| `created_at` | Timestamp | Yes | Creation timestamp "
        "|\n",
        "| `updated_at` | Timestamp | Yes | Last update "
        "timestamp |\n",
        "| `created_by` | UUID | No | Creating user |\n",
        "| `updated_by` | UUID | No | Updating user |\n",
        "\n---\n\n",
        "## 3. Distributions\n\n",
        f"- Source values: {source_counts}\n",
        f"- Status values: {status_counts}\n",
        f"- Conversations linked to an enrollment: "
        f"{linked_count}\n",
        "\n---\n\n",
        "## 4. PRD Compliance Notes\n\n",
        "- Every conversation belongs to one organization and one "
        "student (PRD §11).\n",
        "- The enrollment reference is optional and, when "
        "present, points to an enrollment of the same student "
        "and organization (PRD §11).\n",
        "- V1 source is WHATSAPP (PRD §11). WEB/MOBILE remain "
        "schema enum values; §36 Q5 is still open.\n",
        "- No sentiment, behaviour scores, engagement scores, "
        "summaries, or predictions are stored here (PRD §11).\n",
        "- `started_at` / `completed_at` are synthetic schema "
        "assumptions; the detailed chatbot specification is not "
        "frozen (PRD §42).\n",
        "\n---\n\n",
        "## 5. Validation\n\n```text\n",
        str(validation),
        "\n```\n",
        f"\n### Overall: "
        f"**{'PASS' if validation['validation_passed'] else 'FAIL'}**\n",
        "\n---\n\n",
        "## 6. Model Training\n\n",
        "**No model training was performed.**\n",
    ]

    REPORT_FILE.write_text("".join(lines), encoding="utf-8")


# ============================================================
# Main
# ============================================================

def main():
    print("=" * 70)
    print("DropSafe - Chatbot Conversations Synthetic Dataset")
    print("=" * 70)

    students, enrollments, periods = load_sources()

    (
        enrollment_windows,
        enrollments_by_student,
        global_start,
        global_end,
    ) = build_windows(enrollments, periods)

    print(f"Students loaded: {len(students)}")
    print(f"Enrollments loaded: {len(enrollments)}")

    print("\nGenerating chatbot conversations...")

    df = generate_conversations(
        students,
        enrollment_windows,
        enrollments_by_student,
        global_start,
        global_end,
    )

    RAW_DIR.mkdir(parents=True, exist_ok=True)
    REPORT_DIR.mkdir(parents=True, exist_ok=True)
    df.to_csv(OUTPUT_FILE, index=False)

    print("\nValidating conversations...")
    validation = validate(df, students, enrollments, periods)
    create_report(df, validation)

    print(f"\nRows generated: {len(df)}")
    print(f"Columns generated: {len(df.columns)}")
    print(f"CSV: {OUTPUT_FILE}")
    print(f"Report: {REPORT_FILE}")
    print(
        f"Linked to enrollments: "
        f"{int(df['enrollment_id'].notna().sum())}"
    )
    print(
        f"Validation: "
        f"{'PASS' if validation['validation_passed'] else 'FAIL'}"
    )

    if not validation["validation_passed"]:
        raise SystemExit(
            "Chatbot conversations validation failed."
        )

    print("\nNo model training performed.")


if __name__ == "__main__":
    main()