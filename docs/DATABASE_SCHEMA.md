# Database Schema

## Table of Contents

1. organizations
2. roles
3. users
4. departments
5. programs
6. terms
7. courses
8. course_offerings
9. students
10. mentors
11. enrollments
12. attendance
13. assignments
14. assignment_submissions
15. exams
16. marks
17. academic_records
18. prediction_history
19. dropout_risk_factors
20. chatbot_sessions
21. chatbot_messages
22. behaviour_analysis
23. mentor_chat_sessions
24. mentor_chat_messages
25. counseling_sessions
26. student_risk_summary

---

# 1. organizations

## Purpose

The organizations table stores all organizations registered on the DropSafe platform.

Every student, mentor, user, prediction, chatbot session, and counseling session belongs to exactly one organization.

---

## Columns

| Column | Type | Nullable | Default | Description |
|---------|------|----------|----------|-------------|
| organization_id | UUID | No | Generated | Primary Key |
| organization_code | VARCHAR(20) | No | - | Unique organization code |
| organization_name | VARCHAR(150) | No | - | Official organization name |
| organization_type | VARCHAR(50) | No | - | School, College, Institute, etc. |
| email | VARCHAR(255) | No | - | Official email |
| phone | VARCHAR(20) | Yes | NULL | Contact number |
| website | VARCHAR(255) | Yes | NULL | Website |
| address | TEXT | Yes | NULL | Address |
| city | VARCHAR(100) | Yes | NULL | City |
| state | VARCHAR(100) | Yes | NULL | State |
| country | VARCHAR(100) | No | India | Country |
| postal_code | VARCHAR(15) | Yes | NULL | PIN/ZIP Code |
| logo_url | TEXT | Yes | NULL | Organization logo |
| status | VARCHAR(20) | No | ACTIVE | Organization status |
| created_at | TIMESTAMP | No | CURRENT_TIMESTAMP | Creation date |
| updated_at | TIMESTAMP | No | CURRENT_TIMESTAMP | Last update |

---

## Primary Key

- organization_id

---

## Unique Constraints

- organization_code
- email

---

## Foreign Keys

None

---

## Indexes

- organization_code
- organization_name
- organization_type

---

## Relationships

Organization (1)
│
├── Users (N)
├── Students (N)
├── Mentors (N)
├── Departments (N)
├── Programs (N)
├── Terms (N)
├── Courses (N)
├── Prediction History (N)
├── Chatbot Sessions (N)
└── Counseling Sessions (N)

---

## Business Rules

- One organization can have multiple users.
- One organization can have multiple students.
- One organization can have multiple mentors.
- Every student belongs to one organization.
- Every mentor belongs to one organization.
- Organizations cannot be deleted if dependent data exists.

---

## Example Record

| organization_code | organization_name | organization_type | city | status |
|-------------------|-------------------|-------------------|------|--------|
| GPM001 | Government Polytechnic Miraj | COLLEGE | Miraj | ACTIVE |

---

## Future Enhancements

- Subscription Plans
- Billing
- Branding
- API Keys
- SSO

---

# 2. roles

## Purpose

The `roles` table defines the different user roles available in the DropSafe platform.

Roles determine what actions a user is authorized to perform within an organization.

The same role can be assigned to multiple users.

---

## Columns

| Column | Type | Nullable | Default | Description |
|---------|------|----------|----------|-------------|
| role_id | UUID | No | Generated | Primary Key |
| role_name | VARCHAR(50) | No | - | Name of the role |
| role_code | VARCHAR(30) | No | - | Unique system role code |
| description | TEXT | Yes | NULL | Description of the role |
| status | VARCHAR(20) | No | ACTIVE | Role status |
| created_at | TIMESTAMP | No | CURRENT_TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | No | CURRENT_TIMESTAMP | Last updated timestamp |

---

## Primary Key

- role_id

---

## Unique Constraints

- role_name
- role_code

---

## Foreign Keys

None

---

## Indexes

- role_name
- role_code

---

## Relationships

Role (1)
│
└── Users (N)

One role can be assigned to many users.

Each user has exactly one role.

---

## Default Roles (MVP)

| Role Code | Role Name | Description |
|-----------|-----------|-------------|
| SUPER_ADMIN | Super Administrator | Platform owner with complete access |
| ORG_ADMIN | Organization Admin | Manages one organization |
| MENTOR | Mentor | Monitors and counsels assigned students |
| STUDENT | Student | Interacts with chatbot and views own information |

---

## Business Rules

- Every user must have exactly one role.
- A role can be assigned to multiple users.
- Role names must be unique.
- System roles cannot be deleted.
- New roles may be added in future releases.

---

## Example Records

| role_code | role_name | status |
|-----------|-----------|--------|
| SUPER_ADMIN | Super Administrator | ACTIVE |
| ORG_ADMIN | Organization Admin | ACTIVE |
| MENTOR | Mentor | ACTIVE |
| STUDENT | Student | ACTIVE |

---

## Future Enhancements

- Custom roles
- Permission groups
- Fine-grained access control (RBAC)
- Feature-based permissions
- Organization-specific custom roles


# 3. users

## Purpose

The `users` table stores the login and identity information for all users of the DropSafe platform.

Every person who accesses the system must have a user account.

A user belongs to exactly one organization and is assigned exactly one role.

This table is responsible only for authentication and identity. Academic information is stored in separate tables such as `students` and `mentors`.

---

## Columns

| Column | Type | Nullable | Default | Description |
|---------|------|----------|----------|-------------|
| user_id | UUID | No | Generated | Primary Key |
| organization_id | UUID | No | - | Organization to which the user belongs |
| role_id | UUID | No | - | User role |
| first_name | VARCHAR(100) | No | - | First name |
| last_name | VARCHAR(100) | Yes | NULL | Last name |
| email | VARCHAR(255) | No | - | Login email |
| phone | VARCHAR(20) | Yes | NULL | Mobile number |
| password_hash | TEXT | No | - | Encrypted password |
| profile_photo_url | TEXT | Yes | NULL | Profile image |
| last_login | TIMESTAMP | Yes | NULL | Last successful login |
| email_verified | BOOLEAN | No | FALSE | Email verification status |
| account_status | VARCHAR(20) | No | ACTIVE | Account status |
| created_at | TIMESTAMP | No | CURRENT_TIMESTAMP | Account creation time |
| updated_at | TIMESTAMP | No | CURRENT_TIMESTAMP | Last update time |

---

## Primary Key

- user_id

---

## Foreign Keys

| Column | References |
|---------|------------|
| organization_id | organizations.organization_id |
| role_id | roles.role_id |

---

## Unique Constraints

- email

---

## Indexes

- organization_id
- role_id
- email
- account_status

---

## Relationships

organizations (1)
│
└── users (N)

roles (1)
│
└── users (N)

users (1)
│
├── students (0..1)
└── mentors (0..1)

A user can represent either:
- Student
- Mentor
- Organization Admin
- Super Admin

---

## Business Rules

- Every user belongs to one organization.
- Every user has exactly one role.
- Email addresses must be unique.
- Passwords must never be stored in plain text.
- Passwords must be stored using a secure hashing algorithm (e.g., Argon2 or bcrypt).
- Disabled users cannot log in.
- Suspended users cannot access the system.

---

## Account Status Values

| Value | Description |
|--------|-------------|
| ACTIVE | User can log in |
| INACTIVE | User account is inactive |
| SUSPENDED | User access is blocked |

---

## Example Record

| Field | Value |
|-------|-------|
| first_name | Saklen |
| last_name | Manjire |
| email | saklen@example.com |
| role | STUDENT |
| organization | Government Polytechnic Miraj |
| account_status | ACTIVE |

---

## Security Notes

- Passwords are never returned by APIs.
- Password hashes are stored using Argon2 (preferred) or bcrypt.
- JWT authentication will be used.
- Refresh Tokens will be implemented.
- Audit logging will be added in a future release.

---

## Future Enhancements

- Multi-factor authentication (MFA)
- Social login
- Single Sign-On (SSO)
- Password history
- Account lockout after repeated failed login attempts
- Device/session management


# 4. departments

## Purpose

The `departments` table stores the academic departments within an organization.

Each department belongs to exactly one organization and can offer multiple academic programs, courses, mentors, and students.

This table helps organize academic data and enables department-level reporting and analytics.

---

## Columns

| Column | Type | Nullable | Default | Description |
|---------|------|----------|----------|-------------|
| department_id | UUID | No | Generated | Primary Key |
| organization_id | UUID | No | - | Organization that owns the department |
| department_code | VARCHAR(20) | No | - | Unique department code within the organization |
| department_name | VARCHAR(100) | No | - | Department name |
| description | TEXT | Yes | NULL | Department description |
| status | VARCHAR(20) | No | ACTIVE | Department status |
| created_at | TIMESTAMP | No | CURRENT_TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | No | CURRENT_TIMESTAMP | Last updated timestamp |

---

## Primary Key

- department_id

---

## Foreign Keys

| Column | References |
|---------|------------|
| organization_id | organizations.organization_id |

---

## Unique Constraints

- (organization_id, department_code)
- (organization_id, department_name)

> This allows different organizations to have the same department name (e.g., "Computer Science"), while ensuring uniqueness within each organization.

---

## Indexes

- organization_id
- department_code
- department_name
- status

---

## Relationships

organizations (1)
│
└── departments (N)

departments (1)
│
├── programs (N)
├── courses (N)
├── mentors (N)
└── students (N)

---

## Business Rules

- Every department belongs to exactly one organization.
- A department cannot exist without an organization.
- Department codes must be unique within an organization.
- Department names must be unique within an organization.
- Inactive departments cannot accept new students or programs.
- Departments should not be physically deleted if dependent records exist.

---

## Department Status Values

| Value | Description |
|--------|-------------|
| ACTIVE | Department is operational |
| INACTIVE | Department is inactive |

---

## Example Record

| Field | Value |
|-------|-------|
| department_code | AIML |
| department_name | Artificial Intelligence & Machine Learning |
| organization | Government Polytechnic Miraj |
| status | ACTIVE |

---

## Future Enhancements

- Department Head (HOD)
- Department logo
- Department contact information
- Budget allocation
- Faculty statistics
- Department-specific dashboards

# 5. programs

## Purpose

The `programs` table stores the academic programs offered by departments within an organization.

Each program belongs to exactly one department and one organization. Students enroll in programs, and courses are associated with programs.

This table defines the academic structure that students follow throughout their education.

---

## Columns

| Column | Type | Nullable | Default | Description |
|---------|------|----------|----------|-------------|
| program_id | UUID | No | Generated | Primary Key |
| organization_id | UUID | No | - | Organization offering the program |
| department_id | UUID | No | - | Department offering the program |
| program_code | VARCHAR(20) | No | - | Unique program code |
| program_name | VARCHAR(150) | No | - | Official program name |
| degree_type | VARCHAR(50) | No | - | Degree or certification type |
| duration_years | INTEGER | No | - | Program duration in years |
| total_semesters | INTEGER | No | - | Total number of semesters |
| description | TEXT | Yes | NULL | Program description |
| status | VARCHAR(20) | No | ACTIVE | Program status |
| created_at | TIMESTAMP | No | CURRENT_TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | No | CURRENT_TIMESTAMP | Last updated timestamp |

---

## Primary Key

- program_id

---

## Foreign Keys

| Column | References |
|---------|------------|
| organization_id | organizations.organization_id |
| department_id | departments.department_id |

---

## Unique Constraints

- (organization_id, program_code)
- (department_id, program_name)

---

## Indexes

- organization_id
- department_id
- program_code
- program_name
- status

---

## Relationships

organizations (1)
│
└── programs (N)

departments (1)
│
└── programs (N)

programs (1)
│
├── students (N)
├── courses (N)
└── terms (N)

---

## Business Rules

- Every program belongs to one organization.
- Every program belongs to one department.
- A department can offer multiple programs.
- Students can enroll in only one program at a time.
- Program codes must be unique within an organization.
- Inactive programs cannot accept new student admissions.
- Programs should not be deleted if students or courses are associated with them.

---

## Degree Types

| Value |
|--------|
| DIPLOMA |
| BACHELOR |
| MASTER |
| DOCTORATE |
| CERTIFICATE |
| TRAINING |

---

## Program Status

| Value | Description |
|--------|-------------|
| ACTIVE | Program is currently offered |
| INACTIVE | Program is no longer active |

---

## Example Record

| Field | Value |
|-------|-------|
| program_code | BTECH-AIML |
| program_name | Bachelor of Technology in Artificial Intelligence & Machine Learning |
| degree_type | BACHELOR |
| duration_years | 4 |
| total_semesters | 8 |
| status | ACTIVE |

---

## Future Enhancements

- Program coordinator
- Accreditation details
- Curriculum versioning
- Credit system
- Elective groups
- Outcome-based education (OBE) support


# 6. terms

## Purpose

The `terms` table defines the academic periods within a program.

A term represents a semester, trimester, quarter, or academic year during which students attend classes, complete assignments, take exams, and receive grades.

Every academic activity in DropSafe is associated with a specific term.

---

## Columns

| Column | Type | Nullable | Default | Description |
|---------|------|----------|----------|-------------|
| term_id | UUID | No | Generated | Primary Key |
| organization_id | UUID | No | - | Organization offering the term |
| program_id | UUID | No | - | Program to which the term belongs |
| term_number | INTEGER | No | - | Sequential term number (1,2,3...) |
| term_name | VARCHAR(100) | No | - | Display name (Semester 1, Semester 2, etc.) |
| academic_year | VARCHAR(20) | No | - | Academic year (2026-2027) |
| start_date | DATE | No | - | Term start date |
| end_date | DATE | No | - | Term end date |
| status | VARCHAR(20) | No | UPCOMING | Current term status |
| created_at | TIMESTAMP | No | CURRENT_TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | No | CURRENT_TIMESTAMP | Last updated timestamp |

---

## Primary Key

- term_id

---

## Foreign Keys

| Column | References |
|---------|------------|
| organization_id | organizations.organization_id |
| program_id | programs.program_id |

---

## Unique Constraints

- (program_id, term_number)
- (program_id, academic_year, term_name)

---

## Indexes

- organization_id
- program_id
- academic_year
- status

---

## Relationships

organizations (1)
│
└── terms (N)

programs (1)
│
└── terms (N)

terms (1)
│
├── course_offerings (N)
├── enrollments (N)
├── attendance (N)
├── assignments (N)
├── exams (N)
├── marks (N)
├── academic_records (N)
└── prediction_history (N)

---

## Business Rules

- Every term belongs to exactly one organization.
- Every term belongs to exactly one program.
- Term numbers must be unique within a program.
- A program can have multiple terms.
- Start date must be before end date.
- Only one term should have ACTIVE status for a program at a time.
- Completed terms become read-only except for authorized administrators.

---

## Status Values

| Value | Description |
|--------|-------------|
| UPCOMING | Term has not started |
| ACTIVE | Currently running |
| COMPLETED | Finished |
| CANCELLED | Cancelled |

---

## Example Record

| Field | Value |
|-------|-------|
| term_number | 5 |
| term_name | Semester 5 |
| academic_year | 2026-2027 |
| start_date | 2026-07-15 |
| end_date | 2026-11-30 |
| status | ACTIVE |

---

## Future Enhancements

- Holiday calendar
- Examination schedule
- Result publication date
- Registration deadline
- Attendance freeze date
- Academic calendar integration

# 7. courses

## Purpose

The `courses` table stores the master list of all academic courses available within an organization.

A course represents a subject such as Data Structures, Machine Learning, Mathematics, or Artificial Intelligence.

The course itself is independent of any specific program, term, or academic year. Those associations are managed through the `course_offerings` table.

---

## Columns

| Column | Type | Nullable | Default | Description |
|---------|------|----------|----------|-------------|
| course_id | UUID | No | Generated | Primary Key |
| organization_id | UUID | No | - | Organization that owns the course |
| department_id | UUID | No | - | Department responsible for the course |
| course_code | VARCHAR(20) | No | - | Unique course code |
| course_name | VARCHAR(150) | No | - | Official course name |
| credits | INTEGER | No | 0 | Credit value |
| course_type | VARCHAR(30) | No | THEORY | Theory, Practical, Lab, Project |
| description | TEXT | Yes | NULL | Course description |
| status | VARCHAR(20) | No | ACTIVE | Course status |
| created_at | TIMESTAMP | No | CURRENT_TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | No | CURRENT_TIMESTAMP | Last updated timestamp |

---

## Primary Key

- course_id

---

## Foreign Keys

| Column | References |
|---------|------------|
| organization_id | organizations.organization_id |
| department_id | departments.department_id |

---

## Unique Constraints

- (organization_id, course_code)

---

## Indexes

- organization_id
- department_id
- course_code
- course_name
- status

---

## Relationships

organizations (1)
│
└── courses (N)

departments (1)
│
└── courses (N)

courses (1)
│
└── course_offerings (N)

One course can be offered multiple times across different programs, terms, and academic years.

---

## Business Rules

- Every course belongs to one organization.
- Every course belongs to one department.
- Course codes must be unique within an organization.
- A course may be offered in multiple programs.
- A course may be offered in multiple academic terms.
- Courses should not be duplicated for different semesters.
- Courses should not be physically deleted if historical records exist.

---

## Course Types

| Value | Description |
|--------|-------------|
| THEORY | Classroom subject |
| PRACTICAL | Practical session |
| LAB | Laboratory course |
| PROJECT | Project work |
| INTERNSHIP | Internship course |

---

## Status Values

| Value | Description |
|--------|-------------|
| ACTIVE | Available for offering |
| INACTIVE | Not currently offered |

---

## Example Record

| Field | Value |
|-------|-------|
| course_code | AIML301 |
| course_name | Machine Learning |
| credits | 4 |
| course_type | THEORY |
| status | ACTIVE |

---

## Future Enhancements

- Course syllabus
- Learning outcomes
- Bloom's taxonomy mapping
- Prerequisite courses
- Recommended references
- CO/PO attainment

# 8. course_offerings

## Purpose

The `course_offerings` table represents a specific instance of a course being offered during a particular academic term.

It connects a course with a program, term, and mentor. All academic activities such as enrollments, attendance, assignments, exams, and marks reference a course offering instead of the master course.

This design prevents data duplication and follows database normalization principles.

---

## Columns

| Column | Type | Nullable | Default | Description |
|---------|------|----------|----------|-------------|
| offering_id | UUID | No | Generated | Primary Key |
| organization_id | UUID | No | - | Organization offering the course |
| program_id | UUID | No | - | Academic program |
| term_id | UUID | No | - | Academic term |
| course_id | UUID | No | - | Course being offered |
| mentor_id | UUID | Yes | NULL | Assigned mentor |
| section | VARCHAR(20) | Yes | NULL | Section (A, B, C...) |
| academic_year | VARCHAR(20) | No | - | Academic year |
| max_students | INTEGER | Yes | NULL | Maximum enrollment capacity |
| status | VARCHAR(20) | No | ACTIVE | Offering status |
| created_at | TIMESTAMP | No | CURRENT_TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | No | CURRENT_TIMESTAMP | Last updated timestamp |

---

## Primary Key

- offering_id

---

## Foreign Keys

| Column | References |
|---------|------------|
| organization_id | organizations.organization_id |
| program_id | programs.program_id |
| term_id | terms.term_id |
| course_id | courses.course_id |
| mentor_id | mentors.mentor_id |

---

## Unique Constraints

- (program_id, term_id, course_id, section)

This prevents duplicate offerings of the same course in the same program, term, and section.

---

## Indexes

- organization_id
- program_id
- term_id
- course_id
- mentor_id
- academic_year
- status

---

## Relationships

organizations (1)
│
└── course_offerings (N)

programs (1)
│
└── course_offerings (N)

terms (1)
│
└── course_offerings (N)

courses (1)
│
└── course_offerings (N)

mentors (1)
│
└── course_offerings (N)

course_offerings (1)
│
├── enrollments (N)
├── attendance (N)
├── assignments (N)
├── exams (N)
└── marks (N)

---

## Business Rules

- Every offering belongs to one organization.
- Every offering belongs to one program.
- Every offering belongs to one term.
- Every offering references one course.
- A mentor may teach multiple course offerings.
- A course may be offered multiple times across different terms.
- A course may be offered in multiple programs.
- Section is optional.
- Historical offerings must never be deleted.

---

## Status Values

| Value | Description |
|--------|-------------|
| ACTIVE | Currently running |
| COMPLETED | Finished |
| CANCELLED | Cancelled |

---

## Example Record

| Field | Value |
|-------|-------|
| course | Machine Learning |
| program | B.Tech AIML |
| term | Semester 5 |
| mentor | Dr. Amit Patil |
| section | A |
| academic_year | 2026-2027 |
| status | ACTIVE |

---

## Future Enhancements

- Weekly timetable
- Classroom allocation
- Teaching assistant
- Online meeting link
- LMS integration
- Attendance policy
- Credit completion tracking


# 9. students

## Purpose

The `students` table stores the academic profile of every student enrolled in an organization.

A student is linked to a user account for authentication and is associated with an organization, department, program, and mentor.

This table serves as the central entity for academic records, AI predictions, chatbot interactions, counseling sessions, and analytics.

---

## Columns

| Column | Type | Nullable | Default | Description |
|---------|------|----------|----------|-------------|
| student_id | UUID | No | Generated | Primary Key |
| user_id | UUID | No | - | User account associated with the student |
| organization_id | UUID | No | - | Organization where the student is enrolled |
| department_id | UUID | No | - | Student's department |
| program_id | UUID | No | - | Student's academic program |
| mentor_id | UUID | Yes | NULL | Assigned mentor |
| roll_number | VARCHAR(30) | No | - | Official roll number |
| registration_number | VARCHAR(50) | Yes | NULL | University registration number |
| admission_date | DATE | No | - | Date of admission |
| current_term | INTEGER | No | 1 | Current semester/term number |
| current_cgpa | DECIMAL(3,2) | Yes | NULL | Latest CGPA |
| status | VARCHAR(20) | No | ACTIVE | Student status |
| graduation_date | DATE | Yes | NULL | Graduation or completion date |
| created_at | TIMESTAMP | No | CURRENT_TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | No | CURRENT_TIMESTAMP | Last updated timestamp |

---

## Primary Key

- student_id

---

## Foreign Keys

| Column | References |
|---------|------------|
| user_id | users.user_id |
| organization_id | organizations.organization_id |
| department_id | departments.department_id |
| program_id | programs.program_id |
| mentor_id | mentors.mentor_id |

---

## Unique Constraints

- (organization_id, roll_number)
- (organization_id, registration_number)
- user_id

---

## Indexes

- organization_id
- department_id
- program_id
- mentor_id
- roll_number
- status

---

## Relationships

organizations (1)
│
└── students (N)

users (1)
│
└── students (1)

departments (1)
│
└── students (N)

programs (1)
│
└── students (N)

mentors (1)
│
└── students (N)

students (1)
│
├── enrollments (N)
├── attendance (N)
├── assignment_submissions (N)
├── marks (N)
├── academic_records (N)
├── prediction_history (N)
├── chatbot_sessions (N)
├── behaviour_analysis (N)
├── counseling_sessions (N)
└── student_risk_summary (1)

---

## Business Rules

- Every student must have one user account.
- Every student belongs to one organization.
- Every student belongs to one department.
- Every student belongs to one academic program.
- A student can have one assigned mentor.
- Roll numbers must be unique within an organization.
- A student cannot be deleted if academic records exist.
- A student's organization cannot be changed after admission without an official transfer process.

---

## Student Status

| Value | Description |
|--------|-------------|
| ACTIVE | Currently studying |
| GRADUATED | Successfully completed the program |
| DROPPED | Left the program |
| SUSPENDED | Temporarily suspended |
| TRANSFERRED | Moved to another institution |

---

## Example Record

| Field | Value |
|-------|-------|
| roll_number | AIML22045 |
| registration_number | BATU202622045 |
| program | B.Tech AIML |
| current_term | 5 |
| current_cgpa | 8.12 |
| mentor | Dr. Amit Patil |
| status | ACTIVE |

---

## Future Enhancements

- Parent/Guardian information
- Emergency contacts
- Scholarship details
- Hostel information
- Placement status
- Resume/Profile
- Aadhaar or Student ID integration
- Profile completion percentage

# 10. mentors

## Purpose

The `mentors` table stores mentor profiles within an organization.

A mentor is responsible for monitoring students, reviewing AI-generated risk predictions, conducting counseling sessions, and managing academic interventions.

Each mentor has a corresponding user account for authentication.

---

## Columns

| Column | Type | Nullable | Default | Description |
|---------|------|----------|----------|-------------|
| mentor_id | UUID | No | Generated | Primary Key |
| user_id | UUID | No | - | Associated user account |
| organization_id | UUID | No | - | Organization |
| department_id | UUID | No | - | Department |
| employee_code | VARCHAR(30) | No | - | Employee identifier |
| designation | VARCHAR(100) | Yes | NULL | Professor, Counselor, Trainer, etc. |
| joining_date | DATE | Yes | NULL | Date of joining |
| specialization | VARCHAR(150) | Yes | NULL | Area of specialization |
| office_phone | VARCHAR(20) | Yes | NULL | Office contact number |
| office_location | VARCHAR(100) | Yes | NULL | Office or cabin location |
| status | VARCHAR(20) | No | ACTIVE | Mentor status |
| created_at | TIMESTAMP | No | CURRENT_TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | No | CURRENT_TIMESTAMP | Last updated timestamp |

---

## Primary Key

- mentor_id

---

## Foreign Keys

| Column | References |
|---------|------------|
| user_id | users.user_id |
| organization_id | organizations.organization_id |
| department_id | departments.department_id |

---

## Unique Constraints

- user_id
- (organization_id, employee_code)

---

## Indexes

- organization_id
- department_id
- employee_code
- status

---

## Relationships

organizations (1)
│
└── mentors (N)

users (1)
│
└── mentors (1)

departments (1)
│
└── mentors (N)

mentors (1)
│
├── students (N)
├── course_offerings (N)
├── mentor_chat_sessions (N)
├── mentor_chat_messages (N)
└── counseling_sessions (N)

---

## Business Rules

- Every mentor must have one user account.
- Every mentor belongs to one organization.
- Every mentor belongs to one department.
- A mentor can guide multiple students.
- A mentor can manage multiple course offerings.
- Employee codes must be unique within an organization.
- Inactive mentors cannot be assigned new students or course offerings.
- Historical mentor records must not be deleted.

---

## Mentor Status

| Value | Description |
|--------|-------------|
| ACTIVE | Currently working |
| INACTIVE | Not currently active |
| SUSPENDED | Access suspended |

---

## Example Record

| Field | Value |
|-------|-------|
| employee_code | EMP1023 |
| designation | Assistant Professor |
| specialization | Artificial Intelligence |
| department | AIML |
| status | ACTIVE |

---

## Future Enhancements

- Mentor workload tracking
- Office hours
- Calendar integration
- Performance analytics
- Certifications
- Research interests
- Availability scheduling
- Student feedback

# 11. enrollments

## Purpose

The `enrollments` table records the registration of students in specific course offerings.

An enrollment represents a student's participation in a course during a particular academic term. It serves as the foundation for attendance, assignments, examinations, marks, and academic performance tracking.

---

## Columns

| Column | Type | Nullable | Default | Description |
|---------|------|----------|----------|-------------|
| enrollment_id | UUID | No | Generated | Primary Key |
| organization_id | UUID | No | - | Organization |
| student_id | UUID | No | - | Enrolled student |
| offering_id | UUID | No | - | Course offering |
| enrollment_date | DATE | No | CURRENT_DATE | Date of enrollment |
| enrollment_status | VARCHAR(20) | No | ENROLLED | Enrollment status |
| final_grade | VARCHAR(5) | Yes | NULL | Final letter grade |
| final_percentage | DECIMAL(5,2) | Yes | NULL | Final percentage |
| remarks | TEXT | Yes | NULL | Additional notes |
| created_at | TIMESTAMP | No | CURRENT_TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | No | CURRENT_TIMESTAMP | Last updated timestamp |

---

## Primary Key

- enrollment_id

---

## Foreign Keys

| Column | References |
|---------|------------|
| organization_id | organizations.organization_id |
| student_id | students.student_id |
| offering_id | course_offerings.offering_id |

---

## Unique Constraints

- (student_id, offering_id)

A student cannot enroll in the same course offering more than once.

---

## Indexes

- organization_id
- student_id
- offering_id
- enrollment_status

---

## Relationships

students (1)
│
└── enrollments (N)

course_offerings (1)
│
└── enrollments (N)

enrollments (1)
│
├── attendance (N)
├── assignment_submissions (N)
├── marks (N)
└── academic_records (N)

---

## Business Rules

- Every enrollment belongs to one student.
- Every enrollment belongs to one course offering.
- A student may enroll in multiple course offerings.
- A course offering may have multiple enrolled students.
- Duplicate enrollments are not allowed.
- Withdrawn enrollments remain in the database for historical records.
- Attendance, assignments, and marks should reference the enrollment record.

---

## Enrollment Status

| Value | Description |
|--------|-------------|
| ENROLLED | Student is actively enrolled |
| COMPLETED | Course completed |
| WITHDRAWN | Student withdrew |
| FAILED | Student failed the course |

---

## Example Record

| Field | Value |
|-------|-------|
| student | AIML22045 |
| course | Machine Learning |
| term | Semester 5 |
| enrollment_status | ENROLLED |
| enrollment_date | 2026-07-20 |

---

## Future Enhancements

- Waitlist support
- Credit transfer
- Audit enrollment
- Repeat course tracking
- Enrollment approval workflow
- Batch enrollment import

# 12. attendance

## Purpose

The `attendance` table stores daily attendance records for students enrolled in course offerings.

Each attendance record belongs to a specific enrollment and represents the student's attendance status for a particular class session.

This table is used for attendance reports, eligibility calculations, and AI-based dropout prediction.

---

## Columns

| Column | Type | Nullable | Default | Description |
|---------|------|----------|----------|-------------|
| attendance_id | UUID | No | Generated | Primary Key |
| organization_id | UUID | No | - | Organization |
| enrollment_id | UUID | No | - | Student enrollment |
| attendance_date | DATE | No | - | Class date |
| attendance_status | VARCHAR(20) | No | PRESENT | Attendance status |
| remarks | TEXT | Yes | NULL | Additional remarks |
| recorded_by | UUID | Yes | NULL | User who recorded attendance |
| created_at | TIMESTAMP | No | CURRENT_TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | No | CURRENT_TIMESTAMP | Last updated timestamp |

---

## Primary Key

- attendance_id

---

## Foreign Keys

| Column | References |
|---------|------------|
| organization_id | organizations.organization_id |
| enrollment_id | enrollments.enrollment_id |
| recorded_by | users.user_id |

---

## Unique Constraints

- (enrollment_id, attendance_date)

A student can have only one attendance record per enrolled course per day.

---

## Indexes

- organization_id
- enrollment_id
- attendance_date
- attendance_status

---

## Relationships

organizations (1)
│
└── attendance (N)

enrollments (1)
│
└── attendance (N)

users (1)
│
└── attendance (N)

---

## Business Rules

- Every attendance record belongs to one enrollment.
- Attendance is recorded once per class session.
- Duplicate attendance records for the same enrollment and date are not allowed.
- Attendance records should never be physically deleted.
- Corrections should update the existing record instead of creating a new one.

---

## Attendance Status

| Value | Description |
|--------|-------------|
| PRESENT | Student attended the class |
| ABSENT | Student was absent |
| LATE | Student arrived late |
| EXCUSED | Approved absence |

---

## Example Record

| Field | Value |
|-------|-------|
| enrollment | Machine Learning - Semester 5 |
| attendance_date | 2026-08-10 |
| attendance_status | PRESENT |
| recorded_by | Mentor |

---

## AI Usage

The attendance table contributes to the following AI features:

- Attendance percentage calculation
- Consecutive absence detection
- Long-term attendance trend analysis
- Early dropout risk identification
- Student engagement analysis

---

## Future Enhancements

- QR code attendance
- RFID attendance
- Face recognition attendance
- GPS-based attendance
- Biometric attendance integration
- Automatic attendance sync from LMS


# 13. assignments

## Purpose

The `assignments` table stores assignment details created for a specific course offering.

Each assignment belongs to one course offering and is created by a mentor. Students enrolled in that course submit their work through the `assignment_submissions` table.

Assignments are used for continuous assessment, academic performance evaluation, and AI-based dropout prediction.

---

## Columns

| Column | Type | Nullable | Default | Description |
|---------|------|----------|----------|-------------|
| assignment_id | UUID | No | Generated | Primary Key |
| organization_id | UUID | No | - | Organization |
| offering_id | UUID | No | - | Course offering |
| created_by | UUID | No | - | Mentor who created the assignment |
| title | VARCHAR(200) | No | - | Assignment title |
| description | TEXT | Yes | NULL | Assignment description |
| total_marks | DECIMAL(5,2) | No | - | Maximum marks |
| due_date | TIMESTAMP | No | - | Submission deadline |
| allow_late_submission | BOOLEAN | No | FALSE | Whether late submissions are allowed |
| status | VARCHAR(20) | No | DRAFT | Assignment status |
| created_at | TIMESTAMP | No | CURRENT_TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | No | CURRENT_TIMESTAMP | Last updated timestamp |

---

## Primary Key

- assignment_id

---

## Foreign Keys

| Column | References |
|---------|------------|
| organization_id | organizations.organization_id |
| offering_id | course_offerings.offering_id |
| created_by | mentors.mentor_id |

---

## Indexes

- organization_id
- offering_id
- due_date
- status

---

## Relationships

organizations (1)
│
└── assignments (N)

course_offerings (1)
│
└── assignments (N)

mentors (1)
│
└── assignments (N)

assignments (1)
│
└── assignment_submissions (N)

---

## Business Rules

- Every assignment belongs to one course offering.
- Every assignment is created by one mentor.
- Multiple assignments can exist for one course offering.
- Assignments cannot be modified after grading has started unless authorized.
- Assignments should never be physically deleted.

---

## Assignment Status

| Value | Description |
|--------|-------------|
| DRAFT | Being prepared |
| PUBLISHED | Available to students |
| CLOSED | Submission closed |
| ARCHIVED | Archived |

---

## Example Record

| Field | Value |
|-------|-------|
| title | Machine Learning Assignment 1 |
| total_marks | 20 |
| due_date | 2026-08-25 23:59 |
| allow_late_submission | FALSE |
| status | PUBLISHED |

---

## AI Usage

The assignment table contributes to:

- Assignment completion rate
- Continuous assessment tracking
- Student engagement analysis
- Academic workload monitoring

---

## Future Enhancements

- File attachments
- Rubrics
- Group assignments
- Plagiarism detection
- LMS integration
- Auto-grading
- AI-generated assignments


# 14. assignment_submissions

## Purpose

The `assignment_submissions` table stores each student's submission for an assignment.

Every submission belongs to exactly one assignment and one enrollment. It records submission details, grading, mentor feedback, and contributes to academic performance analysis and AI-based dropout prediction.

---

## Columns

| Column | Type | Nullable | Default | Description |
|---------|------|----------|----------|-------------|
| submission_id | UUID | No | Generated | Primary Key |
| organization_id | UUID | No | - | Organization |
| assignment_id | UUID | No | - | Assignment |
| enrollment_id | UUID | No | - | Student enrollment |
| submitted_at | TIMESTAMP | Yes | NULL | Submission timestamp |
| submission_url | TEXT | Yes | NULL | File or submission link |
| obtained_marks | DECIMAL(5,2) | Yes | NULL | Marks awarded |
| feedback | TEXT | Yes | NULL | Mentor feedback |
| graded_by | UUID | Yes | NULL | Mentor who graded |
| graded_at | TIMESTAMP | Yes | NULL | Grading timestamp |
| submission_status | VARCHAR(20) | No | PENDING | Current submission status |
| created_at | TIMESTAMP | No | CURRENT_TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | No | CURRENT_TIMESTAMP | Last updated timestamp |

---

## Primary Key

- submission_id

---

## Foreign Keys

| Column | References |
|---------|------------|
| organization_id | organizations.organization_id |
| assignment_id | assignments.assignment_id |
| enrollment_id | enrollments.enrollment_id |
| graded_by | mentors.mentor_id |

---

## Unique Constraints

- (assignment_id, enrollment_id)

A student can submit only one submission for an assignment.

---

## Indexes

- organization_id
- assignment_id
- enrollment_id
- submission_status
- graded_by

---

## Relationships

organizations (1)
│
└── assignment_submissions (N)

assignments (1)
│
└── assignment_submissions (N)

enrollments (1)
│
└── assignment_submissions (N)

mentors (1)
│
└── assignment_submissions (N)

---

## Business Rules

- Every submission belongs to one assignment.
- Every submission belongs to one enrollment.
- A student can submit only once per assignment (MVP).
- A submission may remain ungraded.
- Grades can only be entered after submission.
- Missing submissions remain in the database for analytics.
- Submission history should never be deleted.

---

## Submission Status

| Value | Description |
|--------|-------------|
| PENDING | Awaiting submission |
| SUBMITTED | Submitted before deadline |
| LATE | Submitted after deadline |
| MISSING | Not submitted |
| GRADED | Submission evaluated |

---

## Example Record

| Field | Value |
|-------|-------|
| assignment | Machine Learning Assignment 1 |
| student | AIML22045 |
| submitted_at | 2026-08-22 18:35 |
| obtained_marks | 18 |
| submission_status | GRADED |

---

## AI Usage

The assignment submission table contributes to:

- Assignment completion rate
- Late submission frequency
- Missing assignment detection
- Academic engagement score
- Continuous assessment performance
- Early dropout prediction

---

## Future Enhancements

- Multiple submission attempts
- Version history
- File upload support
- Plagiarism reports
- AI-assisted grading
- Rubric-based evaluation
- Peer review

# 15. exams

## Purpose

The `exams` table stores information about examinations conducted for a specific course offering.

Each exam belongs to one course offering and defines the assessment details such as exam type, schedule, total marks, and passing criteria.

Student marks are stored separately in the `marks` table.

---

## Columns

| Column | Type | Nullable | Default | Description |
|---------|------|----------|----------|-------------|
| exam_id | UUID | No | Generated | Primary Key |
| organization_id | UUID | No | - | Organization |
| offering_id | UUID | No | - | Course offering |
| created_by | UUID | No | - | Mentor who created the exam |
| exam_name | VARCHAR(150) | No | - | Exam title |
| exam_type | VARCHAR(30) | No | - | Midterm, Final, Quiz, etc. |
| exam_date | DATE | No | - | Scheduled exam date |
| total_marks | DECIMAL(5,2) | No | - | Maximum marks |
| passing_marks | DECIMAL(5,2) | No | - | Minimum passing marks |
| duration_minutes | INTEGER | Yes | NULL | Exam duration |
| status | VARCHAR(20) | No | SCHEDULED | Exam status |
| created_at | TIMESTAMP | No | CURRENT_TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | No | CURRENT_TIMESTAMP | Last updated timestamp |

---

## Primary Key

- exam_id

---

## Foreign Keys

| Column | References |
|---------|------------|
| organization_id | organizations.organization_id |
| offering_id | course_offerings.offering_id |
| created_by | mentors.mentor_id |

---

## Indexes

- organization_id
- offering_id
- exam_type
- exam_date
- status

---

## Relationships

organizations (1)
│
└── exams (N)

course_offerings (1)
│
└── exams (N)

mentors (1)
│
└── exams (N)

exams (1)
│
└── marks (N)

---

## Business Rules

- Every exam belongs to one course offering.
- Every exam is created by one mentor.
- A course offering can have multiple exams.
- Exam dates cannot be modified after marks have been published.
- Exams should never be physically deleted.

---

## Exam Types

| Value | Description |
|--------|-------------|
| QUIZ | Short assessment |
| MIDTERM | Mid-semester exam |
| FINAL | End-semester exam |
| PRACTICAL | Practical examination |
| VIVA | Oral examination |
| PROJECT | Project evaluation |

---

## Exam Status

| Value | Description |
|--------|-------------|
| DRAFT | Being prepared |
| SCHEDULED | Scheduled |
| COMPLETED | Finished |
| CANCELLED | Cancelled |

---

## Example Record

| Field | Value |
|-------|-------|
| exam_name | Mid Semester Examination |
| exam_type | MIDTERM |
| exam_date | 2026-09-12 |
| total_marks | 30 |
| passing_marks | 12 |
| duration_minutes | 90 |
| status | SCHEDULED |

---

## AI Usage

The exams table contributes to:

- Assessment schedule tracking
- Academic workload analysis
- Performance timeline generation

---

## Future Enhancements

- Online exam integration
- Question paper management
- Invigilator assignment
- Seating arrangement
- Automatic result publication
- AI-based proctoring

# 16. marks

## Purpose

The `marks` table stores the marks obtained by students in examinations.

Each mark record belongs to one exam and one student enrollment. It records the obtained marks, percentage, grade, pass/fail status, and contributes to academic performance analysis and AI-based dropout prediction.

---

## Columns

| Column | Type | Nullable | Default | Description |
|---------|------|----------|----------|-------------|
| mark_id | UUID | No | Generated | Primary Key |
| organization_id | UUID | No | - | Organization |
| exam_id | UUID | No | - | Examination |
| enrollment_id | UUID | No | - | Student enrollment |
| obtained_marks | DECIMAL(5,2) | No | - | Marks obtained |
| percentage | DECIMAL(5,2) | Yes | NULL | Calculated percentage |
| grade | VARCHAR(5) | Yes | NULL | Letter grade |
| result_status | VARCHAR(20) | No | PENDING | Result status |
| remarks | TEXT | Yes | NULL | Evaluator remarks |
| evaluated_by | UUID | Yes | NULL | Mentor who evaluated |
| evaluated_at | TIMESTAMP | Yes | NULL | Evaluation timestamp |
| created_at | TIMESTAMP | No | CURRENT_TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | No | CURRENT_TIMESTAMP | Last updated timestamp |

---

## Primary Key

- mark_id

---

## Foreign Keys

| Column | References |
|---------|------------|
| organization_id | organizations.organization_id |
| exam_id | exams.exam_id |
| enrollment_id | enrollments.enrollment_id |
| evaluated_by | mentors.mentor_id |

---

## Unique Constraints

- (exam_id, enrollment_id)

A student can have only one mark record for a particular exam.

---

## Indexes

- organization_id
- exam_id
- enrollment_id
- result_status

---

## Relationships

organizations (1)
│
└── marks (N)

exams (1)
│
└── marks (N)

enrollments (1)
│
└── marks (N)

mentors (1)
│
└── marks (N)

---

## Business Rules

- Every mark belongs to one exam.
- Every mark belongs to one enrollment.
- A student can have only one mark record per exam.
- Marks cannot exceed the exam's total marks.
- Marks cannot be negative.
- Results should not be deleted after publication.
- Marks may be updated only by authorized mentors or administrators.

---

## Result Status

| Value | Description |
|--------|-------------|
| PENDING | Evaluation pending |
| PASSED | Student passed |
| FAILED | Student failed |
| ABSENT | Student absent |

---

## Example Record

| Field | Value |
|-------|-------|
| exam | Mid Semester Examination |
| student | AIML22045 |
| obtained_marks | 24 |
| percentage | 80.00 |
| grade | A |
| result_status | PASSED |

---

## AI Usage

The marks table contributes to:

- Subject-wise performance
- Semester performance trends
- Low-score detection
- Failure prediction
- Grade progression
- Early academic risk identification
- Dropout prediction features

---

## Future Enhancements

- Grace marks
- Moderation workflow
- Re-evaluation requests
- Internal & external marks separation
- Automatic grade calculation
- GPA calculation
- Transcript generation