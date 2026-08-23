import io
import pandas as pd
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from mangum import Mangum
from planner import plan_analysis, explain_results
from analyzer import run_forecast

app = FastAPI(title="Cloudforge AI Analysis API")

# Allow the browser to talk to this backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.post("/analyze")
async def analyze_file(file: UploadFile = File(...)):
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are supported")
    
    content = await file.read()
    try:
        df = pd.read_csv(io.BytesIO(content))
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid CSV format")

    columns = df.columns.tolist()
    dtypes = {k: str(v) for k, v in df.dtypes.items()}
    sample_rows = df.head(3).to_dict(orient="records")

    try:
        plan = plan_analysis(columns, dtypes, sample_rows)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    if plan["tool"] == "forecast_next_periods":
        results = run_forecast(
            df, 
            date_col=plan["params"].get("date_column"), 
            val_col=plan["params"].get("value_column"),
            periods=int(plan["params"].get("periods", 3))
        )
    else:
        results = {"error": f"Tool {plan['tool']} not fully implemented in this demo."}

    if "error" in results:
        raise HTTPException(status_code=400, detail=results["error"])

    explanation = explain_results(plan, results)

    return {
        "plan": plan,
        "results": results,
        "explanation": explanation
    }

# This specific line is what allows AWS Lambda to run the app later
handler = Mangum(app)
