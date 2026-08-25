import { AlertTriangle, ShieldCheck, Waves } from 'lucide-react'
import { cn } from '@/lib/utils'

type Metric = {
  key: string
  label: string
  value: string
  unit?: string
  caption: string
  meter: number
  tone: 'primary' | 'warning' | 'destructive'
  icon: React.ComponentType<{ className?: string }>
  delta: string
}

const toneMap = {
  primary: { text: 'text-primary', bar: 'bg-primary' },
  warning: { text: 'text-warning', bar: 'bg-warning' },
  destructive: { text: 'text-destructive', bar: 'bg-destructive' },
} as const

export function KpiRow({
  integrity,
  integrityCaption,
  integrityDelta,
  volatility,
  volatilityMax,
  volatilityCaption,
  anomalies,
  anomaliesCaption,
  live,
}: {
  integrity: number
  integrityCaption: string
  integrityDelta: string
  volatility: number
  volatilityMax: number
  volatilityCaption: string
  anomalies: number
  anomaliesCaption: string
  live: boolean
}) {
  const hot = volatility > volatilityMax / 2
  const metrics: Metric[] = [
    {
      key: 'integrity',
      label: 'Data Integrity',
      value: integrity.toFixed(1),
      unit: '%',
      caption: integrityCaption,
      meter: integrity,
      tone: 'primary',
      icon: ShieldCheck,
      delta: integrityDelta,
    },
    {
      key: 'volatility',
      label: 'Volatility Risk Score',
      // A 0–10 backend score keeps its decimal; the 0–100 demo scale doesn't.
      value: volatilityMax <= 10 ? volatility.toFixed(1) : volatility.toFixed(0),
      unit: `/${volatilityMax}`,
      caption: volatilityCaption,
      meter: (volatility / volatilityMax) * 100,
      tone: hot ? 'destructive' : 'warning',
      icon: Waves,
      delta: live ? 'from pipeline' : 'σ rolling 6-period',
    },
    {
      key: 'anomalies',
      label: 'Anomalies Detected',
      value: String(anomalies),
      caption: anomaliesCaption,
      meter: Math.min(100, anomalies * 9),
      tone: 'destructive',
      icon: AlertTriangle,
      delta: anomalies === 0 ? 'none flagged' : 'flagged for review',
    },
  ]

  return (
    <div className="grid gap-px sm:grid-cols-2 lg:grid-cols-3">
      {metrics.map((m, i) => {
        const tone = toneMap[m.tone]
        return (
          <article
            key={m.key}
            className="glass border-border animate-rise relative overflow-hidden rounded-xl border p-4"
            style={{ animationDelay: `${i * 70}ms` }}
          >
            <header className="flex items-center gap-2">
              <m.icon className={cn('size-3.5', tone.text)} />
              <h3 className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
                {m.label}
              </h3>
            </header>

            <div className="flex items-end gap-1.5 pt-3">
              <span className="text-foreground font-mono text-[32px] leading-none font-medium tracking-tight tabular-nums">
                {m.value}
              </span>
              {m.unit ? (
                <span className="text-muted-foreground pb-1 font-mono text-xs">
                  {m.unit}
                </span>
              ) : null}
              <span className="text-muted-foreground/70 ml-auto pb-1 font-mono text-[10px]">
                {m.delta}
              </span>
            </div>

            <div className="bg-muted mt-3.5 h-0.5 w-full overflow-hidden rounded-full">
              <div
                className={cn('h-full rounded-full transition-[width] duration-700', tone.bar)}
                style={{ width: `${Math.min(100, m.meter)}%` }}
              />
            </div>

            <p className="text-muted-foreground/80 pt-2.5 text-[11px] leading-relaxed">
              {m.caption}
            </p>
          </article>
        )
      })}
    </div>
  )
}
