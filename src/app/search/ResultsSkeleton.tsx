export function ResultsSkeleton() {
  return (
    <>
      {/* AI bubble skeleton */}
      <div className="rounded-2xl bg-gray-50 border border-gray-200 p-5 mb-6">
        <div className="flex items-start gap-3">
          <div className="mt-1 h-8 w-8 rounded-full bg-gray-200 animate-pulse shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-5/6 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse" />
            <div className="h-3 w-2/5 bg-gray-200 rounded animate-pulse mt-3" />
          </div>
        </div>
      </div>

      <div className="h-4 w-24 bg-gray-100 rounded animate-pulse mb-4" />

      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-gray-200 overflow-hidden">
            <div className="aspect-[4/3] bg-gray-100 animate-pulse" />
            <div className="p-4 space-y-3">
              <div className="h-3 w-24 bg-gray-100 rounded animate-pulse" />
              <div className="h-4 w-3/4 bg-gray-100 rounded animate-pulse" />
              <div className="h-3 w-1/2 bg-gray-100 rounded animate-pulse" />
              <div className="flex justify-between pt-1">
                <div className="h-4 w-16 bg-gray-100 rounded animate-pulse" />
                <div className="h-4 w-12 bg-gray-100 rounded animate-pulse" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
