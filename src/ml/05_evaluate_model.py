import os
import joblib
import pandas as pd
import matplotlib.pyplot as plt

from lightgbm import LGBMClassifier

from sklearn.model_selection import (
    train_test_split,
    cross_validate
)
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    classification_report,
    confusion_matrix,
    ConfusionMatrixDisplay
)

from imblearn.over_sampling import SMOTE

RANDOM_STATE = 42
TEST_SIZE = 0.20

BASE_DIR = os.path.dirname(__file__)

DATASET_PATH = os.path.join(
    BASE_DIR,
    "datasets",
    "dropsafe_feature_dataset_v1.csv"
)

MODEL_DIR = os.path.join(
    BASE_DIR,
    "models"
)

REPORT_DIR = os.path.join(
    BASE_DIR,
    "outputs",
    "reports"
)

os.makedirs(MODEL_DIR, exist_ok=True)
os.makedirs(REPORT_DIR, exist_ok=True)

print("Loading Dataset...")

df = pd.read_csv(DATASET_PATH)

print(df.shape)

X = df.drop(
    columns=[
        "dropout_risk",
        "grade_letter",
        "grade_point",
        "credit_points",
        "credits_earned",
        "credits_earned_marks",
        "result",
        "attendance_min",
        "attendance_max",
        "assignment_min",
        "assignment_max",
        "cie_min",
        "cie_max",
        "see_min",
        "see_max",
        "credit_completion_ratio"
    ],
    errors="ignore"
)

y = df["dropout_risk"]

X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=TEST_SIZE,
    random_state=RANDOM_STATE,
    stratify=y
)

smote = SMOTE(random_state=RANDOM_STATE)

X_train, y_train = smote.fit_resample(
    X_train,
    y_train
)

model = LGBMClassifier(
    random_state=RANDOM_STATE,
    verbose=-1
)

model.fit(
    X_train,
    y_train
)
y_pred = model.predict(X_test)

accuracy = accuracy_score(y_test, y_pred)

precision = precision_score(
    y_test,
    y_pred,
    average="weighted"
)

recall = recall_score(
    y_test,
    y_pred,
    average="weighted"
)

f1 = f1_score(
    y_test,
    y_pred,
    average="weighted"
)

print("=" * 60)

print(f"Accuracy  : {accuracy:.4f}")
print(f"Precision : {precision:.4f}")
print(f"Recall    : {recall:.4f}")
print(f"F1 Score  : {f1:.4f}")

print("=" * 60)

metrics_df = pd.DataFrame({

    "Metric": [
        "Accuracy",
        "Precision",
        "Recall",
        "F1 Score"
    ],

    "Value": [
        accuracy,
        precision,
        recall,
        f1
    ]

})

metrics_df.to_csv(

    os.path.join(

        REPORT_DIR,

        "dropsafe_lightgbm_evaluation_metrics_v1.csv"

    ),

    index=False

)

print("\nEvaluation Metrics Saved Successfully")

report = classification_report(
    y_test,
    y_pred,
    output_dict=True
)

report_df = pd.DataFrame(report).transpose()

report_df.to_csv(

    os.path.join(
        REPORT_DIR,
        "dropsafe_lightgbm_classification_report_v1.csv"
    ),

    index=True

)

print("\nClassification Report Saved Successfully")

print("\nClassification Report\n")

print(
    classification_report(
        y_test,
        y_pred
    )
)

cm = confusion_matrix(
    y_test,
    y_pred
)

disp = ConfusionMatrixDisplay(
    confusion_matrix=cm
)

disp.plot()

plt.savefig(
    os.path.join(
        REPORT_DIR,
        "dropsafe_confusion_matrix_v1.png"
    )
)

plt.close()

importance = pd.DataFrame({

    "Feature": X.columns,

    "Importance": model.feature_importances_

})

importance = importance.sort_values(
    by="Importance",
    ascending=False
)

print("\nTop 10 Features\n")

print(
    importance.head(10)
)

importance.to_csv(

    os.path.join(
        REPORT_DIR,
        "dropsafe_lightgbm_feature_importance_v1.csv"
    ),

    index=False

)


print("\nRunning 5-Fold Cross Validation...")

cv_results = cross_validate(

    LGBMClassifier(
        random_state=RANDOM_STATE,
        verbose=-1
    ),

    X,
    y,

    cv=5,

    scoring=[
        "accuracy",
        "precision_weighted",
        "recall_weighted",
        "f1_weighted"
    ]

)

cv_df = pd.DataFrame({

    "Metric": [
        "CV Accuracy",
        "CV Precision",
        "CV Recall",
        "CV F1 Score"
    ],

    "Average Score": [

        cv_results["test_accuracy"].mean(),

        cv_results["test_precision_weighted"].mean(),

        cv_results["test_recall_weighted"].mean(),

        cv_results["test_f1_weighted"].mean()

    ]

})

cv_df.to_csv(

    os.path.join(
        REPORT_DIR,
        "dropsafe_lightgbm_cross_validation_v1.csv"
    ),

    index=False

)

print("\nCross Validation Results")

print(cv_df)

print("\nCross Validation Report Saved Successfully")

joblib.dump(

    model,

    os.path.join(
        MODEL_DIR,
        "dropsafe_lightgbm_v1.pkl"
    )

)

print("Model Saved Successfully")