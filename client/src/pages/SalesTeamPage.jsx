import { useEffect, useMemo, useState } from "react";
import { Plus, Search, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

import { DashboardModal } from "../components/DashboardModal";
import { useAuth } from "../context/AuthContext";
import {
  createSalesUser,
  deleteSalesUser,
  fetchMySalesProfile,
  fetchSalesUsers,
  updateSalesUser,
} from "../services/salesService";

const defaultFilters = {
  search: "",
  area: "",
  status: "",
};

const emptyForm = {
  name: "",
  email: "",
  phone: "",
  assignedAreas: "",
  password: "",
  status: "Active",
};

export const SalesTeamPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [filters, setFilters] = useState(defaultFilters);
  const [salesUsers, setSalesUsers] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeModal, setActiveModal] = useState("");
  const [editingSalesUser, setEditingSalesUser] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const isAdmin = user?.role === "admin";

  const loadSalesUsers = async () => {
    try {
      setLoading(true);
      const data = await fetchSalesUsers({ page, limit: 10, ...filters });
      setSalesUsers(data.salesUsers || []);
      setPages(data.pages || 1);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Unable to load sales team");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAdmin && user?.role === "salesperson") {
      fetchMySalesProfile()
        .then((profile) => navigate(`/sales/${profile._id}`, { replace: true }))
        .catch((err) => toast.error(err?.response?.data?.message || "Unable to load sales profile"));
      return;
    }

    if (isAdmin) {
      loadSalesUsers();
    }
  }, [page, filters.search, filters.area, filters.status, isAdmin, user?.role]);

  const closeModal = () => {
    setActiveModal("");
    setEditingSalesUser(null);
    setForm(emptyForm);
  };

  const openCreateModal = () => {
    setEditingSalesUser(null);
    setForm(emptyForm);
    setActiveModal("form");
  };

  const openEditModal = (salesUser) => {
    setEditingSalesUser(salesUser);
    setForm({
      name: salesUser.userId?.name || "",
      email: salesUser.userId?.email || "",
      phone: salesUser.phone || salesUser.userId?.phone || "",
      assignedAreas: (salesUser.assignedAreas || []).join(", "),
      password: "",
      status: salesUser.status || "Active",
    });
    setActiveModal("form");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      setSubmitting(true);
      const payload = {
        ...form,
        assignedAreas: form.assignedAreas,
      };

      if (editingSalesUser) {
        await updateSalesUser(editingSalesUser._id, payload);
        toast.success("Sales user updated");
      } else {
        await createSalesUser(payload);
        toast.success("Sales user created");
      }

      closeModal();
      loadSalesUsers();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Unable to save sales user");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (salesUser) => {
    if (!window.confirm(`Delete sales user "${salesUser.userId?.name}"?`)) return;
    try {
      await deleteSalesUser(salesUser._id);
      toast.success("Sales user deleted");
      loadSalesUsers();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Unable to delete sales user");
    }
  };

  const areaOptions = useMemo(() => {
    const values = salesUsers.flatMap((salesUser) => salesUser.assignedAreas || []).filter(Boolean);
    return [...new Set(values)];
  }, [salesUsers]);

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">Sales Team</h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Manage sales coverage, assignments, and performance from one admin workspace.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white dark:bg-amber-500 dark:text-slate-950"
        >
          <Plus size={16} />
          Add Sales User
        </button>
      </header>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm ring-1 ring-slate-950/5 dark:border-slate-800 dark:bg-slate-900">
        <div className="grid gap-3 md:grid-cols-3">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Search</span>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                value={filters.search}
                onChange={(event) => {
                  setPage(1);
                  setFilters((current) => ({ ...current, search: event.target.value }));
                }}
                placeholder="Search by name, email, phone"
                className="w-full rounded-2xl border border-slate-200 py-2 pl-10 pr-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
            </div>
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Area</span>
            <select
              value={filters.area}
              onChange={(event) => {
                setPage(1);
                setFilters((current) => ({ ...current, area: event.target.value }));
              }}
              className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            >
              <option value="">All areas</option>
              {areaOptions.map((area) => (
                <option key={area} value={area}>
                  {area}
                </option>
              ))}
            </select>
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
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </label>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm ring-1 ring-slate-950/5 dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="h-16 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
              ))}
            </div>
          ) : salesUsers.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 px-6 py-12 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
              No sales users found.
            </div>
          ) : (
            <table className="w-full min-w-[980px]">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  <th className="pb-3 font-semibold">Name</th>
                  <th className="pb-3 font-semibold">Email</th>
                  <th className="pb-3 font-semibold">Area</th>
                  <th className="pb-3 font-semibold">Leads Assigned</th>
                  <th className="pb-3 font-semibold">Conversion Rate</th>
                  <th className="pb-3 font-semibold">Status</th>
                  <th className="pb-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {salesUsers.map((salesUser) => (
                  <tr key={salesUser._id} className="border-b border-slate-100 last:border-b-0 dark:border-slate-800">
                    <td className="py-4 pr-4">
                      <div className="font-semibold text-slate-900 dark:text-slate-100">{salesUser.userId?.name}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{salesUser.phone || salesUser.userId?.phone}</div>
                    </td>
                    <td className="py-4 pr-4 text-sm text-slate-600 dark:text-slate-300">{salesUser.userId?.email}</td>
                    <td className="py-4 pr-4 text-sm text-slate-600 dark:text-slate-300">{(salesUser.assignedAreas || []).join(", ") || "-"}</td>
                    <td className="py-4 pr-4 text-sm text-slate-600 dark:text-slate-300">{salesUser.performance?.totalLeadsHandled || 0}</td>
                    <td className="py-4 pr-4 text-sm text-slate-600 dark:text-slate-300">{salesUser.performance?.conversionRate || 0}%</td>
                    <td className="py-4 pr-4">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${salesUser.status === "Active" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300" : "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200"}`}>
                        {salesUser.status}
                      </span>
                    </td>
                    <td className="py-4">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => navigate(`/sales/${salesUser._id}`)}
                          className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                        >
                          View
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditModal(salesUser)}
                          className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(salesUser)}
                          className="inline-flex items-center gap-1 rounded-xl border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 dark:border-rose-500/30 dark:text-rose-300 dark:hover:bg-rose-500/10"
                        >
                          <Trash2 size={12} />
                          Delete
                        </button>
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

      <DashboardModal
        open={activeModal === "form"}
        title={editingSalesUser ? "Edit Sales User" : "Add Sales User"}
        description="Create or update a sales team member with area coverage and access status."
        onClose={closeModal}
      >
        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Name</span>
            <input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} className="w-full rounded-2xl border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Email</span>
            <input type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} className="w-full rounded-2xl border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Phone</span>
            <input value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} className="w-full rounded-2xl border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Areas</span>
            <input value={form.assignedAreas} onChange={(event) => setForm((current) => ({ ...current, assignedAreas: event.target.value }))} placeholder="Delhi, Noida, Gurgaon" className="w-full rounded-2xl border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">{editingSalesUser ? "Reset Password" : "Password"}</span>
            <input type="password" value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} className="w-full rounded-2xl border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Status</span>
            <select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))} className="w-full rounded-2xl border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100">
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </label>
          <div className="md:col-span-2 flex justify-end gap-3">
            <button type="button" onClick={closeModal} className="rounded-2xl border border-slate-200 px-4 py-2 text-sm dark:border-slate-700 dark:text-slate-200">Cancel</button>
            <button type="submit" disabled={submitting} className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white dark:bg-amber-500 dark:text-slate-950">
              {submitting ? "Saving..." : editingSalesUser ? "Update Sales User" : "Create Sales User"}
            </button>
          </div>
        </form>
      </DashboardModal>
    </div>
  );
};
