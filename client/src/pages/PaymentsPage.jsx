import { useEffect, useMemo, useState } from "react";
import { CreditCard, Landmark, Search, WalletCards } from "lucide-react";
import { toast } from "react-toastify";

import { DashboardModal } from "../components/DashboardModal";
import { PaymentStatusBadge } from "../components/PaymentStatusBadge";
import { useAuth } from "../context/AuthContext";
import { fetchDealers, fetchMyDealerProfile } from "../services/dealerService";
import { fetchOrders } from "../services/orderService";
import { createPayment, fetchDealerLedger, fetchPayments } from "../services/paymentService";

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const defaultFilters = {
  dealerId: "",
  startDate: "",
  endDate: "",
};

const emptyPaymentForm = {
  orderId: "",
  dealerId: "",
  amountPaid: "",
  paymentMethod: "Bank Transfer",
  transactionId: "",
  paymentDate: "",
  note: "",
};

export const PaymentsPage = () => {
  const { user } = useAuth();
  const [filters, setFilters] = useState(defaultFilters);
  const [payments, setPayments] = useState([]);
  const [dealers, setDealers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [ledger, setLedger] = useState(null);
  const [summary, setSummary] = useState(null);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingLedger, setLoadingLedger] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [activeModal, setActiveModal] = useState("");
  const [paymentForm, setPaymentForm] = useState(emptyPaymentForm);
  const [selectedOrderMeta, setSelectedOrderMeta] = useState({ totalAmount: 0, paidAmount: 0, remainingAmount: 0 });
  const [currentDealerId, setCurrentDealerId] = useState("");

  const canCreatePayment = user?.role === "admin" || user?.role === "salesperson";

  const loadPayments = async () => {
    try {
      setLoading(true);
      const data = await fetchPayments({ page, limit: 12, ...filters });
      setPayments(data.payments || []);
      setPages(data.pages || 1);
      setSummary(data.summary || null);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Unable to load payments");
    } finally {
      setLoading(false);
    }
  };

  const loadLedger = async (dealerId) => {
    if (!dealerId) {
      setLedger(null);
      return;
    }

    try {
      setLoadingLedger(true);
      const data = await fetchDealerLedger(dealerId);
      setLedger(data);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Unable to load ledger");
    } finally {
      setLoadingLedger(false);
    }
  };

  const loadDealers = async () => {
    if (user?.role !== "admin") return;
    try {
      const data = await fetchDealers({ limit: 100 });
      setDealers(data.dealers || []);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Unable to load dealers");
    }
  };

  const loadOrders = async () => {
    try {
      const data = await fetchOrders({ page: 1, limit: 100 });
      setOrders(data.orders || []);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Unable to load orders");
    }
  };

  useEffect(() => {
    loadPayments();
  }, [page, filters.dealerId, filters.startDate, filters.endDate]);

  useEffect(() => {
    loadDealers();
    loadOrders();
  }, [user?.role]);

  useEffect(() => {
    const resolveDealer = async () => {
      if (user?.role === "dealer") {
        try {
          const profile = await fetchMyDealerProfile();
          setCurrentDealerId(profile._id);
          loadLedger(profile._id);
        } catch (err) {
          toast.error(err?.response?.data?.message || "Unable to load dealer profile");
        }
      }
    };

    resolveDealer();
  }, [user?.role]);

  useEffect(() => {
    if (user?.role === "admin") {
      loadLedger(filters.dealerId);
    }
  }, [filters.dealerId, user?.role]);

  const openPaymentModal = () => {
    setPaymentForm(emptyPaymentForm);
    setSelectedOrderMeta({ totalAmount: 0, paidAmount: 0, remainingAmount: 0 });
    setActiveModal("payment");
  };

  const closeModal = () => {
    setActiveModal("");
    setPaymentForm(emptyPaymentForm);
    setSelectedOrderMeta({ totalAmount: 0, paidAmount: 0, remainingAmount: 0 });
  };

  const handleOrderChange = async (orderId) => {
    const order = orders.find((item) => item._id === orderId);
    setPaymentForm((current) => ({
      ...current,
      orderId,
      dealerId: order?.dealerId?._id || order?.dealer?._id || current.dealerId,
    }));

    if (!orderId) {
      setSelectedOrderMeta({ totalAmount: 0, paidAmount: 0, remainingAmount: 0 });
      return;
    }

    try {
      const data = await fetchPayments({ orderId, limit: 100, page: 1 });
      const paidAmount = (data.payments || []).reduce((sum, payment) => sum + Number(payment.amountPaid || 0), 0);
      const totalAmount = Number(order?.totalAmount || 0);
      setSelectedOrderMeta({
        totalAmount,
        paidAmount,
        remainingAmount: Math.max(totalAmount - paidAmount, 0),
      });
    } catch (err) {
      toast.error(err?.response?.data?.message || "Unable to load order payment summary");
    }
  };

  const handleCreatePayment = async (event) => {
    event.preventDefault();
    try {
      setSubmitting(true);
      await createPayment({
        ...paymentForm,
        amountPaid: Number(paymentForm.amountPaid),
      });
      toast.success("Payment added");
      closeModal();
      loadPayments();
      if (user?.role === "dealer") {
        loadLedger(currentDealerId);
      } else if (filters.dealerId) {
        loadLedger(filters.dealerId);
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Unable to add payment");
    } finally {
      setSubmitting(false);
    }
  };

  const ledgerCards = useMemo(() => {
    if (ledger) {
      return [
        { label: "Total Orders Amount", value: formatCurrency(ledger.totalOrdersAmount) },
        { label: "Total Paid", value: formatCurrency(ledger.totalPaid) },
        { label: "Outstanding", value: formatCurrency(ledger.totalOutstanding) },
      ];
    }

    return [
      { label: "Total Orders Amount", value: formatCurrency(summary?.totalOrdersAmount) },
      { label: "Total Paid", value: formatCurrency(summary?.totalPaid) },
      { label: "Outstanding", value: formatCurrency(summary?.totalOutstanding) },
    ];
  }, [ledger, summary]);

  return (
    <div className="space-y-6">
      <header className="rounded-[2rem] border border-stone-200/80 bg-[radial-gradient(circle_at_top_left,_rgba(20,184,166,0.2),_transparent_24%),linear-gradient(135deg,_#f0fdfa,_#fffdf8_55%,_#fff7ed)] p-6 shadow-[0_24px_60px_rgba(15,118,110,0.12)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white/70 px-3 py-1 text-[11px] uppercase tracking-[0.3em] text-stone-600">
            <WalletCards size={12} />
            Collections Board
          </div>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-stone-950">Payments & Ledger</h2>
          <p className="mt-2 text-sm text-stone-500">
            Monitor collections, dealer dues, and payment history from a single ledger workspace.
          </p>
        </div>
        {canCreatePayment ? (
          <button
            type="button"
            onClick={openPaymentModal}
            className="inline-flex items-center gap-2 rounded-2xl bg-stone-950 px-4 py-2 text-sm font-medium text-white"
          >
            <CreditCard size={16} />
            Add Payment
          </button>
        ) : null}
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        {ledgerCards.map((card) => (
          <div key={card.label} className="crm-panel rounded-[2rem] p-5">
            <p className="text-sm text-stone-500">{card.label}</p>
            <p className="mt-2 text-2xl font-semibold text-stone-950">{card.value}</p>
          </div>
        ))}
      </section>

      <section className="crm-panel rounded-[2rem] p-5">
        <div className="grid gap-3 md:grid-cols-4">
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

          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-stone-500">Start Date</span>
            <input
              type="date"
              value={filters.startDate}
              onChange={(event) => {
                setPage(1);
                setFilters((current) => ({ ...current, startDate: event.target.value }));
              }}
              className="crm-input"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-stone-500">End Date</span>
            <input
              type="date"
              value={filters.endDate}
              onChange={(event) => {
                setPage(1);
                setFilters((current) => ({ ...current, endDate: event.target.value }));
              }}
              className="crm-input"
            />
          </label>

          <div className="flex items-end">
            <div className="inline-flex items-center gap-2 rounded-2xl border border-stone-200 bg-white px-4 py-2 text-sm text-stone-500">
              <Search size={15} />
              Filtered payment view
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <div className="crm-panel rounded-[2rem] p-5 xl:col-span-2">
          <h3 className="text-lg font-semibold text-stone-950">Payment Table</h3>
          <div className="mt-4 overflow-x-auto">
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div key={index} className="h-16 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
                ))}
              </div>
            ) : payments.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-stone-300 px-4 py-10 text-center text-sm text-stone-500">
                No payments recorded.
              </div>
            ) : (
              <table className="w-full min-w-[980px]">
                <thead>
                  <tr className="border-b border-stone-200 text-left text-xs uppercase tracking-wide text-stone-500">
                    <th className="pb-3 font-semibold">Dealer</th>
                    <th className="pb-3 font-semibold">Order</th>
                    <th className="pb-3 font-semibold">Amount Paid</th>
                    <th className="pb-3 font-semibold">Remaining</th>
                    <th className="pb-3 font-semibold">Method</th>
                    <th className="pb-3 font-semibold">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment) => (
                    <tr key={payment._id} className="border-b border-stone-100 last:border-b-0">
                      <td className="py-4 pr-4 text-sm text-stone-700">{payment.dealerId?.name || "Dealer"}</td>
                      <td className="py-4 pr-4">
                        <div className="text-sm font-medium text-stone-950">
                          {payment.orderId?.products?.map((product) => product.productName).join(", ") || "Order"}
                        </div>
                        <div className="mt-1"><PaymentStatusBadge status={payment.orderId?.paymentStatus || "Pending"} /></div>
                      </td>
                      <td className="py-4 pr-4 text-sm text-stone-700">{formatCurrency(payment.amountPaid)}</td>
                      <td className="py-4 pr-4 text-sm text-stone-700">{formatCurrency(payment.remainingAmount)}</td>
                      <td className="py-4 pr-4 text-sm text-stone-700">{payment.paymentMethod}</td>
                      <td className="py-4 pr-4 text-sm text-stone-700">{new Date(payment.paymentDate || payment.paidAt).toLocaleDateString()}</td>
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
            <div className="text-sm text-stone-500">Page {page} of {pages}</div>
            <button
              type="button"
              onClick={() => setPage((current) => Math.min(current + 1, pages))}
              disabled={page >= pages}
              className="rounded-2xl border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-700 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>

        <div className="crm-panel rounded-[2rem] p-5">
          <div className="flex items-center gap-2">
            <Landmark size={18} className="text-stone-500" />
            <h3 className="text-lg font-semibold text-stone-950">Ledger Dashboard</h3>
          </div>

          {loadingLedger ? (
            <div className="mt-4 space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-16 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
              ))}
            </div>
          ) : ledger ? (
            <div className="mt-4 space-y-4">
              <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/60">
                <div className="text-sm font-medium text-slate-900 dark:text-slate-100">{ledger.dealer?.name}</div>
                <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{ledger.orderCount} orders • {ledger.paymentHistory?.length || 0} payments</div>
              </div>
              <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
                <div>Total orders amount: <span className="font-medium text-slate-900 dark:text-slate-100">{formatCurrency(ledger.totalOrdersAmount)}</span></div>
                <div>Total paid: <span className="font-medium text-slate-900 dark:text-slate-100">{formatCurrency(ledger.totalPaid)}</span></div>
                <div>Total outstanding: <span className="font-medium text-slate-900 dark:text-slate-100">{formatCurrency(ledger.totalOutstanding)}</span></div>
              </div>
              <div className="space-y-3">
                {(ledger.paymentHistory || []).slice(0, 5).map((payment) => (
                  <div key={payment._id} className="rounded-2xl border border-slate-200 p-3 dark:border-slate-800">
                    <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                      {payment.orderId?.products?.map((product) => product.productName).join(", ") || "Order"}
                    </div>
                    <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {formatCurrency(payment.amountPaid)} • {payment.paymentMethod} • {new Date(payment.paymentDate || payment.paidAt).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="mt-4 rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
              Select a dealer filter to view ledger details.
            </div>
          )}
        </div>
      </section>

      <DashboardModal open={activeModal === "payment"} title="Add Payment" description="Record a payment and update the ledger automatically." onClose={closeModal}>
        <form onSubmit={handleCreatePayment} className="grid gap-4 md:grid-cols-2">
          <label className="block md:col-span-2">
            <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Order</span>
            <select
              required
              value={paymentForm.orderId}
              onChange={(event) => handleOrderChange(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            >
              <option value="">Select order</option>
              {orders.map((order) => (
                <option key={order._id} value={order._id}>
                  {(order.products?.[0]?.productName || "Order")} - {order.dealerId?.name || order.dealer?.name || "Dealer"}
                </option>
              ))}
            </select>
          </label>

          <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
            <div>Total amount: <span className="font-medium text-slate-900 dark:text-slate-100">{formatCurrency(selectedOrderMeta.totalAmount)}</span></div>
            <div className="mt-1">Already paid: <span className="font-medium text-slate-900 dark:text-slate-100">{formatCurrency(selectedOrderMeta.paidAmount)}</span></div>
            <div className="mt-1">Remaining: <span className="font-medium text-slate-900 dark:text-slate-100">{formatCurrency(selectedOrderMeta.remainingAmount)}</span></div>
          </div>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Amount Paid</span>
            <input
              required
              type="number"
              min="0"
              max={selectedOrderMeta.remainingAmount || undefined}
              value={paymentForm.amountPaid}
              onChange={(event) => setPaymentForm((current) => ({ ...current, amountPaid: event.target.value }))}
              className="w-full rounded-2xl border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Payment Method</span>
            <select
              value={paymentForm.paymentMethod}
              onChange={(event) => setPaymentForm((current) => ({ ...current, paymentMethod: event.target.value }))}
              className="w-full rounded-2xl border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            >
              <option value="Cash">Cash</option>
              <option value="UPI">UPI</option>
              <option value="Bank Transfer">Bank Transfer</option>
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Transaction ID</span>
            <input
              value={paymentForm.transactionId}
              onChange={(event) => setPaymentForm((current) => ({ ...current, transactionId: event.target.value }))}
              className="w-full rounded-2xl border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Payment Date</span>
            <input
              type="date"
              value={paymentForm.paymentDate}
              onChange={(event) => setPaymentForm((current) => ({ ...current, paymentDate: event.target.value }))}
              className="w-full rounded-2xl border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
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
            <button type="button" onClick={closeModal} className="rounded-2xl border border-slate-200 px-4 py-2 text-sm dark:border-slate-700 dark:text-slate-200">Cancel</button>
            <button type="submit" disabled={submitting} className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white dark:bg-amber-500 dark:text-slate-950">
              {submitting ? "Saving..." : "Add payment"}
            </button>
          </div>
        </form>
      </DashboardModal>
    </div>
  );
};
