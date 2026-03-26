import { Download, RefreshCcw, Search, SlidersHorizontal } from "lucide-react";

export const DashboardFilters = ({
  filters,
  dealers,
  areas,
  onChange,
  onRefresh,
  onExport,
  exporting,
  refreshing,
  canFilterDealer,
}) => {
  return (
    <section className="crm-panel rounded-[2rem] p-4">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-gradient-to-br from-orange-500 to-amber-300 p-2 text-stone-950 shadow-lg">
            <SlidersHorizontal size={18} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-stone-950">Dashboard Filters</h3>
            <p className="text-xs text-stone-500">Refine analytics by date, dealer, and market area.</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-2xl border border-stone-200 bg-white/70 px-4 py-2 text-sm font-medium text-stone-700 transition hover:border-orange-200 hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCcw size={16} className={refreshing ? "animate-spin" : ""} />
            Refresh
          </button>
          <button
            type="button"
            onClick={onExport}
            disabled={exporting}
            className="inline-flex items-center gap-2 rounded-2xl bg-stone-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Download size={16} />
            {exporting ? "Exporting..." : "Export CSV"}
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-stone-500">Start date</span>
          <input
            type="date"
            value={filters.startDate}
            onChange={(event) => onChange("startDate", event.target.value)}
            className="crm-input"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-stone-500">End date</span>
          <input
            type="date"
            value={filters.endDate}
            onChange={(event) => onChange("endDate", event.target.value)}
            className="crm-input"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-stone-500">Area</span>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={15} />
            <select
              value={filters.area}
              onChange={(event) => onChange("area", event.target.value)}
              className="crm-input appearance-none py-2.5 pl-9 pr-3"
            >
              <option value="">All areas</option>
              {areas.map((area) => (
                <option key={area} value={area}>
                  {area}
                </option>
              ))}
            </select>
          </div>
        </label>

        {canFilterDealer ? (
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-stone-500">Dealer</span>
            <select
              value={filters.dealerId}
              onChange={(event) => onChange("dealerId", event.target.value)}
              className="crm-input"
            >
              <option value="">All dealers</option>
              {dealers.map((dealer) => (
                <option key={dealer._id} value={dealer._id}>
                  {dealer.name}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <div className="rounded-2xl border border-dashed border-stone-300 px-4 py-3 text-sm text-stone-500">
            Role-based scope is already applied to your dashboard.
          </div>
        )}

        <div className="rounded-2xl bg-gradient-to-r from-orange-50 to-teal-50 px-4 py-3 text-sm text-stone-700">
          Auto refresh every 45 seconds keeps this view current.
        </div>
      </div>
    </section>
  );
};
