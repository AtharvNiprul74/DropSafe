from pathlib import Path
from datetime import date, datetime, timedelta, timezone
import random
import uuid
import pandas as pd

BASE_DIR = Path(__file__).resolve().parents[2]
RAW_DIR = BASE_DIR / "data" / "raw"
REPORT_DIR = BASE_DIR / "data" / "synthetic"

STUDENTS_FILE = RAW_DIR / "students.csv"
PERIODS_FILE = RAW_DIR / "academic_periods.csv"
LEVELS_FILE = RAW_DIR / "learning_levels.csv"
PROGRAMS_FILE = RAW_DIR / "learning_programs.csv"

OUTPUT_FILE = RAW_DIR / "enrollments.csv"
REPORT_FILE = REPORT_DIR / "enrollments.md"

SEED = 48
ROW_COUNT = 1000
random.seed(SEED)

STATUSES = ["ACTIVE", "COMPLETED", "WITHDRAWN", "TRANSFERRED", "ARCHIVED"]


def generate_uuid():
    timestamp_ms = int(datetime.now(timezone.utc).timestamp() * 1000)
    random_bits = uuid.uuid4().int
    value = (
        ((timestamp_ms & ((1 << 48) - 1)) << 80)
        | (0x7 << 76)
        | (((random_bits >> 64) & 0xFFF) << 64)
        | (0b10 << 62)
        | (random_bits & ((1 << 62) - 1))
    )
    return str(uuid.UUID(int=value))


def utc_now():
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def load_csv(path, required):
    if not path.exists():
        raise FileNotFoundError(f"Missing {path}")
    df = pd.read_csv(path, dtype=str)
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise ValueError(f"{path.name} is missing columns: {missing}")
    if df.empty:
        raise ValueError(f"{path.name} is empty.")
    return df


def generate_enrollments(students, periods, levels, programs, count=ROW_COUNT):
    students = (
        students[["id", "organization_id"]]
        .drop_duplicates("id")
        .to_dict("records")
    )

    # PRD §8: Archived Programs cannot accept new Enrollments and
    # Archived Levels cannot accept new Enrollments. Periods that
    # belong to archived parents are excluded from generation.
    archived_programs = set(
        programs.loc[programs["status"] == "ARCHIVED", "id"].astype(str)
    )
    archived_levels = set(
        levels.loc[levels["status"] == "ARCHIVED", "id"].astype(str)
    )

    period_frame = periods.merge(
        levels[["id", "learning_program_id", "level_number"]]
        .rename(columns={"id": "level_id"}),
        left_on="learning_level_id",
        right_on="level_id",
        how="left",
        validate="many_to_one",
    )
    period_frame["start_date"] = pd.to_datetime(
        period_frame["start_date"], errors="raise"
    )
    period_frame["end_date"] = pd.to_datetime(
        period_frame["end_date"], errors="raise"
    )
    period_frame["level_number"] = pd.to_numeric(
        period_frame["level_number"], errors="raise"
    ).astype(int)

    eligible_mask = (
        ~period_frame["learning_program_id"]
        .astype(str)
        .isin(archived_programs)
        & ~period_frame["learning_level_id"]
        .astype(str)
        .isin(archived_levels)
    )
    period_frame = period_frame[eligible_mask].copy()

    eligible_period_ids = set(period_frame["id"].astype(str))

    # Program-specific ordered trajectories. Each student's records
    # remain in one program.
    periods_by_program = {}
    for program_id, group in period_frame.groupby(
        "learning_program_id", sort=True
    ):
        periods_by_program[str(program_id)] = group.sort_values(
            "level_number"
        ).to_dict("records")

    students_by_org = {}
    for student in students:
        students_by_org.setdefault(
            str(student["organization_id"]), []
        ).append(student)

    eligible_programs = {}
    for program_id, group in period_frame.groupby(
        "learning_program_id", sort=True
    ):
        orgs = group["organization_id"].astype(str).unique().tolist()
        if len(orgs) == 1 and orgs[0] in students_by_org:
            eligible_programs.setdefault(orgs[0], []).append(
                str(program_id)
            )

    if not eligible_programs:
        raise ValueError(
            "No non-archived programs have periods matching a "
            "student organization."
        )

    # Build candidate student trajectories. A trajectory uses
    # sequential levels in one program.
    trajectories = []
    for org_id, program_ids in eligible_programs.items():
        org_students = students_by_org.get(org_id, [])
        for student in org_students:
            for program_id in program_ids:
                ordered = periods_by_program[program_id]
                for start_idx in range(len(ordered)):
                    max_len = min(4, len(ordered) - start_idx)
                    if max_len <= 0:
                        continue
                    # Deterministic variation: trajectory lengths 1-4.
                    desired_len = 1 + (
                        (len(trajectories) + start_idx) % max_len
                    )
                    trajectory = ordered[
                        start_idx:start_idx + desired_len
                    ]
                    trajectories.append((student, program_id, trajectory))

    if not trajectories:
        raise ValueError(
            "Could not construct any student enrollment trajectories."
        )

    # Sample trajectories and cap at requested row count while
    # avoiding duplicate student-period pairs.
    random.shuffle(trajectories)
    rows = []
    seen_pairs = set()
    for student, program_id, trajectory in trajectories:
        if len(rows) >= count:
            break
        if any(
            (
                str(student["organization_id"]),
                str(student["id"]),
                str(p["id"]),
            )
            in seen_pairs
            for p in trajectory
        ):
            continue
        # Keep full trajectories together where possible.
        if len(rows) + len(trajectory) > count:
            continue

        for position, period in enumerate(trajectory):
            period_start = period["start_date"].date()
            period_end = period["end_date"].date()
            span = max(0, (period_end - period_start).days)
            enrollment_date = period_start + timedelta(
                days=random.randint(0, span)
            )
            is_last = position == len(trajectory) - 1

            # A completed enrollment can lead to a next level; other
            # exit statuses are terminal.
            if not is_last:
                status = "COMPLETED"
            else:
                status = random.choices(
                    STATUSES,
                    weights=[10, 50, 15, 10, 15],
                    k=1,
                )[0]

            completion_date = None
            if status in {"COMPLETED", "WITHDRAWN", "TRANSFERRED"}:
                # For progression, the enrollment closes at the
                # period end. For terminal exits, the exit occurs
                # during the period.
                if not is_last or status == "COMPLETED":
                    completion_date = period_end
                else:
                    latest_day = max(
                        0, (period_end - enrollment_date).days
                    )
                    completion_date = enrollment_date + timedelta(
                        days=random.randint(0, latest_day)
                    )

            now = utc_now()
            rows.append({
                "id": generate_uuid(),
                "organization_id": student["organization_id"],
                "student_id": student["id"],
                "academic_period_id": period["id"],
                "enrollment_date": enrollment_date.isoformat(),
                "completion_date": (
                    completion_date.isoformat()
                    if completion_date
                    else None
                ),
                "status": status,
                "created_at": now,
                "updated_at": now,
                "created_by": None,
                "updated_by": None,
            })
            seen_pairs.add(
                (
                    str(student["organization_id"]),
                    str(student["id"]),
                    str(period["id"]),
                )
            )

    # If trajectories do not fill the requested count, add unique
    # one-period enrollments from eligible (non-archived) periods.
    if len(rows) < count:
        existing_pairs = seen_pairs
        eligible_periods = periods[
            periods["id"].astype(str).isin(eligible_period_ids)
        ]
        candidate_pairs = []
        for student in students:
            org_id = str(student["organization_id"])
            org_periods = eligible_periods[
                eligible_periods["organization_id"].astype(str)
                == org_id
            ]
            for period in org_periods.to_dict("records"):
                key = (
                    org_id,
                    str(student["id"]),
                    str(period["id"]),
                )
                if key not in existing_pairs:
                    candidate_pairs.append((student, period, key))
        random.shuffle(candidate_pairs)
        for student, period, key in candidate_pairs:
            if len(rows) >= count:
                break
            period_start = date.fromisoformat(
                str(period["start_date"])[:10]
            )
            period_end = date.fromisoformat(
                str(period["end_date"])[:10]
            )
            span = max(0, (period_end - period_start).days)
            enrollment_date = period_start + timedelta(
                days=random.randint(0, span)
            )
            status = random.choice(STATUSES)
            completion_date = None
            if status in {"COMPLETED", "WITHDRAWN", "TRANSFERRED"}:
                completion_date = enrollment_date + timedelta(
                    days=random.randint(
                        0,
                        max(0, (period_end - enrollment_date).days),
                    )
                )
            now = utc_now()
            rows.append({
                "id": generate_uuid(),
                "organization_id": student["organization_id"],
                "student_id": student["id"],
                "academic_period_id": period["id"],
                "enrollment_date": enrollment_date.isoformat(),
                "completion_date": (
                    completion_date.isoformat()
                    if completion_date
                    else None
                ),
                "status": status,
                "created_at": now,
                "updated_at": now,
                "created_by": None,
                "updated_by": None,
            })
            existing_pairs.add(key)

    return pd.DataFrame(rows)


def validate(df, students, periods, levels, programs):
    student_ids = set(students["id"].astype(str))
    period_ids = set(periods["id"].astype(str))
    student_org = dict(
        zip(
            students["id"].astype(str),
            students["organization_id"].astype(str),
        )
    )
    period_org = dict(
        zip(
            periods["id"].astype(str),
            periods["organization_id"].astype(str),
        )
    )

    # Parent status maps for archived-parent checks (PRD §8).
    period_level = dict(
        zip(
            periods["id"].astype(str),
            periods["learning_level_id"].astype(str),
        )
    )
    level_program = dict(
        zip(
            levels["id"].astype(str),
            levels["learning_program_id"].astype(str),
        )
    )
    level_status = dict(
        zip(levels["id"].astype(str), levels["status"].astype(str))
    )
    program_status = dict(
        zip(programs["id"].astype(str), programs["status"].astype(str))
    )

    enrollment_dates = pd.to_datetime(
        df["enrollment_date"], errors="coerce"
    )
    completion_dates = pd.to_datetime(
        df["completion_date"], errors="coerce"
    )
    mapped_student_org = df["student_id"].astype(str).map(student_org)
    mapped_period_org = df["academic_period_id"].astype(
        str
    ).map(period_org)

    df_period_level = df["academic_period_id"].astype(str).map(
        period_level
    )
    df_level_status = df_period_level.map(level_status)
    df_level_program = df_period_level.map(level_program)
    df_program_status = df_level_program.map(program_status)

    results = {
        "rows": len(df),
        "duplicate_ids": int(df["id"].duplicated().sum()),
        "duplicate_student_period_pairs": int(
            df.duplicated(
                [
                    "organization_id",
                    "student_id",
                    "academic_period_id",
                ]
            ).sum()
        ),
        "invalid_student_refs": int(
            (~df["student_id"].astype(str).isin(student_ids)).sum()
        ),
        "invalid_period_refs": int(
            (~df["academic_period_id"].astype(str).isin(period_ids)).sum()
        ),
        "student_organization_mismatches": int(
            (mapped_student_org != df["organization_id"].astype(str)).sum()
        ),
        "period_organization_mismatches": int(
            (mapped_period_org != df["organization_id"].astype(str)).sum()
        ),
        "invalid_statuses": int((~df["status"].isin(STATUSES)).sum()),
        "invalid_enrollment_dates": int(enrollment_dates.isna().sum()),
        "invalid_completion_dates": int(
            (df["completion_date"].notna() & completion_dates.isna()).sum()
        ),
        "completion_before_enrollment": int(
            (
                df["completion_date"].notna()
                & (completion_dates < enrollment_dates)
            ).sum()
        ),
        "enrollment_outside_period": 0,
        "enrollments_under_archived_levels": int(
            (df_level_status == "ARCHIVED").sum()
        ),
        "enrollments_under_archived_programs": int(
            (df_program_status == "ARCHIVED").sum()
        ),
    }
    period_dates = periods.set_index("id")[
        ["start_date", "end_date"]
    ].copy()
    period_dates["start_date"] = pd.to_datetime(
        period_dates["start_date"], errors="coerce"
    )
    period_dates["end_date"] = pd.to_datetime(
        period_dates["end_date"], errors="coerce"
    )
    merged = df.merge(
        period_dates,
        left_on="academic_period_id",
        right_index=True,
        how="left",
    )
    ed = pd.to_datetime(merged["enrollment_date"], errors="coerce")
    results["enrollment_outside_period"] = int(
        ((ed < merged["start_date"]) | (ed > merged["end_date"])).sum()
    )
    results["validation_passed"] = all(
        value == 0
        for key, value in results.items()
        if key not in {"rows", "validation_passed"}
    )
    return results


def main():
    students = load_csv(STUDENTS_FILE, ["id", "organization_id"])
    periods = load_csv(
        PERIODS_FILE,
        [
            "id",
            "organization_id",
            "learning_level_id",
            "start_date",
            "end_date",
        ],
    )
    levels = load_csv(
        LEVELS_FILE,
        [
            "id",
            "organization_id",
            "learning_program_id",
            "level_number",
            "status",
        ],
    )
    programs = load_csv(
        PROGRAMS_FILE, ["id", "organization_id", "status"]
    )

    df = generate_enrollments(
        students, periods, levels, programs, ROW_COUNT
    )

    RAW_DIR.mkdir(parents=True, exist_ok=True)
    REPORT_DIR.mkdir(parents=True, exist_ok=True)
    df.to_csv(OUTPUT_FILE, index=False)

    result = validate(df, students, periods, levels, programs)

    REPORT_FILE.write_text(
        "# Enrollments Synthetic Dataset\n\n"
        f"- Students available: {len(students)}\n"
        f"- Academic periods available: {len(periods)}\n"
        f"- Enrollments generated: {len(df)}\n"
        "- Student trajectories stay within one program and use "
        "sequential levels when a multi-period trajectory is "
        "generated.\n"
        "- Enrollments are generated only for non-archived "
        "programs and levels (PRD §8: archived programs/levels "
        "cannot accept enrollments).\n"
        "- Statuses are synthetic lifecycle values, not verified "
        "dropout labels.\n\n"
        f"## Validation\n\n```text\n{result}\n```\n",
        encoding="utf-8",
    )

    print(f"Students: {len(students)}")
    print(f"Academic periods: {len(periods)}")
    print(f"Enrollments: {len(df)}")
    print(f"CSV: {OUTPUT_FILE}")
    print(f"Report: {REPORT_FILE}")
    print(
        "Enrollments under archived levels: "
        f"{result['enrollments_under_archived_levels']}"
    )
    print(
        "Enrollments under archived programs: "
        f"{result['enrollments_under_archived_programs']}"
    )
    print(
        f"Validation: {'PASS' if result['validation_passed'] else 'FAIL'}"
    )
    if not result["validation_passed"]:
        raise SystemExit("Enrollment validation failed.")


if __name__ == "__main__":
    main()