import { Skeleton } from '@/components/ui/skeleton';

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
}

export function TableSkeleton({ rows = 6, columns = 5 }: TableSkeletonProps) {
  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <div className="px-3 sm:px-4 py-3 border-b bg-muted/40">
        <Skeleton className="h-5 w-32" />
      </div>
      <div className="p-3 sm:p-4 space-y-3">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="grid grid-cols-12 gap-2">
            {Array.from({ length: columns }).map((_, c) => (
              <Skeleton
                key={c}
                className="h-4 col-span-12 sm:col-span-2 first:sm:col-span-3"
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
