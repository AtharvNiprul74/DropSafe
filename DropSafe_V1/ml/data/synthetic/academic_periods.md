# Academic Periods Synthetic Dataset

- Learning levels: 2000
- Academic periods generated: 2000
- Rule: one period per learning level; levels 1-4 map to consecutive academic years.
- Period codes include the full program UUID to avoid short-prefix collisions.
- Target/dropout labels: not generated.

## Validation

```text
{'rows': 2000, 'missing_columns': [], 'duplicate_ids': 0, 'duplicate_period_codes': 0, 'invalid_level_refs': 0, 'organization_mismatches': 0, 'invalid_dates': 0, 'invalid_date_ranges': 0, 'invalid_statuses': 0, 'validation_passed': True}
```
