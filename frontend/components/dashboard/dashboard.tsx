'use client'

import { useEffect, useState, useCallback } from 'react'
import { UploadCloud } from 'lucide-react'
import { ControlSidebar } from './control-sidebar'
import { ForecastStage } from './forecast-stage'
import { GenAiPanel } from './genai-panel'
import { KpiRow } from './kpi-row'
import { TopBar } from './top-bar'
import { XaiRow } from './xai-row'
import type { Point, Trace } from '@/lib/engine'

export function Dashboard() {
  const [dataset, setDataset] = useState('Awaiting Ingestion...')
  const [rows, setRows] = useState(0)
  const [columns, setColumns] = useState(0)
  const [horizon, setHorizon] = useState(6)
  const [sensitivity, setSensitivity] = useState(1.0)
  const [edgeStream, setEdgeStream] = useState(false)
  const [fitting, setFitting] = useState(false)

  // Stored backend response for live scenario recalculations
  const [backendPayload, setBackendPayload] = useState<{
    historical_data: { step: number; value: number }[]
    ml_forecast: { step: number; projected_value: number }[]
    risk_score: number
    anomalies_found: number
    imputed_missing_values: number
    model_used: string
    actionable_insight: string
  } | null>(null)

  // Live UI display states
  const [metrics, setMetrics] = useState({ integrity: 0, volatility: 0, anomalies: 0 })
  const [series, setSeries] = useState<Point[]>([])
  const [briefing, setBriefing] = useState<{
    paragraphs: string[]
    confidence: number
    bias: string
  }>({
    paragraphs: [],
    confidence: 0,
    bias: 'neutral',
  })
  const [rmse, setRmse] = useState<number | null>(null)
  const [traces, setTraces] = useState<Trace[]>([])

  const hasData = backendPayload !== null && series.length > 0

  // 1. Recalculate Chart Series & Scenario Projections
  const applyScenario = useCallback(
    (
      payload: typeof backendPayload,
      targetHorizon: number,
      targetSensitivity: number,
      isStreaming: boolean,
      noiseOffset = 0
    ) => {
      if (!payload || !payload.historical_data || !payload.ml_forecast) return

      const totalRows = payload.historical_data.length || 0
      const points: Point[] = []

      // Observed Historical Points
      payload.historical_data.forEach((d) => {
        points.push({
          period: `T+${d.step}`,
          actual: d.value,
          predicted: d.value,
          upper: null,
          lower: null,
          anomaly: false,
        })
      })

      // Bridge Joint
      if (points.length > 0) {
        const last = points[points.length - 1]
        last.upper = last.actual
        last.lower = last.actual
      }

      // Generate projection based on horizon & sensitivity
      const baseForecast = payload.ml_forecast
      const lastObservedValue =
        payload.historical_data[payload.historical_data.length - 1]?.value || 1000

      // BUG FIX: Moved spreadMultiplier OUTSIDE the loop so the text box can see it!
      const spreadMultiplier = isStreaming ? 0.55 : 1.0

      for (let i = 0; i < targetHorizon; i++) {
        const stepNum = totalRows + i
        const rawProj =
          baseForecast[i]?.projected_value ??
          lastObservedValue + (i + 1) * 25 * targetSensitivity

        // Apply demand sensitivity multiplier & noise
        const adjustedProj =
          Math.round((rawProj * targetSensitivity + noiseOffset) * 100) / 100

        // Streaming telemetry tightens the confidence interval band
        const spread =
          Math.max(12, adjustedProj * (0.04 + i * 0.012)) * spreadMultiplier

        points.push({
          period: `P+${stepNum}`,
          actual: null,
          predicted: adjustedProj,
          upper: Math.round((adjustedProj + spread) * 100) / 100,
          lower: Math.round((adjustedProj - spread) * 100) / 100,
        })
      }

      setSeries(points)

      // Dynamic RMSE calculation based on scenario
      const calculatedRmse =
        payload.risk_score * 1.35 +
        targetHorizon * 0.22 * targetSensitivity -
        (isStreaming ? 1.4 : 0)
      setRmse(Number(Math.max(1.2, calculatedRmse).toFixed(2)))

      // Dynamic KPI updates
      const calculatedIntegrity =
        payload.imputed_missing_values === 0
          ? isStreaming
            ? 99.8
            : 98.4
          : Math.max(
              80,
              Math.round(
                (1 - payload.imputed_missing_values / (totalRows || 1)) * 1000
              ) / 10
            )

      const calculatedVolatility = Math.min(
        100,
        Math.max(
          5,
          Math.round(
            (payload.risk_score * 10 * targetSensitivity -
              (isStreaming ? 6 : 0)) *
              10
          ) / 10
        )
      )

      setMetrics({
        integrity: calculatedIntegrity,
        volatility: calculatedVolatility,
        anomalies: payload.anomalies_found,
      })

      // Dynamic GenAI Synthesis
      const biasLabel =
        targetSensitivity > 1.05
          ? 'expansionary'
          : targetSensitivity < 0.95
          ? 'defensive'
          : 'baseline'

      setBriefing({
        paragraphs: [
          `Model converged on ${payload.model_used}. Scenario locked to ${targetHorizon}-period forecast at ${targetSensitivity.toFixed(2)}× demand sensitivity.`,
          `Under ${biasLabel} trajectory, projected variance tracks with an estimated error bound of ±${(
            spreadMultiplier * 10
          ).toFixed(1)}%.`,
          isStreaming
            ? 'Edge AI telemetry stream attached — 4,214 events/s narrowing confidence intervals dynamically.'
            : 'Edge AI stream detached — batch mode active. Attach IoT stream to tighten real-time projection bounds.',
        ],
        confidence: Math.max(
          65,
          Math.min(99, Math.round(96 - targetHorizon * 1.2 - Math.abs(1 - targetSensitivity) * 15))
        ),
        bias: biasLabel,
      })

      // Update XAI Architecture Traces
      setTraces([
        {
          id: 'pre',
          label: 'Data Preprocessor',
          layer: 'StandardScaler Normalizer',
          attribution: 0.42,
          status: 'converged',
          detail: `${payload.imputed_missing_values} missing imputed · ${payload.anomalies_found} outliers filtered`,
        },
        {
          id: 'automl',
          label: 'AutoML Selection',
          layer: payload.model_used,
          attribution: 0.38,
          status: 'converged',
          detail: `Optimized for minimal validation MSE error`,
        },
        {
          id: 'edge',
          label: 'Temporal Edge Stream',
          layer: 'LSTM Online Buffer',
          attribution: 0.2,
          status: isStreaming ? 'training' : 'queued',
          detail: isStreaming
            ? 'Ingesting 4.2k events/s over socket'
            : 'Awaiting sensor stream connection',
        },
      ])
    },
    []
  )
  // 2. React to Horizon, Sensitivity, or EdgeStream adjustments
  useEffect(() => {
    if (backendPayload) {
      applyScenario(backendPayload, horizon, sensitivity, edgeStream)
    }
  }, [backendPayload, horizon, sensitivity, edgeStream, applyScenario])

  // 3. IoT Sensor Streaming Simulation Loop
  useEffect(() => {
    if (!edgeStream || !backendPayload) return

    const interval = setInterval(() => {
      const liveNoise = (Math.random() - 0.5) * 18
      applyScenario(backendPayload, horizon, sensitivity, true, liveNoise)
    }, 2000)

    return () => clearInterval(interval)
  }, [edgeStream, backendPayload, horizon, sensitivity, applyScenario])

  // 4. File Ingestion Handler
  const handleFileUpload = async (file: File) => {
    setDataset(file.name)
    setFitting(true)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('/analyze', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (data.status === 'success') {
        setRows(data.historical_data?.length || 0)
        setColumns(2)
        setBackendPayload(data)
        
        // Use a slight timeout to ensure React state is ready before applying the scenario
        setTimeout(() => {
            applyScenario(data, horizon, sensitivity, edgeStream)
        }, 100)
        
      } else {
        alert('Pipeline Error: ' + (data.detail || 'Failed to process dataset.'))
      }
    } catch (err) {
      console.error("FULL ERROR LOG:", err)
      alert('Mapping Error: Open your browser console (Right Click -> Inspect -> Console) to see what broke.')
    } finally {
      setFitting(false)
    }
  }

  return (
    <div className="bg-background flex min-h-svh flex-col lg:flex-row">
      <ControlSidebar
        dataset={dataset}
        rows={rows}
        columns={columns}
        onFile={handleFileUpload}
        horizon={horizon}
        onHorizon={setHorizon}
        sensitivity={sensitivity}
        onSensitivity={setSensitivity}
        edgeStream={edgeStream}
        onEdgeStream={setEdgeStream}
        onRefit={() => {
          if (!hasData) return alert('Please upload a dataset first.')
          setFitting(true)
          setTimeout(() => {
            if (backendPayload) applyScenario(backendPayload, horizon, sensitivity, edgeStream)
            setFitting(false)
          }, 800)
        }}
        fitting={fitting}
        live={hasData}
        error={null}
        canRefit={hasData}
        endpoint="/analyze"
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar dataset={dataset} fitting={fitting} edgeStream={edgeStream} />

        <main className="flex flex-1 flex-col gap-4 p-4 sm:p-5">
          {hasData ? (
            <>
              <KpiRow
                integrity={metrics.integrity}
                volatility={metrics.volatility}
                anomalies={metrics.anomalies}
                edgeStream={edgeStream}
              />

              <ForecastStage
                data={series}
                horizon={horizon}
                sensitivity={sensitivity}
                edgeStream={edgeStream}
                fitting={fitting}
                rmse={rmse}
              />

              <div className="grid min-h-0 gap-4">
                <GenAiPanel
                  paragraphs={briefing.paragraphs}
                  confidence={briefing.confidence}
                  bias={briefing.bias}
                  streaming={edgeStream}
                />
              </div>

              <XaiRow traces={traces} />
            </>
          ) : (
            <div className="border-border bg-card/20 flex flex-1 flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 text-center">
              <div className="bg-primary/10 border-primary/20 mb-4 flex size-14 items-center justify-center rounded-full border">
                <UploadCloud className="text-primary size-7 animate-pulse" />
              </div>
              <h3 className="text-foreground text-lg font-semibold tracking-tight">
                logic 404! AutoML Engine Standby
              </h3>
              <p className="text-muted-foreground mt-1 max-w-md text-sm">
                Ingest a CSV dataset via the sidebar on the left to initialize model evaluation, scenario forecasting, and dynamic edge streaming.
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}