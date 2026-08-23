import os
from google import genai

client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))

print("Asking Google for available models...")
for m in client.models.list():
    if "flash" in m.name.lower():
        print(m.name)
