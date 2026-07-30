"""
---------------------------------------------------------
Student Risk Prediction Dataset Generator

Author:
    Saklen Manjire

Purpose:
    Generate complete synthetic academic dataset.
---------------------------------------------------------
"""

from pathlib import Path

from generators.department_generator import DepartmentGenerator
from generators.academic_year_generator import AcademicYearGenerator
from generators.semester_generator import SemesterGenerator
from generators.curriculum_generator import CurriculumGenerator
from generators.mentor_generator import MentorGenerator
from generators.course_offering_generator import CourseOfferingGenerator
from generators.student_generator import StudentGenerator
from generators.registration_generator import RegistrationGenerator
from generators.marks_generator import MarksGenerator
from generators.academic_record_generator import AcademicRecordGenerator

from engines.profile_engine import ProfileEngine

from services.csv_export_service import CSVExportService
from services.data_loader_service import DataLoaderService


def main():

    print("=" * 60)
    print("Student Risk Prediction Dataset Generator")
    print("=" * 60)

    settings = DataLoaderService.load_settings()

    # --------------------------------------------------
    # Departments
    # --------------------------------------------------

    print("\nGenerating Departments...")
    departments = DepartmentGenerator().generate()

    department = departments[0]

    # --------------------------------------------------
    # Academic Years
    # --------------------------------------------------

    print("Generating Academic Years...")

    academic_years = AcademicYearGenerator(
        start_year=settings["generation"]["start_year"],
        number_of_years=settings["generation"]["number_of_years"],
    ).generate()

    active_academic_year = next(
        ay for ay in academic_years if ay.is_active
    )

    # --------------------------------------------------
    # Semesters
    # --------------------------------------------------

    print("Generating Semesters...")

    semesters = SemesterGenerator(
    academic_years=academic_years,
    current_semester=settings["generation"]["current_semester"],
    ).generate()

    active_semester = next(
        sem
        for sem in semesters
        if sem.academic_year_id == active_academic_year.academic_year_id
        and sem.is_active
    )

    # --------------------------------------------------
    # Curriculum
    # --------------------------------------------------

    print("Generating Curriculum...")

    courses, curriculum = CurriculumGenerator(
    department=department,
    semesters=semesters,
    ).generate()

    # --------------------------------------------------
    # Mentors
    # --------------------------------------------------

    print("Generating Mentors...")
    mentors = MentorGenerator(
        department=department,
        number_of_mentors=settings["generation"]["number_of_mentors"],
    ).generate()

    # --------------------------------------------------
    # Course Offerings
    # --------------------------------------------------
    print("Generating Course Offerings...")

    course_offerings = CourseOfferingGenerator(
        curriculum=curriculum,
        mentors=mentors,
    ).generate()

    # --------------------------------------------------
    # Students
    # --------------------------------------------------

    print("Generating Students...")

    students = StudentGenerator(
        department=department,
        academic_year=active_academic_year,
        semester=active_semester,
        total_students=settings["generation"]["number_of_students"],
        settings=settings,
    ).generate()

    # --------------------------------------------------
    # Student Profiles
    # --------------------------------------------------

    

    print("Generating Student Profiles...")

    profile_file = (
        Path(__file__).parent
        / "config"
        / "profiles.json"
    )
    profile_engine = ProfileEngine(
        students=students,
        profile_config=settings["profiles"],
    )

    student_profiles = profile_engine.generate()

    # --------------------------------------------------
    # Registration
    # --------------------------------------------------

    print("Generating Registrations...")

    registrations = RegistrationGenerator(
    students=students,
    course_offerings=course_offerings,
    student_profiles=student_profiles,
    ).generate()

    # --------------------------------------------------
    # Marks
    # --------------------------------------------------

    print("Generating Marks...")

    marks = MarksGenerator(
    registrations=registrations,
    student_profiles=student_profiles,
    course_offerings=course_offerings,
    grading_config=settings["grading"],
    ).generate()

    # --------------------------------------------------
    # Academic Records
    # --------------------------------------------------

    print("Generating Academic Records...")

    academic_records = AcademicRecordGenerator(
        students,
        registrations,
        marks,
    ).generate()

    # --------------------------------------------------
    # Export
    # --------------------------------------------------

    print("Exporting CSV Files...")

    exporter = CSVExportService("data/generated")

    exporter.export_all({

        "departments.csv": departments,
        "academic_years.csv": academic_years,
        "courses.csv": courses,
        "curriculum.csv": curriculum,
        "semesters.csv": semesters,
        "mentors.csv": mentors,
        "course_offerings.csv": course_offerings,
        "students.csv": students,
        "student_profiles.csv": student_profiles,
        "registrations.csv": registrations,
        "marks.csv": marks,
        "academic_records.csv": academic_records,

    })

    print("\nDataset Generated Successfully!")
    print("=" * 60)


if __name__ == "__main__":
    main()