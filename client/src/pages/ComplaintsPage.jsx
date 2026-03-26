import { useEffect, useState } from "react";
import { Filter, MessageSquarePlus, Search, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

import { ComplaintPriorityBadge } from "../components/ComplaintPriorityBadge";
import { ComplaintStatusBadge } from "../components/ComplaintStatusBadge";
import { DashboardModal } from "../components/DashboardModal";
import { useAuth } from "../context/AuthContext";
import {
  createComplaint,
  deleteComplaint,
  fetchComplaints,
  updateComplaint,
} from "../services/complaintService";

const defaultFilters = {
  search: "",
  status: "",
  priority: "",
};

const emptyComplaintForm = {
  subject: "",
  description: "",
  priority: "Medium",
};

const emptyManageForm = {
  status: "Open",
  assignedTo: "",
  resolutionNote: "",
  priority: "Medium",
};

export const ComplaintsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [filters, setFilters] = useState(defaultFilters);
  const [complaints, setComplaints] = useState([]);
  const [summary, setSummary] = useState(null);
  const [supportUsers, setSupportUsers] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeModal, setActiveModal] = useState("");
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [complaintForm, setComplaintForm] = useState(emptyComplaintForm);
  const [manageForm, setManageForm] = useState(emptyManageForm);

  const canCreateComplaint = user?.role === "dealer";
  const canManageComplaint = user?.role === "admin" || user?.role === "salesperson";
  const canDeleteComplaint = user?.role === "admin";

  const loadComplaints = async () => {
    try {
      setLoading(true);
      const data = await fetchComplaints({ page, limit: 10, ...filters });
      setComplaints(data.complaints || []);
      setPages(data.pages || 1);
      setSummary(data.summary || null);
      setSupportUsers(data.supportUsers || []);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Unable to load complaints");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadComplaints();
  }, [page, filters.search, filters.status, filters.priority]);

  const closeModal = () => {
    setActiveModal("");
    setSelectedComplaint(null);
    setComplaintForm(emptyComplaintForm);
    setManageForm(emptyManageForm);
  };

  const handleCreateComplaint = async (event) => {
    event.preventDefault();
    try {
      setSubmitting(true);
      await createComplaint(complaintForm);
      toast.success("Complaint submitted");
      closeModal();
      loadComplaints();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Unable to submit complaint");
    } finally {
      setSubmitting(false);
    }
  };

  const openManageModal = (complaint) => {
    setSelectedComplaint(complaint);
    setManageForm({
      status: complaint.status,
      assignedTo: complaint.assignedTo?._id || "",
      resolutionNote: complaint.resolutionNote || "",
      priority: complaint.priority,
    });
    setActiveModal("manage");
  };

  const handleManageComplaint = async (event) => {
    event.preventDefault();
    if (!selectedComplaint) return;

    try {
      setSubmitting(true);
      await updateComplaint(selectedComplaint._id, manageForm);
      toast.success("Complaint updated");
      closeModal();
      loadComplaints();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Unable to update complaint");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (complaint) => {
    if (!window.confirm(`Delete complaint "${complaint.subject}"?`)) return;
    try {
      await deleteComplaint(complaint._id);
      toast.success("Complaint deleted");
      loadComplaints();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Unable to delete complaint");
    }
  };

  const summaryCards = [
    { label: "Open", value: summary?.open || 0 },
    { label: "In Progress", value: summary?.inProgress || 0 },
    { label: "Resolved", value: summary?.resolved || 0 },
    { label: "Closed", value: summary?.closed || 0 },
  ];

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">Complaint & Support</h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Track dealer issues, support workflow, and resolution progress from one queue.
          </p>
        </div>

        {canCreateComplaint ? (
          <button
            type="button"
            onClick={() => setActiveModal("create")}
            className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white dark:bg-amber-500 dark:text-slate-950"
          >
            <MessageSquarePlus size={16} />
            Raise Complaint
          </button>
        ) : null}
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((item) => (
          <div key={item.label} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm ring-1 ring-slate-950/5 dark:border-slate-800 dark:bg-slate-900">
            <p className="text-sm text-slate-500 dark:text-slate-400">{item.label}</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">{item.value}</p>
          </div>
        ))}
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm ring-1 ring-slate-950/5 dark:border-slate-800 dark:bg-slate-900">
        <div className="grid gap-3 md:grid-cols-3">
          <label className="block md:col-span-1">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Search</span>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                value={filters.search}
                onChange={(event) => {
                  setPage(1);
                  setFilters((current) => ({ ...current, search: event.target.value }));
                }}
                placeholder="Search subject or description"
                className="w-full rounded-2xl border border-slate-200 py-2 pl-10 pr-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
            </div>
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Status</span>
            <select
              value={filters.status}
              onChange={(event) => {
                setPage(1);
                setFilters((current) => ({ ...current, status: event.target.value }));
              }}
              className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            >
              <option value="">All statuses</option>
              <option value="Open">Open</option>
              <option value="In Progress">In Progress</option>
              <option value="Resolved">Resolved</option>
              <option value="Closed">Closed</option>
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Priority</span>
            <select
              value={filters.priority}
              onChange={(event) => {
                setPage(1);
                setFilters((current) => ({ ...current, priority: event.target.value }));
              }}
              className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            >
              <option value="">All priorities</option>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
            </select>
          </label>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm ring-1 ring-slate-950/5 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-4 text-sm font-medium text-slate-500 dark:border-slate-800 dark:text-slate-400">
          <Filter size={16} />
          Complaint Queue
        </div>

        <div className="mt-5 overflow-x-auto">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="h-16 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
              ))}
            </div>
          ) : complaints.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 px-6 py-12 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
              No complaints found for the current filters.
            </div>
          ) : (
            <table className="w-full min-w-[980px]">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  <th className="pb-3 font-semibold">Subject</th>
                  <th className="pb-3 font-semibold">Dealer</th>
                  <th className="pb-3 font-semibold">Priority</th>
                  <th className="pb-3 font-semibold">Status</th>
                  <th className="pb-3 font-semibold">Assigned To</th>
                  <th className="pb-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {complaints.map((complaint) => (
                  <tr key={complaint._id} className="border-b border-slate-100 last:border-b-0 dark:border-slate-800">
                    <td className="py-4 pr-4">
                      <div className="font-semibold text-slate-900 dark:text-slate-100">{complaint.subject}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{new Date(complaint.createdAt).toLocaleDateString()}</div>
                    </td>
                    <td className="py-4 pr-4 text-sm text-slate-600 dark:text-slate-300">
                      {complaint.dealerId?.name || complaint.dealer?.name || "Dealer"}
                    </td>
                    <td className="py-4 pr-4"><ComplaintPriorityBadge priority={complaint.priority} /></td>
                    <td className="py-4 pr-4"><ComplaintStatusBadge status={complaint.status} /></td>
                    <td className="py-4 pr-4 text-sm text-slate-600 dark:text-slate-300">
                      {complaint.assignedTo?.name || "Unassigned"}
                    </td>
                    <td className="py-4">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => navigate(`/complaints/${complaint._id}`)}
                          className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                        >
                          View
                        </button>
                        {canManageComplaint ? (
                          <button
                            type="button"
                            onClick={() => openManageModal(complaint)}
                            className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                          >
                            Manage
                          </button>
                        ) : null}
                        {canDeleteComplaint ? (
                          <button
                            type="button"
                            onClick={() => handleDelete(complaint)}
                            className="inline-flex items-center gap-1 rounded-xl border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 dark:border-rose-500/30 dark:text-rose-300 dark:hover:bg-rose-500/10"
                          >
                            <Trash2 size={12} />
                            Delete
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="mt-5 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setPage((current) => Math.max(current - 1, 1))}
            disabled={page <= 1}
            className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200"
          >
            Previous
          </button>
          <div className="text-sm text-slate-500 dark:text-slate-400">Page {page} of {pages}</div>
          <button
            type="button"
            onClick={() => setPage((current) => Math.min(current + 1, pages))}
            disabled={page >= pages}
            className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200"
          >
            Next
          </button>
        </div>
      </section>

      <DashboardModal open={activeModal === "create"} title="Raise Complaint" description="Create a new support request for the admin team." onClose={closeModal}>
        <form onSubmit={handleCreateComplaint} className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Subject</span>
            <input
              required
              value={complaintForm.subject}
              onChange={(event) => setComplaintForm((current) => ({ ...current, subject: event.target.value }))}
              className="w-full rounded-2xl border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Priority</span>
            <select
              value={complaintForm.priority}
              onChange={(event) => setComplaintForm((current) => ({ ...current, priority: event.target.value }))}
              className="w-full rounded-2xl border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            >
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Description</span>
            <textarea
              required
              rows={5}
              value={complaintForm.description}
              onChange={(event) => setComplaintForm((current) => ({ ...current, description: event.target.value }))}
              className="w-full rounded-2xl border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
          </label>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={closeModal} className="rounded-2xl border border-slate-200 px-4 py-2 text-sm dark:border-slate-700 dark:text-slate-200">Cancel</button>
            <button type="submit" disabled={submitting} className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white dark:bg-amber-500 dark:text-slate-950">
              {submitting ? "Submitting..." : "Submit complaint"}
            </button>
          </div>
        </form>
      </DashboardModal>

      <DashboardModal open={activeModal === "manage"} title="Manage Complaint" description="Assign, prioritise, and resolve this support ticket." onClose={closeModal}>
        <form onSubmit={handleManageComplaint} className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Priority</span>
            <select
              value={manageForm.priority}
              onChange={(event) => setManageForm((current) => ({ ...current, priority: event.target.value }))}
              className="w-full rounded-2xl border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            >
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Status</span>
            <select
              value={manageForm.status}
              onChange={(event) => setManageForm((current) => ({ ...current, status: event.target.value }))}
              className="w-full rounded-2xl border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            >
              <option value="Open">Open</option>
              <option value="In Progress">In Progress</option>
              <option value="Resolved">Resolved</option>
              <option value="Closed">Closed</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Assigned To</span>
            <select
              value={manageForm.assignedTo}
              onChange={(event) => setManageForm((current) => ({ ...current, assignedTo: event.target.value }))}
              className="w-full rounded-2xl border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            >
              <option value="">Unassigned</option>
              {supportUsers.map((person) => (
                <option key={person._id} value={person._id}>
                  {person.name} ({person.role})
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Resolution Note</span>
            <textarea
              rows={4}
              value={manageForm.resolutionNote}
              onChange={(event) => setManageForm((current) => ({ ...current, resolutionNote: event.target.value }))}
              className="w-full rounded-2xl border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
          </label>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={closeModal} className="rounded-2xl border border-slate-200 px-4 py-2 text-sm dark:border-slate-700 dark:text-slate-200">Cancel</button>
            <button type="submit" disabled={submitting} className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white dark:bg-amber-500 dark:text-slate-950">
              {submitting ? "Saving..." : "Update complaint"}
            </button>
          </div>
        </form>
      </DashboardModal>
    </div>
  );
};
