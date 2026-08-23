from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
from mangum import Mangum
import io

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"status": "online", "message": "Logic 404! Backend is live on AWS!"}

@app.post("/analyze")
async def analyze_file(file: UploadFile = File(...)):
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are supported")
    
    try:
        contents = await file.read()
        df = pd.read_csv(io.StringIO(contents.decode('utf-8')))
        
        # Simple processing for preview
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
            
        return {
            "status": "success",
            "results": {"forecast": forecast}
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

handler = Mangum(app)
