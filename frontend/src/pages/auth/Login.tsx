import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { login, resendVerificationEmail } from "@/services/authService";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import axios from "axios";

interface FieldErrors {
  email?: string;
  password?: string;
}

export default function Login() {
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState(location.state?.email ?? "");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState("");
  const [showVerificationLink, setShowVerificationLink] = useState(false);
  const [sendingVerification, setSendingVerification] = useState(false);
  const [loading, setLoading] = useState(false);

  const validate = (): boolean => {
    const next: FieldErrors = {};
    if (!email) next.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      next.email = "Enter a valid email address";
    if (!password) next.password = "Password is required";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setServerError("");
    setShowVerificationLink(false);
    if (!validate()) return;
    setLoading(true);
    try {
      const res = await login({ email, password });
      setUser(res.data.data);
      navigate("/");
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const msg = err.response?.data?.message;
        const unverified =
          err.response?.status === 403 &&
          msg === "Please verify your email before signing in";
        setShowVerificationLink(unverified);
        setServerError(
          err.response?.status === 401
            ? (msg ?? "Invalid email or password")
            : (msg ?? "Something went wrong."),
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEmail = async (
    event: React.MouseEvent<HTMLAnchorElement>,
  ) => {
    event.preventDefault();
    if (sendingVerification) return;

    setSendingVerification(true);
    try {
      const response = await resendVerificationEmail(email);
      navigate("/verify-email", {
        state: { email, verificationNotice: response.data.message },
      });
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 429) {
        navigate("/verify-email", {
          state: {
            email,
            verificationNotice: err.response.data.message,
            resendCooldown: err.response.data.retryAfter,
          },
        });
      } else if (axios.isAxiosError(err)) {
        setServerError(
          err.response?.data?.message ??
            "The verification code could not be sent.",
        );
      } else {
        setServerError("The verification code could not be sent.");
      }
    } finally {
      setSendingVerification(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-[45%] bg-neutral-800 flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-brand-600 rounded-full opacity-10 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent-500 rounded-full opacity-8 blur-3xl" />
        <Link to="/" className="relative flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center">
            <svg
              className="w-4 h-4 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </span>
          <span className="font-extrabold text-white text-lg tracking-tight">
            EventMS
          </span>
        </Link>
        <div className="relative">
          <h2 className="text-3xl font-black text-white leading-tight tracking-tight drop-shadow-sm">
            Manage events that move people.
          </h2>
          <p className="text-neutral-300 mt-4 leading-relaxed text-sm">
            One platform for creating events, managing registrations, onboarding
            vendors and tracking attendance.
          </p>
          <div className="mt-8 flex flex-col gap-3">
            {[
              "Secure role-based access",
              "Digital tickets & check-in",
              "Real-time reporting",
            ].map((t) => (
              <div key={t} className="flex items-center gap-3">
                <span className="w-5 h-5 rounded-full bg-brand-600/20 border border-brand-500/30 flex items-center justify-center shrink-0">
                  <svg
                    className="w-3 h-3 text-brand-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </span>
                <span className="text-sm text-neutral-300">{t}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="relative text-xs text-neutral-600">
          © {new Date().getFullYear()} EventMS
        </p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center bg-neutral-200 px-6 py-12">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <Link to="/" className="lg:hidden flex items-center gap-2 mb-8">
            <span className="w-7 h-7 rounded-lg bg-brand-600 flex items-center justify-center">
              <svg
                className="w-3.5 h-3.5 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </span>
            <span className="font-extrabold text-neutral-900 tracking-tight">
              EventMS
            </span>
          </Link>

          <h1 className="text-2xl font-black text-neutral-900 tracking-tight">
            Welcome back
          </h1>
          <p className="text-sm text-neutral-500 mt-1 mb-7">
            Sign in to your account to continue.
          </p>

          {location.state?.registrationSuccess && (
            <div className="mb-5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
              Registration successful. Please sign in to continue.
            </div>
          )}

          {location.state?.passwordResetSuccess && (
            <div
              role="status"
              className="mb-5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800"
            >
              Your password has been reset. Please sign in with your new
              password.
            </div>
          )}

          {serverError && (
            <div className="mb-5 rounded-lg bg-rose-50 border border-rose-100 px-4 py-3 text-sm text-rose-700">
              {serverError}
              {showVerificationLink && (
                <Link
                  to="/verify-email"
                  state={{ email }}
                  onClick={handleVerifyEmail}
                  className="block mt-2 font-semibold text-brand-600 hover:text-brand-700"
                >
                  {sendingVerification
                    ? "Sending verification code..."
                    : "Verify your email"}
                </Link>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="form-stack">
            <Input
              label="Email address"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={errors.email}
            />
            <Input
              label="Password"
              type="password"
              autoComplete="current-password"
              showPasswordToggle
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={errors.password}
            />
            <div className="-mt-2 flex justify-end">
              <Link
                to="/forgot-password"
                className="text-sm font-semibold text-black hover:text-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500 focus-visible:ring-offset-2"
              >
                Forgot password?
              </Link>
            </div>
            <Button
              type="submit"
              loading={loading}
              className="w-full"
              size="lg"
            >
              Sign in
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-neutral-500">
            Don't have an account?{" "}
            <Link
              to="/register"
              className="font-semibold text-brand-600 hover:text-brand-700"
            >
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
