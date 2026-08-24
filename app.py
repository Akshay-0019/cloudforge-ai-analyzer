from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import StreamingResponse
import pandas as pd
import io

app = FastAPI(title="Logic 404! Data Forecasting API", version="2.0")

@app.get("/")
def read_root():
    return {"message": "Welcome to Logic 404! API is running live."}

@app.post("/analyze")
async def analyze_csv(file: UploadFile = File(...)):
    # 1. Input Validation: Check file extension
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Invalid file format. Please upload a valid .csv file.")
    
    try:
        # Read the uploaded CSV file using pandas
        contents = await file.read()
        df = pd.read_csv(io.BytesIO(contents))
        
        # Validate columns (expects at least a date/category column and a numeric value column)
        if len(df.columns) < 2:
            raise HTTPException(status_code=400, detail="CSV must contain at least two columns (e.g., date and value).")
        
        # Assume first column is date/label and second is numeric metric
        date_col = df.columns[0]
        value_col = df.columns[1]
        
        # Clean data: drop nulls and convert numeric column
        df = df.dropna(subset=[value_col])
        df[value_col] = pd.to_numeric(df[value_col], errors='coerce')
        df = df.dropna(subset=[value_col])
        
        if df.empty:
            raise HTTPException(status_code=400, detail="No valid numeric data found in the selected value column.")

        # 2. Compute Summary Analytics
        summary_stats = {
            "total_rows": int(len(df)),
            "mean_value": float(df[value_col].mean()),
            "min_value": float(df[value_col].min()),
            "max_value": float(df[value_col].max()),
            "sum_value": float(df[value_col].sum())
        }

        # Simple forecasting/trend logic (mock forecasting projection based on mean growth)
        forecast_data = []
        last_val = float(df[value_col].iloc[-1])
        
        for i in range(1, 6):
            next_val = last_val * (1 + (0.02 * i)) # Simulated growth trend
            forecast_data.append({
                "step": i,
                "projected_value": round(next_val, 2)
            })

        return {
            "status": "success",
            "summary_analytics": summary_stats,
            "forecast": forecast_data
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing file: {str(e)}")

@app.post("/download-report")
async def download_report(file: UploadFile = File(...)):
    # 3. Downloadable Report Feature
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Please upload a valid .csv file.")
    
    try:
        contents = await file.read()
        df = pd.read_csv(io.BytesIO(contents))
        
        # Perform some simple transformation/processing for the export
        df['processed_flag'] = "Verified by Logic 404"
        
        # Stream back as a CSV download
        stream = io.StringIO()
        df.to_csv(stream, index=False)
        response = StreamingResponse(iter([stream.getvalue()]), media_type="text/csv")
        response.headers["Content-Disposition"] = "attachment; filename=processed_logic404_report.csv"
        return response

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating report: {str(e)}")