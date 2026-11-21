/** Instant placeholder for buyer pages while data loads on a slow connection: the real page's shape, gently shimmering. */
export function PageSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading property" className="mx-auto min-h-screen max-w-3xl bg-stone-50 sm:px-4 sm:pt-4">
      <div className="skel aspect-[4/3.3] w-full rounded-none sm:rounded-3xl" />
      <div className="relative z-10 -mt-8 mx-3 space-y-3 rounded-[22px] bg-white p-5 shadow-card sm:mx-0">
        <div className="skel h-5 w-24 rounded-full" />
        <div className="skel h-7 w-4/5" />
        <div className="skel h-4 w-2/5" />
        <div className="skel h-9 w-1/3" />
        <div className="grid grid-cols-3 gap-2 pt-1">
          <div className="skel h-16 rounded-2xl" />
          <div className="skel h-16 rounded-2xl" />
          <div className="skel h-16 rounded-2xl" />
        </div>
      </div>
      <div className="mx-3 mt-3 space-y-2 rounded-[22px] bg-white p-5 shadow-card sm:mx-0">
        <div className="skel h-5 w-40" />
        <div className="skel h-4 w-full" />
        <div className="skel h-4 w-11/12" />
        <div className="skel h-4 w-3/4" />
      </div>
    </div>
  );
}
