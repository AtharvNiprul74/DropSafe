from pathlib import Path
import pandas as pd

# ==========================================================
# PATH CONFIGURATION
# ==========================================================

PROJECT_ROOT = Path(__file__).resolve().parents[2]

DATA_DIR = PROJECT_ROOT / "src" / "data" / "generated"

OUTPUT_DIR = PROJECT_ROOT / "src" / "ml" / "datasets"

OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# ==========================================================
# HELPER FUNCTIONS
# ==========================================================

def load_csv(filename):
    file_path = DATA_DIR / filename

    if not file_path.exists():
        raise FileNotFoundError(f"{filename} not found.")

    return pd.read_csv(file_path)


def remove_audit_columns(df):
    return df.drop(
        columns=["created_at", "updated_at"],
        errors="ignore"
    )


def log_shape(step, df):
    print(f"{step:<35} {df.shape}")


# ==========================================================
# LOAD DATA
# ==========================================================

print("\n" + "=" * 80)
print("LOADING DATASETS")
print("=" * 80)

students = remove_audit_columns(load_csv("students.csv"))
profiles = remove_audit_columns(load_csv("student_profiles.csv"))
registrations = remove_audit_columns(load_csv("registrations.csv"))
marks = remove_audit_columns(load_csv("marks.csv"))
academic = remove_audit_columns(load_csv("academic_records.csv"))

log_shape("Students", students)
log_shape("Profiles", profiles)
log_shape("Registrations", registrations)
log_shape("Marks", marks)
log_shape("Academic Records", academic)

# ==========================================================
# BUILD MASTER DATASET
# ==========================================================

print("\n" + "=" * 80)
print("MERGING DATASETS")
print("=" * 80)

master = students.merge(
    profiles,
    on="student_id",
    how="left",
    validate="one_to_one"
)

log_shape("Students + Profiles", master)

master = master.merge(
    academic,
    on="student_id",
    how="left",
    validate="one_to_one",
    suffixes=("", "_academic")
)

log_shape("+ Academic Records", master)

master = master.merge(
    registrations,
    on="student_id",
    how="left",
    validate="one_to_many"
)

log_shape("+ Registrations", master)

master = master.merge(
    marks,
    on="registration_id",
    how="left",
    validate="many_to_one",
    suffixes=("", "_marks")
)

log_shape("+ Marks", master)

# ==========================================================
# CLEAN DATASET
# ==========================================================

master = master.loc[:, ~master.columns.duplicated()]

sort_columns = []

if "student_id" in master.columns:
    sort_columns.append("student_id")

if "registration_id" in master.columns:
    sort_columns.append("registration_id")

if sort_columns:
    master = master.sort_values(sort_columns)

master.reset_index(drop=True, inplace=True)

# ==========================================================
# SAVE DATASET
# ==========================================================

output_file = OUTPUT_DIR / "dropsafe_master_dataset_v1.csv"

master.to_csv(output_file, index=False)

# ==========================================================
# FINAL SUMMARY
# ==========================================================

print("\n" + "=" * 80)
print("MASTER DATASET SUMMARY")
print("=" * 80)

print(f"Rows                : {len(master)}")
print(f"Columns             : {len(master.columns)}")
print(f"Missing Values      : {master.isnull().sum().sum()}")
print(f"Duplicate Rows      : {master.duplicated().sum()}")

print("\nDataset Preview\n")
print(master.head())

print("\nSaved Successfully")

print(output_file)

print("=" * 80)