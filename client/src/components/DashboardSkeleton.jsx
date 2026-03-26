export const DashboardSkeleton = () => {
  return (
    <div className="space-y-6">
      <div className="h-28 animate-pulse rounded-3xl bg-slate-200/80 dark:bg-slate-800" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="h-36 animate-pulse rounded-3xl bg-slate-200/80 dark:bg-slate-800" />
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-5">
        <div className="h-96 animate-pulse rounded-3xl bg-slate-200/80 xl:col-span-3 dark:bg-slate-800" />
        <div className="h-96 animate-pulse rounded-3xl bg-slate-200/80 xl:col-span-2 dark:bg-slate-800" />
      </div>
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="h-96 animate-pulse rounded-3xl bg-slate-200/80 xl:col-span-2 dark:bg-slate-800" />
        <div className="space-y-6">
          <div className="h-56 animate-pulse rounded-3xl bg-slate-200/80 dark:bg-slate-800" />
          <div className="h-56 animate-pulse rounded-3xl bg-slate-200/80 dark:bg-slate-800" />
        </div>
      </div>
    </div>
  );
};
