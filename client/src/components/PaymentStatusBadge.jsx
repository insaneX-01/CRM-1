const styles = {
  Pending: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
  Partial: "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  Paid: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
};

export const PaymentStatusBadge = ({ status }) => (
  <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${styles[status] || styles.Pending}`}>
    {status}
  </span>
);
