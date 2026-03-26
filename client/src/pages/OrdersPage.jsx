import { useEffect, useMemo, useState } from "react";
import { Eye, Plus, Search, ShoppingBag, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

import { DashboardModal } from "../components/DashboardModal";
import { OrderStatusBadge } from "../components/OrderStatusBadge";
import { OrderTableSkeleton } from "../components/OrderTableSkeleton";
import { PaymentStatusBadge } from "../components/PaymentStatusBadge";
import { useAuth } from "../context/AuthContext";
import { fetchLeads } from "../services/leadService";
import { createOrder, deleteOrder, fetchOrders } from "../services/orderService";

const emptyProduct = { productName: "", quantity: 1, price: "" };
const emptyForm = {
  leadId: "",
  products: [{ ...emptyProduct }],
  notes: "",
};

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

export const OrdersPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [summary, setSummary] = useState(null);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [filters, setFilters] = useState({ search: "", status: "", paymentStatus: "" });
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const canCreate = user?.role === "admin" || user?.role === "salesperson";
  const canDelete = user?.role === "admin";

  const loadOrders = async () => {
    try {
      setLoading(true);
      const data = await fetchOrders({ page, limit: 10, ...filters });
      setOrders(data.orders || []);
      setPages(data.pages || 1);
      setSummary(data.summary || null);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Unable to load orders");
    } finally {
      setLoading(false);
    }
  };

  const loadLeads = async () => {
    if (!canCreate) return;
    try {
      const data = await fetchLeads({ page: 1, limit: 100, status: "Converted" });
      setLeads((data.leads || []).filter((lead) => lead.assignedDealer));
    } catch (err) {
      toast.error(err?.response?.data?.message || "Unable to load converted leads");
    }
  };

  useEffect(() => {
    loadOrders();
  }, [page, filters.search, filters.status, filters.paymentStatus]);

  useEffect(() => {
    loadLeads();
  }, [canCreate]);

  const closeModal = () => {
    setModalOpen(false);
    setForm(emptyForm);
  };

  const addProductRow = () => {
    setForm((current) => ({
      ...current,
      products: [...current.products, { ...emptyProduct }],
    }));
  };

  const updateProductRow = (index, key, value) => {
    setForm((current) => ({
      ...current,
      products: current.products.map((product, productIndex) =>
        productIndex === index ? { ...product, [key]: value } : product
      ),
    }));
  };

  const removeProductRow = (index) => {
    setForm((current) => ({
      ...current,
      products: current.products.filter((_, productIndex) => productIndex !== index),
    }));
  };

  const computedTotal = useMemo(
    () =>
      form.products.reduce(
        (sum, item) => sum + Number(item.quantity || 0) * Number(item.price || 0),
        0
      ),
    [form.products]
  );

  const handleCreateOrder = async (event) => {
    event.preventDefault();
    if (!form.leadId || form.products.some((item) => !item.productName || !item.quantity || !item.price)) {
      toast.error("Select a converted lead and complete every product row");
      return;
    }

    try {
      setSubmitting(true);
      await createOrder({
        leadId: form.leadId,
        products: form.products.map((item) => ({
          productName: item.productName.trim(),
          quantity: Number(item.quantity),
          price: Number(item.price),
        })),
        notes: form.notes,
      });
      toast.success("Order created");
      closeModal();
      loadOrders();
      loadLeads();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Unable to create order");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (order) => {
    if (!window.confirm(`Delete order ${order._id}?`)) return;
    try {
      await deleteOrder(order._id);
      toast.success("Order deleted");
      loadOrders();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Unable to delete order");
    }
  };

  return (
    <div className="space-y-6">
      <header className="rounded-[2rem] border border-stone-200/80 bg-[radial-gradient(circle_at_top_left,_rgba(251,146,60,0.18),_transparent_25%),linear-gradient(135deg,_#fffaf2,_#fffdf8_55%,_#f1f5f9)] p-6 shadow-[0_24px_60px_rgba(120,53,15,0.1)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white/70 px-3 py-1 text-[11px] uppercase tracking-[0.3em] text-stone-600">
            <ShoppingBag size={12} />
            Fulfilment Desk
          </div>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-stone-950">Order Management</h2>
          <p className="mt-2 text-sm text-stone-500">Track converted leads, order fulfilment, and payment collection in one place.</p>
        </div>
        {canCreate ? (
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-2xl bg-stone-950 px-4 py-2 text-sm font-medium text-white hover:bg-stone-800"
          >
            <Plus size={16} />
            Create Order
          </button>
        ) : null}
        </div>
      </header>

      {summary ? (
        <section className="grid gap-4 md:grid-cols-3">
          <div className="crm-panel rounded-[2rem] p-5">
            <div className="text-sm text-stone-500">Orders</div>
            <div className="mt-2 text-2xl font-semibold text-stone-950">{summary.totalOrders}</div>
          </div>
          <div className="crm-panel rounded-[2rem] p-5">
            <div className="text-sm text-stone-500">Revenue</div>
            <div className="mt-2 text-2xl font-semibold text-stone-950">{formatCurrency(summary.totalRevenue)}</div>
          </div>
          <div className="crm-panel rounded-[2rem] p-5">
            <div className="text-sm text-stone-500">Dealer Sales Buckets</div>
            <div className="mt-2 text-2xl font-semibold text-stone-950">{summary.dealerWiseSales?.length || 0}</div>
          </div>
        </section>
      ) : null}

      <section className="crm-panel rounded-[2rem] p-5">
        <div className="grid gap-3 md:grid-cols-3">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-stone-500">Search</span>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
              <input
                value={filters.search}
                onChange={(event) => {
                  setPage(1);
                  setFilters((current) => ({ ...current, search: event.target.value }));
                }}
                placeholder="Search by lead or product"
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
              <option value="Pending">Pending</option>
              <option value="Confirmed">Confirmed</option>
              <option value="Delivered">Delivered</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-stone-500">Payment</span>
            <select
              value={filters.paymentStatus}
              onChange={(event) => {
                setPage(1);
                setFilters((current) => ({ ...current, paymentStatus: event.target.value }));
              }}
              className="crm-input"
            >
              <option value="">All payment states</option>
              <option value="Pending">Pending</option>
              <option value="Partial">Partial</option>
              <option value="Paid">Paid</option>
            </select>
          </label>
        </div>
      </section>

      <section className="crm-panel rounded-[2rem] p-5">
        {loading ? (
          <OrderTableSkeleton />
        ) : orders.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-stone-300 px-6 py-12 text-center text-sm text-stone-500">
            No orders found for the current filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px]">
              <thead>
                <tr className="border-b border-stone-200 text-left text-xs uppercase tracking-wide text-stone-500">
                  <th className="pb-3 font-semibold">Order ID</th>
                  <th className="pb-3 font-semibold">Dealer</th>
                  <th className="pb-3 font-semibold">Products</th>
                  <th className="pb-3 font-semibold">Total Amount</th>
                  <th className="pb-3 font-semibold">Status</th>
                  <th className="pb-3 font-semibold">Payment</th>
                  <th className="pb-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order._id} className="border-b border-stone-100 last:border-b-0">
                    <td className="py-4 pr-4 text-sm font-medium text-stone-950">#{order._id.slice(-6).toUpperCase()}</td>
                    <td className="py-4 pr-4 text-sm text-stone-600">
                      <div>{order.dealerId?.name || order.dealer?.name || "Dealer"}</div>
                      <div className="text-xs text-stone-500">{order.leadId?.name || order.lead?.name || "Lead"}</div>
                    </td>
                    <td className="py-4 pr-4 text-sm text-stone-600">
                      {order.products.map((item) => `${item.productName} x${item.quantity}`).join(", ")}
                    </td>
                    <td className="py-4 pr-4 text-sm text-stone-600">{formatCurrency(order.totalAmount)}</td>
                    <td className="py-4 pr-4"><OrderStatusBadge status={order.status} /></td>
                    <td className="py-4 pr-4"><PaymentStatusBadge status={order.paymentStatus} /></td>
                    <td className="py-4">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => navigate(`/orders/${order._id}`)}
                          className="inline-flex items-center gap-1 rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-orange-50"
                        >
                          <Eye size={13} />
                          View
                        </button>
                        {canDelete ? (
                          <button
                            type="button"
                            onClick={() => handleDelete(order)}
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
          </div>
        )}

        <div className="mt-5 flex items-center justify-between gap-3">
          <button type="button" onClick={() => setPage((current) => Math.max(current - 1, 1))} disabled={page <= 1} className="rounded-2xl border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-700 disabled:opacity-50">Previous</button>
          <div className="text-sm text-stone-500">Page {page} of {pages}</div>
          <button type="button" onClick={() => setPage((current) => Math.min(current + 1, pages))} disabled={page >= pages} className="rounded-2xl border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-700 disabled:opacity-50">Next</button>
        </div>
      </section>

      <DashboardModal
        open={modalOpen}
        title="Create Order"
        description="Create an order from a converted lead and add multiple products."
        onClose={closeModal}
      >
        <form onSubmit={handleCreateOrder} className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Converted Lead</span>
            <select value={form.leadId} onChange={(event) => setForm((current) => ({ ...current, leadId: event.target.value }))} className="w-full rounded-2xl border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100">
              <option value="">Select lead</option>
              {leads.map((lead) => (
                <option key={lead._id} value={lead._id}>
                  {lead.name} ({lead.assignedDealer?.name || "Dealer"})
                </option>
              ))}
            </select>
          </label>

          <div className="space-y-3">
            {form.products.map((product, index) => (
              <div key={index} className="grid gap-3 rounded-2xl border border-slate-200 p-4 md:grid-cols-[1fr_120px_140px_auto] dark:border-slate-800">
                <input value={product.productName} onChange={(event) => updateProductRow(index, "productName", event.target.value)} placeholder="Product name" className="rounded-2xl border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" />
                <input type="number" min="1" value={product.quantity} onChange={(event) => updateProductRow(index, "quantity", event.target.value)} placeholder="Qty" className="rounded-2xl border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" />
                <input type="number" min="0" value={product.price} onChange={(event) => updateProductRow(index, "price", event.target.value)} placeholder="Price" className="rounded-2xl border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" />
                <button type="button" onClick={() => removeProductRow(index)} disabled={form.products.length === 1} className="rounded-2xl border border-slate-200 px-3 py-2 text-sm disabled:opacity-50 dark:border-slate-700 dark:text-slate-200">Remove</button>
              </div>
            ))}
          </div>

          <button type="button" onClick={addProductRow} className="rounded-2xl border border-slate-200 px-4 py-2 text-sm dark:border-slate-700 dark:text-slate-200">Add Product</button>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Notes</span>
            <textarea rows={3} value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} className="w-full rounded-2xl border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" />
          </label>

          <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700 dark:bg-slate-800/60 dark:text-slate-200">
            Total Amount: <span className="font-semibold">{formatCurrency(computedTotal)}</span>
          </div>

          <div className="flex justify-end gap-3">
            <button type="button" onClick={closeModal} className="rounded-2xl border border-slate-200 px-4 py-2 text-sm dark:border-slate-700 dark:text-slate-200">Cancel</button>
            <button type="submit" disabled={submitting} className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white dark:bg-amber-500 dark:text-slate-950">{submitting ? "Creating..." : "Create Order"}</button>
          </div>
        </form>
      </DashboardModal>
    </div>
  );
};
