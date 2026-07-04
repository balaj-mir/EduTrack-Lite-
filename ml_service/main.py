import os
import joblib
import pandas as pd
from typing import List, Optional, Union
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

app = FastAPI(
    title="EduTrack Lite - At-Risk ML Classifier API",
    description="Serves predictions from a Scikit-Learn Logistic Regression model trained on the OULAD dataset.",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MODEL_FILE = "model.pkl"
model = None

@app.on_event("startup")
def load_model():
    global model
    if os.path.exists(MODEL_FILE):
        model = joblib.load(MODEL_FILE)
        print(f"Loaded trained classifier from {MODEL_FILE}")
    else:
        print(f"Warning: {MODEL_FILE} not found. Attempting automatic training...")
        try:
            from train_model import train
            train()
            model = joblib.load(MODEL_FILE)
            print("Successfully trained and loaded classifier.")
        except Exception as e:
            print(f"Error loading/training model: {e}")

class StudentFeature(BaseModel):
    student_id: Optional[str] = "unknown"
    average_score: float = Field(..., ge=0.0, le=100.0, description="Student's average quiz score (0-100)")
    completion_percentage: float = Field(..., ge=0.0, le=100.0, description="Percentage of quizzes completed (0-100)")

class BatchPredictRequest(BaseModel):
    students: List[StudentFeature]

class StudentPrediction(BaseModel):
    student_id: str
    flag: str  # "On track" or "At risk"
    probability: float  # Probability of being At risk

class BatchPredictResponse(BaseModel):
    predictions: List[StudentPrediction]

@app.get("/")
def health_check():
    return {"status": "online", "model_loaded": model is not None, "dataset": "OULAD (Open University Learning Analytics Dataset)"}

@app.post("/predict", response_model=BatchPredictResponse)
def predict_batch(request: BatchPredictRequest):
    if model is None:
        raise HTTPException(status_code=503, detail="Model is not loaded.")
    
    if not request.students:
        return BatchPredictResponse(predictions=[])
    
    data = [
        {"average_score": s.average_score, "completion_percentage": s.completion_percentage}
        for s in request.students
    ]
    df = pd.DataFrame(data)
    
    # Predict At-Risk probabilities (label 1 is At risk)
    probabilities = model.predict_proba(df)[:, 1]
    predictions = model.predict(df)
    
    results = []
    for i, s in enumerate(request.students):
        prob = float(probabilities[i])
        flag = "At risk" if predictions[i] == 1 else "On track"
        results.append(StudentPrediction(
            student_id=str(s.student_id),
            flag=flag,
            probability=round(prob, 4)
        ))
        
    return BatchPredictResponse(predictions=results)

@app.post("/predict/single", response_model=StudentPrediction)
def predict_single(student: StudentFeature):
    if model is None:
        raise HTTPException(status_code=503, detail="Model is not loaded.")
    
    df = pd.DataFrame([{"average_score": student.average_score, "completion_percentage": student.completion_percentage}])
    prob = float(model.predict_proba(df)[:, 1][0])
    pred = int(model.predict(df)[0])
    
    return StudentPrediction(
        student_id=str(student.student_id),
        flag="At risk" if pred == 1 else "On track",
        probability=round(prob, 4)
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
