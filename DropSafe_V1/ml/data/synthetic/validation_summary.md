# Consolidated Data Validation Summary

## 1. Scope

Datasets validated in PRD §27 dependency order (items 10-19 and 23-24; import tables 20-22 are backend runtime records, not synthetic CSVs):

- `learning_programs.csv` (500 rows)
- `learning_levels.csv` (2000 rows)
- `academic_periods.csv` (2000 rows)
- `learning_components.csv` (2000 rows)
- `students.csv` (1000 rows)
- `student_identifiers.csv` (1000 rows)
- `enrollments.csv` (1000 rows)
- `academic_records.csv` (1000 rows)
- `attendance_records.csv` (1000 rows)
- `assessment_records.csv` (1000 rows)
- `chatbot_conversations.csv` (3043 rows)
- `chatbot_messages.csv` (21126 rows)

> Synthetic development data only. Not production data.

---

## learning_programs

| Check | Count | Result |
|---|---|---|
| invalid_created_timestamps | 0 | PASS |
| invalid_updated_timestamps | 0 | PASS |
| updated_before_created | 0 | PASS |
| empty_ids | 0 | PASS |
| duplicate_ids | 0 | PASS |
| duplicate_program_codes | 0 | PASS |
| empty_program_codes | 0 | PASS |
| empty_names | 0 | PASS |
| invalid_statuses | 0 | PASS |
| invalid_duration | 0 | PASS |

---

## learning_levels

| Check | Count | Result |
|---|---|---|
| invalid_created_timestamps | 0 | PASS |
| invalid_updated_timestamps | 0 | PASS |
| updated_before_created | 0 | PASS |
| empty_ids | 0 | PASS |
| duplicate_ids | 0 | PASS |
| duplicate_level_numbers | 0 | PASS |
| duplicate_names | 0 | PASS |
| empty_names | 0 | PASS |
| invalid_statuses | 0 | PASS |
| invalid_level_numbers | 0 | PASS |

---

## academic_periods

| Check | Count | Result |
|---|---|---|
| invalid_created_timestamps | 0 | PASS |
| invalid_updated_timestamps | 0 | PASS |
| updated_before_created | 0 | PASS |
| empty_ids | 0 | PASS |
| duplicate_ids | 0 | PASS |
| duplicate_period_codes | 0 | PASS |
| duplicate_names | 0 | PASS |
| empty_period_codes | 0 | PASS |
| empty_names | 0 | PASS |
| invalid_statuses | 0 | PASS |
| invalid_start_dates | 0 | PASS |
| invalid_end_dates | 0 | PASS |
| invalid_date_ranges | 0 | PASS |
| levels_with_multiple_active_periods | 0 | PASS |

---

## learning_components

| Check | Count | Result |
|---|---|---|
| invalid_created_timestamps | 0 | PASS |
| invalid_updated_timestamps | 0 | PASS |
| updated_before_created | 0 | PASS |
| empty_ids | 0 | PASS |
| duplicate_ids | 0 | PASS |
| duplicate_component_codes | 0 | PASS |
| duplicate_names | 0 | PASS |
| empty_component_codes | 0 | PASS |
| empty_names | 0 | PASS |
| invalid_component_types | 0 | PASS |
| invalid_statuses | 0 | PASS |
| invalid_maximum_marks | 0 | PASS |
| invalid_passing_marks | 0 | PASS |
| passing_marks_exceed_maximum | 0 | PASS |

---

## students

| Check | Count | Result |
|---|---|---|
| invalid_created_timestamps | 0 | PASS |
| invalid_updated_timestamps | 0 | PASS |
| updated_before_created | 0 | PASS |
| empty_ids | 0 | PASS |
| duplicate_ids | 0 | PASS |
| invalid_statuses | 0 | PASS |

---

## student_identifiers

| Check | Count | Result |
|---|---|---|
| invalid_created_timestamps | 0 | PASS |
| invalid_updated_timestamps | 0 | PASS |
| updated_before_created | 0 | PASS |
| empty_ids | 0 | PASS |
| duplicate_ids | 0 | PASS |
| duplicate_identifier_values | 0 | PASS |
| duplicate_student_type_pairs | 0 | PASS |
| empty_identifier_values | 0 | PASS |
| invalid_identifier_types | 0 | PASS |
| invalid_statuses | 0 | PASS |
| invalid_primary_flags | 0 | PASS |
| students_with_multiple_primary_identifiers | 0 | PASS |

---

## enrollments

| Check | Count | Result |
|---|---|---|
| invalid_created_timestamps | 0 | PASS |
| invalid_updated_timestamps | 0 | PASS |
| updated_before_created | 0 | PASS |
| empty_ids | 0 | PASS |
| duplicate_ids | 0 | PASS |
| duplicate_student_period_pairs | 0 | PASS |
| empty_student_ids | 0 | PASS |
| empty_period_ids | 0 | PASS |
| invalid_statuses | 0 | PASS |
| invalid_enrollment_dates | 0 | PASS |
| invalid_completion_dates | 0 | PASS |
| completion_before_enrollment | 0 | PASS |

---

## academic_records

| Check | Count | Result |
|---|---|---|
| invalid_created_timestamps | 0 | PASS |
| invalid_updated_timestamps | 0 | PASS |
| updated_before_created | 0 | PASS |
| empty_ids | 0 | PASS |
| duplicate_ids | 0 | PASS |
| empty_enrollment_ids | 0 | PASS |
| empty_component_ids | 0 | PASS |
| invalid_academic_statuses | 0 | PASS |

---

## attendance_records

| Check | Count | Result |
|---|---|---|
| invalid_created_timestamps | 0 | PASS |
| invalid_updated_timestamps | 0 | PASS |
| updated_before_created | 0 | PASS |
| empty_ids | 0 | PASS |
| duplicate_ids | 0 | PASS |
| duplicate_business_keys | 0 | PASS |
| invalid_attended_sessions | 0 | PASS |
| invalid_total_sessions | 0 | PASS |
| attendance_exceeds_total | 0 | PASS |

---

## assessment_records

| Check | Count | Result |
|---|---|---|
| invalid_created_timestamps | 0 | PASS |
| invalid_updated_timestamps | 0 | PASS |
| updated_before_created | 0 | PASS |
| empty_ids | 0 | PASS |
| duplicate_ids | 0 | PASS |
| duplicate_business_keys | 0 | PASS |
| invalid_obtained_marks | 0 | PASS |
| invalid_maximum_marks | 0 | PASS |
| obtained_marks_exceed_maximum | 0 | PASS |

---

## chatbot_conversations

| Check | Count | Result |
|---|---|---|
| invalid_created_timestamps | 0 | PASS |
| invalid_updated_timestamps | 0 | PASS |
| updated_before_created | 0 | PASS |
| empty_ids | 0 | PASS |
| duplicate_ids | 0 | PASS |
| empty_student_ids | 0 | PASS |
| invalid_sources | 0 | PASS |
| invalid_statuses | 0 | PASS |
| invalid_started_timestamps | 0 | PASS |
| invalid_completed_timestamps | 0 | PASS |
| completed_before_started | 0 | PASS |
| active_conversations_with_completion | 0 | PASS |
| completed_conversations_without_completion | 0 | PASS |

---

## chatbot_messages

| Check | Count | Result |
|---|---|---|
| invalid_created_timestamps | 0 | PASS |
| invalid_updated_timestamps | 0 | PASS |
| updated_before_created | 0 | PASS |
| empty_ids | 0 | PASS |
| duplicate_ids | 0 | PASS |
| empty_conversation_ids | 0 | PASS |
| invalid_sender_types | 0 | PASS |
| empty_message_texts | 0 | PASS |
| invalid_message_timestamps | 0 | PASS |

---

## Cross-Dataset Checks

| Check | Count | Result |
|---|---|---|
| levels_invalid_program_references | 0 | PASS |
| periods_invalid_level_references | 0 | PASS |
| components_invalid_period_references | 0 | PASS |
| identifiers_invalid_student_references | 0 | PASS |
| enrollments_invalid_student_references | 0 | PASS |
| enrollments_invalid_period_references | 0 | PASS |
| records_invalid_enrollment_references | 0 | PASS |
| records_invalid_component_references | 0 | PASS |
| attendance_invalid_record_references | 0 | PASS |
| attendance_invalid_component_references | 0 | PASS |
| assessments_invalid_record_references | 0 | PASS |
| assessments_invalid_component_references | 0 | PASS |
| conversations_invalid_student_references | 0 | PASS |
| conversations_invalid_enrollment_references | 0 | PASS |
| messages_invalid_conversation_references | 0 | PASS |
| levels_organization_mismatches | 0 | PASS |
| periods_organization_mismatches | 0 | PASS |
| components_organization_mismatches | 0 | PASS |
| identifiers_organization_mismatches | 0 | PASS |
| enrollments_student_organization_mismatches | 0 | PASS |
| enrollments_period_organization_mismatches | 0 | PASS |
| records_enrollment_organization_mismatches | 0 | PASS |
| records_component_organization_mismatches | 0 | PASS |
| attendance_record_organization_mismatches | 0 | PASS |
| attendance_component_organization_mismatches | 0 | PASS |
| assessments_record_organization_mismatches | 0 | PASS |
| assessments_component_organization_mismatches | 0 | PASS |
| conversations_student_organization_mismatches | 0 | PASS |
| messages_conversation_organization_mismatches | 0 | PASS |
| conversations_enrollment_organization_mismatches | 0 | PASS |
| conversations_enrollment_student_mismatches | 0 | PASS |
| records_period_mismatches | 0 | PASS |
| attendance_component_mismatches | 0 | PASS |
| assessments_component_mismatches | 0 | PASS |
| records_duplicate_per_enrollment | 0 | PASS |
| enrollments_without_academic_records | 0 | PASS |
| enrollments_without_component_coverage | 0 | PASS |
| conversations_without_messages | 0 | PASS |
| messages_non_monotonic_within_conversation | 0 | PASS |
| messages_before_conversation_start | 0 | PASS |
| messages_after_conversation_end | 0 | PASS |
| conversations_outside_enrollment_window | 0 | PASS |
| attendance_records_forbidden_derived_columns | 0 | PASS |
| assessment_records_forbidden_derived_columns | 0 | PASS |
| chatbot_conversations_forbidden_derived_columns | 0 | PASS |
| chatbot_messages_forbidden_derived_columns | 0 | PASS |
| learning_programs_risk_label_columns | 0 | PASS |
| learning_levels_risk_label_columns | 0 | PASS |
| academic_periods_risk_label_columns | 0 | PASS |
| learning_components_risk_label_columns | 0 | PASS |
| students_risk_label_columns | 0 | PASS |
| student_identifiers_risk_label_columns | 0 | PASS |
| enrollments_risk_label_columns | 0 | PASS |
| academic_records_risk_label_columns | 0 | PASS |
| attendance_records_risk_label_columns | 0 | PASS |
| assessment_records_risk_label_columns | 0 | PASS |
| chatbot_conversations_risk_label_columns | 0 | PASS |
| chatbot_messages_risk_label_columns | 0 | PASS |

---

## Warnings (review, non-blocking)

None.

---

## Overall Result

**PASS**

---

## Model Training

**No model training was performed.** This task only validates synthetic development data.
