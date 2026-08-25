'use client'

import { useEffect, useState } from 'react'
import { Sparkles, Terminal } from 'lucide-react'
import { cn } from '@/lib/utils'

export function GenAiPanel({
  paragraphs,
  confidence,
  badge,
  streaming,
  source,
}: {
  paragraphs: string[]
  /** null when the source provides no confidence score. */
  confidence: number | null
  badge: string
  streaming: boolean
  source: string
}) {
  const full = paragraphs.join('\n\n')
  const [shown, setShown] = useState(full.length)

  // Type the briefing out whenever the underlying analysis changes.
  useEffect(() => {
    setShown(0)
    let frame = 0
    const id = window.setInterval(() => {
      frame += 9
      setShown(frame)
      if (frame >= full.length) window.clearInterval(id)
    }, 16)
    return () => window.clearInterval(id)
  }, [full])

  const done = shown >= full.length
  const text = full.slice(0, shown)

  return (
    <section className="glass border-border animate-rise flex flex-col overflow-hidden rounded-xl border">
      <header className="border-border flex items-center gap-2 border-b px-4 py-3">
        <Sparkles className="text-primary size-3.5" />
        <h2 className="text-foreground text-sm font-medium tracking-tight">
          GenAI Decision Agent
        </h2>
        <span
          className={cn(
            'ml-auto flex items-center gap-1.5 font-mono text-[10px]',
            done ? 'text-muted-foreground' : 'text-primary',
          )}
        >
          <span
            className={cn(
              'size-1.5 rounded-full',
              done ? 'bg-muted-foreground/50' : 'bg-primary animate-pulse-dot',
            )}
          />
          {done ? 'response complete' : 'generating'}
        </span>
      </header>

      <div className="flex items-center gap-3 px-4 py-2.5">
        {confidence !== null ? (
          <>
            <span className="text-muted-foreground/70 font-mono text-[10px] tracking-widest uppercase">
              confidence
            </span>
            <div className="bg-muted h-0.5 flex-1 overflow-hidden rounded-full">
              <div
                className="bg-primary h-full rounded-full transition-[width] duration-700"
                style={{ width: `${confidence}%` }}
              />
            </div>
            <span className="text-foreground font-mono text-[11px] tabular-nums">
              {confidence}%
            </span>
          </>
        ) : (
          <span className="text-muted-foreground/70 flex-1 font-mono text-[10px] tracking-widest uppercase">
            model
          </span>
        )}
        <span className="border-border text-muted-foreground rounded border px-1.5 py-0.5 font-mono text-[10px]">
          {badge}
        </span>
      </div>

      <div className="min-h-0 flex-1 px-4 pb-4">
        <div className="border-border bg-background/40 h-full rounded-lg border p-3.5">
          <p className="text-muted-foreground/70 flex items-center gap-1.5 pb-2.5 font-mono text-[10px]">
            <Terminal className="size-3" />
            {source} — {streaming ? 'live context' : 'batch context'}
          </p>
          <div className="max-h-[240px] space-y-3 overflow-y-auto pr-1 lg:max-h-[176px]">
            {text.split('\n\n').map((para, i) => (
              <p
                key={i}
                className="text-card-foreground/85 text-[12.5px] leading-relaxed"
              >
                {para}
                {!done && i === text.split('\n\n').length - 1 ? (
                  <span className="bg-primary ml-0.5 inline-block h-3.5 w-[2px] translate-y-0.5 align-baseline" />
                ) : null}
              </p>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
