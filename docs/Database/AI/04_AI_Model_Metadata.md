# Table - ai_model_metadata

**Schema:** AI

**Version:** 1.0

**Status:** DRAFT

---

# Purpose

The `ai_model_metadata` table stores information about AI models used to generate predictions.

It provides versioning, traceability, reproducibility, and governance for the AI engine.

This table does not store predictions.

Instead, it stores information about the models that produced those predictions.

---

# Aggregate Owner

AI Aggregate

---

# Template Type

Master Entity

---

# Business Rules

- Every AI Model has a unique version.
- Only one AI Model Version can be ACTIVE at a time.
- Existing AI Models are never modified after deployment.
- AI Models are archived instead of deleted.
- Predictions always reference the AI Model Version used during prediction generation.

---

# Business Key

```
model_version
```

---

# Table Name

```
ai_model_metadata
```

---

# Columns

| Column | Type | Nullable | Description |
|---------|------|----------|-------------|
| id | UUID v7 | ❌ | Primary Key |
| model_name | VARCHAR(100) | ❌ | AI Model Name |
| model_version | VARCHAR(30) | ❌ | Version Identifier |
| algorithm | VARCHAR(100) | ❌ | Prediction Algorithm |
| feature_version | VARCHAR(30) | ❌ | Feature Engineering Version |
| training_dataset_version | VARCHAR(50) | ✅ | Dataset Version |
| deployed_at | TIMESTAMP | ❌ | Deployment Timestamp |
| status | ENUM | ❌ | ACTIVE, RETIRED |
| created_at | TIMESTAMP | ❌ | Created Timestamp |

---

# Business Constraints

- Model Version must be unique.
- Only one ACTIVE model is allowed.
- RETIRED models remain available for historical reference.
- Predictions always reference the model version used at prediction time.

---

# Database Constraints

## Primary Key

- id

---

## Unique Constraints

```
model_version
```

---

# Indexes

Primary

- id

Search

- model_name
- model_version

Filtering

- status

---

# Relationships

Referenced By

- Predictions

---

# Lifecycle

```
ACTIVE

↓

RETIRED
```

Historical model metadata is never deleted.

---

# Migration Dependencies

## Must Exist Before

None

---

## Required Before

- predictions

---

# Notes

Examples

```
Model Name

DropSafe Risk Predictor
```

```
Model Version

v1.0.0
```

```
Algorithm

Random Forest
```

```
Feature Version

v1.2
```

Future versions may introduce different algorithms without affecting historical predictions.

---

# Design Principles

Feature Engineering

↓

AI Model

↓

Prediction

↓

Counseling

---

End of Document