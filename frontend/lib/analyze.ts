/**
 * Client for the FastAPI AutoML service.
 *
 * The dashboard POSTs a CSV as multipart/form-data (field name `file`) and
 * receives the pipeline result, which is normalised here into the same shapes
 * the presentational components already consume.
 */

import type { Point } from './engine'

export const ANALYZE_ENDPOINT =
  process.env.NEXT_PUBLIC_ANALYZE_URL ?? 'http://localhost:8000/analyze'

/**
 * The backend reports `risk_score` on a 0–10 scale (e.g. 4.0). Change this if
 * your service uses a different ceiling — it drives the KPI meter fill only.
 */
export const RISK_SCALE_MAX = 10

export type AnalyzeResponse = {
  status: string
  imputed_missing_values: number
  anomalies_found: number
  risk_score: number
  model_used: string
  actionable_insight: string
  historical_data: Array<{ step: number; value: number }>
  ml_forecast: Array<{ step: number; projected_value: number }>
}

/** Normalised result the dashboard renders from. */
export type Analysis = {
  dataset: string
  rows: number
  imputed: number
  integrity: number
  anomalies: number
  risk: number
  model: string
  insight: string
  series: Point[]
  horizon: number
}

export class AnalyzeError extends Error {}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function asNumber(value: unknown, field: string): number {
  const n = typeof value === 'string' ? Number.parseFloat(value) : value
  if (typeof n !== 'number' || !Number.isFinite(n)) {
    throw new AnalyzeError(`Malformed response: "${field}" is not a number.`)
  }
  return n
}

function asString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new AnalyzeError(`Malformed response: "${field}" is missing.`)
  }
  return value
}

function asArray(value: unknown, field: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new AnalyzeError(`Malformed response: "${field}" is not an array.`)
  }
  return value
}

/**
 * Turns the two backend series into the single row set the chart expects.
 *
 * The service returns observed values and projections separately with no
 * in-sample fit, so `predicted` stays null across history — except on the last
 * observed point, which anchors the forecast line so it starts at "now" rather
 * than floating away from the observed series.
 */
function toSeries(raw: AnalyzeResponse): Point[] {
  const history = [...raw.historical_data].sort((a, b) => a.step - b.step)
  const forecast = [...raw.ml_forecast].sort((a, b) => a.step - b.step)

  const points: Point[] = history.map((h, i) => ({
    period: `t${h.step}`,
    actual: h.value,
    predicted: i === history.length - 1 ? h.value : null,
    upper: null,
    lower: null,
  }))

  for (const f of forecast) {
    points.push({
      period: `t${f.step}`,
      actual: null,
      predicted: f.projected_value,
      upper: null,
      lower: null,
    })
  }

  return points
}

function toAnalysis(raw: unknown, dataset: string): Analysis {
  if (!isRecord(raw)) {
    throw new AnalyzeError('Malformed response: expected a JSON object.')
  }

  const status = typeof raw.status === 'string' ? raw.status : 'unknown'
  if (status !== 'success') {
    throw new AnalyzeError(`Pipeline reported status "${status}".`)
  }

  const history = asArray(raw.historical_data, 'historical_data').map((row, i) => {
    if (!isRecord(row)) {
      throw new AnalyzeError(`Malformed response: historical_data[${i}].`)
    }
    return {
      step: asNumber(row.step, `historical_data[${i}].step`),
      value: asNumber(row.value, `historical_data[${i}].value`),
    }
  })

  if (history.length === 0) {
    throw new AnalyzeError('Response contained no historical_data to plot.')
  }

  const forecast = asArray(raw.ml_forecast, 'ml_forecast').map((row, i) => {
    if (!isRecord(row)) {
      throw new AnalyzeError(`Malformed response: ml_forecast[${i}].`)
    }
    return {
      step: asNumber(row.step, `ml_forecast[${i}].step`),
      projected_value: asNumber(
        row.projected_value,
        `ml_forecast[${i}].projected_value`,
      ),
    }
  })

  const parsed: AnalyzeResponse = {
    status,
    imputed_missing_values: asNumber(
      raw.imputed_missing_values,
      'imputed_missing_values',
    ),
    anomalies_found: asNumber(raw.anomalies_found, 'anomalies_found'),
    risk_score: asNumber(raw.risk_score, 'risk_score'),
    model_used: asString(raw.model_used, 'model_used'),
    actionable_insight: asString(raw.actionable_insight, 'actionable_insight'),
    historical_data: history,
    ml_forecast: forecast,
  }

  const rows = parsed.historical_data.length
  const clean = Math.max(0, rows - parsed.imputed_missing_values)

  return {
    dataset,
    rows,
    imputed: parsed.imputed_missing_values,
    integrity: (clean / rows) * 100,
    anomalies: parsed.anomalies_found,
    risk: parsed.risk_score,
    model: parsed.model_used,
    insight: parsed.actionable_insight,
    series: toSeries(parsed),
    horizon: parsed.ml_forecast.length,
  }
}

/** POSTs `file` to the analyze endpoint and returns the normalised result. */
export async function analyzeFile(
  file: File,
  signal?: AbortSignal,
): Promise<Analysis> {
  const body = new FormData()
  body.append('file', file)

  let response: Response
  try {
    response = await fetch(ANALYZE_ENDPOINT, { method: 'POST', body, signal })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    // fetch() only rejects on network/CORS/mixed-content failures.
    throw new AnalyzeError(
      `Could not reach the analyze service at ${ANALYZE_ENDPOINT}. Confirm it is running and that CORS allows this origin.`,
    )
  }

  if (!response.ok) {
    // FastAPI puts validation errors in `detail`; surface it when present.
    let detail = ''
    try {
      const payload: unknown = await response.json()
      if (isRecord(payload) && typeof payload.detail === 'string') {
        detail = ` — ${payload.detail}`
      }
    } catch {
      // non-JSON error body, the status alone will have to do
    }
    throw new AnalyzeError(`Analyze failed: ${response.status}${detail}`)
  }

  let payload: unknown
  try {
    payload = await response.json()
  } catch {
    throw new AnalyzeError('Analyze service returned a non-JSON response.')
  }

  return toAnalysis(payload, file.name)
}

/** KPI card values, branched between a live backend result and the demo model. */
export function deriveKpis(
  analysis: Analysis | null,
  fallback: { integrity: number; volatility: number; anomalies: number },
  edgeStream: boolean,
) {
  if (analysis) {
    return {
      integrity: analysis.integrity,
      integrityCaption: `${analysis.imputed.toLocaleString()} imputed of ${analysis.rows.toLocaleString()} rows parsed`,
      integrityDelta: analysis.imputed === 0 ? 'no gaps found' : 'gaps coalesced',
      volatility: analysis.risk,
      volatilityMax: RISK_SCALE_MAX,
      volatilityCaption:
        analysis.risk > RISK_SCALE_MAX / 2
          ? 'high dispersion — widen safety stock'
          : 'dispersion within tolerance band',
      anomalies: analysis.anomalies,
      anomaliesCaption: `flagged by ${analysis.model} residual scan`,
    }
  }

  return {
    integrity: fallback.integrity,
    integrityCaption: '0.6% null coalesced · 14 dtype casts',
    integrityDelta: edgeStream ? '+1.1 with stream' : 'batch validated',
    volatility: fallback.volatility,
    volatilityMax: 100,
    volatilityCaption:
      fallback.volatility > 55
        ? 'high dispersion — widen safety stock'
        : 'dispersion within tolerance band',
    anomalies: fallback.anomalies,
    anomaliesCaption: 'isolation forest · contamination 0.04',
  }
}
