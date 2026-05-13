export function EventCardSkeleton() {
  return (
    <div className="rounded-xl overflow-hidden bg-white" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
      <div className="bg-gray-200 animate-pulse" style={{ aspectRatio: '1/1' }} />
      <div className="px-2.5 pt-2 pb-3 space-y-2">
        <div className="h-2.5 bg-gray-200 rounded-full animate-pulse w-full" />
        <div className="h-2.5 bg-gray-200 rounded-full animate-pulse w-3/4" />
        <div className="h-2 bg-gray-200 rounded-full animate-pulse w-2/5" />
        <div className="flex gap-1 pt-0.5">
          <div className="h-4 w-14 bg-gray-200 rounded-full animate-pulse" />
          <div className="h-4 w-9 bg-gray-200 rounded-full animate-pulse" />
        </div>
      </div>
    </div>
  );
}
