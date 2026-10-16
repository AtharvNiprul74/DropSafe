# DropSafe V1 — Feature Engineering Report (Phase 1)

**Generated:** 2026-10-16 17:11:30 UTC  
**Phase:** ML Workstream Phase 1 (Feature Engineering)  
**Governing Standard:** PRD §13 AI Domain (`student_snapshots` features)  
**Feature Version:** `v1.0.0`  
**Output CSV:** `data\processed\student_features.csv`  
**Total Records:** 1,000  

---

## 1. Feature Specifications & Summary

| Feature Name | Min | Mean | Median | Max | Std Dev |
| :--- | :---: | :---: | :---: | :---: | :---: |
| `attendance_percentage` | 0.00 | 50.74 | 50.00 | 100.00 | 30.10 |
| `overall_marks_percentage` | 0.07 | 50.26 | 49.84 | 99.89 | 29.06 |
| `failed_learning_components` | 0.00 | 0.42 | 0.00 | 1.00 | 0.49 |
| `backlog_count` | 0.00 | 0.42 | 0.00 | 1.00 | 0.49 |
| `behaviour_score` | 50.00 | 63.00 | 60.00 | 100.00 | 12.82 |
| `engagement_score` | 0.00 | 43.21 | 43.22 | 100.00 | 21.54 |
| `sentiment_score` | 50.00 | 63.68 | 65.27 | 79.98 | 10.44 |

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
- **Traceability (§13/§24):** All rows stamped with `feature_version = v1.0.0`.
- **Relational Integrity (§8/§13):** Preserves `enrollment_id`, `student_id`, `organization_id`.
- **Join Key:** Joins 1-to-1 with `training_labels.csv` on `enrollment_id`.
