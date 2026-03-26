import { LogOut, Menu, UserRound } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export const Topbar = ({ toggleSidebar }) => {
  const { user, logout } = useAuth();

  return (
    <header className="px-4 pt-4 md:px-6 md:pt-6">
      <div className="crm-panel rounded-[2rem] px-5 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={toggleSidebar}
              className="rounded-2xl bg-stone-900 px-3 py-3 text-stone-100 transition hover:bg-black md:hidden"
            >
              <Menu size={20} />
            </button>
            <div className="hidden rounded-2xl bg-gradient-to-br from-orange-500 to-amber-300 p-3 text-stone-950 shadow-lg md:block">
              <UserRound size={18} />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.3em] text-stone-500">Workspace</p>
              <h1 className="text-lg font-semibold text-stone-950">{user?.name || "Dealer CRM"}</h1>
              <p className="text-xs text-stone-500">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="inline-flex items-center gap-2 rounded-2xl bg-stone-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-stone-800"
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </div>
    </header>
  );
};
