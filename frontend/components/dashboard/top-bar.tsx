import { ChevronRight, GitBranch } from 'lucide-react'

export function TopBar({
  dataset,
  fitting,
  edgeStream,
}: {
  dataset: string
  fitting: boolean
  edgeStream: boolean
}) {
  return (
    <header className="border-border glass sticky top-0 z-20 flex h-14 items-center gap-3 border-b px-5">
      <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5">
        <span className="text-muted-foreground text-[12.5px]">Workspaces</span>
        <ChevronRight className="text-muted-foreground/50 size-3" />
        <span className="text-muted-foreground hidden text-[12.5px] sm:inline">
          supply-ops
        </span>
        <ChevronRight className="text-muted-foreground/50 hidden size-3 sm:inline" />
        <span className="text-foreground truncate text-[12.5px] font-medium">
          {dataset}
        </span>
      </nav>

      <span className="border-border text-muted-foreground ml-1 hidden items-center gap-1.5 rounded border px-1.5 py-0.5 font-mono text-[10px] md:inline-flex">
        <GitBranch className="size-3" />
        run/2f9c1e
      </span>

      <div className="ml-auto flex items-center gap-4">
        <span className="text-muted-foreground hidden font-mono text-[10px] sm:inline">
          {edgeStream ? 'ingest 4.2k/s' : 'ingest idle'}
        </span>
        <span className="text-muted-foreground hidden font-mono text-[10px] md:inline">
          p99 148ms
        </span>
        <span className="text-muted-foreground flex items-center gap-1.5 font-mono text-[10px]">
          <span
            className={
              fitting
                ? 'bg-warning animate-pulse-dot size-1.5 rounded-full'
                : 'bg-success size-1.5 rounded-full'
            }
          />
          {fitting ? 'compute busy' : 'all systems nominal'}
        </span>
        <span className="border-border bg-muted text-foreground grid size-6 place-items-center rounded-full border font-mono text-[10px]">
          AT
        </span>
      </div>
    </header>
  )
}
