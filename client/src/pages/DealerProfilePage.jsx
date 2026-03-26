import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Building2, CreditCard, Phone, ReceiptText, TrendingUp, Users } from "lucide-react";
import { toast } from "react-toastify";

import { DealerStatusBadge } from "../components/DealerStatusBadge";
import { LeadStatusBadge } from "../components/LeadStatusBadge";
import { useAuth } from "../context/AuthContext";
import { fetchDealerSummary, fetchMyDealerProfile } from "../services/dealerService";

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const MetricCard = ({ icon: Icon, label, value, helper }) => (
  <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm ring-1 ring-slate-950/5 dark:border-slate-800 dark:bg-slate-900">
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
        <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">{value}</p>
        {helper ? <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{helper}</p> : null}
      </div>
      <div className="rounded-2xl bg-slate-100 p-3 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
        <Icon size={18} />
      </div>
    </div>
  </div>
);

export const DealerProfilePage = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSummary = async () => {
      try {
        setLoading(true);
        if (id) {
          const data = await fetchDealerSummary(id);
          setSummary(data);
        } else {
          const dealer = await fetchMyDealerProfile();
          const data = await fetchDealerSummary(dealer._id);
          setSummary(data);
        }
      } catch (err) {
        toast.error(err?.response?.data?.message || "Unable to load dealer profile");
      } finally {
        setLoading(false);
      }
    };

    loadSummary();
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-40 animate-pulse rounded-3xl bg-slate-200 dark:bg-slate-800" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-28 animate-pulse rounded-3xl bg-slate-200 dark:bg-slate-800" />
          ))}
        </div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-200 px-6 py-12 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
        Dealer profile not available.
      </div>
    );
  }

  const { dealer, performance, leads, orders, payments, activities } = summary;

  return (
    <div className="space-y-6">
      <header className="rounded-[2rem] border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-slate-100 p-6 shadow-sm dark:border-slate-800 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-slate-500 dark:text-slate-400">
              {user?.role === "dealer" ? "Dealer Workspace" : "Dealer Admin View"}
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">{dealer.name}</h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{dealer.businessName}</p>
            <div className="mt-4 flex flex-wrap gap-3 text-sm text-slate-600 dark:text-slate-300">
              <span className="inline-flex items-center gap-2"><Phone size={15} /> {dealer.phone}</span>
              <span>{dealer.email}</span>
              <span>{dealer.area}</span>
            </div>
          </div>
          <DealerStatusBadge status={dealer.status} />
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={Users} label="Total Leads Assigned" value={performance.totalLeadsAssigned} />
        <MetricCard icon={TrendingUp} label="Converted Leads" value={performance.convertedLeads} helper={`${performance.conversionRate}% conversion rate`} />
        <MetricCard icon={ReceiptText} label="Revenue Generated" value={formatCurrency(performance.totalRevenue)} helper={`${performance.totalOrders} orders`} />
        <MetricCard icon={CreditCard} label="Payments Received" value={formatCurrency(performance.totalPaid)} helper={`${formatCurrency(performance.outstanding)} outstanding`} />
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm ring-1 ring-slate-950/5 xl:col-span-1 dark:border-slate-800 dark:bg-slate-900">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Dealer Info</h3>
          <div className="mt-4 space-y-3 text-sm text-slate-600 dark:text-slate-300">
            <div><span className="font-medium text-slate-900 dark:text-slate-100">Business:</span> {dealer.businessName}</div>
            <div><span className="font-medium text-slate-900 dark:text-slate-100">Address:</span> {dealer.address}</div>
            <div><span className="font-medium text-slate-900 dark:text-slate-100">GST:</span> {dealer.gstNumber || "-"}</div>
            <div><span className="font-medium text-slate-900 dark:text-slate-100">Rating:</span> {dealer.rating || 0} / 5</div>
            <div><span className="font-medium text-slate-900 dark:text-slate-100">Created:</span> {new Date(dealer.createdAt).toLocaleDateString()}</div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm ring-1 ring-slate-950/5 xl:col-span-2 dark:border-slate-800 dark:bg-slate-900">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Assigned Leads</h3>
          <div className="mt-4 space-y-3">
            {leads.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                No assigned leads yet.
              </div>
            ) : (
              leads.map((lead) => (
                <div key={lead._id} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-slate-100">{lead.name}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{lead.phone} - {lead.area}</div>
                    </div>
                    <LeadStatusBadge status={lead.status} />
                  </div>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{lead.requirement}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm ring-1 ring-slate-950/5 dark:border-slate-800 dark:bg-slate-900">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Orders Summary</h3>
          <div className="mt-4 space-y-3">
            {orders.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                No orders recorded yet.
              </div>
            ) : (
              orders.map((order) => (
                <div key={order._id} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-slate-100">
                        {order.products?.map((product) => product.productName).join(", ") || "Order"}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {order.leadId?.name || order.lead?.name || "Lead"} - {order.products?.reduce((sum, product) => sum + product.quantity, 0) || 0} items
                      </div>
                    </div>
                    <div className="text-sm font-medium text-slate-700 dark:text-slate-200">{formatCurrency(order.totalAmount)}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm ring-1 ring-slate-950/5 dark:border-slate-800 dark:bg-slate-900">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Payment Summary</h3>
          <div className="mt-4 space-y-3">
            {payments.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                No payments recorded yet.
              </div>
            ) : (
              payments.map((payment) => (
                <div key={payment._id} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-slate-100">
                        {payment.orderId?.products?.map((product) => product.productName).join(", ") || payment.paymentMethod}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{new Date(payment.paymentDate || payment.paidAt).toLocaleDateString()} - {payment.paymentMethod}</div>
                    </div>
                    <div className="text-sm font-medium text-slate-700 dark:text-slate-200">{formatCurrency(payment.amountPaid ?? payment.amount)}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm ring-1 ring-slate-950/5 dark:border-slate-800 dark:bg-slate-900">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Dealer Activity</h3>
        <div className="mt-4 space-y-3">
          {activities.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
              No dealer activity logged yet.
            </div>
          ) : (
            activities.map((activity) => (
              <div key={activity._id} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-medium text-slate-900 dark:text-slate-100">{activity.message}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">{new Date(activity.createdAt).toLocaleString()}</div>
                </div>
                <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {activity.userId?.name || activity.user?.name || "System"} ({activity.userId?.role || activity.user?.role || "unknown"})
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
};
