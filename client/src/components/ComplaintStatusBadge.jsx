const statusClasses = {
  Open: "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  "In Progress": "bg-sky-100 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300",
  Resolved: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
  Closed: "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200",
};

export const ComplaintStatusBadge = ({ status }) => (
  <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusClasses[status] || statusClasses.Open}`}>
    {status}
  </span>
);
