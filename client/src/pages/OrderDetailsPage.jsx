import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "react-toastify";

import { OrderStatusBadge } from "../components/OrderStatusBadge";
import { PaymentStatusBadge } from "../components/PaymentStatusBadge";
import { fetchOrderById, updateOrder } from "../services/orderService";
import { createPayment } from "../services/paymentService";

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

export const OrderDetailsPage = () => {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    amountPaid: "",
    paymentMethod: "Cash",
    transactionId: "",
    note: "",
  });

  const loadOrder = async () => {
    try {
      setLoading(true);
      const data = await fetchOrderById(id);
      setOrder(data);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Unable to load order");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrder();
  }, [id]);

  const handleStatusUpdate = async (nextStatus) => {
    try {
      setSaving(true);
      await updateOrder(order._id, { status: nextStatus });
      toast.success("Order status updated");
      loadOrder();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Unable to update order");
    } finally {
      setSaving(false);
    }
  };

  const handlePaymentSubmit = async (event) => {
    event.preventDefault();
    try {
      setSaving(true);
      await createPayment({
        orderId: order._id,
        dealerId: order.dealerId?._id || order.dealer?._id,
        amountPaid: Number(paymentForm.amountPaid),
        paymentMethod: paymentForm.paymentMethod,
        transactionId: paymentForm.transactionId,
        note: paymentForm.note,
      });
      toast.success("Payment added");
      setPaymentForm({ amountPaid: "", paymentMethod: "Cash", transactionId: "", note: "" });
      loadOrder();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Unable to add payment");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="h-40 animate-pulse rounded-3xl bg-slate-200 dark:bg-slate-800" />;
  }

  if (!order) {
    return <div className="text-sm text-slate-500 dark:text-slate-400">Order not found.</div>;
  }

  const paidAmount = order.payments?.reduce((sum, payment) => sum + payment.amountPaid, 0) || 0;
  const remainingAmount = Math.max(order.totalAmount - paidAmount, 0);

  return (
    <div className="space-y-6">
      <header className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">Order #{order._id.slice(-6).toUpperCase()}</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{order.dealerId?.name || order.dealer?.name} - {order.leadId?.name || order.lead?.name}</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <OrderStatusBadge status={order.status} />
          <PaymentStatusBadge status={order.paymentStatus} />
        </div>
      </header>

      <section className="grid gap-6 xl:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2 dark:border-slate-800 dark:bg-slate-900">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Products</h3>
          <div className="mt-4 space-y-3">
            {order.products.map((product, index) => (
              <div key={index} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-slate-100">{product.productName}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">Qty {product.quantity}</div>
                  </div>
                  <div className="text-sm font-medium text-slate-700 dark:text-slate-200">{formatCurrency(product.quantity * product.price)}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700 dark:bg-slate-800/60 dark:text-slate-200">
            Total Amount: <span className="font-semibold">{formatCurrency(order.totalAmount)}</span>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Status Flow</h3>
            <div className="mt-4 grid gap-2">
              {["Pending", "Confirmed", "Delivered", "Cancelled"].map((status) => (
                <button key={status} type="button" disabled={saving || status === order.status} onClick={() => handleStatusUpdate(status)} className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200">
                  Mark as {status}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Payment Snapshot</h3>
            <div className="mt-4 space-y-2 text-sm text-slate-600 dark:text-slate-300">
              <div>Total paid: {formatCurrency(paidAmount)}</div>
              <div>Remaining: {formatCurrency(remainingAmount)}</div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Add Payment</h3>
          <form onSubmit={handlePaymentSubmit} className="mt-4 space-y-3">
            <input type="number" min="0" value={paymentForm.amountPaid} onChange={(event) => setPaymentForm((current) => ({ ...current, amountPaid: event.target.value }))} placeholder="Amount paid" className="w-full rounded-2xl border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" />
            <select value={paymentForm.paymentMethod} onChange={(event) => setPaymentForm((current) => ({ ...current, paymentMethod: event.target.value }))} className="w-full rounded-2xl border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100">
              <option>Cash</option>
              <option>UPI</option>
              <option>Bank Transfer</option>
            </select>
            <input value={paymentForm.transactionId} onChange={(event) => setPaymentForm((current) => ({ ...current, transactionId: event.target.value }))} placeholder="Transaction ID" className="w-full rounded-2xl border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" />
            <textarea rows={3} value={paymentForm.note} onChange={(event) => setPaymentForm((current) => ({ ...current, note: event.target.value }))} placeholder="Note" className="w-full rounded-2xl border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" />
            <button type="submit" disabled={saving} className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white dark:bg-amber-500 dark:text-slate-950">{saving ? "Saving..." : "Add Payment"}</button>
          </form>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Timeline</h3>
          <div className="mt-4 space-y-3">
            {(order.timeline || []).length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                No timeline entries yet.
              </div>
            ) : (
              order.timeline.map((entry) => (
                <div key={entry._id} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                  <div className="font-medium text-slate-900 dark:text-slate-100">{entry.message}</div>
                  <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {new Date(entry.createdAt).toLocaleString()} - {entry.userId?.name || entry.user?.name || "System"}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
};
