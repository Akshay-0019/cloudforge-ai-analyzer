from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
from mangum import Mangum
from planner import plan_analysis, explain_results
import io

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/analyze")
async def analyze_file(file: UploadFile = File(...)):
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are supported")
    
    try:
        contents = await file.read()
        df = pd.read_csv(io.StringIO(contents.decode('utf-8')))
        
        plan = plan_analysis(list(df.columns), df.dtypes.astype(str).to_dict(), df.head(3).to_dict('records'))
        
        # Execute the forecasted plan mathematically
        periods = 12
        date_col = df.columns[0]
        val_col = df.columns[1]
        
        df[date_col] = pd.to_datetime(df[date_col])
        df = df.sort_values(date_col)
        
        avg_monthly_change = df[val_col].diff().mean()
        last_date = df[date_col].iloc[-1]
        last_val = df[val_col].iloc[-1]
        
        forecast = []
        for i in range(1, periods + 1):
            next_date = last_date + pd.DateOffset(months=i)
            next_val = last_val + (avg_monthly_change * i)
            forecast.append({
                "date": next_date.strftime('%Y-%m-%d'),
                "value": round(next_val, 2)
            })
            
        explanation = explain_results(plan, {"forecast_periods": periods, "trend": "upward", "avg_change": avg_monthly_change})
        
        return {
            "plan": plan,
            "explanation": explanation,
            "results": {"forecast": forecast}
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# This is the crucial adapter for AWS Lambda
handler = Mangum(app)
