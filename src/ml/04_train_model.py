# ==========================================================
# IMPORT LIBRARIES
# ==========================================================

import warnings
warnings.filterwarnings("ignore")

import os
import time
import joblib

import numpy as np
import pandas as pd

from imblearn.over_sampling import SMOTE

from sklearn.model_selection import train_test_split

from sklearn.linear_model import LogisticRegression

from sklearn.tree import DecisionTreeClassifier

from sklearn.ensemble import RandomForestClassifier

from sklearn.svm import SVC

from xgboost import XGBClassifier

from lightgbm import LGBMClassifier

from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    classification_report,
    confusion_matrix
)


# ==========================================================
# CONFIGURATION
# ==========================================================

FEATURE_DATASET = "datasets/dropsafe_feature_dataset_v1.csv"

MODEL_DIRECTORY = "models"

REPORT_DIRECTORY = "outputs/reports"

OUTPUT_DIR="outputs/reports"

RANDOM_STATE = 42

TEST_SIZE = 0.20

# ==========================================================
# LOAD FEATURE DATASET
# ==========================================================

print("\nLoading Feature Dataset...")

if not os.path.exists(FEATURE_DATASET):

    raise FileNotFoundError(
        f"\nDataset Not Found\n{FEATURE_DATASET}"
    )

df = pd.read_csv(FEATURE_DATASET)

print("Dataset Loaded Successfully")

print(f"Rows    : {len(df)}")
print(f"Columns : {len(df.columns)}")


# ==========================================================
# VALIDATE DATASET
# ==========================================================

print("\nValidating Dataset...")

if df.empty:

    raise ValueError("Dataset is Empty.")

if "dropout_risk" not in df.columns:

    raise ValueError(
        "Target Column 'dropout_risk' Not Found."
    )

duplicate_rows = df.duplicated().sum()

print(f"Duplicate Rows : {duplicate_rows}")

missing_values = df.isnull().sum().sum()

print(f"Missing Values : {missing_values}")

print("Validation Completed")


# ==========================================================
# LEAKAGE FEATURES
# ==========================================================

LEAKAGE_COLUMNS = [

    "result",

    "semester_result",

    "grade_letter",

    "grade_point",

    "credit_points",

    "credits_earned_marks",

    "credits_earned",

    "credit_completion_ratio",

    "attendance_min",

    "attendance_max",

    "assignment_min",

    "assignment_max",

    "cie_min",

    "cie_max",

    "see_min",

    "see_max"

]


# ==========================================================
# SPLIT FEATURES & TARGET
# ==========================================================

print("\nSplitting Features & Target...")

student_ids = df["student_id"].copy()

X = df.drop(
    columns=[
        "student_id",
        "dropout_risk",
        *LEAKAGE_COLUMNS
    ],
    errors="ignore"
)

y = df["dropout_risk"]

print(f"Features : {X.shape[1]}")
print(f"Samples  : {len(X)}")

print("\nRemaining Features")

for column in X.columns:

    print(f"✓ {column}")

# ==========================================================
# TRAIN TEST SPLIT
# ==========================================================

print("\nCreating Train/Test Split...")

X_train, X_test, y_train, y_test = train_test_split(

    X,

    y,

    test_size=TEST_SIZE,

    random_state=RANDOM_STATE,

    stratify=y
)

print(f"Training Samples : {len(X_train)}")

print(f"Testing Samples  : {len(X_test)}")

# ==========================================================
# HANDLE CLASS IMBALANCE
# ==========================================================

# ==========================================================
# APPLY SMOTE
# ==========================================================

print("\nApplying SMOTE...")

print("\nBefore SMOTE")
print("-" * 40)
print(y_train.value_counts().sort_index())

print(f"\nTraining Samples Before SMOTE : {len(X_train)}")

smote = SMOTE(
    random_state=RANDOM_STATE
)

X_train, y_train = smote.fit_resample(
    X_train,
    y_train
)

print("\nAfter SMOTE")
print("-" * 40)
print(y_train.value_counts().sort_index())

print(f"\nTraining Samples After SMOTE : {len(X_train)}")

print("\nSMOTE Completed")

print("\n" + "=" * 80)
print("PHASE 1 COMPLETED")
print("=" * 80)

# ==========================================================
# INITIALIZE MODELS
# ==========================================================

print("\nInitializing Models...")

models = {

    "Logistic Regression": LogisticRegression(
        max_iter=1000,
        random_state=RANDOM_STATE
    ),

    "Decision Tree": DecisionTreeClassifier(
        random_state=RANDOM_STATE
    ),

    "Random Forest": RandomForestClassifier(
        n_estimators=300,
        random_state=RANDOM_STATE,
        n_jobs=-1
    ),

    "XGBoost": XGBClassifier(
        random_state=RANDOM_STATE,
        eval_metric="mlogloss"
    ),

    "LightGBM": LGBMClassifier(
        random_state=RANDOM_STATE,
        verbose=-1
    ),

    "Support Vector Machine": SVC(
        probability=True,
        random_state=RANDOM_STATE
    )

}

print(f"{len(models)} Models Initialized Successfully")

# ==========================================================
# RESULTS STORAGE
# ==========================================================

results = []

# ==========================================================
# TRAIN MODEL
# ==========================================================

def train_model(model, X_train, y_train):

    start_time = time.time()

    model.fit(X_train, y_train)

    training_time = time.time() - start_time

    return model, training_time

# ==========================================================
# EVALUATE MODEL
# ==========================================================

def evaluate_model(model, X_test, y_test):

    predictions = model.predict(X_test)

    accuracy = accuracy_score(
        y_test,
        predictions
    )

    precision = precision_score(
        y_test,
        predictions,
        average="weighted",
        zero_division=0
    )

    recall = recall_score(
        y_test,
        predictions,
        average="weighted",
        zero_division=0
    )

    f1 = f1_score(
        y_test,
        predictions,
        average="weighted",
        zero_division=0
    )

    report = classification_report(
        y_test,
        predictions
    )

    matrix = confusion_matrix(
        y_test,
        predictions
    )

    return (
        accuracy,
        precision,
        recall,
        f1,
        report,
        matrix
    )
    
# ==========================================================
# TRAIN ALL MODELS
# ==========================================================

print("\nTraining Models...")

trained_models = {}

for model_name, model in models.items():

    print("\n" + "=" * 70)
    print(f"Training : {model_name}")
    print("=" * 70)

    trained_model, training_time = train_model(
        model,
        X_train,
        y_train
    )

    (
        accuracy,
        precision,
        recall,
        f1,
        report,
        matrix
    ) = evaluate_model(
        trained_model,
        X_test,
        y_test
    )

    trained_models[model_name] = trained_model

    results.append({

        "Model": model_name,

        "Accuracy": accuracy,

        "Precision": precision,

        "Recall": recall,

        "F1 Score": f1,

        "Training Time (sec)": training_time

    })

    print(f"Accuracy  : {accuracy:.4f}")
    print(f"Precision : {precision:.4f}")
    print(f"Recall    : {recall:.4f}")
    print(f"F1 Score  : {f1:.4f}")
    print(f"Time      : {training_time:.2f} sec")
    

comparison_df = pd.DataFrame(results)

comparison_df = comparison_df.sort_values(

    by="Accuracy",

    ascending=False

)

best_model = comparison_df.iloc[0]

print("\nSelected Model")

print(best_model)

comparison_df.to_csv(

    os.path.join(
        OUTPUT_DIR,
        "dropsafe_models_comparison_v1.csv"
    ),

    index=False

)