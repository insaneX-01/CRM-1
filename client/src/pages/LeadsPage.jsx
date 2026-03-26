import { useEffect, useMemo, useState } from "react";
import {
  Clock3,
  Download,
  Orbit,
  Pencil,
  Plus,
  Search,
  Shuffle,
  Trash2,
} from "lucide-react";
import { toast } from "react-toastify";

import { DashboardModal } from "../components/DashboardModal";
import { LeadStatusBadge } from "../components/LeadStatusBadge";
import { LeadTableSkeleton } from "../components/LeadTableSkeleton";
import { useAuth } from "../context/AuthContext";
import { fetchDealers } from "../services/dealerService";
import {
  assignLead,
  createLead,
  deleteLead,
  exportLeadsCsv,
  fetchLeadActivity,
  fetchLeads,
  updateLead,
  updateLeadStatus,
} from "../services/leadService";

const statusOptions = ["New", "Contacted", "Converted", "Lost"];
const defaultFilters = {
  search: "",
  status: "",
  area: "",
  dealerId: "",
};
const emptyLeadForm = {
  name: "",
  phone: "",
  area: "",
  requirement: "",
  assignedDealerId: "",
  autoAssign: false,
};
const emptyAssignForm = {
  leadId: "",
  dealerId: "",
  autoAssign: true,
};

const normalizePhone = (phone = "") => phone.replace(/\D/g, "");
const phonePattern = /^[0-9]{10,15}$/;

const formatTimelineDate = (value) => new Date(value).toLocaleString();

export const LeadsPage = () => {
  const { user } = useAuth();
  const [filters, setFilters] = useState(defaultFilters);
  const [page, setPage] = useState(1);
  const [leads, setLeads] = useState([]);
  const [dealers, setDealers] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalLeads, setTotalLeads] = useState(0);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [activeModal, setActiveModal] = useState("");
  const [editingLead, setEditingLead] = useState(null);
  const [selectedLead, setSelectedLead] = useState(null);
  const [leadForm, setLeadForm] = useState(emptyLeadForm);
  const [assignForm, setAssignForm] = useState(emptyAssignForm);
  const [timeline, setTimeline] = useState([]);
  const [timelineLoading, setTimelineLoading] = useState(false);

  const canCreateLead = user?.role === "admin" || user?.role === "salesperson";
  const canAssignLead = user?.role === "admin";
  const canDeleteLead = user?.role === "admin";
  const canEditLead = user?.role === "admin" || user?.role === "salesperson";

  const loadLeads = async () => {
    try {
      setLoading(true);
      const data = await fetchLeads({
        page,
        limit: 10,
        ...filters,
      });
      setLeads(data.leads || []);
      setTotalPages(data.pages || 1);
      setTotalLeads(data.total || 0);
      if (data.dealers?.length) {
        setDealers(data.dealers);
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Unable to load leads");
    } finally {
      setLoading(false);
    }
  };

  const loadDealers = async () => {
    if (user?.role !== "admin") return;
    try {
      const data = await fetchDealers();
      setDealers(data?.dealers || data || []);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Unable to load dealers");
    }
  };

  useEffect(() => {
    loadLeads();
  }, [page, filters.search, filters.status, filters.area, filters.dealerId]);

  useEffect(() => {
    loadDealers();
  }, [user?.role]);

  const resetLeadForm = () => {
    setLeadForm(emptyLeadForm);
    setEditingLead(null);
  };

  const closeModal = () => {
    setActiveModal("");
    resetLeadForm();
    setAssignForm(emptyAssignForm);
    setSelectedLead(null);
    setTimeline([]);
    setTimelineLoading(false);
  };

  const validateLeadForm = () => {
    if (!leadForm.name.trim() || !leadForm.area.trim() || !leadForm.requirement.trim()) {
      return "Name, area, and requirement are required";
    }

    if (!phonePattern.test(normalizePhone(leadForm.phone))) {
      return "Enter a valid phone number with 10 to 15 digits";
    }

    return "";
  };

  const openCreateModal = () => {
    resetLeadForm();
    setActiveModal("lead");
  };

  const openEditModal = (lead) => {
    setEditingLead(lead);
    setLeadForm({
      name: lead.name,
      phone: lead.phone,
      area: lead.area,
      requirement: lead.requirement,
      assignedDealerId: lead.assignedDealer?._id || "",
      autoAssign: false,
    });
    setActiveModal("lead");
  };

  const openAssignModal = (lead) => {
    const suggestedDealer = dealers.find(
      (dealer) => dealer.area?.toLowerCase() === lead.area?.toLowerCase()
    );

    setSelectedLead(lead);
    setAssignForm({
      leadId: lead._id,
      dealerId: suggestedDealer?._id || lead.assignedDealer?._id || "",
      autoAssign: !lead.assignedDealer,
    });
    setActiveModal("assign");
  };

  const openTimelineModal = async (lead) => {
    try {
      setSelectedLead(lead);
      setTimelineLoading(true);
      setActiveModal("timeline");
      const data = await fetchLeadActivity(lead._id);
      setTimeline(data);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Unable to load lead timeline");
    } finally {
      setTimelineLoading(false);
    }
  };

  const handleLeadSubmit = async (event) => {
    event.preventDefault();
    const validationError = validateLeadForm();
    if (validationError) {
      toast.error(validationError);
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        ...leadForm,
        phone: normalizePhone(leadForm.phone),
      };

      if (editingLead) {
        await updateLead(editingLead._id, payload);
        toast.success("Lead updated");
      } else {
        await createLead(payload);
        toast.success("Lead created");
      }

      closeModal();
      loadLeads();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Unable to save lead");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAssignSubmit = async (event) => {
    event.preventDefault();
    try {
      setSubmitting(true);
      await assignLead(assignForm.leadId, {
        dealerId: assignForm.autoAssign ? "" : assignForm.dealerId,
        autoAssign: assignForm.autoAssign,
      });
      toast.success("Lead assigned successfully");
      closeModal();
      loadLeads();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Unable to assign lead");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (lead) => {
    if (!window.confirm(`Delete lead "${lead.name}"?`)) return;

    try {
      await deleteLead(lead._id);
      toast.success("Lead deleted");
      loadLeads();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Unable to delete lead");
    }
  };

  const handleStatusChange = async (lead, nextStatus) => {
    const previousStatus = lead.status;
    const previousReason = lead.lostReason || "";
    let lostReason = previousReason;

    if (nextStatus === "Lost") {
      lostReason = window.prompt("Reason for marking this lead as lost?", previousReason) || "";
      if (!lostReason.trim()) {
        toast.error("Lost reason is required");
        return;
      }
    }

    setLeads((current) =>
      current.map((item) =>
        item._id === lead._id
          ? { ...item, status: nextStatus, lostReason }
          : item
      )
    );

    try {
      await updateLeadStatus(lead._id, { status: nextStatus, lostReason });
      toast.success("Lead status updated");
      loadLeads();
    } catch (err) {
      setLeads((current) =>
        current.map((item) =>
          item._id === lead._id
            ? { ...item, status: previousStatus, lostReason: previousReason }
            : item
        )
      );
      toast.error(err?.response?.data?.message || "Unable to update lead status");
    }
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      const blob = await exportLeadsCsv(filters);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "leads-export.csv";
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Unable to export leads");
    } finally {
      setExporting(false);
    }
  };

  const areaOptions = useMemo(() => {
    const values = [...new Set([...dealers.map((dealer) => dealer.area), ...leads.map((lead) => lead.area)].filter(Boolean))];
    return values.sort((a, b) => a.localeCompare(b));
  }, [dealers, leads]);

  const suggestedDealers = useMemo(() => {
    if (!selectedLead) return [];
    return dealers.filter(
      (dealer) => dealer.area?.toLowerCase() === selectedLead.area?.toLowerCase()
    );
  }, [dealers, selectedLead]);

  return (
    <div className="space-y-6">
      <header className="rounded-[2rem] border border-stone-200/80 bg-[radial-gradient(circle_at_top_left,_rgba(251,146,60,0.18),_transparent_25%),linear-gradient(135deg,_#fffaf2,_#fffdf8_55%,_#eefbf8)] p-6 shadow-[0_24px_60px_rgba(120,53,15,0.1)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white/70 px-3 py-1 text-[11px] uppercase tracking-[0.3em] text-stone-600">
            <Orbit size={12} />
            Pipeline Studio
          </div>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-stone-950">Lead Management</h2>
          <p className="mt-2 text-sm text-stone-500">
            Manage lead intake, assignment, status tracking, and dealer follow-up from one workspace.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleExport}
            disabled={exporting}
            className="inline-flex items-center gap-2 rounded-2xl border border-stone-200 bg-white/80 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-orange-50 disabled:opacity-60"
          >
            <Download size={16} />
            {exporting ? "Exporting..." : "Export CSV"}
          </button>

          {canCreateLead ? (
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 rounded-2xl bg-stone-950 px-4 py-2 text-sm font-medium text-white hover:bg-stone-800"
            >
              <Plus size={16} />
              Add Lead
            </button>
          ) : null}
        </div>
        </div>
      </header>

      <section className="crm-panel rounded-[2rem] p-5">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <label className="block xl:col-span-2">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-stone-500">Search</span>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
              <input
                value={filters.search}
                onChange={(event) => {
                  setPage(1);
                  setFilters((current) => ({ ...current, search: event.target.value }));
                }}
                placeholder="Search by name, phone, or requirement"
                className="crm-input py-2.5 pl-10 pr-3"
              />
            </div>
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-stone-500">Status</span>
            <select
              value={filters.status}
              onChange={(event) => {
                setPage(1);
                setFilters((current) => ({ ...current, status: event.target.value }));
              }}
              className="crm-input"
            >
              <option value="">All statuses</option>
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-stone-500">Area</span>
            <select
              value={filters.area}
              onChange={(event) => {
                setPage(1);
                setFilters((current) => ({ ...current, area: event.target.value }));
              }}
              className="crm-input"
            >
              <option value="">All areas</option>
              {areaOptions.map((area) => (
                <option key={area} value={area}>
                  {area}
                </option>
              ))}
            </select>
          </label>

          {user?.role === "admin" ? (
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-stone-500">Dealer</span>
              <select
                value={filters.dealerId}
                onChange={(event) => {
                  setPage(1);
                  setFilters((current) => ({ ...current, dealerId: event.target.value }));
                }}
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
          ) : null}
        </div>
      </section>

      <section className="crm-panel rounded-[2rem] p-5">
        <div className="flex items-center justify-between gap-3 border-b border-stone-200 pb-4">
          <div>
            <h3 className="text-lg font-semibold text-stone-950">Lead Table</h3>
            <p className="text-sm text-stone-500">{totalLeads} lead{totalLeads === 1 ? "" : "s"} in the current result set</p>
          </div>
        </div>

        <div className="mt-5 overflow-x-auto">
          {loading ? (
            <LeadTableSkeleton />
          ) : leads.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-stone-300 px-6 py-12 text-center text-sm text-stone-500">
              No leads match the current filters.
            </div>
          ) : (
            <table className="w-full min-w-[980px]">
              <thead>
                <tr className="border-b border-stone-200 text-left text-xs uppercase tracking-wide text-stone-500">
                  <th className="pb-3 font-semibold">Name</th>
                  <th className="pb-3 font-semibold">Phone</th>
                  <th className="pb-3 font-semibold">Area</th>
                  <th className="pb-3 font-semibold">Requirement</th>
                  <th className="pb-3 font-semibold">Status</th>
                  <th className="pb-3 font-semibold">Assigned Dealer</th>
                  <th className="pb-3 font-semibold">Created By</th>
                  <th className="pb-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr key={lead._id} className="border-b border-stone-100 last:border-b-0">
                    <td className="py-4 pr-4">
                      <div className="font-semibold text-stone-950">{lead.name}</div>
                      <div className="text-xs text-stone-500">
                        {new Date(lead.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="py-4 pr-4 text-sm text-stone-600">{lead.phone}</td>
                    <td className="py-4 pr-4 text-sm text-stone-600">{lead.area}</td>
                    <td className="max-w-xs py-4 pr-4 text-sm text-stone-600">{lead.requirement}</td>
                    <td className="py-4 pr-4">
                      <div className="flex items-center gap-3">
                        <LeadStatusBadge status={lead.status} />
                        <select
                          value={lead.status}
                          onChange={(event) => handleStatusChange(lead, event.target.value)}
                          className="rounded-xl border border-stone-200 bg-white px-2 py-1 text-xs text-stone-700"
                        >
                          {statusOptions.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                      </div>
                      {lead.status === "Lost" && lead.lostReason ? (
                        <div className="mt-2 text-xs text-rose-600 dark:text-rose-300">Reason: {lead.lostReason}</div>
                      ) : null}
                    </td>
                    <td className="py-4 pr-4 text-sm text-stone-600">
                      {lead.assignedDealer ? (
                        <div>
                          <div>{lead.assignedDealer.name}</div>
                          <div className="text-xs text-stone-500">{lead.assignedDealer.area}</div>
                        </div>
                      ) : (
                        <span className="text-xs text-stone-400">Unassigned</span>
                      )}
                    </td>
                    <td className="py-4 pr-4 text-sm text-stone-600">
                      {lead.createdBy?.name || "-"}
                    </td>
                    <td className="py-4">
                      <div className="flex flex-wrap gap-2">
                        {canEditLead ? (
                          <button
                            type="button"
                            onClick={() => openEditModal(lead)}
                            className="inline-flex items-center gap-1 rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-orange-50"
                          >
                            <Pencil size={13} />
                            Edit
                          </button>
                        ) : null}

                        {canAssignLead ? (
                          <button
                            type="button"
                            onClick={() => openAssignModal(lead)}
                            className="inline-flex items-center gap-1 rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-orange-50"
                          >
                            <Shuffle size={13} />
                            Assign
                          </button>
                        ) : null}

                        <button
                          type="button"
                          onClick={() => openTimelineModal(lead)}
                          className="inline-flex items-center gap-1 rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-orange-50"
                        >
                          <Clock3 size={13} />
                          Timeline
                        </button>

                        {canDeleteLead ? (
                          <button
                            type="button"
                            onClick={() => handleDelete(lead)}
                            className="inline-flex items-center gap-1 rounded-xl border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 dark:border-rose-500/30 dark:text-rose-300 dark:hover:bg-rose-500/10"
                          >
                            <Trash2 size={13} />
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
            className="rounded-2xl border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-700 disabled:opacity-50"
          >
            Previous
          </button>

          <div className="text-sm text-stone-500">
            Page {page} of {totalPages}
          </div>

          <button
            type="button"
            onClick={() => setPage((current) => Math.min(current + 1, totalPages))}
            disabled={page >= totalPages}
            className="rounded-2xl border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-700 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </section>

      <DashboardModal
        open={activeModal === "lead"}
        title={editingLead ? "Edit Lead" : "Add Lead"}
        description="Create or update lead details with validation and optional assignment."
        onClose={closeModal}
      >
        <form onSubmit={handleLeadSubmit} className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Name</span>
            <input
              value={leadForm.name}
              onChange={(event) => setLeadForm((current) => ({ ...current, name: event.target.value }))}
              className="w-full rounded-2xl border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Phone</span>
            <input
              value={leadForm.phone}
              onChange={(event) => setLeadForm((current) => ({ ...current, phone: event.target.value }))}
              className="w-full rounded-2xl border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Area</span>
            <input
              value={leadForm.area}
              onChange={(event) => setLeadForm((current) => ({ ...current, area: event.target.value }))}
              className="w-full rounded-2xl border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
          </label>

          {user?.role === "admin" ? (
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Assigned dealer</span>
              <select
                value={leadForm.assignedDealerId}
                onChange={(event) => setLeadForm((current) => ({ ...current, assignedDealerId: event.target.value }))}
                className="w-full rounded-2xl border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              >
                <option value="">Unassigned</option>
                {dealers.map((dealer) => (
                  <option key={dealer._id} value={dealer._id}>
                    {dealer.name} ({dealer.area})
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <label className="block md:col-span-2">
            <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Requirement</span>
            <textarea
              rows={4}
              value={leadForm.requirement}
              onChange={(event) => setLeadForm((current) => ({ ...current, requirement: event.target.value }))}
              className="w-full rounded-2xl border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
          </label>

          {!editingLead && user?.role === "admin" ? (
            <label className="md:col-span-2 flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-3 text-sm text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
              <input
                type="checkbox"
                checked={leadForm.autoAssign}
                onChange={(event) => setLeadForm((current) => ({ ...current, autoAssign: event.target.checked }))}
              />
              Auto assign a dealer when area matches.
            </label>
          ) : null}

          <div className="md:col-span-2 flex justify-end gap-3">
            <button type="button" onClick={closeModal} className="rounded-2xl border border-slate-200 px-4 py-2 text-sm dark:border-slate-700 dark:text-slate-200">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white dark:bg-amber-500 dark:text-slate-950">
              {submitting ? "Saving..." : editingLead ? "Update lead" : "Create lead"}
            </button>
          </div>
        </form>
      </DashboardModal>

      <DashboardModal
        open={activeModal === "assign"}
        title="Assign Lead"
        description="Assign the lead to a dealer manually or use area-based auto assignment."
        onClose={closeModal}
      >
        <form onSubmit={handleAssignSubmit} className="space-y-4">
          <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
            {selectedLead ? `${selectedLead.name} - ${selectedLead.area}` : "Select a lead"}
          </div>

          {suggestedDealers.length > 0 ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
              Suggested dealer{suggestedDealers.length > 1 ? "s" : ""}: {suggestedDealers.map((dealer) => dealer.name).join(", ")}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-3 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
              No dealer suggestions found for this area.
            </div>
          )}

          <label className="flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-3 text-sm text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
            <input
              type="checkbox"
              checked={assignForm.autoAssign}
              onChange={(event) => setAssignForm((current) => ({ ...current, autoAssign: event.target.checked }))}
            />
            Use auto assignment based on area
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Dealer</span>
            <select
              value={assignForm.dealerId}
              onChange={(event) => setAssignForm((current) => ({ ...current, dealerId: event.target.value, autoAssign: false }))}
              disabled={assignForm.autoAssign}
              className="w-full rounded-2xl border border-slate-200 px-3 py-2 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            >
              <option value="">Select dealer</option>
              {dealers.map((dealer) => (
                <option key={dealer._id} value={dealer._id}>
                  {dealer.name} ({dealer.area})
                </option>
              ))}
            </select>
          </label>

          <div className="flex justify-end gap-3">
            <button type="button" onClick={closeModal} className="rounded-2xl border border-slate-200 px-4 py-2 text-sm dark:border-slate-700 dark:text-slate-200">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white dark:bg-amber-500 dark:text-slate-950">
              {submitting ? "Assigning..." : "Assign lead"}
            </button>
          </div>
        </form>
      </DashboardModal>

      <DashboardModal
        open={activeModal === "timeline"}
        title="Lead Timeline"
        description={selectedLead ? `Activity history for ${selectedLead.name}` : "Lead activity"}
        onClose={closeModal}
      >
        {timelineLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-16 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
            ))}
          </div>
        ) : timeline.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
            No timeline entries found for this lead yet.
          </div>
        ) : (
          <div className="space-y-3">
            {timeline.map((entry) => (
              <div key={entry._id} className="rounded-2xl border border-slate-200 px-4 py-4 dark:border-slate-800">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-slate-900 dark:text-white">{entry.message}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">{formatTimelineDate(entry.createdAt)}</div>
                </div>
                <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  By {entry.userId?.name || entry.user?.name || "System"} ({entry.userId?.role || entry.user?.role || "unknown"})
                </div>
              </div>
            ))}
          </div>
        )}
      </DashboardModal>
    </div>
  );
};
