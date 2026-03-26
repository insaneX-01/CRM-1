import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const COLORS = ["#0f766e", "#2563eb", "#f59e0b", "#dc2626"];

const ChartCard = ({ title, subtitle, children, className = "" }) => (
  <section className={`crm-panel rounded-[2rem] p-5 ${className}`}>
    <div>
      <h3 className="text-lg font-semibold text-stone-950">{title}</h3>
      {subtitle ? <p className="mt-1 text-sm text-stone-500">{subtitle}</p> : null}
    </div>
    <div className="mt-5 h-80">{children}</div>
  </section>
);

export const ChartsSection = ({ statusData, monthlySales, dealerPerformance }) => {
  return (
    <div className="grid gap-6 xl:grid-cols-5">
      <ChartCard
        title="Lead Status Distribution"
        subtitle="Real-time health of the pipeline across active filters."
        className="xl:col-span-2"
      >
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={statusData}
              dataKey="value"
              nameKey="name"
              innerRadius={70}
              outerRadius={108}
              paddingAngle={3}
            >
              {statusData.map((entry, index) => (
                <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard
        title="Monthly Orders and Sales"
        subtitle="Order volume and revenue trend for the last visible months."
        className="xl:col-span-3"
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={monthlySales}>
            <CartesianGrid strokeDasharray="3 3" stroke="#d6d3d1" opacity={0.7} />
            <XAxis dataKey="month" tick={{ fill: "#78716c", fontSize: 12 }} />
            <YAxis yAxisId="left" tick={{ fill: "#78716c", fontSize: 12 }} />
            <YAxis yAxisId="right" orientation="right" tick={{ fill: "#78716c", fontSize: 12 }} />
            <Tooltip />
            <Legend />
            <Bar yAxisId="left" dataKey="orders" name="Orders" fill="#ef6c2f" radius={[10, 10, 0, 0]} />
            <Bar yAxisId="right" dataKey="revenue" name="Revenue" fill="#0f8b8d" radius={[10, 10, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard
        title="Dealer Performance"
        subtitle="Top dealers ranked by lead conversions."
        className="xl:col-span-5"
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={dealerPerformance} layout="vertical" margin={{ left: 20, right: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#d6d3d1" opacity={0.7} />
            <XAxis type="number" tick={{ fill: "#78716c", fontSize: 12 }} />
            <YAxis
              type="category"
              dataKey="dealer"
              width={140}
              tick={{ fill: "#78716c", fontSize: 12 }}
            />
            <Tooltip />
            <Legend />
            <Bar dataKey="conversions" name="Conversions" fill="#ef6c2f" radius={[0, 10, 10, 0]} />
            <Bar dataKey="totalLeads" name="Total Leads" fill="#0f8b8d" radius={[0, 10, 10, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
};
