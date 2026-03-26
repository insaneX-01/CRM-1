import { AlertCircle, CreditCard, Package2, UserRoundPlus } from "lucide-react";

const iconByType = {
  lead: UserRoundPlus,
  order: Package2,
  payment: CreditCard,
  complaint: AlertCircle,
};

const formatCurrency = (value) =>
  value == null
    ? "-"
    : new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
      }).format(value);

export const RecentActivityTable = ({ activities }) => {
  return (
    <section className="crm-panel rounded-[2rem] p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-stone-950">Recent Activity</h3>
          <p className="text-sm text-stone-500">Latest leads, orders, payments, and complaints across your scope.</p>
        </div>
      </div>

      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[760px]">
          <thead>
            <tr className="border-b border-stone-200 text-left text-xs uppercase tracking-wide text-stone-500">
              <th className="pb-3 font-semibold">Event</th>
              <th className="pb-3 font-semibold">Details</th>
              <th className="pb-3 font-semibold">Owner</th>
              <th className="pb-3 font-semibold">Status</th>
              <th className="pb-3 font-semibold">Amount</th>
              <th className="pb-3 font-semibold">Time</th>
            </tr>
          </thead>
          <tbody>
            {activities.map((activity) => {
              const Icon = iconByType[activity.type] || AlertCircle;

              return (
                <tr key={activity.id} className="border-b border-stone-100 last:border-b-0">
                  <td className="py-4 pr-4">
                    <div className="flex items-center gap-3">
                      <div className="rounded-2xl bg-gradient-to-br from-stone-100 to-orange-100 p-2 text-stone-700">
                        <Icon size={16} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-stone-950">{activity.title}</p>
                        <p className="text-xs capitalize text-stone-500">{activity.type}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 pr-4 text-sm text-stone-600">{activity.subtitle}</td>
                  <td className="py-4 pr-4 text-sm text-stone-600">{activity.meta}</td>
                  <td className="py-4 pr-4">
                    <span className="inline-flex rounded-full bg-stone-100 px-2.5 py-1 text-xs font-semibold text-stone-700">
                      {activity.status}
                    </span>
                  </td>
                  <td className="py-4 pr-4 text-sm font-medium text-stone-700">{formatCurrency(activity.amount)}</td>
                  <td className="py-4 text-sm text-stone-500">
                    {new Date(activity.timestamp).toLocaleString()}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
};
