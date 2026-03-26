import { X } from "lucide-react";

export const DashboardModal = ({ open, title, description, children, onClose }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/55 p-4 backdrop-blur-sm">
      <div className="crm-panel w-full max-w-2xl rounded-[2rem] p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-semibold text-stone-950">{title}</h3>
            {description ? (
              <p className="mt-1 text-sm text-stone-500">{description}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl p-2 text-stone-500 transition hover:bg-stone-100 hover:text-stone-800"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
};
