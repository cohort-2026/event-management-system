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
      navigate(res.data.data.mustChangePassword ? '/change-password' : '/');
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
    <main className="flex min-h-screen items-center justify-center bg-neutral-100 px-4 py-10 sm:px-6">
      <div className="w-full max-w-sm rounded-2xl bg-white p-4 shadow-xl shadow-neutral-900/20 sm:p-6">
        <div className="relative">
        <Link to="/" className="mb-5 flex flex-col items-center gap-2">
          <img src="/dream-event-logo.jpg" alt="Dream Event Management" className="h-14 w-14 rounded-xl object-cover shadow-sm" />
          <span className="font-extrabold text-neutral-900 tracking-tight">EventMS</span>
        </Link>

          <h1 className="text-center text-2xl font-black text-neutral-900 tracking-tight">
            Welcome back
          </h1>
          <p className="text-center text-sm text-neutral-500 mt-1 mb-5">
            Manage events that move people.
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
              {location.state?.passwordSetupMessage ?? 'Your password has been reset. Please sign in with your new password.'}
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
              placeholder="example@gmail.com"
            />
            <Input
              label="Password"
              type="password"
              autoComplete="current-password"
              showPasswordToggle
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={errors.password}
              placeholder="••••••••"
            />
            <div className="-mt-2 flex justify-end">
              <Link
                to="/forgot-password"
                className="text-sm font-semibold text-neutral-700 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
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

          <p className="mt-4 text-center text-sm text-neutral-500">
            Don't have an account?{" "}
            <Link
              to="/register"
              className="font-semibold text-brand-600 hover:text-brand-700"
            >
              Register
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
