const priorityClasses = {
  Low: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  Medium: "bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-300",
  High: "bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300",
};

export const ComplaintPriorityBadge = ({ priority }) => (
  <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${priorityClasses[priority] || priorityClasses.Medium}`}>
    {priority}
  </span>
);
