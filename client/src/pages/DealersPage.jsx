import { useEffect, useMemo, useState } from "react";
import { Download, Eye, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

import { DashboardModal } from "../components/DashboardModal";
import { DealerStatusBadge } from "../components/DealerStatusBadge";
import { DealerTableSkeleton } from "../components/DealerTableSkeleton";
import {
  createDealer,
  deleteDealer,
  exportDealersCsv,
  fetchDealers,
  updateDealer,
} from "../services/dealerService";

const defaultFilters = {
  search: "",
  area: "",
  status: "",
};

const emptyDealerForm = {
  name: "",
  businessName: "",
  phone: "",
  email: "",
  area: "",
  address: "",
  gstNumber: "",
  status: "Active",
  password: "",
  rating: 0,
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phonePattern = /^[0-9]{10,15}$/;
const normalizePhone = (value = "") => value.replace(/\D/g, "");

export const DealersPage = () => {
  const navigate = useNavigate();
  const [filters, setFilters] = useState(defaultFilters);
  const [dealers, setDealers] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingDealer, setEditingDealer] = useState(null);
  const [dealerForm, setDealerForm] = useState(emptyDealerForm);
  const [modalOpen, setModalOpen] = useState(false);

  const loadDealers = async () => {
    try {
      setLoading(true);
      const data = await fetchDealers({
        page,
        limit: 10,
        ...filters,
      });
      setDealers(data.dealers || []);
      setTotal(data.total || 0);
      setPages(data.pages || 1);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Unable to load dealers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDealers();
  }, [page, filters.search, filters.area, filters.status]);

  const areaOptions = useMemo(() => {
    return [...new Set(dealers.map((dealer) => dealer.area).filter(Boolean))].sort((a, b) =>
      a.localeCompare(b)
    );
  }, [dealers]);

  const closeModal = () => {
    setModalOpen(false);
    setEditingDealer(null);
    setDealerForm(emptyDealerForm);
  };

  const openCreateModal = () => {
    setEditingDealer(null);
    setDealerForm(emptyDealerForm);
    setModalOpen(true);
  };

  const openEditModal = (dealer) => {
    setEditingDealer(dealer);
    setDealerForm({
      name: dealer.name,
      businessName: dealer.businessName,
      phone: dealer.phone,
      email: dealer.email,
      area: dealer.area,
      address: dealer.address,
      gstNumber: dealer.gstNumber || "",
      status: dealer.status,
      password: "",
      rating: dealer.rating || 0,
    });
    setModalOpen(true);
  };

  const validateForm = () => {
    if (!dealerForm.name.trim() || !dealerForm.businessName.trim() || !dealerForm.area.trim() || !dealerForm.address.trim()) {
      return "Name, business name, area, and address are required";
    }
    if (!emailPattern.test(dealerForm.email.trim().toLowerCase())) {
      return "Enter a valid email address";
    }
    if (!phonePattern.test(normalizePhone(dealerForm.phone))) {
      return "Enter a valid phone number with 10 to 15 digits";
    }
    if (!editingDealer && !dealerForm.password) {
      return "Password is required when creating a dealer";
    }
    return "";
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const validationError = validateForm();
    if (validationError) {
      toast.error(validationError);
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        ...dealerForm,
        phone: normalizePhone(dealerForm.phone),
        email: dealerForm.email.trim().toLowerCase(),
        rating: Number(dealerForm.rating || 0),
      };

      if (editingDealer) {
        if (!payload.password) {
          delete payload.password;
        }
        await updateDealer(editingDealer._id, payload);
        toast.success("Dealer updated");
      } else {
        await createDealer(payload);
        toast.success("Dealer created");
      }

      closeModal();
      loadDealers();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Unable to save dealer");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (dealer) => {
    if (!window.confirm(`Remove dealer "${dealer.name}"?`)) return;
    try {
      await deleteDealer(dealer._id);
      toast.success("Dealer removed");
      loadDealers();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Unable to delete dealer");
    }
  };

  const handleStatusToggle = async (dealer) => {
    const nextStatus = dealer.status === "Active" ? "Inactive" : "Active";
    try {
      await updateDealer(dealer._id, { status: nextStatus });
      toast.success(`Dealer marked ${nextStatus.toLowerCase()}`);
      loadDealers();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Unable to update dealer status");
    }
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      const blob = await exportDealersCsv(filters);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "dealers-export.csv";
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Unable to export dealers");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">Dealer Management</h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Manage dealer accounts, area coverage, status, and conversion performance.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleExport}
            disabled={exporting}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <Download size={16} />
            {exporting ? "Exporting..." : "Export CSV"}
          </button>
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 dark:bg-amber-500 dark:text-slate-950"
          >
            <Plus size={16} />
            Add Dealer
          </button>
        </div>
      </header>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm ring-1 ring-slate-950/5 dark:border-slate-800 dark:bg-slate-900">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="block xl:col-span-2">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Search</span>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                value={filters.search}
                onChange={(event) => {
                  setPage(1);
                  setFilters((current) => ({ ...current, search: event.target.value }));
                }}
                placeholder="Search by name, business name, or area"
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
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Dealer Table</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">{total} dealer{total === 1 ? "" : "s"} in the current result set</p>
          </div>
        </div>

        <div className="mt-5 overflow-x-auto">
          {loading ? (
            <DealerTableSkeleton />
          ) : dealers.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 px-6 py-12 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
              No dealers match the current filters.
            </div>
          ) : (
            <table className="w-full min-w-[1080px]">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  <th className="pb-3 font-semibold">Name</th>
                  <th className="pb-3 font-semibold">Business Name</th>
                  <th className="pb-3 font-semibold">Phone</th>
                  <th className="pb-3 font-semibold">Area</th>
                  <th className="pb-3 font-semibold">Status</th>
                  <th className="pb-3 font-semibold">Total Leads</th>
                  <th className="pb-3 font-semibold">Conversion Rate</th>
                  <th className="pb-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {dealers.map((dealer) => (
                  <tr key={dealer._id} className="border-b border-slate-100 last:border-b-0 dark:border-slate-800">
                    <td className="py-4 pr-4">
                      <div className="font-semibold text-slate-900 dark:text-slate-100">{dealer.name}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{dealer.email}</div>
                    </td>
                    <td className="py-4 pr-4 text-sm text-slate-600 dark:text-slate-300">{dealer.businessName}</td>
                    <td className="py-4 pr-4 text-sm text-slate-600 dark:text-slate-300">{dealer.phone}</td>
                    <td className="py-4 pr-4 text-sm text-slate-600 dark:text-slate-300">{dealer.area}</td>
                    <td className="py-4 pr-4">
                      <button type="button" onClick={() => handleStatusToggle(dealer)}>
                        <DealerStatusBadge status={dealer.status} />
                      </button>
                    </td>
                    <td className="py-4 pr-4 text-sm text-slate-600 dark:text-slate-300">{dealer.performance?.totalLeads || 0}</td>
                    <td className="py-4 pr-4 text-sm text-slate-600 dark:text-slate-300">
                      {(dealer.performance?.conversionRate || 0).toFixed(1)}%
                    </td>
                    <td className="py-4">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => navigate(`/dealers/${dealer._id}`)}
                          className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                        >
                          <Eye size={13} />
                          View
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditModal(dealer)}
                          className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                        >
                          <Pencil size={13} />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(dealer)}
                          className="inline-flex items-center gap-1 rounded-xl border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 dark:border-rose-500/30 dark:text-rose-300 dark:hover:bg-rose-500/10"
                        >
                          <Trash2 size={13} />
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
          <div className="text-sm text-slate-500 dark:text-slate-400">
            Page {page} of {pages}
          </div>
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
        open={modalOpen}
        title={editingDealer ? "Edit Dealer" : "Add Dealer"}
        description="Create or update dealer profile and business account details."
        onClose={closeModal}
      >
        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Name</span>
            <input value={dealerForm.name} onChange={(event) => setDealerForm((current) => ({ ...current, name: event.target.value }))} className="w-full rounded-2xl border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Business Name</span>
            <input value={dealerForm.businessName} onChange={(event) => setDealerForm((current) => ({ ...current, businessName: event.target.value }))} className="w-full rounded-2xl border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Phone</span>
            <input value={dealerForm.phone} onChange={(event) => setDealerForm((current) => ({ ...current, phone: event.target.value }))} className="w-full rounded-2xl border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Email</span>
            <input value={dealerForm.email} onChange={(event) => setDealerForm((current) => ({ ...current, email: event.target.value }))} className="w-full rounded-2xl border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Area</span>
            <input value={dealerForm.area} onChange={(event) => setDealerForm((current) => ({ ...current, area: event.target.value }))} className="w-full rounded-2xl border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Status</span>
            <select value={dealerForm.status} onChange={(event) => setDealerForm((current) => ({ ...current, status: event.target.value }))} className="w-full rounded-2xl border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100">
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </label>
          <label className="block md:col-span-2">
            <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Address</span>
            <textarea rows={3} value={dealerForm.address} onChange={(event) => setDealerForm((current) => ({ ...current, address: event.target.value }))} className="w-full rounded-2xl border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">GST Number</span>
            <input value={dealerForm.gstNumber} onChange={(event) => setDealerForm((current) => ({ ...current, gstNumber: event.target.value }))} className="w-full rounded-2xl border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">{editingDealer ? "Reset Password" : "Password"}</span>
            <input type="password" value={dealerForm.password} onChange={(event) => setDealerForm((current) => ({ ...current, password: event.target.value }))} className="w-full rounded-2xl border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" />
          </label>
          <div className="md:col-span-2 flex justify-end gap-3">
            <button type="button" onClick={closeModal} className="rounded-2xl border border-slate-200 px-4 py-2 text-sm dark:border-slate-700 dark:text-slate-200">Cancel</button>
            <button type="submit" disabled={submitting} className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white dark:bg-amber-500 dark:text-slate-950">
              {submitting ? "Saving..." : editingDealer ? "Update dealer" : "Create dealer"}
            </button>
          </div>
        </form>
      </DashboardModal>
    </div>
  );
};
