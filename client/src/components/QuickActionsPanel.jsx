import { CreditCard, PackagePlus, Shuffle, UserPlus2 } from "lucide-react";

export const QuickActionsPanel = ({ actions }) => {
  return (
    <section className="crm-panel rounded-[2rem] p-5">
      <div>
        <h3 className="text-lg font-semibold text-stone-950">Quick Actions</h3>
        <p className="text-sm text-stone-500">Create operational records without leaving the dashboard.</p>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {actions.map((action) => {
          const Icon =
            action.icon === "lead"
              ? UserPlus2
              : action.icon === "assign"
                ? Shuffle
                : action.icon === "order"
                  ? PackagePlus
                  : CreditCard;

          return (
            <button
              key={action.key}
              type="button"
              onClick={action.onClick}
              className="group rounded-[1.75rem] border border-stone-200/80 bg-gradient-to-br from-white via-orange-50/40 to-teal-50/40 p-4 text-left transition hover:-translate-y-1 hover:border-orange-200 hover:shadow-lg"
            >
              <div className="flex items-center justify-between gap-3">
                <div className={`rounded-2xl p-3 text-white shadow-lg ${action.color}`}>
                  <Icon size={18} />
                </div>
                <span className="text-xs font-semibold uppercase tracking-wide text-stone-400">Launch</span>
              </div>

              <div className="mt-4">
                <p className="text-sm font-semibold text-stone-950">{action.label}</p>
                <p className="mt-1 text-xs text-stone-500">{action.description}</p>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
};
