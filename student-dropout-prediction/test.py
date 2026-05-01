import pandas as pd
import joblib

saved = joblib.load("best_dropout_model.pkl")

model = saved["model"]
threshold = saved["threshold"]
train_columns = saved["columns"]

print("Model loaded successfully")

df = pd.read_csv("synthetic_students.csv")

drop_cols = [
    "student_id", "name", "email", "phone",
    "registration_date", "last_active_date",
    "mentor_assigned"
]

df = df.drop(columns=drop_cols, errors="ignore")

df = pd.get_dummies(df)

df = df.reindex(columns=train_columns, fill_value=0)

y_prob = model.predict_proba(df)[:, 1]
y_pred = (y_prob >= threshold).astype(int)

df["Dropout_Probability"] = y_prob
df["Predicted_Dropout"] = y_pred

print(df[["Dropout_Probability", "Predicted_Dropout"]].head())

df.to_csv("final_predictions.csv", index=False)

print("Predictions saved")