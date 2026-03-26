import { ArrowDownRight, ArrowUpRight } from "lucide-react";

const trendStyles = {
  up: "text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-300",
  down: "text-rose-600 bg-rose-50 dark:bg-rose-500/10 dark:text-rose-300",
  neutral: "text-slate-500 bg-slate-100 dark:bg-slate-800 dark:text-slate-300",
};

export const StatsCard = ({
  icon: Icon,
  label,
  value,
  trend = "neutral",
  trendValue = 0,
  accent = "from-sky-500 to-cyan-400",
  helperText,
  format = "number",
}) => {
  const formattedValue =
    format === "currency"
      ? new Intl.NumberFormat("en-IN", {
          style: "currency",
          currency: "INR",
          maximumFractionDigits: 0,
        }).format(Number(value || 0))
      : Number(value || 0).toLocaleString();

  const TrendIcon = trend === "down" ? ArrowDownRight : ArrowUpRight;

  return (
    <article className="crm-panel group relative overflow-hidden rounded-[2rem] p-5 transition duration-300 hover:-translate-y-1">
      <div className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${accent}`} />
      <div className={`absolute -right-10 -top-10 h-28 w-28 rounded-full bg-gradient-to-br opacity-30 blur-2xl transition group-hover:scale-110 ${accent}`} />

      <div className="relative flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-stone-500">{label}</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-stone-950">{formattedValue}</p>
          {helperText ? <p className="mt-2 text-xs text-stone-500">{helperText}</p> : null}
        </div>

        <div className={`rounded-2xl bg-gradient-to-br p-3 text-white shadow-lg ${accent}`}>
          <Icon size={20} />
        </div>
      </div>

      <div className="relative mt-5 flex items-center justify-between border-t border-stone-200/70 pt-4">
        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${trendStyles[trend] || trendStyles.neutral}`}>
          <TrendIcon size={14} />
          {Math.abs(Number(trendValue || 0)).toFixed(1)}%
        </span>
        <span className="text-xs text-stone-400">vs previous period</span>
      </div>
    </article>
  );
};
