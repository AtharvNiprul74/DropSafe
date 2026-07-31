"""
===========================================================================
DropSafe
03_feature_engineering.py

Author : Saklen
Purpose:
    Create ML-ready dataset from master_dataset.csv

Pipeline
--------
1. Load master dataset
2. Validate dataset
3. Create Target
4. Create Engineered Features
5. Handle Missing Values
6. Encode Categorical Variables
7. Remove Leakage Columns
8. Save Feature Dataset
9. Save Encoders

===========================================================================
"""

from pathlib import Path
import warnings
import joblib
import numpy as np
import pandas as pd

from sklearn.preprocessing import LabelEncoder

warnings.filterwarnings("ignore")

# ==========================================================
# PATH CONFIGURATION
# ==========================================================

PROJECT_ROOT = Path(__file__).resolve().parents[2]

ML_DIR = PROJECT_ROOT / "src" / "ml"

DATASET_DIR = ML_DIR / "datasets"

ENCODER_DIR = ML_DIR / "encoders"

OUTPUT_DIR = ML_DIR / "outputs"

REPORT_DIR = OUTPUT_DIR / "reports"

DATASET_DIR.mkdir(exist_ok=True)

ENCODER_DIR.mkdir(exist_ok=True)

REPORT_DIR.mkdir(exist_ok=True)

MASTER_DATASET = DATASET_DIR / "dropsafe_master_dataset_v1.csv"

FEATURE_DATASET = DATASET_DIR / "dropsafe_feature_dataset_v1.csv"

ENCODER_FILE = ENCODER_DIR / "dropsafe_label_encoders_v1.pkl"

FEATURE_COLUMNS_FILE = ENCODER_DIR / "dropsafe_feature_columns_v1.pkl"

# ==========================================================
# LOAD DATASET
# ==========================================================

print("=" * 80)
print("DropSafe ML Pipeline")
print("STEP 03 : FEATURE ENGINEERING")
print("=" * 80)

if not MASTER_DATASET.exists():

    raise FileNotFoundError(
        f"\nMaster Dataset not found:\n{MASTER_DATASET}"
    )

df = pd.read_csv(MASTER_DATASET)

print(f"\nDataset Loaded Successfully")
print(f"Rows    : {len(df)}")
print(f"Columns : {len(df.columns)}")

# ==========================================================
# BASIC VALIDATION
# ==========================================================

print("\nPerforming Validation...")

if df.empty:
    raise ValueError("Dataset is Empty")

if df.duplicated().sum() > 0:

    print(f"Duplicate Rows Found : {df.duplicated().sum()}")

else:

    print("No Duplicate Rows")

print("Validation Completed")

# ==========================================================
# CREATE TARGET VARIABLE
# ==========================================================

print("\nCreating Target Variable...")

if "dropout_probability" in df.columns:

    # ==========================================================
    # CALCULATE DROPOUT PROBABILITY
    # ==========================================================

    print("\nCalculating Dropout Probability...")
    
    print("\nMissing Values Before Dropout Probability")

    columns = [
        "attendance_percentage",
        "assignment_completion",
        "lms_activity_score",
        "cgpa",
        "failed_courses",
        "backlog_courses",
        "is_repeat"
    ]

    print(df[columns].isna().sum())
    
    print("\nCalculating Dropout Probability...")

    df["attendance_percentage"] = df["attendance_percentage"].fillna(0)
    df["assignment_completion"] = df["assignment_completion"].fillna(0)
    df["lms_activity_score"] = df["lms_activity_score"].fillna(0)
    df["cgpa"] = df["cgpa"].fillna(0)
    df["failed_courses"] = df["failed_courses"].fillna(0)
    df["backlog_courses"] = df["backlog_courses"].fillna(0)
    df["is_repeat"] = df["is_repeat"].fillna(0)

    df["dropout_probability"] = (

        (100 - df["attendance_percentage"]) * 0.003 +

        (100 - df["assignment_completion"]) * 0.002 +

        (100 - df["lms_activity_score"]) * 0.002 +

        (10 - df["cgpa"]) * 0.05 +

        df["failed_courses"] * 0.08 +

        df["backlog_courses"] * 0.06 +

        df["is_repeat"] * 0.05

    )

    df["dropout_probability"] = df["dropout_probability"].clip(0, 1)
else:

    raise Exception(
        "dropout_probability column missing."
    )

# ==========================================================
# CREATE TARGET VARIABLE
# ==========================================================

print("Creating Target Variable...")    

df["dropout_risk"] = pd.cut(
    df["dropout_probability"],
    bins=[-0.01, 0.35, 0.70, 1.01],
    labels=["LOW", "MEDIUM", "HIGH"]
)

print("\nDropout Risk Distribution")
print(df["dropout_risk"].value_counts(dropna=False))

print("\nUnique Dropout Risk Values")
print(df["dropout_risk"].unique())

# ==========================================================
# FEATURE 1
# HAS REGISTRATION
# ==========================================================

print("Creating has_registration...")

df["has_registration"] = np.where(
    df["registration_id"].isna(),
    0,
    1
)

# ==========================================================
# FEATURE 2
# HAS MARKS
# ==========================================================

print("Creating has_marks...")

df["has_marks"] = np.where(
    df["marks_id"].isna(),
    0,
    1
)

# ==========================================================
# FEATURE 3
# FAILED COURSE
# ==========================================================

print("Creating failed_course...")

if "result" in df.columns:

    df["failed_course_risk"] = np.where(
        df["result"].str.upper() == "FAIL",
        1,
        0
    )

else:

    df["failed_course_risk"] = 0

# ==========================================================
# FEATURE 4
# BACKLOG RISK
# ==========================================================

print("Creating backlog_risk...")

if "backlog_courses" in df.columns:

    df["backlog_risk"] = np.where(
        df["backlog_courses"] > 0,
        1,
        0
    )

else:

    df["backlog_risk"] = 0

# ==========================================================
# FEATURE 5
# ATTENDANCE RISK
# ==========================================================

print("Creating attendance_risk...")

if "attendance_percentage" in df.columns:

    df["attendance_risk"] = np.where(
        df["attendance_percentage"] < 75,
        1,
        0
    )

else:

    df["attendance_risk"] = 0

# ==========================================================
# FEATURE 6
# ASSIGNMENT RISK
# ==========================================================

print("Creating assignment_risk...")

if "assignment_completion" in df.columns:

    df["assignment_risk"] = np.where(
        df["assignment_completion"] < 60,
        1,
        0
    )

else:

    df["assignment_risk"] = 0

# ==========================================================
# FEATURE 7
# LMS RISK
# ==========================================================

print("Creating lms_risk...")

if "lms_activity_score" in df.columns:

    df["lms_risk"] = np.where(
        df["lms_activity_score"] < 50,
        1,
        0
    )

else:

    df["lms_risk"] = 0

# ==========================================================
# FEATURE 8
# CGPA RISK
# ==========================================================

print("Creating cgpa_risk...")

if "cgpa" in df.columns:

    df["cgpa_risk"] = np.where(
        df["cgpa"] < 6.50,
        1,
        0
    )

else:

    df["cgpa_risk"] = 0

# ==========================================================
# FEATURE 9
# REPEAT COURSE
# ==========================================================

print("Creating repeat_course_risk...")

if "is_repeat" in df.columns:

    df["is_repeat"] = (
        df["is_repeat"]
        .replace({
            "Yes": 1,
            "No": 0,
            "YES": 1,
            "NO": 0,
            True: 1,
            False: 0
        })
    )

    df["is_repeat"] = (
        pd.to_numeric(
            df["is_repeat"],
            errors="coerce"
        )
        .fillna(0)
        .astype(int)
    )

    df["repeat_course_risk"] = np.where(
        df["is_repeat"] == 1,
        1,
        0
    )

else:

    df["repeat_course_risk"] = 0

# ==========================================================
# FEATURE 10
# CREDIT COMPLETION RATIO
# ==========================================================

print("Creating credit_completion_ratio...")

if (
    "credits_registered_marks" in df.columns
    and
    "credits_earned_marks" in df.columns
):

    df["credit_completion_ratio"] = np.where(

        df["credits_registered_marks"] > 0,

        df["credits_earned_marks"]
        /
        df["credits_registered_marks"],

        0

    )

else:

    df["credit_completion_ratio"] = 0

print("\nFeature Creation Completed.")  


# ==========================================================
# HANDLE MISSING VALUES
# ==========================================================

print("\n" + "=" * 80)
print("Handling Missing Values")
print("=" * 80)

# --------------------------
# Numeric Columns
# --------------------------

numeric_columns = df.select_dtypes(
    include=[np.number]
).columns.tolist()

for column in numeric_columns:

    missing = df[column].isna().sum()

    if missing > 0:

        median = df[column].median()

        df[column] = df[column].fillna(median)

print("Numeric Missing Values Handled")


remaining = df.isnull().sum()

remaining = remaining[remaining > 0]

if len(remaining):

    print("\nColumns Still Containing Null Values")

    print(remaining)

else:

    print("\nNo Missing Values Remaining")

# --------------------------
# Categorical Columns
# --------------------------

categorical_columns = df.select_dtypes(
    include=["object", "category"]
).columns.tolist()

for column in categorical_columns:

    if column == "dropout_risk":
        continue

    df[column] = df[column].fillna("Unknown")

print("Categorical Missing Values Handled")

# ==========================================================
# DATA CLEANING
# ==========================================================

print("\n" + "=" * 80)
print("Cleaning Dataset")
print("=" * 80)

# Remove extra spaces

for column in categorical_columns:

    df[column] = (
        df[column]
        .astype(str)
        .str.strip()
    )

# Standardize Gender

if "gender" in df.columns:

    df["gender"] = (
        df["gender"]
        .str.upper()
    )

# Standardize Result

if "result" in df.columns:

    df["result"] = (
        df["result"]
        .str.upper()
    )

# Standardize Semester Result

if "semester_result" in df.columns:

    df["semester_result"] = (
        df["semester_result"]
        .str.upper()
    )

print("Cleaning Completed")

# ==========================================================
# FEATURE SCALING
# (Not Applied)
# ==========================================================

print("\nSkipping Scaling")
print("Reason : Random Forest & XGBoost don't require scaling.")

# ==========================================================
# LABEL ENCODING
# ==========================================================

print("\n" + "=" * 80)
print("Encoding Categorical Features")
print("=" * 80)

encoders = {}

encoding_columns = [

    "gender",

    "registration_status",

    "semester_result",

    "grade_letter",

    "result",

    "dropout_risk"

]

encoding_columns = [

    column

    for column in encoding_columns

    if column in df.columns

]

for column in encoding_columns:

    encoder = LabelEncoder()

    df[column] = encoder.fit_transform(
        df[column].astype(str)
    )

    encoders[column] = encoder

    print(f"Encoded : {column}")

print("\nEncoded Dropout Risk Classes")
print(encoders["dropout_risk"].classes_)

print("\nEncoding Completed")

# ==========================================================
# REMOVE DATA LEAKAGE
# ==========================================================

print("\n" + "=" * 80)
print("Removing Unnecessary Columns")
print("=" * 80)

columns_to_drop = [

    # Personal

    "first_name",

    "last_name",

    "email",

    "phone",

    "date_of_birth",

    # IDs

    "roll_number",

    "profile_id",

    "profile_name",

    "academic_record_id",

    "registration_id",

    "marks_id",

    "mentor_id",

    "course_offering_id",

    # Leakage

    "dropout_probability"

]

existing_columns = [

    column

    for column in columns_to_drop

    if column in df.columns

]

df.drop(

    columns=existing_columns,

    inplace=True

)

print(f"Columns Removed : {len(existing_columns)}")


# ==========================================================
# REMOVE CONSTANT COLUMNS
# ==========================================================

constant_columns = [

    column

    for column in df.columns

    if df[column].nunique(dropna=False) <= 1
]

if constant_columns:

    print("\nRemoving Constant Columns")

    for column in constant_columns:
        print("-", column)

    df.drop(
        columns=constant_columns,
        inplace=True
    )

# ==========================================================
# CHECK DUPLICATES
# ==========================================================

duplicate_rows = df.duplicated().sum()

if duplicate_rows > 0:

    print(f"Removing {duplicate_rows} Duplicate Rows")

    df.drop_duplicates(
        inplace=True
    )

else:

    print("No Duplicate Rows Found")

# ==========================================================
# FINAL NULL CHECK
# ==========================================================

null_count = df.isna().sum().sum()

print(f"\nRemaining Missing Values : {null_count}")

# ==========================================================
# SAVE LABEL ENCODERS
# ==========================================================

print("\nSaving Label Encoders...")

joblib.dump(

    encoders,

    ENCODER_FILE

)

print("Saved :", ENCODER_FILE)

# ==========================================================
# SAVE FEATURE LIST
# ==========================================================

feature_columns = [

    column

    for column in df.columns

    if column != "dropout_risk"

]

joblib.dump(

    feature_columns,

    FEATURE_COLUMNS_FILE

)

print("Saved :", FEATURE_COLUMNS_FILE)

print("\nPart 2 Completed Successfully")

# ==========================================================
# SAVE FEATURE DATASET
# ==========================================================

print("\n" + "=" * 80)
print("Saving Feature Dataset")
print("=" * 80)

df.to_csv(

    FEATURE_DATASET,

    index=False

)

print("Feature Dataset Saved Successfully")
print(FEATURE_DATASET)

# ==========================================================
# FEATURE REPORT
# ==========================================================

report_path = REPORT_DIR / "03_feature_engineering_report_v1.txt"

with open(

    report_path,

    "w",

    encoding="utf-8"

) as report:

    report.write("=" * 70 + "\n")
    report.write("DropSafe Feature Engineering Report\n")
    report.write("=" * 70 + "\n\n")

    report.write(f"Rows : {len(df)}\n")
    report.write(f"Columns : {len(df.columns)}\n\n")

    report.write("Columns\n")
    report.write("-" * 70 + "\n")

    for column in df.columns:

        report.write(f"{column}\n")

    report.write("\n")

    report.write("=" * 70 + "\n")
    report.write("Missing Values\n")
    report.write("=" * 70 + "\n\n")

    missing = df.isnull().sum()

    for column, value in missing.items():

        report.write(f"{column:<35}{value}\n")

    report.write("\n")

    report.write("=" * 70 + "\n")
    report.write("Data Types\n")
    report.write("=" * 70 + "\n\n")

    for column in df.columns:

        report.write(

            f"{column:<35}{df[column].dtype}\n"

        )

print("Report Generated")

print(report_path)

# ==========================================================
# TARGET DISTRIBUTION
# ==========================================================

print("\n" + "=" * 80)
print("Target Distribution")
print("=" * 80)

if "dropout_risk" in df.columns:

    distribution = (

        df["dropout_risk"]

        .value_counts()

        .sort_index()

    )

    print(distribution)

# ==========================================================
# DATASET INFORMATION
# ==========================================================

print("\n" + "=" * 80)
print("Dataset Summary")
print("=" * 80)

print()

print("\nDataset Shape :", df.shape)
print("Data Types")
print(df.dtypes)

# ==========================================================
# ENGINEERED FEATURES
# ==========================================================

engineered_features = [

    "has_registration",

    "has_marks",

    "failed_course_risk",

    "backlog_risk",

    "attendance_risk",

    "assignment_risk",

    "lms_risk",

    "cgpa_risk",

    "repeat_course_risk",

    "credit_completion_ratio"

]

print("\n" + "=" * 80)
print("Engineered Features")
print("=" * 80)

for feature in engineered_features:

    if feature in df.columns:

        print(f"✓ {feature}")

# ==========================================================
# FINAL SUMMARY
# ==========================================================

print("\n" + "=" * 80)
print("FEATURE ENGINEERING COMPLETED")
print("=" * 80)

print(f"Input Dataset      : {MASTER_DATASET}")
print(f"Output Dataset     : {FEATURE_DATASET}")
print(f"Encoder File       : {ENCODER_FILE}")
print(f"Feature List       : {FEATURE_COLUMNS_FILE}")
print(f"Report             : {report_path}")

print("\nStatistics")

print(f"Rows               : {len(df)}")
print(f"Columns            : {len(df.columns)}")
print(f"Missing Values     : {df.isnull().sum().sum()}")
print(f"Duplicate Rows     : {df.duplicated().sum()}")

print("\nPipeline Completed Successfully.")

print("=" * 80)