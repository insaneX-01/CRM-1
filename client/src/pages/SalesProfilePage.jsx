import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "react-toastify";

import { LeadStatusBadge } from "../components/LeadStatusBadge";
import { DashboardModal } from "../components/DashboardModal";
import { useAuth } from "../context/AuthContext";
import { addLeadNote, assignLeadToSales, fetchLeads, updateLeadStatus } from "../services/leadService";
import { fetchMySalesProfile, fetchSalesSummary } from "../services/salesService";

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

export const SalesProfilePage = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeModal, setActiveModal] = useState("");
  const [selectedLead, setSelectedLead] = useState(null);
  const [note, setNote] = useState("");
  const [unassignedLeads, setUnassignedLeads] = useState([]);

  const loadSummary = async () => {
    try {
      setLoading(true);
      if (id) {
        const data = await fetchSalesSummary(id);
        setSummary(data);
      } else {
        const profile = await fetchMySalesProfile();
        const data = await fetchSalesSummary(profile._id);
        setSummary(data);
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Unable to load sales profile");
    } finally {
      setLoading(false);
    }
  };

  const loadUnassignedLeads = async () => {
    if (user?.role !== "admin") return;
    try {
      const data = await fetchLeads({ page: 1, limit: 100 });
      setUnassignedLeads((data.leads || []).filter((lead) => !lead.assignedSales));
    } catch (err) {
      toast.error(err?.response?.data?.message || "Unable to load lead options");
    }
  };

  useEffect(() => {
    loadSummary();
  }, [id]);

  const handleStatusChange = async (lead, status) => {
    try {
      setSaving(true);
      const lostReason = status === "Lost" ? window.prompt("Reason for marking this lead as lost?", lead.lostReason || "") || "" : "";
      await updateLeadStatus(lead._id, { status, lostReason });
      toast.success("Lead status updated");
      loadSummary();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Unable to update lead status");
    } finally {
      setSaving(false);
    }
  };

  const openNoteModal = (lead) => {
    setSelectedLead(lead);
    setNote("");
    setActiveModal("note");
  };

  const handleAddNote = async (event) => {
    event.preventDefault();
    if (!selectedLead) return;
    try {
      setSaving(true);
      await addLeadNote(selectedLead._id, { note });
      toast.success("Lead note added");
      setActiveModal("");
      loadSummary();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Unable to add lead note");
    } finally {
      setSaving(false);
    }
  };

  const openAssignModal = async () => {
    await loadUnassignedLeads();
    setActiveModal("assign");
  };

  const handleAssignLead = async (leadId) => {
    try {
      setSaving(true);
      await assignLeadToSales(leadId, { salesId: summary.salesUser.userId._id });
      toast.success("Lead assigned to sales user");
      loadSummary();
      loadUnassignedLeads();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Unable to assign lead");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-32 animate-pulse rounded-3xl bg-slate-200 dark:bg-slate-800" />
        <div className="h-64 animate-pulse rounded-3xl bg-slate-200 dark:bg-slate-800" />
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-200 px-6 py-12 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
        Sales profile not available.
      </div>
    );
  }

  const { salesUser, performance, leads, notes, activities } = summary;

  return (
    <div className="space-y-6">
      <header className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm ring-1 ring-slate-950/5 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-slate-500 dark:text-slate-400">Sales Dashboard</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">{salesUser.userId?.name}</h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              {salesUser.userId?.email} • {(salesUser.assignedAreas || []).join(", ") || "No areas assigned"}
            </p>
          </div>
          {user?.role === "admin" ? (
            <button
              type="button"
              onClick={openAssignModal}
              className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white dark:bg-amber-500 dark:text-slate-950"
            >
              Assign Lead
            </button>
          ) : null}
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm ring-1 ring-slate-950/5 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm text-slate-500 dark:text-slate-400">Assigned Leads</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">{performance.totalLeadsHandled}</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm ring-1 ring-slate-950/5 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm text-slate-500 dark:text-slate-400">Converted Leads</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">{performance.convertedLeads}</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm ring-1 ring-slate-950/5 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm text-slate-500 dark:text-slate-400">Conversion Rate</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">{performance.conversionRate}%</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm ring-1 ring-slate-950/5 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm text-slate-500 dark:text-slate-400">Revenue Generated</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(performance.totalRevenue)}</p>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm ring-1 ring-slate-950/5 xl:col-span-2 dark:border-slate-800 dark:bg-slate-900">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Assigned Leads</h3>
          <div className="mt-4 space-y-3">
            {leads.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                No leads assigned yet.
              </div>
            ) : (
              leads.map((lead) => (
                <div key={lead._id} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-slate-100">{lead.name}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{lead.phone} • {lead.area}</div>
                      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{lead.requirement}</p>
                    </div>
                    <LeadStatusBadge status={lead.status} />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {["New", "Contacted", "Converted", "Lost"].map((status) => (
                      <button key={status} type="button" disabled={saving || status === lead.status} onClick={() => handleStatusChange(lead, status)} className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200">
                        {status}
                      </button>
                    ))}
                    <button type="button" onClick={() => openNoteModal(lead)} className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 dark:border-slate-700 dark:text-slate-200">
                      Add Note
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm ring-1 ring-slate-950/5 dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Recent Notes</h3>
            <div className="mt-4 space-y-3">
              {notes.length === 0 ? (
                <div className="text-sm text-slate-500 dark:text-slate-400">No notes added yet.</div>
              ) : (
                notes.slice(0, 6).map((item) => (
                  <div key={item._id} className="rounded-2xl border border-slate-200 p-3 dark:border-slate-800">
                    <div className="text-sm font-medium text-slate-900 dark:text-slate-100">{item.leadId?.name || "Lead"}</div>
                    <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{new Date(item.createdAt).toLocaleString()}</div>
                    <div className="mt-2 text-sm text-slate-600 dark:text-slate-300">{item.note}</div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm ring-1 ring-slate-950/5 dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Activity Timeline</h3>
            <div className="mt-4 space-y-3">
              {activities.length === 0 ? (
                <div className="text-sm text-slate-500 dark:text-slate-400">No activity logged yet.</div>
              ) : (
                activities.slice(0, 8).map((entry) => (
                  <div key={entry._id} className="rounded-2xl border border-slate-200 p-3 dark:border-slate-800">
                    <div className="text-sm font-medium text-slate-900 dark:text-slate-100">{entry.message}</div>
                    <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {new Date(entry.createdAt).toLocaleString()} • {entry.userId?.name || "System"}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </section>

      <DashboardModal open={activeModal === "note"} title="Add Lead Note" description={selectedLead ? `Add a note for ${selectedLead.name}` : "Add note"} onClose={() => setActiveModal("")}>
        <form onSubmit={handleAddNote} className="space-y-4">
          <textarea
            rows={5}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            className="w-full rounded-2xl border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          />
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setActiveModal("")} className="rounded-2xl border border-slate-200 px-4 py-2 text-sm dark:border-slate-700 dark:text-slate-200">Cancel</button>
            <button type="submit" disabled={saving} className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white dark:bg-amber-500 dark:text-slate-950">
              {saving ? "Saving..." : "Add Note"}
            </button>
          </div>
        </form>
      </DashboardModal>

      <DashboardModal open={activeModal === "assign"} title="Assign Lead" description="Assign an unassigned lead to this sales user." onClose={() => setActiveModal("")}>
        <div className="space-y-3">
          {unassignedLeads.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
              No unassigned leads available.
            </div>
          ) : (
            unassignedLeads.map((lead) => (
              <div key={lead._id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 p-3 dark:border-slate-800">
                <div>
                  <div className="font-medium text-slate-900 dark:text-slate-100">{lead.name}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">{lead.area} • {lead.phone}</div>
                </div>
                <button type="button" disabled={saving} onClick={() => handleAssignLead(lead._id)} className="rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-medium text-white dark:bg-amber-500 dark:text-slate-950">
                  Assign
                </button>
              </div>
            ))
          )}
        </div>
      </DashboardModal>
    </div>
  );
};
