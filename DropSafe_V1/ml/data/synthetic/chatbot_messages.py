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

CONVERSATIONS_FILE = RAW_DIR / "chatbot_conversations.csv"
OUTPUT_FILE = RAW_DIR / "chatbot_messages.csv"
REPORT_FILE = REPORT_DIR / "chatbot_messages.md"


# ============================================================
# Configuration
# ============================================================

SEED = 51
random.seed(SEED)

# PRD §11 sender types.
SENDER_TYPES = ["STUDENT", "BOT", "SYSTEM"]

MIN_MESSAGES = 2
MAX_MESSAGES = 12
ACTIVE_WINDOW_MINUTES = 180

# PRD §11: raw messages only, no derived AI values.
FORBIDDEN_COLUMNS = [
    "sentiment", "sentiment_score", "behaviour_score",
    "engagement_score", "summary", "risk_label",
    "risk_score", "prediction", "predicted_risk", "stress",
]

# PRD §31: bot responses must not reveal predictions, internal
# AI decisions, or mentor actions. Templates below comply.
STUDENT_TEXTS = [
    "Hi, I need help with my attendance record.",
    "I missed two classes this week because I was unwell.",
    "Can you tell me my pending assignments?",
    "I am feeling stressed about the upcoming assessments.",
    "When is the next doubt-clearing session?",
    "I could not submit my assignment on time.",
    "Is there an extra class scheduled for this module?",
    "I did well in my last assessment.",
    "I am finding it hard to focus on studies lately.",
    "Thank you, that was helpful.",
    "Can you share the timetable for this week?",
    "I have a doubt in the last topic discussed in class.",
    "My attendance record seems incorrect.",
    "I want to know the syllabus for the next test.",
    "I am preparing regularly for the assessments.",
]

BOT_TEXTS = [
    "Hello! How can I help you today?",
    "Please share your query in detail.",
    "Here is the information you requested.",
    "Your query has been noted.",
    "Let me check that for you.",
    "You can reach out anytime. Take care!",
    "Please contact your institute office for document "
    "requests.",
    "Got it. Anything else I can help with?",
    "The requested details have been shared.",
    "Thank you for reaching out.",
]

SYSTEM_TEXTS = [
    "Session started.",
    "Session ended.",
    "Conversation closed by system.",
    "Session timed out due to inactivity.",
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


def isoformat_utc(value):
    return value.replace(microsecond=0).isoformat()


def parse_utc_timestamp(value):
    return datetime.fromisoformat(str(value))


def load_csv(path, required):
    if not path.exists():
        raise FileNotFoundError(
            f"Missing {path}. Generate the parent dataset first."
        )
    df = pd.read_csv(path, dtype=str)
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise ValueError(
            f"{path.name} is missing columns: {missing}"
        )
    if df.empty:
        raise ValueError(f"{path.name} is empty.")
    return df


def empty_count(df, column):
    return int(
        df[column].fillna("").astype(str).str.strip().eq("").sum()
    )


def build_sender_sequence(n):
    """
    Build an alternating STUDENT/BOT sequence of length n with
    occasional SYSTEM messages. At least one STUDENT message is
    always present.
    """
    senders = []
    for index in range(n):
        senders.append("STUDENT" if index % 2 == 0 else "BOT")

    if n >= 3 and random.random() < 0.20:
        senders[0] = "SYSTEM"
    if n >= 4 and random.random() < 0.15:
        senders[-1] = "SYSTEM"

    if "STUDENT" not in senders:
        senders[0] = "STUDENT"

    return senders


def generate_message_times(started_at, end_at, n):
    """
    Generate n distinct, strictly increasing timestamps between
    started_at and end_at (PRD §11: ordering is determined by
    message_timestamp).
    """
    span_seconds = int((end_at - started_at).total_seconds())
    if span_seconds < n + 4:
        span_seconds = n + 4

    offsets = sorted(
        random.sample(range(1, span_seconds - 1), n)
    )

    return [
        (started_at + timedelta(seconds=offset)).replace(
            microsecond=0
        )
        for offset in offsets
    ]


# ============================================================
# Generation
# ============================================================

def generate_messages(conversations):
    """
    Generate synthetic raw chatbot messages.

    PRD §11 rules encoded:
    - Every conversation receives one or more messages
      (parent-driven coverage).
    - Message text is never empty.
    - Ordering is determined by message_timestamp.
    - Only STUDENT / BOT / SYSTEM sender types.
    - No derived sentiment, scores, or predictions stored.
    """

    rows = []

    for _, conversation in conversations.iterrows():
        conversation_id = str(conversation["id"])
        organization_id = str(conversation["organization_id"])

        started_at = parse_utc_timestamp(conversation["started_at"])

        completed_raw = conversation["completed_at"]
        if pd.isna(completed_raw) or str(completed_raw).strip() == "":
            # ACTIVE conversations have no completion timestamp;
            # messages stay inside a bounded recent window.
            end_at = started_at + timedelta(
                minutes=ACTIVE_WINDOW_MINUTES
            )
        else:
            end_at = parse_utc_timestamp(completed_raw)

        n = random.randint(MIN_MESSAGES, MAX_MESSAGES)
        senders = build_sender_sequence(n)
        times = generate_message_times(started_at, end_at, n)

        for sender, timestamp in zip(senders, times):
            if sender == "STUDENT":
                text = random.choice(STUDENT_TEXTS)
            elif sender == "BOT":
                text = random.choice(BOT_TEXTS)
            else:
                text = random.choice(SYSTEM_TEXTS)

            stamp = isoformat_utc(timestamp)

            # Messages are append-only: created_at equals the
            # message timestamp and is never changed afterwards.
            rows.append({
                "id": generate_uuid(),
                "organization_id": organization_id,
                "conversation_id": conversation_id,
                "sender_type": sender,
                "message_text": text,
                "message_timestamp": stamp,
                "created_at": stamp,
                "updated_at": stamp,
                "created_by": None,
                "updated_by": None,
            })

    return pd.DataFrame(rows)


# ============================================================
# Validation
# ============================================================

def validate(df, conversations):
    conversation_keys = conversations["id"].astype(str)
    conversation_ids = set(conversation_keys)
    conversation_org = dict(
        zip(
            conversation_keys,
            conversations["organization_id"].astype(str),
        )
    )
    conversation_started = dict(
        zip(
            conversation_keys,
            pd.to_datetime(
                conversations["started_at"],
                errors="coerce",
                utc=True,
            ),
        )
    )
    conversation_completed = dict(
        zip(
            conversation_keys,
            pd.to_datetime(
                conversations["completed_at"],
                errors="coerce",
                utc=True,
            ),
        )
    )

    keys = df["conversation_id"].astype(str)
    message_ts = pd.to_datetime(
        df["message_timestamp"], errors="coerce", utc=True
    )
    created = pd.to_datetime(
        df["created_at"], errors="coerce", utc=True
    )
    updated = pd.to_datetime(
        df["updated_at"], errors="coerce", utc=True
    )

    mapped_org = keys.map(conversation_org)
    mapped_start = keys.map(conversation_started)
    mapped_end = keys.map(conversation_completed)

    prev_ts = message_ts.groupby(keys).shift(1)

    results = {
        "rows": len(df),
        "duplicate_ids": int(df["id"].duplicated().sum()),
        "empty_ids": empty_count(df, "id"),
        "empty_conversation_ids": empty_count(df, "conversation_id"),
        "invalid_conversation_references": int(
            (~keys.isin(conversation_ids)).sum()
        ),
        "conversations_without_messages": int(
            len(conversation_ids - set(keys))
        ),
        "invalid_sender_types": int(
            (~df["sender_type"].isin(SENDER_TYPES)).sum()
        ),
        "empty_message_texts": int(
            df["message_text"]
            .fillna("")
            .astype(str)
            .str.strip()
            .eq("")
            .sum()
        ),
        "invalid_message_timestamps": int(
            message_ts.isna().sum()
        ),
        "non_monotonic_message_order": int(
            (prev_ts.notna() & (message_ts <= prev_ts)).sum()
        ),
        "messages_before_conversation_start": int(
            (
                message_ts.notna()
                & mapped_start.notna()
                & (message_ts < mapped_start)
            ).sum()
        ),
        "messages_after_conversation_end": int(
            (
                message_ts.notna()
                & mapped_end.notna()
                & (message_ts > mapped_end)
            ).sum()
        ),
        "conversation_organization_mismatches": int(
            (
                mapped_org.notna()
                & (mapped_org != df["organization_id"].astype(str))
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

    sender_counts = df["sender_type"].value_counts().to_dict()

    lines = [
        "# Chatbot Messages Synthetic Dataset\n\n",
        "## 1. Dataset Identification\n\n",
        "- **Dataset:** `chatbot_messages.csv`\n",
        "- **Dataset type:** Synthetic development dataset\n",
        f"- **Generated records:** {len(df)}\n",
        f"- **Random seed:** {SEED}\n",
        "- **Parent dataset:** `chatbot_conversations.csv`\n",
        "\n> Synthetic data only. Raw messages are highly "
        "sensitive and access-controlled (PRD §11, §17).\n\n"
        "---\n\n",
        "## 2. Dataset Structure\n\n",
        "| Column | Data Type | Required | Description |\n",
        "|---|---|---|---|\n",
        "| `id` | UUID | Yes | Message identifier |\n",
        "| `organization_id` | UUID | Yes | Owning organization "
        "|\n",
        "| `conversation_id` | UUID | Yes | Parent conversation "
        "|\n",
        "| `sender_type` | Enum | Yes | STUDENT / BOT / SYSTEM "
        "|\n",
        "| `message_text` | String | Yes | Raw message content "
        "|\n",
        "| `message_timestamp` | Timestamp | Yes | Ordering "
        "timestamp |\n",
        "| `created_at` | Timestamp | Yes | Creation timestamp "
        "(equals message timestamp; append-only) |\n",
        "| `updated_at` | Timestamp | Yes | Last update "
        "timestamp |\n",
        "| `created_by` | UUID | No | Creating user |\n",
        "| `updated_by` | UUID | No | Updating user |\n",
        "\n---\n\n",
        "## 3. Sender Distribution\n\n",
        f"{sender_counts}\n",
        "\n---\n\n",
        "## 4. PRD Compliance Notes\n\n",
        "- Every conversation contains one or more messages "
        "(PRD §11).\n",
        "- Message text is never empty (PRD §11).\n",
        "- Ordering within a conversation is determined by "
        "`message_timestamp`; timestamps are strictly increasing "
        "(PRD §11).\n",
        "- Messages are append-only; original content is never "
        "modified (PRD §11).\n",
        "- No sentiment, stress, engagement, behaviour scores, "
        "risk predictions, or AI summaries are stored in this "
        "table (PRD §11).\n",
        "- BOT templates avoid revealing predictions, internal "
        "AI decisions, or mentor actions (PRD §31).\n",
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
    print("DropSafe - Chatbot Messages Synthetic Dataset")
    print("=" * 70)

    conversations = load_csv(
        CONVERSATIONS_FILE,
        [
            "id",
            "organization_id",
            "student_id",
            "status",
            "started_at",
            "completed_at",
        ],
    )

    print(f"Conversations loaded: {len(conversations)}")

    print("\nGenerating chatbot messages...")

    df = generate_messages(conversations)

    RAW_DIR.mkdir(parents=True, exist_ok=True)
    REPORT_DIR.mkdir(parents=True, exist_ok=True)
    df.to_csv(OUTPUT_FILE, index=False)

    print("\nValidating messages...")
    validation = validate(df, conversations)
    create_report(df, validation)

    print(f"\nRows generated: {len(df)}")
    print(f"Columns generated: {len(df.columns)}")
    print(f"CSV: {OUTPUT_FILE}")
    print(f"Report: {REPORT_FILE}")
    print(
        f"Conversations covered: "
        f"{len(set(df['conversation_id'].astype(str)))}"
    )
    print(
        f"Validation: "
        f"{'PASS' if validation['validation_passed'] else 'FAIL'}"
    )

    if not validation["validation_passed"]:
        raise SystemExit("Chatbot messages validation failed.")

    print("\nNo model training performed.")


if __name__ == "__main__":
    main()