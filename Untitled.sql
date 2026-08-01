CREATE TABLE "organizations" (
  "id" uuid PRIMARY KEY,
  "code" varchar UNIQUE,
  "name" varchar,
  "type" varchar,
  "email" varchar,
  "phone" varchar,
  "website" varchar,
  "status" varchar,
  "created_at" timestamp,
  "updated_at" timestamp
);

CREATE TABLE "roles" (
  "id" uuid PRIMARY KEY,
  "organization_id" uuid,
  "name" varchar
);

CREATE TABLE "users" (
  "id" uuid PRIMARY KEY,
  "organization_id" uuid,
  "role_id" uuid,
  "first_name" varchar,
  "last_name" varchar,
  "email" varchar UNIQUE,
  "password_hash" varchar,
  "status" varchar
);

CREATE TABLE "departments" (
  "id" uuid PRIMARY KEY,
  "organization_id" uuid,
  "name" varchar
);

CREATE TABLE "programs" (
  "id" uuid PRIMARY KEY,
  "organization_id" uuid,
  "department_id" uuid,
  "name" varchar
);

CREATE TABLE "academic_periods" (
  "id" uuid PRIMARY KEY,
  "organization_id" uuid,
  "name" varchar
);

CREATE TABLE "courses" (
  "id" uuid PRIMARY KEY,
  "organization_id" uuid,
  "program_id" uuid,
  "title" varchar
);

CREATE TABLE "mentors" (
  "id" uuid PRIMARY KEY,
  "organization_id" uuid,
  "department_id" uuid,
  "user_id" uuid
);

CREATE TABLE "students" (
  "id" uuid PRIMARY KEY,
  "organization_id" uuid,
  "program_id" uuid,
  "user_id" uuid
);

CREATE TABLE "course_offerings" (
  "id" uuid PRIMARY KEY,
  "course_id" uuid,
  "academic_period_id" uuid,
  "mentor_id" uuid
);

CREATE TABLE "enrollments" (
  "id" uuid PRIMARY KEY,
  "student_id" uuid,
  "course_offering_id" uuid
);

CREATE TABLE "attendance" (
  "id" uuid PRIMARY KEY,
  "enrollment_id" uuid,
  "attendance_date" date,
  "status" varchar
);

CREATE TABLE "assessments" (
  "id" uuid PRIMARY KEY,
  "course_offering_id" uuid,
  "title" varchar,
  "type" varchar
);

CREATE TABLE "assessment_results" (
  "id" uuid PRIMARY KEY,
  "assessment_id" uuid,
  "enrollment_id" uuid,
  "marks" decimal
);

CREATE TABLE "academic_records" (
  "id" uuid PRIMARY KEY,
  "student_id" uuid,
  "academic_period_id" uuid,
  "performance_score" decimal,
  "attendance_percentage" decimal
);

CREATE TABLE "prediction_history" (
  "id" uuid PRIMARY KEY,
  "student_id" uuid,
  "risk_score" decimal,
  "risk_level" varchar
);

CREATE TABLE "dropout_risk_factors" (
  "id" uuid PRIMARY KEY,
  "prediction_id" uuid,
  "factor_name" varchar,
  "factor_weight" decimal
);

CREATE TABLE "chat_sessions" (
  "id" uuid PRIMARY KEY,
  "student_id" uuid
);

CREATE TABLE "chat_messages" (
  "id" uuid PRIMARY KEY,
  "session_id" uuid,
  "sender" varchar,
  "message" text
);

CREATE TABLE "behaviour_analysis" (
  "id" uuid PRIMARY KEY,
  "session_id" uuid,
  "sentiment_score" decimal
);

CREATE TABLE "counseling_sessions" (
  "id" uuid PRIMARY KEY,
  "student_id" uuid,
  "mentor_id" uuid
);

CREATE TABLE "mentor_messages" (
  "id" uuid PRIMARY KEY,
  "counseling_session_id" uuid,
  "sender" varchar,
  "message" text
);

CREATE TABLE "student_risk_summary" (
  "id" uuid PRIMARY KEY,
  "student_id" uuid,
  "latest_prediction_id" uuid,
  "overall_risk" varchar
);

ALTER TABLE "roles" ADD FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "users" ADD FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "users" ADD FOREIGN KEY ("role_id") REFERENCES "roles" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "departments" ADD FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "programs" ADD FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "programs" ADD FOREIGN KEY ("department_id") REFERENCES "departments" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "academic_periods" ADD FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "courses" ADD FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "courses" ADD FOREIGN KEY ("program_id") REFERENCES "programs" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "mentors" ADD FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "mentors" ADD FOREIGN KEY ("department_id") REFERENCES "departments" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "mentors" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "students" ADD FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "students" ADD FOREIGN KEY ("program_id") REFERENCES "programs" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "students" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "course_offerings" ADD FOREIGN KEY ("course_id") REFERENCES "courses" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "course_offerings" ADD FOREIGN KEY ("academic_period_id") REFERENCES "academic_periods" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "course_offerings" ADD FOREIGN KEY ("mentor_id") REFERENCES "mentors" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "enrollments" ADD FOREIGN KEY ("student_id") REFERENCES "students" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "enrollments" ADD FOREIGN KEY ("course_offering_id") REFERENCES "course_offerings" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "attendance" ADD FOREIGN KEY ("enrollment_id") REFERENCES "enrollments" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "assessments" ADD FOREIGN KEY ("course_offering_id") REFERENCES "course_offerings" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "assessment_results" ADD FOREIGN KEY ("assessment_id") REFERENCES "assessments" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "assessment_results" ADD FOREIGN KEY ("enrollment_id") REFERENCES "enrollments" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "academic_records" ADD FOREIGN KEY ("student_id") REFERENCES "students" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "academic_records" ADD FOREIGN KEY ("academic_period_id") REFERENCES "academic_periods" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "prediction_history" ADD FOREIGN KEY ("student_id") REFERENCES "students" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "dropout_risk_factors" ADD FOREIGN KEY ("prediction_id") REFERENCES "prediction_history" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "chat_sessions" ADD FOREIGN KEY ("student_id") REFERENCES "students" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "chat_messages" ADD FOREIGN KEY ("session_id") REFERENCES "chat_sessions" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "behaviour_analysis" ADD FOREIGN KEY ("session_id") REFERENCES "chat_sessions" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "counseling_sessions" ADD FOREIGN KEY ("student_id") REFERENCES "students" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "counseling_sessions" ADD FOREIGN KEY ("mentor_id") REFERENCES "mentors" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "mentor_messages" ADD FOREIGN KEY ("counseling_session_id") REFERENCES "counseling_sessions" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "student_risk_summary" ADD FOREIGN KEY ("student_id") REFERENCES "students" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "student_risk_summary" ADD FOREIGN KEY ("latest_prediction_id") REFERENCES "prediction_history" ("id") DEFERRABLE INITIALLY IMMEDIATE;
