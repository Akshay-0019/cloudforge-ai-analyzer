import { Binary } from 'lucide-react'
import type { Trace } from '@/lib/engine'
import { cn } from '@/lib/utils'

const statusStyle = {
  converged: { dot: 'bg-success', text: 'text-success' },
  training: { dot: 'bg-warning animate-pulse-dot', text: 'text-warning' },
  queued: { dot: 'bg-muted-foreground/60', text: 'text-muted-foreground' },
} as const

export function XaiRow({ traces }: { traces: Trace[] }) {
  return (
    <section className="animate-rise">
      <header className="flex items-center gap-2 pb-2.5">
        <Binary className="text-muted-foreground size-3.5" />
        <h2 className="text-foreground text-[13px] font-medium tracking-tight">
          Explainable AI (XAI)
        </h2>
        <span className="text-muted-foreground/70 font-mono text-[10px] tracking-widest uppercase">
          architecture trace
        </span>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        {traces.map((t) => {
          const s = statusStyle[t.status]
          return (
            <article
              key={t.id}
              className="glass border-border relative overflow-hidden rounded-lg border p-3.5"
            >
              {t.status === 'training' ? (
                <span className="pointer-events-none absolute inset-x-0 top-0 h-px overflow-hidden">
                  <span className="via-primary animate-trace block h-px w-1/3 bg-gradient-to-r from-transparent to-transparent" />
                </span>
              ) : null}

              <div className="flex items-center gap-2">
                <span className={cn('size-1.5 shrink-0 rounded-full', s.dot)} />
                <h3 className="text-foreground truncate text-[12px] font-medium">
                  {t.label}
                </h3>
                <span
                  className={cn('ml-auto font-mono text-[9px] tracking-wider uppercase', s.text)}
                >
                  {t.status}
                </span>
              </div>

              <p className="text-muted-foreground/80 pt-2 font-mono text-[10px]">
                {t.layer}
              </p>

              <div className="flex items-center gap-2 pt-2.5">
                <div className="bg-muted h-0.5 flex-1 overflow-hidden rounded-full">
                  <div
                    className="bg-primary/70 h-full rounded-full"
                    style={{ width: `${t.attribution * 100}%` }}
                  />
                </div>
                <span className="text-foreground font-mono text-[10px] tabular-nums">
                  {(t.attribution * 100).toFixed(0)}%
                </span>
              </div>

              <p className="text-muted-foreground pt-2 text-[11px] leading-relaxed">
                {t.detail}
              </p>
            </article>
          )
        })}
      </div>
    </section>
  )
}
