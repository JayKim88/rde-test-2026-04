export default function Loading() {
  return (
    <section>
      {/* Sticky search bar placeholder */}
      <div className="border-b border-gray-200 bg-white px-6 py-3">
        <div className="mx-auto max-w-5xl">
          <div className="h-24 rounded-2xl bg-gray-100 animate-pulse" />
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-6 py-10">
        {/* AI bubble skeleton */}
        <div className="rounded-2xl bg-gray-50 border border-gray-200 p-5 mb-6">
          <div className="flex items-start gap-3">
            <div className="h-8 w-8 rounded-full bg-gray-200 animate-pulse shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse" />
              <div className="h-4 w-1/2 bg-gray-200 rounded animate-pulse" />
            </div>
          </div>
        </div>

        <div className="h-4 w-32 bg-gray-100 rounded animate-pulse mb-4" />

        {/* Card grid skeleton */}
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-gray-200 overflow-hidden">
              <div className="aspect-[4/3] bg-gray-100 animate-pulse" />
              <div className="p-4 space-y-3">
                <div className="h-3 w-20 bg-gray-100 rounded animate-pulse" />
                <div className="h-4 w-3/4 bg-gray-100 rounded animate-pulse" />
                <div className="h-4 w-1/2 bg-gray-100 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
