import os
import uuid
from datetime import datetime, timezone
import numpy as np
import pandas as pd

np.random.seed(42)
N = 1000

# Base directory for processed data
base_dir = os.path.join("data", "processed")
if not os.path.exists(base_dir) and os.path.exists(os.path.join("ml", "data", "processed")):
    base_dir = os.path.join("ml", "data", "processed")
os.makedirs(base_dir, exist_ok=True)

print("=" * 72)
print("DropSafe V1 — Generating Realistic Complex Student Dataset (N=1,000)")
print("=" * 72)

# 1. Latent Student Profile Dynamics
ability = np.random.normal(0, 1.0, N)
motivation = 0.5 * ability + np.random.normal(0, 0.85, N)
life_distress = np.random.exponential(scale=0.8, size=N)

# 2. Attendance Dynamics (sessions out of 50)
total_sessions = 50
raw_att_pct = 76.0 + 14.0 * motivation - 10.0 * life_distress + np.random.normal(0, 7.5, N)
att_pct = np.clip(raw_att_pct, 16.0, 98.0)
attended_sessions = np.round((att_pct / 100.0) * total_sessions).astype(int)

# 3. Marks & Academic Performance (out of 100)
assessment_max_marks = 100.0
component_max_marks = 100.0
component_passing_marks = 40.0

raw_marks = 52.0 + 17.0 * ability + 0.22 * (att_pct - 75.0) - 6.0 * life_distress + np.random.normal(0, 8.5, N)
obtained_marks = np.clip(np.round(raw_marks, 1), 12.0, 96.0)

# 4. Course Failures
fail_prob = 1.0 / (1.0 + np.exp((obtained_marks - 40.0) / 5.0))
failed_components = np.random.binomial(n=1, p=np.clip(fail_prob, 0.02, 0.98))

# 5. Behaviour & Chatbot Interaction (WhatsApp)
disengage_prob = 1.0 / (1.0 + np.exp((motivation - life_distress * 0.5 + 0.2) * 2.0))
is_disengaged = np.random.binomial(n=1, p=np.clip(disengage_prob, 0.15, 0.65))

conversation_count = np.where(
    is_disengaged == 1,
    0,
    np.random.poisson(lam=np.clip(2.8 + life_distress * 0.8 - motivation * 0.3, 1.0, 7.0))
)
has_conversation_evidence = conversation_count > 0

# 6. Realistic Multi-Factor Risk Score (Continuous Composite + Human Variance)
acad_distress = (100.0 - obtained_marks) * 0.42 + (100.0 - att_pct) * 0.38 + failed_components * 15.0
beh_distress = np.where(conversation_count == 0, 16.0, np.maximum(0.0, 6.0 - conversation_count * 1.5))
human_unobserved_noise = np.random.normal(0, 6.0, N)

total_risk_latent = acad_distress + beh_distress + human_unobserved_noise

# 7. Map to the 3 PRD §13 Risk Classes (~30% HIGH, ~48% MEDIUM, ~22% LOW)
cutoff_high = np.percentile(total_risk_latent, 70.0)
cutoff_low = np.percentile(total_risk_latent, 22.0)

risk_labels = []
for score in total_risk_latent:
    if score >= cutoff_high:
        risk_labels.append("HIGH")
    elif score <= cutoff_low:
        risk_labels.append("LOW")
    else:
        risk_labels.append("MEDIUM")

# Point breakdown for auditability
att_pts = (att_pct < 75.0).astype(int)
marks_pts = (obtained_marks < 50.0).astype(int)
fail_pts = failed_components.astype(int)
conv_pts = (conversation_count == 0).astype(int)
total_points = att_pts + marks_pts + fail_pts + conv_pts

org_id = "01a1433d-6421-77e9-bae7-69f1efc2128b"
enrollment_ids = [str(uuid.uuid4()) for _ in range(N)]
student_ids = [str(uuid.uuid4()) for _ in range(N)]
period_ids = [f"prd_{((i % 8) + 1):03d}" for i in range(N)]
record_ids = [str(uuid.uuid4()) for _ in range(N)]
component_ids = [f"cmp_{((i % 20) + 1):03d}" for i in range(N)]

now_iso = datetime.now(timezone.utc).isoformat()

# 8. Create enrollment_evidence.csv (Exact 21 columns)
evidence_df = pd.DataFrame({
    "enrollment_id": enrollment_ids,
    "organization_id": org_id,
    "student_id": student_ids,
    "academic_period_id": period_ids,
    "enrollment_status": "ACTIVE",
    "enrollment_date": "2024-01-15",
    "academic_record_id": record_ids,
    "academic_status": "ACTIVE",
    "learning_component_id": component_ids,
    "attended_sessions": attended_sessions,
    "total_sessions": total_sessions,
    "obtained_marks": obtained_marks,
    "assessment_maximum_marks": assessment_max_marks,
    "component_passing_marks": component_passing_marks,
    "component_maximum_marks": component_max_marks,
    "conversation_count": conversation_count,
    "has_conversation_evidence": has_conversation_evidence,
    "has_academic_record": True,
    "has_attendance_evidence": True,
    "has_assessment_evidence": True,
    "evidence_sufficient": True
})

evidence_path = os.path.join(base_dir, "enrollment_evidence.csv")
evidence_df.to_csv(evidence_path, index=False)
print(f"[1/4] Saved realistic enrollment_evidence.csv: {len(evidence_df)} rows x {len(evidence_df.columns)} cols")

# 9. Create training_labels.csv (Exact 12 columns)
labels_df = pd.DataFrame({
    "enrollment_id": enrollment_ids,
    "student_id": student_ids,
    "organization_id": org_id,
    "label_rule_version": "v2.0-realistic-multivariate",
    "evidence_sufficient": True,
    "attendance_points": att_pts,
    "marks_points": marks_pts,
    "failed_points": fail_pts,
    "conversation_points": conv_pts,
    "total_points": total_points,
    "risk_label": risk_labels,
    "created_at": now_iso
})

labels_path = os.path.join(base_dir, "training_labels.csv")
labels_df.to_csv(labels_path, index=False)
print(f"[2/4] Saved realistic training_labels.csv: {len(labels_df)} rows")
print("      Distribution:", labels_df["risk_label"].value_counts().to_dict())

# 10. Compute 7 PRD §13 Features
feature_version = "v1.0.0"
behaviour_score = np.round(np.clip(50.0 + 8.0 * conversation_count - 10.0 * failed_components, 15.0, 95.0), 2)
engagement_score = np.round(np.clip(0.6 * att_pct + 0.4 * np.minimum(conversation_count * 25.0, 100.0), 10.0, 98.0), 2)
sentiment_score = np.round(np.clip(55.0 + (obtained_marks - 50.0) * 0.35 + np.random.normal(0, 4, N), 20.0, 95.0), 2)

features_df = pd.DataFrame({
    "enrollment_id": enrollment_ids,
    "student_id": student_ids,
    "organization_id": org_id,
    "feature_version": feature_version,
    "evidence_sufficient": True,
    "attendance_percentage": np.round(att_pct, 2),
    "overall_marks_percentage": np.round(obtained_marks, 2),
    "failed_learning_components": failed_components,
    "backlog_count": failed_components,
    "behaviour_score": behaviour_score,
    "engagement_score": engagement_score,
    "sentiment_score": sentiment_score,
    "created_at": now_iso
})

features_path = os.path.join(base_dir, "student_features.csv")
features_df.to_csv(features_path, index=False)
print(f"[3/4] Saved student_features.csv: {len(features_df)} rows")

# 11. Create student_snapshots.csv
snapshots_df = pd.DataFrame({
    "snapshot_id": [str(uuid.uuid4()) for _ in range(N)],
    "organization_id": org_id,
    "student_id": student_ids,
    "enrollment_id": enrollment_ids,
    "import_session_id": [None] * N,
    "status": "GENERATED",
    "feature_version": feature_version,
    "attendance_percentage": np.round(att_pct, 2),
    "overall_marks_percentage": np.round(obtained_marks, 2),
    "failed_learning_components": failed_components,
    "backlog_count": failed_components,
    "behaviour_score": behaviour_score,
    "engagement_score": engagement_score,
    "sentiment_score": sentiment_score,
    "created_at": now_iso
})

snapshots_path = os.path.join(base_dir, "student_snapshots.csv")
snapshots_df.to_csv(snapshots_path, index=False)
print(f"[4/4] Saved student_snapshots.csv: {len(snapshots_df)} rows (Status: GENERATED)")

print("-" * 72)
print("SUCCESS: Complex realistic dataset successfully generated and aligned!")
print("=" * 72)