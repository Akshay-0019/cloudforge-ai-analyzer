from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import HTMLResponse
import pandas as pd
import numpy as np
import io
import os
from sklearn.linear_model import LinearRegression, Ridge, Lasso, ElasticNet
from sklearn.neural_network import MLPRegressor
from sklearn.preprocessing import StandardScaler, PolynomialFeatures
from sklearn.pipeline import make_pipeline
from sklearn.metrics import mean_squared_error
from textblob import TextBlob
import google.generativeai as genai

app = FastAPI(title="Logic 404! AI Agent API", version="14.0")

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "PASTE_YOUR_API_KEY_HERE")

@app.get("/")
def read_root():
    return {"message": "Logic 404! AI Engine is live."}

@app.get("/dashboard", response_class=HTMLResponse)
def get_dashboard():
    html_content = """
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <title>Logic 404! | Terminal</title>
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        <style>
            :root { 
                --bg: #000000; 
                --panel: #050505; 
                --text: #cccccc; 
                --accent: #00ff41; /* Terminal Green */
                --danger: #ff003c; 
                --success: #00ff41; 
                --warning: #ffb000; /* Amber */
            }
            body { 
                font-family: 'Courier New', Consolas, monospace; 
                background-color: var(--bg); 
                color: var(--text); 
                margin: 0; padding: 20px; display: flex; height: 100vh; box-sizing: border-box; 
            }
            /* Sidebar */
            .sidebar { width: 280px; background: var(--panel); padding: 20px; display: flex; flex-direction: column; border: 1px solid #333; overflow-y: auto; }
            .sidebar h2 { font-size: 24px; margin-top: 0; color: var(--accent); letter-spacing: 2px; text-transform: uppercase; }
            .tagline { font-size: 11px; color: #666; margin-bottom: 25px; text-transform: uppercase; letter-spacing: 1px; }
            
            /* Terminal Buttons */
            .upload-btn { background-color: transparent; color: var(--accent); border: 1px solid var(--accent); padding: 12px; cursor: pointer; font-weight: bold; width: 100%; margin-top: 10px; font-family: 'Courier New', monospace; text-transform: uppercase; transition: 0.1s; }
            .upload-btn:hover { background-color: var(--accent); color: #000; }
            .inject-btn { color: var(--warning); border-color: var(--warning); }
            .inject-btn:hover { background-color: var(--warning); color: #000; }
            .iot-btn { color: var(--success); border-color: var(--success); }
            .iot-btn:hover { background-color: var(--success); color: #000; }
            
            /* Terminal Inputs */
            input[type=file] { color: #888; font-size: 12px; width: 100%; font-family: 'Courier New', monospace; }
            input[type=number] { background: #000; border: 1px solid #333; color: var(--accent); padding: 10px; width: 100%; box-sizing: border-box; margin-top: 5px; font-family: 'Courier New', monospace; }
            input[type=number]:focus { outline: none; border-color: var(--accent); }
            
            /* Main Content */
            .main-content { flex: 1; margin-left: 20px; display: flex; flex-direction: column; gap: 20px; overflow-y: auto; padding-right: 10px; }
            .kpi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
            .kpi-card { background: var(--panel); padding: 20px; border: 1px solid #333; text-align: center; }
            .kpi-title { font-size: 12px; color: #888; text-transform: uppercase; letter-spacing: 1px; }
            .kpi-value { font-size: 28px; font-weight: bold; margin-top: 10px; color: #fff; }
            
            .bottom-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 20px; flex: 1; min-height: 400px; }
            .chart-panel, .agent-panel { background: var(--panel); padding: 20px; border: 1px solid #333; display: flex; flex-direction: column;}
            
            .agent-header { display: flex; align-items: center; gap: 10px; color: var(--text); font-weight: bold; margin-bottom: 15px; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;}
            .agent-header span { display: inline-block; width: 10px; height: 10px; background: var(--accent); }
            #agentOutput { color: var(--accent); line-height: 1.6; font-size: 13px; flex: 1; overflow-y: auto; text-transform: uppercase; }
            .blinking-cursor { display: inline-block; width: 10px; height: 15px; background-color: var(--accent); animation: blink 1s step-end infinite; margin-left: 2px;}
            
            /* XAI Panel */
            .explanation-panel { background: #000; padding: 20px; border: 1px dashed #333; margin-top: 5px; }
            .explanation-title { color: #888; font-size: 12px; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 15px; display: flex; align-items: center; gap: 8px;}
            .explanation-title span { display: inline-block; width: 8px; height: 8px; background: #888; }
            .explanation-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
            .explain-box { padding: 15px; border-left: 2px solid var(--accent); background: transparent; }
            .explain-box h4 { margin: 0 0 8px 0; font-size: 13px; color: #fff; text-transform: uppercase; letter-spacing: 1px;}
            .explain-box p { margin: 0; font-size: 12px; color: #888; line-height: 1.5; }
            .box-dl { border-left-color: var(--warning); }
            .box-iot { border-left-color: var(--danger); }
            
            @keyframes blink { 50% { opacity: 0; } }
            canvas { flex: 1; max-height: 400px; }
        </style>
    </head>
    <body>
        <div class="sidebar">
            <h2>>_ logic 404!</h2>
            <div class="tagline">SYS.AUTOML.GENAI.v14</div>
            <div style="margin-bottom: 20px;">
                <label style="font-size:12px; color:#888; margin-bottom:10px; display:block;">[1] DATA INGESTION (CSV)</label>
                <input type="file" id="csvFile" accept=".csv">
                <button class="upload-btn" onclick="handleFileUpload()">EXECUTE PIPELINE</button>
            </div>
            <hr style="border-color: #333; margin-bottom: 20px; width: 100%;">
            <div style="margin-bottom: 20px;">
                <label style="font-size:12px; color:#888; display:block;">[2] SCENARIO OVERRIDE</label>
                <input type="number" id="manualValue" placeholder="AWAITING VAR...">
                <button class="upload-btn inject-btn" onclick="injectData()">INJECT VAR</button>
            </div>
            <hr style="border-color: #333; margin-bottom: 20px; width: 100%;">
            <div style="margin-bottom: 20px;">
                <label style="font-size:12px; color:#888; display:block;">[3] IOT SENSOR STREAM</label>
                <button class="upload-btn iot-btn" id="iotBtn" onclick="toggleIoTStream()">INIT SENSOR</button>
            </div>
            <div style="flex:1;"></div>
            <div class="tagline" style="margin-bottom:0; text-align:center;">STATUS: ONLINE</div>
        </div>

        <div class="main-content">
            <div class="kpi-grid">
                <div class="kpi-card">
                    <div class="kpi-title">DATA INTEGRITY (IMP)</div>
                    <div class="kpi-value" id="kpiImputed" style="color: var(--accent);">0</div>
                </div>
                <div class="kpi-card">
                    <div class="kpi-title">VOLATILITY RISK INDEX</div>
                    <div class="kpi-value" id="kpiRisk">--/10</div>
                </div>
                <div class="kpi-card">
                    <div class="kpi-title">ANOMALIES DETECTED</div>
                    <div class="kpi-value" id="kpiAnomalies" style="color: var(--danger);">0</div>
                </div>
            </div>
            <div class="bottom-grid">
                <div class="chart-panel">
                    <div style="color:#fff; font-weight: bold; margin-bottom: 15px; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">
                        MODEL_VIZ: [<span id="chartModelLabel" style="color: var(--warning);">AUTOML_IDLE</span>]
                    </div>
                    <canvas id="predictionChart"></canvas>
                </div>
                <div class="agent-panel">
                    <div class="agent-header"><span id="agentIndicator"></span> LLM DECISION AGENT</div>
                    <div id="agentOutput">AWAITING SYSTEM INGESTION...<span class="blinking-cursor"></span></div>
                </div>
            </div>
            
            <div class="explanation-panel">
                <div class="explanation-title"><span></span> SYSTEM ARCHITECTURE TRACE</div>
                <div class="explanation-grid">
                    <div class="explain-box">
                        <h4>> PREPROCESS</h4>
                        <p id="explain-1">SYS_IDLE. Z-Score anomaly detection and standard scaling normalization pending.</p>
                    </div>
                    <div class="explain-box box-dl">
                        <h4>> AUTOML RACE</h4>
                        <p id="explain-2">SYS_IDLE. 7-model holdout validation pending data injection.</p>
                    </div>
                    <div class="explain-box box-iot">
                        <h4>> LLM / EDGE</h4>
                        <p id="explain-3">SYS_IDLE. High-frequency sensor stream disconnected.</p>
                    </div>
                </div>
            </div>
        </div>

        <script>
            let chartInstance = null;
            let currentCSVText = ""; 
            let iotInterval = null;

            // Globally override Chart.js defaults to terminal font
            Chart.defaults.font.family = "'Courier New', monospace";
            Chart.defaults.color = '#666';

            function typeWriter(text, elementId, speed = 10) {
                const el = document.getElementById(elementId);
                el.innerHTML = ''; 
                let i = 0;
                function type() {
                    if (i < text.length) {
                        if (text.charAt(i) === '\\n') { el.innerHTML += '<br>'; } 
                        else { el.innerHTML += text.charAt(i); }
                        i++;
                        setTimeout(type, speed);
                    } else {
                        el.innerHTML += '<span class="blinking-cursor"></span>';
                    }
                }
                type();
            }

            async function handleFileUpload() {
                const fileInput = document.getElementById('csvFile');
                if (!fileInput.files.length) return alert("ERR: NO FILE DETECTED.");
                const reader = new FileReader();
                reader.onload = async function(e) {
                    currentCSVText = e.target.result;
                    await processData(currentCSVText);
                };
                reader.readAsText(fileInput.files[0]);
            }

            async function injectData() {
                if (!currentCSVText) return alert("ERR: PIPELINE UNINITIALIZED.");
                const newVal = document.getElementById('manualValue').value;
                if (!newVal) return alert("ERR: NULL VALUE ENTERED.");
                currentCSVText += `\\nSimulated_Step,${newVal}`;
                await processData(currentCSVText);
            }

            function toggleIoTStream() {
                if (!currentCSVText) return alert("ERR: CALIBRATION DATA REQUIRED.");
                const btn = document.getElementById('iotBtn');
                if (iotInterval) {
                    clearInterval(iotInterval);
                    iotInterval = null;
                    btn.innerHTML = 'INIT SENSOR';
                    btn.style.color = 'var(--success)';
                    btn.style.borderColor = 'var(--success)';
                    btn.style.backgroundColor = 'transparent';
                    document.getElementById('explain-3').innerHTML = "STREAM TERMINATED. Manual injection port open.";
                } else {
                    btn.innerHTML = 'HALT SENSOR';
                    btn.style.color = '#000';
                    btn.style.borderColor = 'var(--danger)';
                    btn.style.backgroundColor = 'var(--danger)';
                    document.getElementById('explain-3').innerHTML = "<span style='color:var(--danger)'>[LIVE]</span> Edge sensor polling at 2.5s intervals. Models retraining dynamically.";
                    iotInterval = setInterval(() => {
                        let currentVal = parseFloat(document.getElementById('manualValue').value);
                        let noise = currentVal * (Math.random() * 0.1 - 0.05);
                        document.getElementById('manualValue').value = (currentVal + noise).toFixed(2);
                        injectData();
                    }, 2500);
                }
            }

            async function processData(csvString) {
                const blob = new Blob([csvString], { type: 'text/csv' });
                const formData = new FormData();
                formData.append("file", blob, "data.csv");

                const response = await fetch('/analyze', { method: 'POST', body: formData });
                const result = await response.json();

                if (result.status !== "success") {
                    alert("ERR_PROCESS: " + (result.detail || "Corrupted File"));
                    return;
                }

                document.getElementById('kpiImputed').innerText = result.imputed_missing_values;
                const riskEl = document.getElementById('kpiRisk');
                riskEl.innerText = result.risk_score + '/10';
                riskEl.style.color = result.risk_score > 5 ? 'var(--danger)' : 'var(--success)';
                document.getElementById('kpiAnomalies').innerText = result.anomalies_found;

                document.getElementById('chartModelLabel').innerText = result.model_used;
                document.getElementById('explain-1').innerHTML = `Records parsed: ${result.historical_data.length}. Missing values imputed. StandardScaler applied.`;
                document.getElementById('explain-2').innerHTML = `AutoML evaluated 7 architectures. <strong>${result.model_used}</strong> selected for minimal MSE validation error. Forecasting T+5 steps.`;
                
                if (!iotInterval) {
                    document.getElementById('explain-3').innerHTML = `LLM Synthesized Constraints. Risk=${result.risk_score}. Anomalies=${result.anomalies_found}. Contextual generation complete.`;
                }

                if(iotInterval) {
                    document.getElementById('agentOutput').innerHTML = "> [LIVE STREAM ACTIVE]<br><br>" + result.actionable_insight.replace(/\\n/g, '<br>') + '<span class="blinking-cursor"></span>';
                } else {
                    typeWriter("> " + result.actionable_insight, 'agentOutput', 5); // Faster typing for terminal feel
                }

                const labels = [];
                const historyData = [];
                const forecastData = [];

                result.historical_data.forEach((d, index) => {
                    labels.push("T+" + d.step);
                    historyData.push(d.value);
                    forecastData.push(null);
                });

                const lastVal = historyData[historyData.length - 1];
                if(!iotInterval) document.getElementById('manualValue').value = lastVal;

                const lastIdx = result.historical_data.length - 1;
                forecastData[lastIdx] = result.historical_data[lastIdx].value;

                result.ml_forecast.forEach(d => {
                    labels.push("P+" + d.step);
                    historyData.push(null);
                    forecastData.push(d.projected_value);
                });

                if (chartInstance) chartInstance.destroy();
                const ctx = document.getElementById('predictionChart').getContext('2d');
                chartInstance = new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: labels,
                        datasets: [
                            { label: 'OBSERVED', data: historyData, borderColor: '#00ff41', backgroundColor: 'transparent', tension: 0, borderWidth: 1.5, pointRadius: 2, pointBackgroundColor: '#000', pointBorderColor: '#00ff41' },
                            { label: `PROJECTION`, data: forecastData, borderColor: '#ffb000', borderDash: [4, 4], tension: 0, borderWidth: 1.5, pointRadius: 3, pointBackgroundColor: '#000', pointBorderColor: '#ffb000' }
                        ]
                    },
                    options: { 
                        responsive: true, maintainAspectRatio: false, animation: iotInterval ? false : true,
                        scales: { 
                            x: { grid: { color: '#222', drawBorder: true, borderColor: '#333' } }, 
                            y: { grid: { color: '#222', drawBorder: true, borderColor: '#333' } } 
                        },
                        plugins: { legend: { position: 'top', labels: { boxWidth: 12, font: {family: "'Courier New', monospace"} } } }
                    }
                });
            }
        </script>
    </body>
    </html>
    """
    return HTMLResponse(content=html_content)

@app.post("/analyze")
async def analyze_csv(file: UploadFile = File(...)):
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Invalid file format.")
    
    try:
        contents = await file.read()
        df = pd.read_csv(io.BytesIO(contents))
        
        if len(df.columns) < 2:
            raise HTTPException(status_code=400, detail="CSV needs at least two columns.")
        
        value_col = df.columns[1]
        df[value_col] = pd.to_numeric(df[value_col], errors='coerce')
        
        missing_count = int(df[value_col].isnull().sum())
        if missing_count > 0:
            df[value_col] = df[value_col].fillna(df[value_col].mean())
        
        y = df[value_col].values
        if len(y) < 3:
            raise HTTPException(status_code=400, detail="Need at least 3 rows of data to train models.")
            
        sentiment_penalty = 0
        if 'Context' in df.columns:
            polarities = df['Context'].dropna().apply(lambda x: TextBlob(str(x)).sentiment.polarity)
            if not polarities.empty and polarities.mean() < 0:
                sentiment_penalty = abs(polarities.mean()) * 2 
        
        mean_val = df[value_col].mean()
        std_val = df[value_col].std()
        z_scores = np.zeros(len(df)) if std_val == 0 else (df[value_col] - mean_val) / std_val
        anomalies = int((abs(z_scores) > 2).sum())

        X = np.arange(len(df)).reshape(-1, 1)

        n_points = len(df)
        holdout_size = max(2, int(n_points * 0.2)) if n_points > 4 else 1
        
        train_X, test_X = X[:-holdout_size], X[-holdout_size:]
        train_y, test_y = y[:-holdout_size], y[-holdout_size:]

        models = {
            "LINEAR_REG": LinearRegression(),
            "RIDGE_L2": Ridge(),
            "LASSO_L1": Lasso(),
            "ELASTICNET": ElasticNet(),
            "POLY_DEG_2": make_pipeline(StandardScaler(), PolynomialFeatures(degree=2), LinearRegression()),
            "POLY_DEG_3": make_pipeline(StandardScaler(), PolynomialFeatures(degree=3), LinearRegression()),
            "MLP_DEEP_LEARNING": make_pipeline(StandardScaler(), MLPRegressor(hidden_layer_sizes=(50,), max_iter=2000, random_state=42))
        }

        best_model_name = "LINEAR_REG" 
        best_model = models[best_model_name]
        best_error = float('inf')

        for name, model in models.items():
            try:
                model.fit(train_X, train_y)
                preds = model.predict(test_X)
                error = mean_squared_error(test_y, preds)
                if error < best_error:
                    best_error = error
                    best_model_name = name
            except:
                pass 
        
        best_model = models[best_model_name]
        best_model.fit(X, y)
        
        risk_score = round(min(((std_val / (mean_val + 1e-5)) * 10) + sentiment_penalty, 10), 1)
        
        insight = f"SYS_REPORT:\n- Parsed {len(df)} elements.\n- Outlier violations: {anomalies}.\n\n"
        
        if GEMINI_API_KEY and GEMINI_API_KEY != "PASTE_YOUR_API_KEY_HERE":
            try:
                genai.configure(api_key=GEMINI_API_KEY)
                llm = genai.GenerativeModel('gemini-1.5-flash')
                prompt = f"Act as an AI system terminal. Data anomaly count is {anomalies}. Volatility risk is {risk_score}/10. The AI engine auto-selected {best_model_name} as the most accurate forecasting model. Give a 2 sentence strategic command based on this context. Be extremely concise and robotic."
                response = llm.generate_content(prompt)
                insight += f"LLM_DIRECTIVE:\n{response.text}"
            except Exception as e:
                insight += "LLM_DIRECTIVE:\nCONNECTION_ERR. Verify API gateway."
        else:
            insight += f"LLM_DIRECTIVE:\nAutoML locked to {best_model_name}. API key required for dynamic text generation."

        historical_data = [{"step": int(i), "value": float(val)} for i, val in enumerate(y)]
        
        future_X = np.arange(len(df), len(df) + 5).reshape(-1, 1)
        predictions = best_model.predict(future_X)
        forecast_data = [{"step": int(len(df) + i), "projected_value": round(float(pred), 2)} for i, pred in enumerate(predictions)]

        return {
            "status": "success",
            "imputed_missing_values": missing_count,
            "anomalies_found": anomalies,
            "risk_score": risk_score,
            "model_used": best_model_name,
            "actionable_insight": insight,
            "historical_data": historical_data,
            "ml_forecast": forecast_data
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))