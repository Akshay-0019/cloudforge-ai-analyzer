/**
 * Deterministic synthetic model output for the logic 404! AutoML engine.
 * A seeded PRNG keeps server and client renders identical (no hydration drift).
 */

function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export type Point = {
  period: string
  actual: number | null
  /** null where no fitted value exists for the period (live backend history). */
  predicted: number | null
  upper: number | null
  lower: number | null
  anomaly?: boolean
}

const PERIODS = [
  'W01',
  'W02',
  'W03',
  'W04',
  'W05',
  'W06',
  'W07',
  'W08',
  'W09',
  'W10',
  'W11',
  'W12',
  'W13',
  'W14',
  'W15',
  'W16',
  'W17',
  'W18',
  'W19',
  'W20',
  'W21',
  'W22',
  'W23',
  'W24',
  'W25',
  'W26',
  'W27',
  'W28',
  'W29',
  'W30',
]

/**
 * @param horizon number of forecast periods to project beyond observed history
 * @param drift scenario sensitivity multiplier (1 = baseline)
 * @param seed PRNG seed — bump it to simulate a re-fit of the pipeline
 */
export function buildSeries(horizon: number, drift = 1, seed = 42): Point[] {
  const rand = mulberry32(seed)
  const observed = 18
  const total = observed + Math.max(1, Math.min(12, horizon))
  const out: Point[] = []
  let level = 1240

  for (let i = 0; i < total; i++) {
    const season = Math.sin((i / 6.2) * Math.PI) * 88
    const trend = i * 21.5
    const noise = (rand() - 0.5) * 74
    const base = level + trend + season + noise

    if (i < observed) {
      const spike = i === 7 ? 210 : i === 13 ? -186 : 0
      out.push({
        period: PERIODS[i],
        actual: Math.round(base + spike),
        predicted: Math.round(base * 0.995),
        upper: null,
        lower: null,
        anomaly: spike !== 0,
      })
    } else {
      const step = i - observed + 1
      const projected = base + step * 26 * drift
      const spread = 46 + step * 27
      out.push({
        period: PERIODS[i],
        actual: null,
        predicted: Math.round(projected),
        upper: Math.round(projected + spread),
        lower: Math.round(projected - spread),
      })
    }
  }

  // stitch the band so the forecast ribbon starts at the last observed point
  const joint = out[observed - 1]
  joint.upper = joint.actual
  joint.lower = joint.actual
  return out
}

export function deriveMetrics(horizon: number, drift: number, edge: boolean) {
  const rand = mulberry32(horizon * 31 + Math.round(drift * 100))
  const integrity = 97.4 + (edge ? 1.1 : 0) - horizon * 0.08
  const volatility = 26 + horizon * 2.4 * drift - (edge ? 3.1 : 0)
  const anomalies = 4 + Math.floor(rand() * 3) + Math.floor(horizon / 4)
  return {
    integrity: Math.min(99.9, Math.max(88, integrity)),
    volatility: Math.min(98, Math.max(6, volatility)),
    anomalies,
  }
}

export type Trace = {
  id: string
  label: string
  layer: string
  attribution: number
  status: 'converged' | 'training' | 'queued'
  detail: string
}

export function buildTraces(edge: boolean): Trace[] {
  return [
    {
      id: 'shap',
      label: 'SHAP Attribution',
      layer: 'dense_4 › 512u › relu',
      attribution: 0.41,
      status: 'converged',
      detail: 'regional_demand dominates gradient flow',
    },
    {
      id: 'lstm',
      label: 'Temporal Encoder',
      layer: 'lstm_2 › 256u › tanh',
      attribution: 0.33,
      status: edge ? 'training' : 'converged',
      detail: edge
        ? 're-fitting on live IoT window (4.2k events/s)'
        : 'seasonality captured at lag 6',
    },
    {
      id: 'grad',
      label: 'Counterfactual Probe',
      layer: 'ridge › l2 α=0.07',
      attribution: 0.26,
      status: 'queued',
      detail: 'awaiting scenario lock to evaluate',
    },
  ]
}

export function buildBriefing(
  horizon: number,
  drift: number,
  edge: boolean,
  dataset: string,
) {
  const bias = drift > 1.15 ? 'expansionary' : drift < 0.85 ? 'defensive' : 'neutral'
  return {
    confidence: Math.round(Math.max(58, 94 - horizon * 1.8 - Math.abs(1 - drift) * 22)),
    bias,
    paragraphs: [
      `Pipeline converged on ${dataset} after 3 candidate architectures. The temporal encoder outperformed the gradient-boosted baseline by 6.4% RMSE, so the ${horizon}-period projection is served from the deep model with a ridge fallback held warm.`,
      `Under the ${bias} scenario (sensitivity ×${drift.toFixed(2)}), demand crosses the current capacity ceiling near period ${18 + Math.max(2, Math.round(horizon * 0.6))}. Recommend staging procurement one cycle earlier and holding a ${drift > 1 ? '12%' : '6%'} buffer against the upper confidence bound.`,
      edge
        ? `Edge stream is attached — telemetry is narrowing the interval in-flight, and the encoder is re-fitting on the live window. Treat the current band as provisional until the next checkpoint.`
        : `Edge stream is detached, so the interval reflects batch history only. Attaching live telemetry would tighten the band by an estimated 18%.`,
    ],
  }
}
