import pandas as pd
from analyzer import run_forecast

def test_run_forecast():
    dates = pd.date_range('2024-01-01', periods=5)
    df = pd.DataFrame({
        'date': dates,
        'revenue': [100, 200, 300, 400, 500]
    })
    
    result = run_forecast(df, 'date', 'revenue', periods=2)
    
    assert "error" not in result
    assert result["trend_direction"] == "increasing"
    assert result["slope"] == 100.0
    assert len(result["forecast"]) == 2
