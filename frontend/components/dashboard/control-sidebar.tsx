"use client"

import { useRef, useState } from 'react'
import {
  Activity,
  CircleSlash,
  FileUp,
  Minus,
  Plus,
  Radio,
  RotateCcw,
  Sliders,
  Table2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type Props = {
  dataset: string
  rows: number
  columns: number
  onFile: (file: File) => void
  horizon: number
  onHorizon: (n: number) => void
  sensitivity: number
  onSensitivity: (n: number) => void
  edgeStream: boolean
  onEdgeStream: (v: boolean) => void
  onRefit: () => void
  fitting: boolean
  /** true once a backend result is driving the dashboard */
  live: boolean
  error: string | null
  canRefit: boolean
  endpoint: string
}

function Section({
  icon: Icon,
  title,
  hint,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <section className="border-border border-b px-5 py-5">
      <header className="flex items-center gap-2 pb-3.5">
        <Icon className="text-muted-foreground size-3.5" />
        <h2 className="text-foreground text-[13px] font-medium tracking-tight">
          {title}
        </h2>
        {hint ? (
          <span className="text-muted-foreground/70 ml-auto font-mono text-[10px] tracking-widest uppercase">
            {hint}
          </span>
        ) : null}
      </header>
      {children}
    </section>
  )
}

function Stepper({
  value,
  onChange,
  min,
  max,
  step = 1,
  suffix,
  label,
  format,
  disabled = false,
}: {
  value: number
  onChange: (n: number) => void
  min: number
  max: number
  step?: number
  suffix?: string
  label: string
  format?: (n: number) => string
  disabled?: boolean
}) {
  const clamp = (n: number) => {
    const snapped = Math.min(max, Math.max(min, Math.round(n / step) * step))
    const decimals = (String(step).split('.')[1] ?? '').length
    return Number.parseFloat(snapped.toFixed(decimals))
  }

  return (
    <div className={cn('space-y-1.5', disabled && 'opacity-50')}>
      <label
        htmlFor={`stepper-${label}`}
        className="text-muted-foreground block text-[11px]"
      >
        {label}
      </label>
      <div className="border-border bg-background/60 focus-within:border-primary/50 focus-within:ring-ring flex items-center rounded-lg border transition-colors focus-within:ring-3">
        <button
          type="button"
          onClick={() => onChange(clamp(value - step))}
          disabled={disabled || value <= min}
          aria-label={`Decrease ${label}`}
          className="text-muted-foreground hover:text-foreground disabled:opacity-30 grid size-8 shrink-0 place-items-center transition-colors"
        >
          <Minus className="size-3" />
        </button>
        <div className="relative flex-1">
          <input
            id={`stepper-${label}`}
            type="number"
            inputMode="decimal"
            value={value}
            min={min}
            max={max}
            step={step}
            disabled={disabled}
            onChange={(e) => {
              const next = Number.parseFloat(e.target.value)
              if (!Number.isNaN(next)) onChange(clamp(next))
            }}
            className="text-foreground w-full bg-transparent py-1.5 text-center font-mono text-sm tabular-nums outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
          {suffix ? (
            <span className="text-muted-foreground/60 pointer-events-none absolute inset-y-0 right-1 flex items-center font-mono text-[10px]">
              {suffix}
            </span>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => onChange(clamp(value + step))}
          disabled={disabled || value >= max}
          aria-label={`Increase ${label}`}
          className="text-muted-foreground hover:text-foreground disabled:opacity-30 grid size-8 shrink-0 place-items-center transition-colors"
        >
          <Plus className="size-3" />
        </button>
      </div>
      {format ? (
        <p className="text-muted-foreground/70 font-mono text-[10px]">
          {format(value)}
        </p>
      ) : null}
    </div>
  )
}

export function ControlSidebar({
  dataset,
  rows,
  columns,
  onFile,
  horizon,
  onHorizon,
  sensitivity,
  onSensitivity,
  edgeStream,
  onEdgeStream,
  onRefit,
  fitting,
  live,
  error,
  canRefit,
  endpoint,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  return (
    <aside className="border-border bg-card/40 flex w-full shrink-0 flex-col border-r lg:w-[280px]">
      <div className="border-border flex h-14 items-center gap-2.5 border-b px-5">
        <div className="bg-primary/15 border-primary/30 text-primary grid size-6 place-items-center rounded-md border font-mono text-[10px] font-bold">
          L4
        </div>
        <span className="text-foreground text-[15px] font-semibold tracking-tight">
          logic 404!
        </span>
        <span className="text-muted-foreground/70 border-border ml-auto rounded border px-1.5 py-0.5 font-mono text-[10px]">
          v2.4
        </span>
      </div>

      <div className="flex-1 overflow-y-auto">
        <Section icon={FileUp} title="Data Ingestion" hint="csv · parquet">
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.parquet,.json,.tsv"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) onFile(file) // BUG FIXED HERE
            }}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="border-border hover:border-primary/40 hover:bg-primary/5 group focus-visible:border-primary/50 focus-visible:ring-ring w-full rounded-lg border border-dashed px-3 py-4 text-left transition-colors outline-none focus-visible:ring-3"
          >
            <span className="text-muted-foreground group-hover:text-primary flex items-center gap-2 text-[11px] transition-colors">
              <FileUp className="size-3.5" />
              Drop a file or click to upload
            </span>
          </button>

          <dl className="mt-3.5 space-y-2">
            <div className="flex items-baseline justify-between gap-2">
              <dt className="text-muted-foreground text-[11px]">Active set</dt>
              <dd className="text-foreground max-w-[150px] truncate font-mono text-[11px]">
                {dataset}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-2">
              <dt className="text-muted-foreground text-[11px]">Rows</dt>
              <dd className="text-foreground font-mono text-[11px] tabular-nums">
                {rows.toLocaleString()}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-2">
              <dt className="text-muted-foreground text-[11px]">Features</dt>
              <dd className="text-foreground font-mono text-[11px] tabular-nums">
                {columns}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-2">
              <dt className="text-muted-foreground text-[11px]">Schema</dt>
              <dd className="text-success flex items-center gap-1.5 font-mono text-[11px]">
                <Table2 className="size-3" />
                inferred
              </dd>
            </div>
          </dl>
        </Section>

        <Section icon={Sliders} title="Scenario Planning" hint="what-if">
          <div className="space-y-3.5">
            <Stepper
              label="Forecast horizon"
              value={horizon}
              onChange={onHorizon}
              min={1}
              max={12}
              suffix="wk"
              format={(n) => `projecting t+1 … t+${n}`}
            />
            <Stepper
              label="Demand sensitivity"
              value={sensitivity}
              onChange={onSensitivity}
              min={0.5}
              max={1.6}
              step={0.05}
              suffix="×"
              format={(n) =>
                n > 1.05
                  ? 'expansionary bias'
                  : n < 0.95
                    ? 'defensive bias'
                    : 'baseline bias'
              }
            />
          </div>
        </Section>

        <Section icon={Radio} title="Edge AI / IoT Stream">
          <button
            type="button"
            role="switch"
            aria-checked={edgeStream}
            onClick={() => onEdgeStream(!edgeStream)}
            className={cn(
              'focus-visible:ring-ring flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors outline-none focus-visible:ring-3',
              edgeStream
                ? 'border-primary/40 bg-primary/10'
                : 'border-border bg-background/60 hover:bg-muted/40',
            )}
          >
            <span
              className={cn(
                'relative h-4 w-7 shrink-0 rounded-full transition-colors',
                edgeStream ? 'bg-primary' : 'bg-muted',
              )}
            >
              <span
                className={cn(
                  'bg-background absolute top-0.5 size-3 rounded-full transition-all',
                  edgeStream ? 'left-3.5' : 'left-0.5',
                )}
              />
            </span>
            <span className="min-w-0">
              <span
                className={cn(
                  'block text-[12px] font-medium',
                  edgeStream ? 'text-primary' : 'text-foreground',
                )}
              >
                {edgeStream ? 'Stream attached' : 'Stream detached'}
              </span>
              <span className="text-muted-foreground block font-mono text-[10px]">
                {edgeStream ? '4,214 events/s · 6 nodes' : 'batch inference only'}
              </span>
            </span>
            {edgeStream ? (
              <Activity className="text-primary animate-pulse-dot ml-auto size-3.5" />
            ) : (
              <CircleSlash className="text-muted-foreground/60 ml-auto size-3.5" />
            )}
          </button>
        </Section>
      </div>

      <div className="border-border bg-card/60 border-t p-4">
        <Button
          onClick={onRefit}
          disabled={fitting}
          className="w-full font-medium"
          size="lg"
        >
          <RotateCcw className={cn('size-3.5', fitting && 'animate-spin')} />
          {fitting ? 'Re-fitting pipeline…' : 'Re-fit AutoML pipeline'}
        </Button>
        <p className="text-muted-foreground/70 pt-2.5 text-center font-mono text-[10px]">
          gpu cluster · eu-central-1 · 4×A100
        </p>
      </div>
    </aside>
  )
}