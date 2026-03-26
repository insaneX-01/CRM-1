import { BellRing } from "lucide-react";

export const NotificationsFeed = ({ notifications }) => {
  return (
    <section className="crm-panel rounded-[2rem] p-5">
      <div>
        <h3 className="text-lg font-semibold text-stone-950">Notifications</h3>
        <p className="text-sm text-stone-500">Operational alerts surfaced from current dashboard activity.</p>
      </div>

      <div className="mt-5 space-y-3">
        {notifications.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-stone-300 p-4 text-sm text-stone-500">
            No urgent notifications in the current time window.
          </div>
        ) : (
          notifications.map((notification) => (
            <div
              key={notification.id || notification.message}
              className="rounded-2xl border border-stone-200 bg-gradient-to-r from-white to-orange-50/70 p-4"
            >
              <div className="flex items-start gap-3">
                <div className="rounded-2xl bg-amber-100 p-2 text-amber-700">
                  <BellRing size={16} />
                </div>
                <div>
                  <p className="text-sm font-medium text-stone-950">{notification.message}</p>
                  {notification.time ? (
                    <p className="mt-1 text-xs text-stone-500">{notification.time}</p>
                  ) : null}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
};
