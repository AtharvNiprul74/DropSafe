# Chatbot Conversations Synthetic Dataset

## 1. Dataset Identification

- **Dataset:** `chatbot_conversations.csv`
- **Dataset type:** Synthetic development dataset
- **Generated records:** 3043
- **Random seed:** 50
- **Source datasets:** `students.csv`, `enrollments.csv`, `academic_periods.csv`

> Synthetic data only. Raw chatbot conversations are highly sensitive and access-controlled (PRD §11, §17, §22).

---

## 2. Dataset Structure

| Column | Data Type | Required | Description |
|---|---|---|---|
| `id` | UUID | Yes | Conversation identifier |
| `organization_id` | UUID | Yes | Owning organization |
| `student_id` | UUID | Yes | Participating student |
| `enrollment_id` | UUID | No | Optional enrollment reference (PRD §11) |
| `source` | Enum | Yes | WEB / MOBILE / WHATSAPP |
| `status` | Enum | Yes | ACTIVE / COMPLETED / ARCHIVED |
| `started_at` | Timestamp | Yes | Conversation start (synthetic schema assumption) |
| `completed_at` | Timestamp | No | Conversation completion |
| `created_at` | Timestamp | Yes | Creation timestamp |
| `updated_at` | Timestamp | Yes | Last update timestamp |
| `created_by` | UUID | No | Creating user |
| `updated_by` | UUID | No | Updating user |

---

## 3. Distributions

- Source values: {'WHATSAPP': 3043}
- Status values: {'COMPLETED': 2433, 'ARCHIVED': 319, 'ACTIVE': 291}
- Conversations linked to an enrollment: 1300

---

## 4. PRD Compliance Notes

- Every conversation belongs to one organization and one student (PRD §11).
- The enrollment reference is optional and, when present, points to an enrollment of the same student and organization (PRD §11).
- V1 source is WHATSAPP (PRD §11). WEB/MOBILE remain schema enum values; §36 Q5 is still open.
- No sentiment, behaviour scores, engagement scores, summaries, or predictions are stored here (PRD §11).
- `started_at` / `completed_at` are synthetic schema assumptions; the detailed chatbot specification is not frozen (PRD §42).

---

## 5. Validation

```text
{'rows': 3043, 'duplicate_ids': 0, 'empty_ids': 0, 'empty_student_ids': 0, 'invalid_student_references': 0, 'invalid_enrollment_references': 0, 'student_organization_mismatches': 0, 'enrollment_organization_mismatches': 0, 'enrollment_student_mismatches': 0, 'invalid_sources': 0, 'invalid_statuses': 0, 'invalid_started_timestamps': 0, 'invalid_completed_timestamps': 0, 'completed_before_started': 0, 'active_conversations_with_completion': 0, 'completed_conversations_without_completion': 0, 'conversations_outside_enrollment_window': 0, 'invalid_created_timestamps': 0, 'invalid_updated_timestamps': 0, 'updated_before_created': 0, 'forbidden_columns_present': 0, 'validation_passed': True}
```

### Overall: **PASS**

---

## 6. Model Training

**No model training was performed.**
