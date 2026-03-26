import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "../context/AuthContext";
import { LoadingSpinner } from "../components/LoadingSpinner";

export const LoginPage = () => {
  const { login, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/";

  const { register, handleSubmit } = useForm({
    defaultValues: {
      email: "",
      password: "",
    },
  });

  useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, from]);

  const onSubmit = async (data) => {
    try {
      await login(data);
      toast.success("Welcome back!");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Login failed");
    }
  };

  return (
    <div className="crm-auth-shell">
      <div className="container relative z-10 mx-auto flex min-h-screen items-center justify-center px-4 py-10">
        <div className="grid w-full max-w-6xl gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <section className="hidden lg:block">
            <div className="max-w-xl">
              <div className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.35em] text-orange-200">
                Sales Intelligence
              </div>
              <h1 className="mt-6 text-5xl font-semibold leading-tight text-white">
                Make the CRM feel like a live command center.
              </h1>
              <p className="mt-5 text-base leading-7 text-slate-300">
                Track leads, convert orders, and monitor payments from a sharper, more energetic workspace built for daily momentum.
              </p>
              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                {[
                  ["247", "Fresh leads in motion"],
                  ["18", "Dealers active today"],
                  ["94%", "Payment visibility"],
                ].map(([value, label]) => (
                  <div key={label} className="rounded-[1.75rem] border border-white/10 bg-white/5 p-4 backdrop-blur">
                    <div className="text-2xl font-semibold text-white">{value}</div>
                    <div className="mt-1 text-sm text-slate-300">{label}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <div className="crm-auth-card w-full max-w-md p-8 md:p-10 lg:ml-auto">
            <h1 className="mb-2 text-3xl font-semibold text-white">Dealer CRM</h1>
            <p className="mb-6 text-sm text-slate-200">
              Login to manage leads, orders and payments.
            </p>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-200">
                  Email
                </label>
                <input
                  type="email"
                  {...register("email", { required: true })}
                  className="mt-1 w-full rounded-2xl border border-white/15 bg-slate-950/35 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-orange-300"
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-200">
                  Password
                </label>
                <input
                  type="password"
                  {...register("password", { required: true })}
                  className="mt-1 w-full rounded-2xl border border-white/15 bg-slate-950/35 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-orange-300"
                  placeholder="........"
                />
              </div>

              <button
                type="submit"
                className="w-full rounded-2xl bg-gradient-to-r from-orange-500 to-amber-400 px-4 py-3 text-sm font-semibold text-stone-950 shadow-sm transition hover:brightness-105"
              >
                {loading ? <LoadingSpinner size={18} /> : "Sign in"}
              </button>
            </form>

            <p className="mt-6 text-center text-xs text-slate-300">
              New to the system?{" "}
              <Link to="/register" className="font-medium text-white underline">
                Register
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
