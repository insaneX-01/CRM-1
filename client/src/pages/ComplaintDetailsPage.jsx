import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "react-toastify";

import { ComplaintPriorityBadge } from "../components/ComplaintPriorityBadge";
import { ComplaintStatusBadge } from "../components/ComplaintStatusBadge";
import { fetchComplaintActivity, fetchComplaintById } from "../services/complaintService";

export const ComplaintDetailsPage = () => {
  const { id } = useParams();
  const [complaint, setComplaint] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadComplaint = async () => {
      try {
        setLoading(true);
        const [complaintData, timelineData] = await Promise.all([
          fetchComplaintById(id),
          fetchComplaintActivity(id),
        ]);
        setComplaint(complaintData);
        setTimeline(timelineData || []);
      } catch (err) {
        toast.error(err?.response?.data?.message || "Unable to load complaint details");
      } finally {
        setLoading(false);
      }
    };

    loadComplaint();
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-28 animate-pulse rounded-3xl bg-slate-200 dark:bg-slate-800" />
        <div className="h-56 animate-pulse rounded-3xl bg-slate-200 dark:bg-slate-800" />
      </div>
    );
  }

  if (!complaint) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-200 px-6 py-12 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
        Complaint not found.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm ring-1 ring-slate-950/5 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-slate-500 dark:text-slate-400">Complaint Detail</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">{complaint.subject}</h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Dealer: {complaint.dealerId?.name || complaint.dealer?.name || "Dealer"} • Created {new Date(complaint.createdAt).toLocaleString()}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <ComplaintPriorityBadge priority={complaint.priority} />
            <ComplaintStatusBadge status={complaint.status} />
          </div>
        </div>
      </header>

      <section className="grid gap-6 xl:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm ring-1 ring-slate-950/5 xl:col-span-2 dark:border-slate-800 dark:bg-slate-900">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Description</h3>
          <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-600 dark:text-slate-300">{complaint.description}</p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm ring-1 ring-slate-950/5 dark:border-slate-800 dark:bg-slate-900">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Support Meta</h3>
          <div className="mt-4 space-y-3 text-sm text-slate-600 dark:text-slate-300">
            <div><span className="font-medium text-slate-900 dark:text-slate-100">Assigned To:</span> {complaint.assignedTo?.name || "Unassigned"}</div>
            <div><span className="font-medium text-slate-900 dark:text-slate-100">Priority:</span> {complaint.priority}</div>
            <div><span className="font-medium text-slate-900 dark:text-slate-100">Status:</span> {complaint.status}</div>
          </div>
          <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
            <div className="font-medium text-slate-900 dark:text-slate-100">Resolution Note</div>
            <div className="mt-2 whitespace-pre-wrap">{complaint.resolutionNote || "No resolution note added yet."}</div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm ring-1 ring-slate-950/5 dark:border-slate-800 dark:bg-slate-900">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Timeline</h3>
        <div className="mt-4 space-y-3">
          {timeline.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
              No complaint activity logged yet.
            </div>
          ) : (
            timeline.map((entry) => (
              <div key={entry._id} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-medium text-slate-900 dark:text-slate-100">{entry.message}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">{new Date(entry.createdAt).toLocaleString()}</div>
                </div>
                <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {entry.userId?.name || "System"} ({entry.userId?.role || "unknown"})
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
};
