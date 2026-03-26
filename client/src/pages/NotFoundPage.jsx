import { Link } from "react-router-dom";

export const NotFoundPage = () => {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 text-center">
      <h1 className="text-4xl font-bold text-slate-900">404</h1>
      <p className="text-lg text-slate-600">Page not found.</p>
      <Link
        to="/"
        className="rounded-lg bg-brand px-5 py-2 text-sm font-semibold text-white hover:bg-brand-2"
      >
        Go to dashboard
      </Link>
    </div>
  );
};
