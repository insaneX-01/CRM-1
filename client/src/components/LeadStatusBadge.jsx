const statusStyles = {
  New: "bg-sky-100 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300",
  Contacted: "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  Converted: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
  Lost: "bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300",
};

export const LeadStatusBadge = ({ status }) => {
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
