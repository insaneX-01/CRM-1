import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { fetchSchemes } from "../services/schemeService";

export const SchemesPage = () => {
  const [schemes, setSchemes] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadSchemes = async () => {
    try {
      setLoading(true);
      const data = await fetchSchemes();
      setSchemes(data);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Unable to load schemes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSchemes();
  }, []);

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-semibold">Schemes & Incentives</h2>
        <p className="text-sm text-slate-500">Track active incentive schemes and performance criteria.</p>
      </header>

      <div className="card p-6">
        {loading ? (
          <div className="py-10 text-center text-slate-500">Loading…</div>
        ) : schemes.length === 0 ? (
          <div className="py-10 text-center text-slate-500">No schemes defined yet.</div>
        ) : (
          <div className="space-y-3">
            {schemes.map((scheme) => (
              <div
                key={scheme._id}
                className="rounded-lg border border-slate-200 p-4"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-base font-semibold text-slate-800">
                      {scheme.name}
                    </div>
                    <div className="text-xs text-slate-500">{scheme.criteria}</div>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                    {scheme.active ? "Active" : "Inactive"}
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-600">{scheme.description}</p>
                <div className="mt-2 text-xs text-slate-500">
                  Incentive: {scheme.incentiveRate}%
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
