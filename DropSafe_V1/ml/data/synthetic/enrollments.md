# Enrollments Synthetic Dataset

- Students available: 1000
- Academic periods available: 2000
- Enrollments generated: 1000
- Student trajectories stay within one program and use sequential levels when a multi-period trajectory is generated.
- Enrollments are generated only for non-archived programs and levels (PRD §8: archived programs/levels cannot accept enrollments).
- Statuses are synthetic lifecycle values, not verified dropout labels.

## Validation

```text
{'rows': 1000, 'duplicate_ids': 0, 'duplicate_student_period_pairs': 0, 'invalid_student_refs': 0, 'invalid_period_refs': 0, 'student_organization_mismatches': 0, 'period_organization_mismatches': 0, 'invalid_statuses': 0, 'invalid_enrollment_dates': 0, 'invalid_completion_dates': 0, 'completion_before_enrollment': 0, 'enrollment_outside_period': 0, 'enrollments_under_archived_levels': 0, 'enrollments_under_archived_programs': 0, 'validation_passed': True}
```
