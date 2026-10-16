# DropSafe V1 — Training Labels Generation & Distribution Report

**Generated:** 2026-10-16 11:42:47 UTC  
**Phase:** ML Workstream Phase 0 (Training Labels Generation)  
**Author:** ML Engineer 1 (Data Validation & Evidence Layer)  
**Consumer:** ML Engineer 2 (Phase 1 Feature Engineering & Model Training)  
**Label Rule Version:** `v1.0-draft-points`  
**Output CSV:** `data\processed\training_labels.csv`  

---

## 1. Executive Summary

This report documents the generation of ground-truth risk training labels for **DropSafe V1**.
The labels were generated from the validated `enrollment_evidence.csv` dataset in accordance with:
- **Decision Gate Item #1 Sign-Off**: Points-based multi-factor evaluation rule.
- **PRD §8/§9/§11 Separation Principle**: Source raw business evidence was strictly unmodified; labels are persisted exclusively in `data/processed/`.
- **PRD §14 & §30 Grounding Invariant**: The system does not guess labels when evidence is insufficient.
- **PRD §13/§24 Traceability**: Every label record preserves `label_rule_version` and component score breakdown.

---

## 2. Dataset Overview

| Metric | Count | Percentage |
| :--- | :--- | :--- |
| **Total Enrollments Processed** | 1,000 | 100.0% |
| **Evidence Sufficient Records** | 1,000 | 100.0% |
| **Evidence Insufficient Records** | 0 | 0.0% |
| **Output Labeled Records** | 1,000 | 100.0% |

---

## 3. Risk Label Distribution (PRD §13 Enums)

| Risk Class | Count | Percentage | Rule Definition |
| :--- | :--- | :--- | :--- |
| **HIGH** | **360** | **36.0%** | `total_points >= 3` |
| **MEDIUM** | **555** | **55.5%** | `total_points in [1, 2]` |
| **LOW** | **85** | **8.5%** | `total_points == 0` |
| *UNAVAILABLE* | 0 | 0.0% | `evidence_sufficient == False` |
| **TOTAL** | **1,000** | **100.0%** | |

### Class Distribution Bar Chart
```text
HIGH   [##################                                ] 36.0% (360)
MEDIUM [###########################                       ] 55.5% (555)
LOW    [####                                              ] 8.5% (85)
```

---

## 4. Points Component Breakdown

| Factor | Trigger Condition | Breaches Triggered | % of Total Enrollments |
| :--- | :--- | :--- | :--- |
| **Attendance Risk** | Attendance < 75.0% | 722 | 72.2% |
| **Marks Risk** | Marks < 50.0% | 501 | 50.1% |
| **Failed Component** | `marks < passing` OR `FAIL` outcome | 421 | 42.1% |
| **Behaviour / Conversation** | `conversation_count <= 0` (Disengaged) | 315 | 31.5% |

### Total Points Distribution (0 to 4 Scale)
| Points Total | Records | Share | Mapped Risk Label |
| :---: | :---: | :---: | :---: |
| **0** | 85 | 8.5% | LOW |
| **1** | 312 | 31.2% | MEDIUM |
| **2** | 243 | 24.3% | MEDIUM |
| **3** | 279 | 27.9% | HIGH |
| **4** | 81 | 8.1% | HIGH |

---

## 5. PRD Invariants Verification Checklist

| Invariant | PRD Reference | Status | Verification Detail |
| :--- | :--- | :---: | :--- |
| **Raw Data Isolation** | §8, §9, §11 | **PASS** | Source tables untouched. No labels written to raw files. |
| **Evidence Immutability** | §8, §9 | **PASS** | `enrollment_evidence.csv` read in read-only mode; unmodified. |
| **Valid Risk Enums** | §13 | **PASS** | Labels strictly constrained to `LOW`, `MEDIUM`, `HIGH`. |
| **Traceability Version** | §24, §30 | **PASS** | Every row records `label_rule_version = v1.0-draft-points`. |
| **No Guessed Predictions** | §14, §30 | **PASS** | Insufficient evidence rows flagged `UNAVAILABLE`. |
| **Business Key Preservation** | §8, §13 | **PASS** | `enrollment_id`, `student_id`, `organization_id` preserved. |

---

## 6. Handoff Contract for ML Engineer 2 (Phase 1 Feature Engineering)

ML Engineer 2 can immediately join:
- Features source: `enrollment_evidence.csv`
- Target labels: `training_labels.csv`

**Join Key:** `enrollment_id` (1-to-1 match guaranteed).
