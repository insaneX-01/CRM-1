import { NavLink } from "react-router-dom";
import { LifeBuoy, Sparkles, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const baseLink =
  "group flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition duration-300";
const activeLink = "bg-white text-stone-950 shadow-lg shadow-orange-900/10";

export const Sidebar = ({ collapsed, setCollapsed, isMobile }) => {
  const { user } = useAuth();

  const links = [
    { to: "/", label: "Dashboard", icon: "DB" },
    { to: "/leads", label: "Leads", icon: "LD" },
  ];

  if (user?.role === "admin") {
    links.push({ to: "/dealers", label: "Dealers", icon: "DL" });
    links.push({ to: "/schemes", label: "Schemes", icon: "SC" });
  }

  if (user?.role === "dealer") {
    links.push({ to: "/dealer-profile", label: "My Profile", icon: "PR" });
  }

  if (user?.role === "salesperson") {
    links.push({ to: "/sales-profile", label: "My Sales Desk", icon: "SD" });
  }

  links.push({ to: "/orders", label: "Orders", icon: "OR" });
  links.push({ to: "/payments", label: "Payments", icon: "PY" });
  links.push({ to: "/complaints", label: "Complaints", icon: "CP" });

  if (user?.role === "admin") {
    links.push({ to: "/sales", label: "Sales Team", icon: "SL" });
  }

  const sidebarClasses = isMobile
    ? `crm-dark-panel fixed inset-y-0 left-0 z-50 h-full w-72 transform transition-transform duration-300 ${
        collapsed ? "-translate-x-full" : "translate-x-0"
      }`
    : `crm-dark-panel m-3 h-[calc(100%-1.5rem)] transition-all duration-300 ${
        collapsed ? "w-20" : "w-72"
      }`;

  return (
    <>
      {isMobile && !collapsed ? (
        <div className="fixed inset-0 z-40 bg-black/50" onClick={() => setCollapsed(true)} />
      ) : null}

      <aside className={`${sidebarClasses} overflow-hidden rounded-[2rem]`}>
        <div className="crm-orb absolute -left-10 top-16 h-36 w-36 rounded-full bg-orange-500/20 blur-3xl" />
        <div className="crm-orb absolute -right-10 bottom-12 h-36 w-36 rounded-full bg-cyan-400/20 blur-3xl" />

        <div className="relative flex items-center justify-between px-5 py-6">
          <div className={collapsed && !isMobile ? "hidden" : ""}>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.3em] text-orange-200">
              <Sparkles size={12} />
              Command Hub
            </div>
            <span className="mt-4 block text-2xl font-semibold tracking-tight text-white">Dealer CRM</span>
            <span className="text-xs uppercase tracking-[0.28em] text-stone-400">{user?.role?.toUpperCase()}</span>
          </div>

          {isMobile ? (
            <button onClick={() => setCollapsed(true)} className="rounded-xl p-2 text-stone-300 transition hover:bg-white/10 hover:text-white">
              <X size={20} />
            </button>
          ) : null}
        </div>

        <nav className="relative space-y-2 px-3">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              onClick={() => isMobile && setCollapsed(true)}
              className={({ isActive }) =>
                `${baseLink} ${
                  isActive
                    ? activeLink
                    : "text-stone-300 hover:bg-white/10 hover:text-white"
                } ${collapsed && !isMobile ? "justify-center px-2" : ""}`
              }
            >
              <span className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl text-[10px] font-bold ${
                collapsed && !isMobile
                  ? "bg-white/10 text-stone-100"
                  : "bg-gradient-to-br from-orange-400 via-amber-300 to-teal-300 text-stone-950"
              }`}>
                {link.icon}
              </span>
              {(!collapsed || isMobile) && <span>{link.label}</span>}
            </NavLink>
          ))}
        </nav>

        {(!collapsed || isMobile) && (
          <div className="relative mx-3 mt-6 rounded-[1.75rem] border border-white/10 bg-white/5 p-4 text-stone-200">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-orange-500/15 p-2 text-orange-200">
                <LifeBuoy size={18} />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Pipeline pulse</p>
                <p className="text-xs text-stone-400">Keep leads moving with faster follow-ups.</p>
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  );
};
