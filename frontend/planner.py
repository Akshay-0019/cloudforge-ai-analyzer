import json
import os
from google import genai
from google.genai import types

# Initialize the Gemini client
client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))

AVAILABLE_TOOLS = [{
    "name": "forecast_next_periods",
    "description": "Project a numeric column's value.",
    "params": ["date_column", "value_column", "periods"]
}]

def plan_analysis(columns: list[str], dtypes: dict, sample_rows: list[dict]) -> dict:
    prompt = f"Columns: {columns}\nChoose a tool from: {json.dumps(AVAILABLE_TOOLS)}\nRespond with ONLY valid JSON containing 'tool' and 'params'."
    
    # Updated to the latest model: gemini-3.6-flash
    response = client.models.generate_content(
        model='gemini-3.6-flash',
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            temperature=0.1
        )
    )
    return json.loads(response.text.strip())

def explain_results(plan: dict, results: dict) -> str:
    prompt = f"Analysis: {plan['tool']}. Results: {json.dumps(results)}. Explain in 2 sentences."
    
    # Updated to the latest model: gemini-3.6-flash
    response = client.models.generate_content(
        model='gemini-3.6-flash',
        contents=prompt,
    )
    return response.text.strip()
