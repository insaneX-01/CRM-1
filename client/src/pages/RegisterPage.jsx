import { useForm } from "react-hook-form";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "../context/AuthContext";
import { LoadingSpinner } from "../components/LoadingSpinner";

export const RegisterPage = () => {
  const { register: registerUser, loading } = useAuth();
  const navigate = useNavigate();

  const { register, handleSubmit, watch } = useForm({
    defaultValues: {
      name: "",
      email: "",
      password: "",
      role: "dealer",
      phone: "",
      area: "",
      businessName: "",
      address: "",
    },
  });

  const selectedRole = watch("role");

  const onSubmit = async (data) => {
    try {
      await registerUser(data);
      toast.success("Account created");
      navigate("/");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Registration failed");
    }
  };

  return (
    <div className="crm-auth-shell">
      <div className="container relative z-10 mx-auto flex min-h-screen items-center justify-center px-4 py-10">
        <div className="grid w-full max-w-6xl gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <section className="hidden lg:block">
            <div className="max-w-xl">
              <div className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.35em] text-teal-200">
                Team Onboarding
              </div>
              <h1 className="mt-6 text-5xl font-semibold leading-tight text-white">
                Bring dealers and sales teams into one energetic workflow.
              </h1>
              <p className="mt-5 text-base leading-7 text-slate-300">
                Create access fast, organize areas clearly, and give every user a front row seat to lead movement, orders, and collections.
              </p>
            </div>
          </section>

          <div className="crm-auth-card w-full max-w-md p-8 md:p-10 lg:ml-auto">
            <h1 className="mb-2 text-3xl font-semibold text-white">Create an account</h1>
            <p className="mb-6 text-sm text-slate-200">
              Register as a dealer or salesperson.
            </p>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-200">
                  Name
                </label>
                <input
                  type="text"
                  {...register("name", { required: true })}
                  className="mt-1 w-full rounded-2xl border border-white/15 bg-slate-950/35 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-orange-300"
                  placeholder="Your name"
                />
              </div>
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
                  Role
                </label>
                <select
                  {...register("role", { required: true })}
                  className="mt-1 w-full rounded-2xl border border-white/15 bg-slate-950/35 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-orange-300"
                >
                  <option value="dealer">Dealer</option>
                  <option value="salesperson">Salesperson</option>
                </select>
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
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-200">
                  Phone
                </label>
                <input
                  type="text"
                  {...register("phone", { required: true })}
                  className="mt-1 w-full rounded-2xl border border-white/15 bg-slate-950/35 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-orange-300"
                  placeholder="10 to 15 digit phone number"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-200">
                  Area
                </label>
                <input
                  type="text"
                  {...register("area")}
                  className="mt-1 w-full rounded-2xl border border-white/15 bg-slate-950/35 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-orange-300"
                  placeholder="e.g. North"
                />
              </div>
              {selectedRole === "dealer" ? (
                <>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-slate-200">
                      Business Name
                    </label>
                    <input
                      type="text"
                      {...register("businessName", { required: selectedRole === "dealer" })}
                      className="mt-1 w-full rounded-2xl border border-white/15 bg-slate-950/35 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-orange-300"
                      placeholder="Your business name"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-slate-200">
                      Address
                    </label>
                    <textarea
                      rows={3}
                      {...register("address", { required: selectedRole === "dealer" })}
                      className="mt-1 w-full rounded-2xl border border-white/15 bg-slate-950/35 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-orange-300"
                      placeholder="Business address"
                    />
                  </div>
                </>
              ) : null}
              <button
                type="submit"
                className="w-full rounded-2xl bg-gradient-to-r from-orange-500 to-amber-400 px-4 py-3 text-sm font-semibold text-stone-950 shadow-sm transition hover:brightness-105"
              >
                {loading ? <LoadingSpinner size={18} /> : "Create account"}
              </button>
            </form>

            <p className="mt-6 text-center text-xs text-slate-300">
              Already have an account?{" "}
              <Link to="/login" className="font-medium text-white underline">
                Login
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
