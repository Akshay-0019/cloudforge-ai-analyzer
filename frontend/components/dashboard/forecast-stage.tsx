'use client'

import { useMemo } from 'react'
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Cpu, TrendingUp } from 'lucide-react'
import { ANALYZE_ENDPOINT } from '@/lib/analyze'
import type { Point } from '@/lib/engine'
import { cn } from '@/lib/utils'

type Row = Point & { band?: [number, number] }

/** Host portion of the endpoint, for the footer provenance label. */
const ANALYZE_HOST = (() => {
  try {
    return new URL(ANALYZE_ENDPOINT).host
  } catch {
    return 'analyze service'
  }
})()

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ payload: Row }>
  label?: string
}) {
  if (!active || !payload?.length) return null
  const row = payload[0].payload
  const forecast = row.actual === null

  return (
    <div className="border-border-strong bg-popover/95 min-w-[168px] rounded-lg border p-2.5 shadow-2xl backdrop-blur-xl">
      <div className="flex items-center justify-between gap-3 pb-1.5">
        <span className="text-foreground font-mono text-[11px]">{label}</span>
        <span
          className={cn(
            'font-mono text-[9px] tracking-wider uppercase',
            forecast ? 'text-primary' : 'text-muted-foreground',
          )}
        >
          {forecast ? 'forecast' : 'observed'}
        </span>
      </div>
      <dl className="space-y-1">
        {row.actual !== null ? (
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-muted-foreground text-[11px]">Actual</dt>
            <dd className="text-foreground font-mono text-[11px] tabular-nums">
              {row.actual.toLocaleString()}
            </dd>
          </div>
        ) : null}
        {row.predicted !== null ? (
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-muted-foreground text-[11px]">Predicted</dt>
            <dd className="text-primary font-mono text-[11px] tabular-nums">
              {row.predicted.toLocaleString()}
            </dd>
          </div>
        ) : null}
        {forecast && row.upper !== null && row.lower !== null ? (
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-muted-foreground text-[11px]">95% CI</dt>
            <dd className="text-muted-foreground font-mono text-[11px] tabular-nums">
              {row.lower.toLocaleString()}–{row.upper.toLocaleString()}
            </dd>
          </div>
        ) : null}
      </dl>
      {row.anomaly ? (
        <p className="text-destructive border-border mt-2 border-t pt-1.5 font-mono text-[10px]">
          anomaly · residual &gt; 3σ
        </p>
      ) : null}
    </div>
  )
}

export function ForecastStage({
  data,
  horizon,
  sensitivity,
  edgeStream,
  fitting,
  rmse,
  model,
  live,
}: {
  data: Point[]
  horizon: number
  sensitivity: number
  edgeStream: boolean
  fitting: boolean
  /** null when the backend supplies no fit metric. */
  rmse: number | null
  model: string
  live: boolean
}) {
  // The service returns point projections only, so there is no interval to draw.
  const hasBand = useMemo(
    () => data.some((d) => d.upper !== null && d.lower !== null),
    [data],
  )
  const rows = useMemo<Row[]>(
    () =>
      data.map((d) => ({
        ...d,
        band:
          d.upper !== null && d.lower !== null
            ? ([d.lower, d.upper] as [number, number])
            : undefined,
      })),
    [data],
  )

  const splitPeriod = useMemo(() => {
    const last = data.filter((d) => d.actual !== null).at(-1)
    return last?.period
  }, [data])

  return (
    <section className="glass border-border animate-rise relative overflow-hidden rounded-xl border">
      <div className="grid-noise pointer-events-none absolute inset-0 opacity-40" />

      <header className="border-border relative flex flex-wrap items-center gap-x-4 gap-y-2 border-b px-5 py-3.5">
        <div className="flex items-center gap-2">
          <TrendingUp className="text-primary size-4" />
          <h2 className="text-foreground text-sm font-medium tracking-tight">
            Predictive Modeling
          </h2>
        </div>
        <span className="border-border text-muted-foreground rounded border px-1.5 py-0.5 font-mono text-[10px]">
          {model}
        </span>
        <div className="ml-auto flex items-center gap-4">
          {rmse !== null ? (
            <span className="text-muted-foreground font-mono text-[10px]">
              rmse <span className="text-foreground">{rmse.toFixed(2)}</span>
            </span>
          ) : null}
          <span className="text-muted-foreground font-mono text-[10px]">
            t+{horizon}
            {live ? '' : ` · ×${sensitivity.toFixed(2)}`}
          </span>
          <span
            className={cn(
              'flex items-center gap-1.5 font-mono text-[10px]',
              fitting ? 'text-warning' : edgeStream ? 'text-primary' : 'text-success',
            )}
          >
            <span
              className={cn(
                'size-1.5 rounded-full',
                fitting
                  ? 'bg-warning animate-pulse-dot'
                  : edgeStream
                    ? 'bg-primary animate-pulse-dot'
                    : 'bg-success',
              )}
            />
            {fitting ? 'fitting' : edgeStream ? 'streaming' : 'stable'}
          </span>
        </div>
      </header>

      <div className="relative h-[300px] w-full px-2 pt-5 pb-2 sm:h-[360px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={rows} margin={{ top: 4, right: 28, left: 4, bottom: 0 }}>
            <defs>
              <linearGradient id="bandFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.28} />
                <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.04} />
              </linearGradient>
            </defs>

            <CartesianGrid
              stroke="var(--border-strong)"
              strokeDasharray="2 6"
              vertical={false}
            />
            <XAxis
              dataKey="period"
              stroke="var(--border-strong)"
              tick={{
                fill: 'var(--muted-foreground)',
                fontSize: 10,
                fontFamily: 'var(--font-mono)',
              }}
              tickLine={false}
              interval="preserveStartEnd"
              minTickGap={18}
            />
            <YAxis
              stroke="transparent"
              tick={{
                fill: 'var(--muted-foreground)',
                fontSize: 10,
                fontFamily: 'var(--font-mono)',
              }}
              tickLine={false}
              width={48}
              domain={['dataMin - 140', 'dataMax + 140']}
              tickFormatter={(v: number) => `${(v / 1000).toFixed(1)}k`}
            />
            <Tooltip
              content={<ChartTooltip />}
              cursor={{ stroke: 'var(--primary)', strokeWidth: 1, strokeDasharray: '3 3' }}
            />

            {splitPeriod ? (
              <ReferenceLine
                x={splitPeriod}
                stroke="var(--primary)"
                strokeOpacity={0.45}
                strokeDasharray="4 4"
                label={{
                  value: 'now',
                  position: 'insideTopRight',
                  fill: 'var(--muted-foreground)',
                  fontSize: 9,
                  fontFamily: 'var(--font-mono)',
                }}
              />
            ) : null}

            {hasBand ? (
              <Area
                type="monotone"
                dataKey="band"
                stroke="none"
                fill="url(#bandFill)"
                connectNulls
                isAnimationActive={false}
              />
            ) : null}
            <Line
              type="monotone"
              dataKey="actual"
              stroke="var(--chart-2)"
              strokeWidth={1.5}
              dot={false}
              activeDot={{ r: 3, fill: 'var(--chart-2)', stroke: 'var(--background)' }}
              connectNulls={false}
              animationDuration={700}
            />
            <Line
              type="monotone"
              dataKey="predicted"
              stroke="var(--primary)"
              strokeWidth={2}
              strokeDasharray="5 4"
              dot={false}
              activeDot={{ r: 3.5, fill: 'var(--primary)', stroke: 'var(--background)' }}
              animationDuration={700}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <footer className="border-border relative flex flex-wrap items-center gap-x-5 gap-y-2 border-t px-5 py-2.5">
        <span className="text-muted-foreground flex items-center gap-1.5 text-[11px]">
          <span className="bg-chart-2 h-px w-4" />
          Observed
        </span>
        <span className="text-muted-foreground flex items-center gap-1.5 text-[11px]">
          <span className="bg-primary h-px w-4" />
          Predicted
        </span>
        {hasBand ? (
          <span className="text-muted-foreground flex items-center gap-1.5 text-[11px]">
            <span className="bg-primary/25 h-2.5 w-4 rounded-sm" />
            95% interval
          </span>
        ) : null}
        <span className="text-muted-foreground/70 ml-auto flex items-center gap-1.5 font-mono text-[10px]">
          <Cpu className="size-3" />
          {live
            ? `${ANALYZE_HOST} · point projections`
            : edgeStream
              ? 'online learning enabled'
              : 'checkpoint 0428_final'}
        </span>
      </footer>
    </section>
  )
}
