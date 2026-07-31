import os
import joblib
import pandas as pd



# ==========================================================
# DropSafe - Student Prediction Module
# Step 1: Load Required Resources
# ==========================================================

print("=" * 60)
print("DropSafe - Student Prediction Module")
print("=" * 60)

# ----------------------------------------------------------
# File Paths
# ----------------------------------------------------------

DATASET_PATH = "datasets/dropsafe_feature_dataset_v1.csv"
MODEL_PATH = "models/dropsafe_lightgbm_v1.pkl"
FEATURE_COLUMNS_PATH = "encoders/dropsafe_feature_columns_v1.pkl"
LABEL_ENCODERS_PATH = "encoders/dropsafe_label_encoders_v1.pkl"

# ----------------------------------------------------------
# Check Files Exist
# ----------------------------------------------------------

required_files = [
    DATASET_PATH,
    MODEL_PATH,
    FEATURE_COLUMNS_PATH,
    LABEL_ENCODERS_PATH
]

print("\nChecking required files...\n")

for file in required_files:
    if not os.path.exists(file):
        raise FileNotFoundError(f"File not found: {file}")

print(" All required files found.")

# ----------------------------------------------------------
# Load Dataset
# ----------------------------------------------------------

dataset = pd.read_csv(DATASET_PATH)

print(f" Dataset Loaded Successfully")
print(f"   Shape : {dataset.shape}")

# ----------------------------------------------------------
# Load Trained Model
# ----------------------------------------------------------

model = joblib.load(MODEL_PATH)

print(" Model Loaded Successfully")

# ----------------------------------------------------------
# Load Feature Columns
# ----------------------------------------------------------

feature_columns = joblib.load(FEATURE_COLUMNS_PATH)

print(f" Feature Columns Loaded")
print(f"   Total Features : {len(feature_columns)}")

# ----------------------------------------------------------
# Load Label Encoders
# ----------------------------------------------------------

label_encoders = joblib.load(LABEL_ENCODERS_PATH)

print(" Label Encoders Loaded")


print("\n" + "=" * 60)
print("Step 1 Completed Successfully")
print("=" * 60)

# Separate features and target
X = dataset.drop(columns=["dropout_risk"])
y = dataset["dropout_risk"]

print("\nDataset feature count :", len(X.columns))
print("Saved feature count   :", len(feature_columns))

print("\nChecking feature order...")

if list(X.columns) != feature_columns:
    raise ValueError("Feature columns do not match the training data.")

print("Feature columns verified successfully.")

# Display the features stored inside the trained model

print("\nModel Information")
print("-" * 60)

print(f"Model expects {model.n_features_in_} features")

print("\nFeatures used during training:")

for index, feature in enumerate(model.feature_name_, start=1):
    print(f"{index:2}. {feature}")
    
print("\nComparing dataset features with model features")
print("-" * 60)

dataset_features = set(X.columns)
model_features = set(model.feature_name_)

missing_in_dataset = model_features - dataset_features
extra_in_dataset = dataset_features - model_features

print(f"Dataset feature count : {len(dataset_features)}")
print(f"Model feature count   : {len(model_features)}")

print("\nMissing features in dataset:")
if missing_in_dataset:
    for feature in sorted(missing_in_dataset):
        print(feature)
else:
    print("None")

print("\nExtra features in dataset:")
if extra_in_dataset:
    for feature in sorted(extra_in_dataset):
        print(feature)
else:
    print("None")
    
# Validate dataset against model features

required_features = list(model.feature_name_)

missing_features = [
    feature for feature in required_features
    if feature not in X.columns
]

if missing_features:
    raise ValueError(
        "Prediction failed.\n"
        f"Missing required features: {missing_features}"
    )

# Keep only the features used during training
X = X[required_features]

print(f"\nPrediction dataset shape: {X.shape}")

# Generate predictions

predictions = model.predict(X)

print("\nPredictions generated successfully.")
print(f"Total predictions : {len(predictions)}")

print("\nFirst 10 Predictions")
print(predictions[:10])
print("Total rows:", len(dataset))

print("Unique students:", dataset["student_id"].nunique())