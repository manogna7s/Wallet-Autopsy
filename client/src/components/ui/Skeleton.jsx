import { cn } from '../../lib/format'

export function Skeleton({ className }) {
  return <div className={cn('animate-pulse bg-inset', className)} aria-hidden="true" />
}

export function InvestigationSkeleton() {
  return (
    <div className="space-y-8" aria-busy="true" aria-live="polite">
      <div className="flex gap-8">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-4 w-24" />
      </div>
      <div className="grid gap-10 md:grid-cols-[240px_1fr]">
        <Skeleton className="mx-auto h-48 w-48 rounded-full" />
        <div className="grid grid-cols-2 gap-6">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
      </div>
      <Skeleton className="h-40" />
      <Skeleton className="h-64" />
    </div>
  )
}

export function ListSkeleton({ rows = 4 }) {
  return (
    <div className="divide-y divide-line">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 py-5">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-3 w-24" />
          <div className="ml-auto">
            <Skeleton className="h-6 w-12" />
          </div>
        </div>
      ))}
    </div>
  )
}
