import pandas as pd
import numpy as np

def run_forecast(df: pd.DataFrame, date_col: str, val_col: str, periods: int = 3) -> dict:
    df = df.dropna(subset=[date_col, val_col]).copy()
    df[date_col] = pd.to_datetime(df[date_col])
    df = df.sort_values(date_col)
    
    x = np.arange(len(df))
    y = df[val_col].values
    
    if len(x) < 2:
        return {"error": "Not enough data points to forecast"}
        
    slope, intercept = np.polyfit(x, y, 1)
    
    last_date = df[date_col].max()
    future_dates = [last_date + pd.Timedelta(days=30*i) for i in range(1, periods + 1)]
    future_y = (slope * np.arange(len(x), len(x) + periods) + intercept).round(2)
    
    return {
        "trend_direction": "increasing" if slope > 0 else "decreasing",
        "slope": round(slope, 2),
        "forecast": [{"date": d.strftime("%Y-%m-%d"), "value": v} for d, v in zip(future_dates, future_y)]
    }
