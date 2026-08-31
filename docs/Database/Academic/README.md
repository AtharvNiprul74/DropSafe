# DropSafe - Academic Schema

**Version:** 1.0

**Status:** DRAFT

**Depends On**

- 00_Database_Standards.md
- 01_Master_Schema.md
- 09_Data_Architecture.md

---

# Purpose

The Academic Schema stores all academic information related to students.

It represents the academic journey of a student from enrollment through academic performance.

The Academic Schema is the primary source of evidence for the Prediction Engine.

---

# Academic Modules

The Academic Schema contains:

- Learning Programs
- Learning Levels
- Academic Periods
- Learning Components
- Students
- Student Identifiers
- Enrollments
- Academic Records
- Attendance Records
- Assessment Records

---

# Academic Flow
Organization
        │
        ▼
Learning Program
        │
        ▼
Learning Level
        │
        ▼
Academic Period
        │
        ▼
Learning Components

────────────────────────────────

    Student
        │
        ▼
Student Identifiers
        │
        ▼
Enrollment
        │
        ▼
Academic Record
      ┌─┴─────────────┐
      ▼               ▼
Attendance       Assessment

# Business Principles

- Student stores identity only.
- Enrollment stores the academic journey.
- Academic Record stores academic performance.
- Attendance and Assessment provide academic evidence.
- AI reads academic evidence but never modifies it.

---

# Table Order

Implementation order:

1. Learning Programs
2. Learning Levels
3. Academic Periods
4. Learning Components
5. Students
6. Student Identifiers
7. Enrollments
8. Academic Records
9. Attendance Records
10. Assessment Records

---

# Notes

The Academic Schema is intentionally separated from:

- AI Schema
- Counseling Schema
- Import Schema

This keeps business data independent from AI-generated data.

---

End of Document