import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Building2,
  CalendarRange,
  CircleDollarSign,
  ClipboardList,
  Compass,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";
import { toast } from "react-toastify";

import { ChartsSection } from "../components/ChartsSection";
import { DashboardFilters } from "../components/DashboardFilters";
import { DashboardModal } from "../components/DashboardModal";
import { DashboardSkeleton } from "../components/DashboardSkeleton";
import { NotificationsFeed } from "../components/NotificationsFeed";
import { QuickActionsPanel } from "../components/QuickActionsPanel";
import { RecentActivityTable } from "../components/RecentActivityTable";
import { StatsCard } from "../components/StatsCard";
import { useAuth } from "../context/AuthContext";
import { fetchDealers } from "../services/dealerService";
import {
  exportDashboardCsv,
  fetchDashboardActivity,
  fetchDashboardCharts,
  fetchDashboardStats,
} from "../services/dashboardService";
import { fetchLeads, createLead, assignLead } from "../services/leadService";
import { createOrder, fetchOrders } from "../services/orderService";
import { createPayment } from "../services/paymentService";

const DEFAULT_FILTERS = {
  startDate: "",
  endDate: "",
  dealerId: "",
  area: "",
};

const emptyLeadForm = {
  name: "",
  phone: "",
  area: "",
  requirement: "",
  assignedDealerId: "",
};

const emptyAssignForm = {
  leadId: "",
  dealerId: "",
};

const emptyOrderForm = {
  leadId: "",
  product: "",
  quantity: 1,
  price: "",
  notes: "",
};

const emptyPaymentForm = {
  orderId: "",
  dealerId: "",
  amount: "",
  paymentMethod: "Bank Transfer",
  note: "",
};

const buildParams = (filters) =>
  Object.entries(filters).reduce((acc, [key, value]) => {
    if (value) acc[key] = value;
    return acc;
  }, {});

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

export const DashboardPage = () => {
  const { user } = useAuth();
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [summary, setSummary] = useState(null);
  const [chartsData, setChartsData] = useState(null);
  const [activities, setActivities] = useState([]);
  const [dealers, setDealers] = useState([]);
  const [leadOptions, setLeadOptions] = useState([]);
  const [orderOptions, setOrderOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");
  const [activeModal, setActiveModal] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [leadForm, setLeadForm] = useState(emptyLeadForm);
  const [assignForm, setAssignForm] = useState(emptyAssignForm);
  const [orderForm, setOrderForm] = useState(emptyOrderForm);
  const [paymentForm, setPaymentForm] = useState(emptyPaymentForm);

  const canFilterDealer = user?.role === "admin";

  const loadDashboard = async ({ silent = false } = {}) => {
    try {
      if (!silent) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      setError("");

      const params = buildParams(filters);
      const [stats, charts, activity] = await Promise.all([
        fetchDashboardStats(params),
        fetchDashboardCharts(params),
        fetchDashboardActivity(params),
      ]);

      setSummary(stats);
      setChartsData(charts);
      setActivities(activity);
    } catch (err) {
      const message = err?.response?.data?.message || "Failed to load dashboard";
      setError(message);
      if (silent) {
        toast.error(message);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadDealersIfNeeded = async () => {
    if (user?.role !== "admin") return;
    try {
      const data = await fetchDealers();
      setDealers(data?.dealers || data || []);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Unable to load dealers");
    }
  };

  useEffect(() => {
    loadDashboard();
  }, [filters.startDate, filters.endDate, filters.dealerId, filters.area]);

  useEffect(() => {
    loadDealersIfNeeded();
  }, [user?.role]);

  useEffect(() => {
    const interval = setInterval(() => {
      loadDashboard({ silent: true });
    }, 45000);

    return () => clearInterval(interval);
  }, [filters.startDate, filters.endDate, filters.dealerId, filters.area]);

  const handleFilterChange = (key, value) => {
    setFilters((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      const blob = await exportDashboardCsv(buildParams(filters));
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "dashboard-export.csv";
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Unable to export dashboard");
    } finally {
      setExporting(false);
    }
  };

  const closeModal = () => {
    setActiveModal("");
    setLeadForm(emptyLeadForm);
    setAssignForm(emptyAssignForm);
    setOrderForm(emptyOrderForm);
    setPaymentForm(emptyPaymentForm);
  };

  const loadLeadOptions = async () => {
    try {
      const data = await fetchLeads({ page: 1, limit: 100 });
      setLeadOptions(data.leads || []);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Unable to load lead options");
    }
  };

  const loadOrderOptions = async () => {
    try {
      const data = await fetchOrders({ page: 1, limit: 100 });
      setOrderOptions(data.orders || []);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Unable to load order options");
    }
  };

  const openModal = async (modalKey) => {
    setActiveModal(modalKey);
    if (modalKey === "assign" || modalKey === "order") {
      await loadLeadOptions();
    }
    if (modalKey === "payment") {
      await loadOrderOptions();
    }
    if (modalKey === "lead" && user?.role === "admin") {
      await loadDealersIfNeeded();
    }
  };

  const submitLead = async (event) => {
    event.preventDefault();
    try {
      setSubmitting(true);
      await createLead(leadForm);
      toast.success("Lead created successfully");
      closeModal();
      loadDashboard({ silent: true });
    } catch (err) {
      toast.error(err?.response?.data?.message || "Unable to create lead");
    } finally {
      setSubmitting(false);
    }
  };

  const submitAssignment = async (event) => {
    event.preventDefault();
    try {
      setSubmitting(true);
      await assignLead(assignForm.leadId, assignForm.dealerId);
      toast.success("Lead assigned successfully");
      closeModal();
      loadDashboard({ silent: true });
    } catch (err) {
      toast.error(err?.response?.data?.message || "Unable to assign lead");
    } finally {
      setSubmitting(false);
    }
  };

  const submitOrder = async (event) => {
    event.preventDefault();
    try {
      setSubmitting(true);
      await createOrder({
        ...orderForm,
        quantity: Number(orderForm.quantity),
        price: Number(orderForm.price),
      });
      toast.success("Order created successfully");
      closeModal();
      loadDashboard({ silent: true });
    } catch (err) {
      toast.error(err?.response?.data?.message || "Unable to create order");
    } finally {
      setSubmitting(false);
    }
  };

  const submitPayment = async (event) => {
    event.preventDefault();
    try {
      setSubmitting(true);
      await createPayment({
        ...paymentForm,
        amount: Number(paymentForm.amount),
      });
      toast.success("Payment recorded successfully");
      closeModal();
      loadDashboard({ silent: true });
    } catch (err) {
      toast.error(err?.response?.data?.message || "Unable to create payment");
    } finally {
      setSubmitting(false);
    }
  };

  const areaOptions = useMemo(() => {
    const allAreas = [
      ...dealers.map((dealer) => dealer.area),
      ...leadOptions.map((lead) => lead.area),
      user?.area,
    ].filter(Boolean);

    return [...new Set(allAreas)];
  }, [dealers, leadOptions, user?.area]);

  const statCards = useMemo(() => {
    if (!summary) return [];

    const converted = summary.leadsByStatus?.Converted || 0;
    const contacted = summary.leadsByStatus?.Contacted || 0;
    const newLeads = summary.leadsByStatus?.New || 0;
    const lost = summary.leadsByStatus?.Lost || 0;

    const cards = [
      {
        icon: Building2,
        label: user?.role === "dealer" ? "My Dealer Account" : "Total Dealers",
        value: user?.role === "dealer" ? 1 : summary.totalDealers,
        trend: summary.growth?.dealers >= 0 ? "up" : "down",
        trendValue: summary.growth?.dealers,
        accent: "from-cyan-500 to-sky-500",
      },
      {
        icon: Users,
        label: user?.role === "salesperson" ? "Assigned Leads" : "Total Leads",
        value: summary.totalLeads,
        trend: summary.growth?.leads >= 0 ? "up" : "down",
        trendValue: summary.growth?.leads,
        accent: "from-blue-600 to-indigo-500",
      },
      {
        icon: Target,
        label: "Lead Status Mix",
        value: converted + contacted + newLeads + lost,
        trend: converted >= lost ? "up" : "down",
        trendValue: summary.totalLeads ? (converted / summary.totalLeads) * 100 : 0,
        helperText: `New ${newLeads} - Contacted ${contacted} - Converted ${converted} - Lost ${lost}`,
        accent: "from-violet-500 to-fuchsia-500",
      },
      {
        icon: ClipboardList,
        label: "Total Orders",
        value: summary.totalOrders,
        trend: summary.growth?.orders >= 0 ? "up" : "down",
        trendValue: summary.growth?.orders,
        accent: "from-amber-500 to-orange-500",
      },
      {
        icon: TrendingUp,
        label: "Total Revenue",
        value: summary.totalRevenue,
        trend: summary.growth?.revenue >= 0 ? "up" : "down",
        trendValue: summary.growth?.revenue,
        format: "currency",
        accent: "from-emerald-500 to-teal-500",
      },
      {
        icon: CircleDollarSign,
        label: "Outstanding Payments",
        value: summary.outstanding,
        trend: summary.growth?.outstanding <= 0 ? "up" : "down",
        trendValue: summary.growth?.outstanding,
        format: "currency",
        accent: "from-rose-500 to-pink-500",
      },
    ];

    return cards;
  }, [summary, user?.role]);

  const notifications = useMemo(() => {
    const items = [...(chartsData?.notifications || [])];

    if ((summary?.outstanding || 0) > 0) {
      items.unshift({
        id: "outstanding-balance",
        message: `${formatCurrency(summary.outstanding)} still outstanding across the current dashboard scope`,
      });
    }

    if ((summary?.leadsByStatus?.New || 0) > 0) {
      items.push({
        id: "new-leads",
        message: `${summary.leadsByStatus.New} new leads need first response`,
      });
    }

    return items.slice(0, 5);
  }, [chartsData?.notifications, summary]);

  const quickActions = useMemo(() => {
    const actions = [
      {
        key: "lead",
        icon: "lead",
        label: "Add Lead",
        description: "Capture fresh demand and assign it immediately if needed.",
        color: "bg-gradient-to-br from-sky-500 to-blue-600",
        onClick: () => openModal("lead"),
      },
      {
        key: "order",
        icon: "order",
        label: "Create Order",
        description: "Convert an active lead into a live order from the dashboard.",
        color: "bg-gradient-to-br from-violet-500 to-fuchsia-600",
        onClick: () => openModal("order"),
      },
      {
        key: "payment",
        icon: "payment",
        label: "Add Payment",
        description: "Log a payment update and immediately refresh outstanding balances.",
        color: "bg-gradient-to-br from-emerald-500 to-teal-600",
        onClick: () => openModal("payment"),
      },
    ];

    if (user?.role === "admin") {
      actions.splice(1, 0, {
        key: "assign",
        icon: "assign",
        label: "Assign Lead",
        description: "Route open leads to the right dealer for follow-up.",
        color: "bg-gradient-to-br from-amber-500 to-orange-600",
        onClick: () => openModal("assign"),
      });
    }

    return actions;
  }, [user?.role, leadOptions.length, orderOptions.length]);

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="max-w-md rounded-3xl border border-rose-200 bg-white p-8 text-center shadow-sm dark:border-rose-500/30 dark:bg-slate-900">
          <AlertCircle className="mx-auto h-12 w-12 text-rose-500" />
          <h2 className="mt-4 text-xl font-semibold text-slate-900 dark:text-white">Dashboard unavailable</h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{error}</p>
          <button
            type="button"
            onClick={() => loadDashboard()}
            className="mt-6 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 dark:bg-amber-500 dark:text-slate-950"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="relative overflow-hidden rounded-[2.25rem] border border-stone-200/80 bg-[radial-gradient(circle_at_top_left,_rgba(251,146,60,0.22),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(13,148,136,0.2),_transparent_26%),linear-gradient(135deg,_#fff8ef,_#fffdf8_52%,_#eefbf8)] p-6 shadow-[0_30px_80px_rgba(120,53,15,0.12)]">
        <div className="crm-orb absolute -right-12 top-8 h-40 w-40 rounded-full bg-orange-200/50 blur-3xl" />
        <div className="crm-orb absolute left-12 top-10 h-28 w-28 rounded-full bg-teal-200/50 blur-3xl" />

        <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-stone-200/80 bg-white/70 px-3 py-1 text-[11px] uppercase tracking-[0.3em] text-stone-600 backdrop-blur">
              <Compass size={12} />
              Techfanatics Equipment Limited
            </div>
            <h1 className="mt-4 max-w-3xl text-3xl font-semibold tracking-tight text-stone-950 md:text-4xl">Real-time CRM Control Center</h1>
            <p className="mt-3 max-w-2xl text-sm text-stone-600">
              Monitor dealers, pipeline health, sales flow, and payment exposure from one production-ready dashboard.
            </p>
            <div className="mt-5 flex flex-wrap gap-3 text-sm text-stone-700">
              <div className="inline-flex items-center gap-2 rounded-full bg-stone-950 px-4 py-2 text-white">
                <CalendarRange size={15} />
                Live refresh every 45 seconds
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white/70 px-4 py-2">
                <TrendingUp size={15} />
                High-visibility pipeline overview
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:w-[24rem] xl:grid-cols-1">
            <div className="rounded-[1.75rem] border border-stone-200/80 bg-white/80 px-4 py-4 text-sm text-stone-700 backdrop-blur">
              <div className="text-stone-500">Role</div>
              <div className="mt-1 font-semibold capitalize text-stone-950">{user?.role}</div>
            </div>
            <div className="rounded-[1.75rem] bg-stone-950 px-4 py-4 text-sm text-stone-200 shadow-xl">
              <div className="text-stone-400">Focus</div>
              <div className="mt-1 font-semibold text-white">
                {(summary?.totalLeads || 0).toLocaleString()} active opportunities in view
              </div>
            </div>
          </div>
        </div>
      </header>

      <DashboardFilters
        filters={filters}
        dealers={dealers}
        areas={areaOptions}
        onChange={handleFilterChange}
        onRefresh={() => loadDashboard({ silent: true })}
        onExport={handleExport}
        exporting={exporting}
        refreshing={refreshing}
        canFilterDealer={canFilterDealer}
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {statCards.map((card) => (
          <StatsCard key={card.label} {...card} />
        ))}
      </section>

      <ChartsSection
        statusData={chartsData?.leadsStatusDistribution || []}
        monthlySales={chartsData?.monthlySales || []}
        dealerPerformance={chartsData?.dealerPerformance || []}
      />

      <section className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <RecentActivityTable activities={activities} />
        </div>

        <div className="space-y-6">
          <QuickActionsPanel actions={quickActions} />
          <NotificationsFeed notifications={notifications} />
        </div>
      </section>

      <DashboardModal
        open={activeModal === "lead"}
        title="Add Lead"
        description="Capture a new lead directly from the dashboard."
        onClose={closeModal}
      >
        <form onSubmit={submitLead} className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Lead name</span>
            <input
              required
              value={leadForm.name}
              onChange={(event) => setLeadForm((current) => ({ ...current, name: event.target.value }))}
              className="w-full rounded-2xl border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Phone</span>
            <input
              required
              value={leadForm.phone}
              onChange={(event) => setLeadForm((current) => ({ ...current, phone: event.target.value }))}
              className="w-full rounded-2xl border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Area</span>
            <input
              required
              value={leadForm.area}
              onChange={(event) => setLeadForm((current) => ({ ...current, area: event.target.value }))}
              className="w-full rounded-2xl border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
          </label>
          {user?.role === "admin" ? (
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Assign dealer</span>
              <select
                value={leadForm.assignedDealerId}
                onChange={(event) => setLeadForm((current) => ({ ...current, assignedDealerId: event.target.value }))}
                className="w-full rounded-2xl border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              >
                <option value="">Keep unassigned</option>
                {dealers.map((dealer) => (
                  <option key={dealer._id} value={dealer._id}>
                    {dealer.name}
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
          <div className="md:col-span-2 flex justify-end gap-3">
            <button type="button" onClick={closeModal} className="rounded-2xl border border-slate-200 px-4 py-2 text-sm dark:border-slate-700 dark:text-slate-200">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white dark:bg-amber-500 dark:text-slate-950">
              {submitting ? "Saving..." : "Create lead"}
            </button>
          </div>
        </form>
      </DashboardModal>

      <DashboardModal
        open={activeModal === "assign"}
        title="Assign Lead"
        description="Route a lead to the appropriate dealer."
        onClose={closeModal}
      >
        <form onSubmit={submitAssignment} className="grid gap-4">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Lead</span>
            <select
              required
              value={assignForm.leadId}
              onChange={(event) => setAssignForm((current) => ({ ...current, leadId: event.target.value }))}
              className="w-full rounded-2xl border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            >
              <option value="">Select lead</option>
              {leadOptions.map((lead) => (
                <option key={lead._id} value={lead._id}>
                  {lead.name} ({lead.status})
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Dealer</span>
            <select
              required
              value={assignForm.dealerId}
              onChange={(event) => setAssignForm((current) => ({ ...current, dealerId: event.target.value }))}
              className="w-full rounded-2xl border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            >
              <option value="">Select dealer</option>
              {dealers.map((dealer) => (
                <option key={dealer._id} value={dealer._id}>
                  {dealer.name}
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
        open={activeModal === "order"}
        title="Create Order"
        description="Convert an existing lead into a live order."
        onClose={closeModal}
      >
        <form onSubmit={submitOrder} className="grid gap-4 md:grid-cols-2">
          <label className="block md:col-span-2">
            <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Lead</span>
            <select
              required
              value={orderForm.leadId}
              onChange={(event) => setOrderForm((current) => ({ ...current, leadId: event.target.value }))}
              className="w-full rounded-2xl border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            >
              <option value="">Select lead</option>
              {leadOptions
                .filter((lead) => user?.role !== "admin" || lead.assignedDealer)
                .map((lead) => (
                  <option key={lead._id} value={lead._id}>
                    {lead.name} ({lead.assignedDealer?.name || "Unassigned"})
                  </option>
                ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Product</span>
            <input
              required
              value={orderForm.product}
              onChange={(event) => setOrderForm((current) => ({ ...current, product: event.target.value }))}
              className="w-full rounded-2xl border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Quantity</span>
            <input
              required
              min="1"
              type="number"
              value={orderForm.quantity}
              onChange={(event) => setOrderForm((current) => ({ ...current, quantity: event.target.value }))}
              className="w-full rounded-2xl border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Unit price</span>
            <input
              required
              min="0"
              type="number"
              value={orderForm.price}
              onChange={(event) => setOrderForm((current) => ({ ...current, price: event.target.value }))}
              className="w-full rounded-2xl border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
          </label>
          <label className="block md:col-span-2">
            <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Notes</span>
            <textarea
              rows={4}
              value={orderForm.notes}
              onChange={(event) => setOrderForm((current) => ({ ...current, notes: event.target.value }))}
              className="w-full rounded-2xl border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
          </label>
          <div className="md:col-span-2 flex justify-end gap-3">
            <button type="button" onClick={closeModal} className="rounded-2xl border border-slate-200 px-4 py-2 text-sm dark:border-slate-700 dark:text-slate-200">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white dark:bg-amber-500 dark:text-slate-950">
              {submitting ? "Creating..." : "Create order"}
            </button>
          </div>
        </form>
      </DashboardModal>

      <DashboardModal
        open={activeModal === "payment"}
        title="Add Payment"
        description="Record a payment against a dealer or order."
        onClose={closeModal}
      >
        <form onSubmit={submitPayment} className="grid gap-4 md:grid-cols-2">
          <label className="block md:col-span-2">
            <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Order</span>
            <select
              value={paymentForm.orderId}
              onChange={(event) => {
                const nextOrderId = event.target.value;
                const selectedOrder = orderOptions.find((order) => order._id === nextOrderId);
                setPaymentForm((current) => ({
                  ...current,
                  orderId: nextOrderId,
                  dealerId: selectedOrder?.dealerId?._id || selectedOrder?.dealer?._id || current.dealerId,
                }));
              }}
              className="w-full rounded-2xl border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            >
              <option value="">Select order</option>
              {orderOptions.map((order) => (
                <option key={order._id} value={order._id}>
                  {(order.products?.[0]?.productName || "Order")} ({order.dealerId?.name || order.dealer?.name || "Dealer"})
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Dealer</span>
            <select
              required
              value={paymentForm.dealerId}
              onChange={(event) => setPaymentForm((current) => ({ ...current, dealerId: event.target.value }))}
              className="w-full rounded-2xl border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            >
              <option value="">Select dealer</option>
              {(user?.role === "admin" ? dealers : orderOptions.map((order) => order.dealerId || order.dealer).filter(Boolean)).map((dealer) => (
                <option key={dealer._id} value={dealer._id}>
                  {dealer.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Amount</span>
            <input
              required
              min="0"
              type="number"
              value={paymentForm.amount}
              onChange={(event) => setPaymentForm((current) => ({ ...current, amount: event.target.value }))}
              className="w-full rounded-2xl border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Payment method</span>
            <select
              value={paymentForm.paymentMethod}
              onChange={(event) => setPaymentForm((current) => ({ ...current, paymentMethod: event.target.value }))}
              className="w-full rounded-2xl border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            >
              <option>Bank Transfer</option>
              <option>Cash</option>
              <option>UPI</option>
            </select>
          </label>
          <label className="block md:col-span-2">
            <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Note</span>
            <textarea
              rows={4}
              value={paymentForm.note}
              onChange={(event) => setPaymentForm((current) => ({ ...current, note: event.target.value }))}
              className="w-full rounded-2xl border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
          </label>
          <div className="md:col-span-2 flex justify-end gap-3">
            <button type="button" onClick={closeModal} className="rounded-2xl border border-slate-200 px-4 py-2 text-sm dark:border-slate-700 dark:text-slate-200">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white dark:bg-amber-500 dark:text-slate-950">
              {submitting ? "Saving..." : "Add payment"}
            </button>
          </div>
        </form>
      </DashboardModal>
    </div>
  );
};
