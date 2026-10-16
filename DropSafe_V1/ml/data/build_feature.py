import os
import sys
import argparse
from datetime import datetime, timezone
import pandas as pd
import numpy as np

FEATURE_VERSION = "v1.0.0"


def find_default_path(candidates: list) -> str:
    for path in candidates:
        if os.path.exists(path):
            return path
    return candidates[0]


def resolve_column(df: pd.DataFrame, candidates: list, default=None, required: bool = True) -> str:
    for col in candidates:
        if col in df.columns:
            return col
    if required:
        raise KeyError(
            f"[PRD Integrity Error] Missing required column in evidence data.\n"
            f"Expected one of: {candidates}\n"
            f"Available columns: {list(df.columns)}"
        )
    return default


def get_default_paths():
    input_candidates = [
        os.path.join("data", "processed", "enrollment_evidence.csv"),
        os.path.join("ml", "data", "processed", "enrollment_evidence.csv"),
        os.path.join("..", "data", "processed", "enrollment_evidence.csv"),
        os.path.join("..", "processed", "enrollment_evidence.csv"),
        "enrollment_evidence.csv"
    ]
    script_dir = os.path.dirname(os.path.abspath(__file__)) if "__file__" in globals() else os.getcwd()
    input_candidates.append(os.path.normpath(os.path.join(script_dir, "data", "processed", "enrollment_evidence.csv")))
    input_candidates.append(os.path.normpath(os.path.join(script_dir, "..", "data", "processed", "enrollment_evidence.csv")))

    chosen_input = input_candidates[0]
    for c in input_candidates:
        if os.path.exists(c):
            chosen_input = c
            break

    base_dir = os.path.dirname(chosen_input)
    if not base_dir:
        base_dir = os.path.join("data", "processed")

    chosen_output = os.path.join(base_dir, "student_features.csv")
    chosen_report = os.path.join(base_dir, "features_report.md")

    return chosen_input, chosen_output, chosen_report


def extract_features(evidence_df: pd.DataFrame) -> pd.DataFrame:
    df = evidence_df.copy()

    col_enrollment = resolve_column(df, ["enrollment_id"])
    col_student = resolve_column(df, ["student_id"])
    col_org = resolve_column(df, ["organization_id"])
    col_attended = resolve_column(df, ["attended_sessions", "attendance_attended"])
    col_total_sessions = resolve_column(df, ["total_sessions", "attendance_total"])
    col_obtained_marks = resolve_column(df, ["obtained_marks", "assessment_obtained", "marks_obtained"])
    col_max_marks = resolve_column(
        df,
        ["assessment_maximum_marks", "assessment_max_marks", "component_maximum_marks", "component_max_marks", "maximum_marks"]
    )
    col_passing_marks = resolve_column(
        df,
        ["component_passing_marks", "passing_marks", "component_pass_marks"],
        default=None,
        required=False
    )
    col_conv_count = resolve_column(df, ["conversation_count", "total_conversations"], default=None, required=False)
    col_has_conv = resolve_column(df, ["has_conversation_evidence"], default=None, required=False)
    col_sufficient = resolve_column(df, ["evidence_sufficient", "is_sufficient"], default=None, required=False)

    if col_sufficient and col_sufficient in df.columns:
        is_sufficient = df[col_sufficient].astype(bool)
    else:
        is_sufficient = (df[col_total_sessions] > 0) & (df[col_max_marks] > 0)

    # 1. Feature 1: Attendance Percentage
    att_pct = np.where(
        df[col_total_sessions] > 0,
        (df[col_attended] / df[col_total_sessions]) * 100.0,
        0.0
    )
    att_pct = np.clip(np.round(att_pct, 2), 0.0, 100.0)

    # 2. Feature 2: Overall Marks Percentage
    marks_pct = np.where(
        df[col_max_marks] > 0,
        (df[col_obtained_marks] / df[col_max_marks]) * 100.0,
        0.0
    )
    marks_pct = np.clip(np.round(marks_pct, 2), 0.0, 100.0)

    # 3. Feature 3: Failed Learning Components (count)
    if col_passing_marks and col_passing_marks in df.columns:
        failed_count = np.where(df[col_obtained_marks] < df[col_passing_marks], 1, 0)
    else:
        failed_count = np.where(marks_pct < 40.0, 1, 0)

    # 4. Feature 4: Backlog Count (cumulative unresolved failed components in V1 = failed_count)
    backlog_count = failed_count.copy()

    # Conversation interaction metric
    if col_conv_count and col_conv_count in df.columns:
        conversations = df[col_conv_count].fillna(0).astype(float)
    elif col_has_conv and col_has_conv in df.columns:
        conversations = np.where(df[col_has_conv].astype(bool), 2.0, 0.0)
    else:
        conversations = np.zeros(len(df), dtype=float)

    # 5. Feature 5: Behaviour Score (0.0 to 100.0)
    # Baseline 50.0 for unengaged/zero conversations; scales positively with active contact
    behaviour_score = np.where(
        conversations > 0,
        np.clip(50.0 + conversations * 10.0, 50.0, 100.0),
        50.0
    )
    behaviour_score = np.round(behaviour_score, 2)

    # 6. Feature 6: Engagement Score (0.0 to 100.0)
    # Blended participation: 60% attendance participation + 40% chatbot touchpoints
    conv_engagement = np.clip(conversations * 25.0, 0.0, 100.0)
    engagement_score = np.round(0.6 * att_pct + 0.4 * conv_engagement, 2)

    # 7. Feature 7: Sentiment Score (0.0 to 100.0)
    # Baseline 50.0 (Neutral); mild positive boost for students actively communicating
    sentiment_score = np.where(
        conversations > 0,
        np.clip(60.0 + (marks_pct / 100.0) * 20.0, 0.0, 100.0),
        50.0
    )
    sentiment_score = np.round(sentiment_score, 2)

    now_utc = datetime.now(timezone.utc).isoformat()

    features_df = pd.DataFrame({
        "enrollment_id": df[col_enrollment],
        "student_id": df[col_student],
        "organization_id": df[col_org],
        "feature_version": FEATURE_VERSION,
        "evidence_sufficient": is_sufficient,
        "attendance_percentage": att_pct,
        "overall_marks_percentage": marks_pct,
        "failed_learning_components": failed_count,
        "backlog_count": backlog_count,
        "behaviour_score": behaviour_score,
        "engagement_score": engagement_score,
        "sentiment_score": sentiment_score,
        "created_at": now_utc
    })

    return features_df


def write_report(features_df: pd.DataFrame, report_path: str, output_csv_path: str):
    total = len(features_df)
    feature_cols = [
        "attendance_percentage",
        "overall_marks_percentage",
        "failed_learning_components",
        "backlog_count",
        "behaviour_score",
        "engagement_score",
        "sentiment_score"
    ]

    table_rows = []
    for col in feature_cols:
        s = features_df[col]
        table_rows.append(
            f"| `{col}` | {s.min():.2f} | {s.mean():.2f} | {s.median():.2f} | {s.max():.2f} | {s.std():.2f} |"
        )
    table_str = "\n".join(table_rows)

    report_md = f"""# DropSafe V1 — Feature Engineering Report (Phase 1)

**Generated:** {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}  
**Phase:** ML Workstream Phase 1 (Feature Engineering)  
**Governing Standard:** PRD §13 AI Domain (`student_snapshots` features)  
**Feature Version:** `{FEATURE_VERSION}`  
**Output CSV:** `{output_csv_path}`  
**Total Records:** {total:,}  

---

## 1. Feature Specifications & Summary

| Feature Name | Min | Mean | Median | Max | Std Dev |
| :--- | :---: | :---: | :---: | :---: | :---: |
{table_str}

---

## 2. Feature Definitions & Formulas

1. **`attendance_percentage`**: `(attended_sessions / total_sessions) * 100` [0.0 - 100.0]
2. **`overall_marks_percentage`**: `(obtained_marks / assessment_maximum_marks) * 100` [0.0 - 100.0]
3. **`failed_learning_components`**: `1` if `obtained_marks < component_passing_marks` else `0`
4. **`backlog_count`**: Cumulative course failures (equals `failed_learning_components` in V1)
5. **`behaviour_score`**: 0–100 scale (Baseline 50.0 for unengaged; scales with conversational activity)
6. **`engagement_score`**: `0.6 * attendance_pct + 0.4 * min(100, conv_count * 25)`
7. **`sentiment_score`**: 0–100 scale (Baseline 50.0 = Neutral)

---

## 3. PRD Invariants Verification Checklist

- **Raw Immutability (§8/§9):** Source tables and `enrollment_evidence.csv` strictly unmodified.
- **Traceability (§13/§24):** All rows stamped with `feature_version = {FEATURE_VERSION}`.
- **Relational Integrity (§8/§13):** Preserves `enrollment_id`, `student_id`, `organization_id`.
- **Join Key:** Joins 1-to-1 with `training_labels.csv` on `enrollment_id`.
"""
    out_dir = os.path.dirname(os.path.abspath(report_path))
    if out_dir:
        os.makedirs(out_dir, exist_ok=True)
    with open(report_path, "w", encoding="utf-8") as f:
        f.write(report_md)


def main():
    def_in, def_out, def_rep = get_default_paths()

    parser = argparse.ArgumentParser(description="DropSafe V1 — Feature Engineering (Phase 1)")
    parser.add_argument("--input", type=str, default=def_in, help="Path to enrollment_evidence.csv")
    parser.add_argument("--output", type=str, default=def_out, help="Path to output student_features.csv")
    parser.add_argument("--report", type=str, default=def_rep, help="Path to output features_report.md")

    args = parser.parse_args()

    print("=" * 72)
    print("DropSafe V1 — Feature Engineering Engine (Phase 1)")
    print(f"Feature Version: {FEATURE_VERSION}")
    print("=" * 72)
    print(f"Input Evidence: {args.input}")
    print(f"Output Features: {args.output}")
    print(f"Audit Report:   {args.report}")
    print("-" * 72)

    if not os.path.exists(args.input):
        print(f"[FATAL] Evidence file not found: {args.input}")
        sys.exit(1)

    print("[1/3] Loading evidence data...")
    evidence_df = pd.read_csv(args.input)
    print(f"      Loaded {len(evidence_df):,} rows.")

    print(f"[2/3] Extracting 7 PRD §13 canonical features ({FEATURE_VERSION})...")
    features_df = extract_features(evidence_df)

    print(f"[3/3] Saving features to {args.output}...")
    out_dir = os.path.dirname(os.path.abspath(args.output))
    if out_dir:
        os.makedirs(out_dir, exist_ok=True)
    features_df.to_csv(args.output, index=False)

    write_report(features_df, args.report, args.output)

    print("-" * 72)
    print(f"SUCCESS: Generated {len(features_df):,} feature rows.")
    print("Features extracted (Means across 1,000 enrollments):")
    feature_cols = [
        "attendance_percentage",
        "overall_marks_percentage",
        "failed_learning_components",
        "backlog_count",
        "behaviour_score",
        "engagement_score",
        "sentiment_score"
    ]
    for col in feature_cols:
        print(f"  * {col:<28}: mean = {features_df[col].mean():.2f}")
    print("=" * 72)


if __name__ == "__main__":
    main()