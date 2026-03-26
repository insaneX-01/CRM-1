const statusStyles = {
  Active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
  Inactive: "bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300",
};

export const DealerStatusBadge = ({ status }) => {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
        statusStyles[status] || "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"
      }`}
    >
      {status}
    </span>
  );
};
