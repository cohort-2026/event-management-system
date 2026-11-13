import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { login, resendVerificationEmail } from "@/services/authService";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/primitives/button";
import { Input } from "@/components/ui/primitives/input";
import { Label } from "@/components/ui/label";
import { CalendarDays, Eye, EyeOff, LoaderCircle, TriangleAlert } from "lucide-react";
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
  const [showPassword, setShowPassword] = useState(false);

  const validate = (): boolean => {
    const next: FieldErrors = {};
    if (!email) next.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      next.email = "Enter a valid email address";
    if (!password) next.password = "Password is required";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setServerError("");
    setShowVerificationLink(false);
    if (!validate()) return;
    setLoading(true);
    try {
      const response = await login({ email, password });
      setUser(response.data.data);
      navigate(response.data.data.mustChangePassword ? "/change-password" : "/");
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.message;
        const unverified =
          error.response?.status === 403 &&
          message === "Please verify your email before signing in";
        setShowVerificationLink(unverified);
        setServerError(
          error.response?.status === 401
            ? (message ?? "Invalid email or password")
            : (message ?? "Something went wrong."),
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
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 429) {
        navigate("/verify-email", {
          state: {
            email,
            verificationNotice: error.response.data.message,
            resendCooldown: error.response.data.retryAfter,
          },
        });
      } else if (axios.isAxiosError(error)) {
        setServerError(
          error.response?.data?.message ??
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
    <main className="min-h-screen bg-white lg:grid lg:grid-cols-2">
      <aside className="relative hidden min-h-screen overflow-hidden bg-gradient-to-br from-rose-600 via-red-500 to-orange-500 p-10 text-white lg:flex lg:flex-col lg:justify-between">
        <div aria-hidden="true" className="absolute inset-0 opacity-80 [background-image:radial-gradient(circle_at_82%_16%,rgba(255,255,255,.32)_0_10%,transparent_10.2%),radial-gradient(circle_at_14%_82%,rgba(255,183,117,.9)_0_19%,transparent_19.2%),radial-gradient(ellipse_at_58%_116%,rgba(150,47,24,.75)_0_28%,transparent_28.2%)]" />
        <Link to="/" className="relative flex items-center gap-2.5 !text-white" aria-label="EventMS home">
          <span className="flex size-8 items-center justify-center rounded-lg bg-white/20"><CalendarDays aria-hidden="true" className="size-4" /></span>
          <span className="text-sm font-extrabold tracking-tight">EventMS</span>
        </Link>
        <div className="relative max-w-md pb-8">
          <p className="mb-3 text-sm font-semibold text-white/80">Discover. Book. Show up.</p>
          <h2 className="text-4xl font-black leading-tight tracking-tight xl:text-5xl">
            Your seat at your next event is one step away.
          </h2>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/80">
            Find workshops, meet new people, and keep every ticket in one place.
          </p>
        </div>
        <p className="relative text-xs text-white/65">© {new Date().getFullYear()} EventMS</p>
      </aside>

      <section className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-8">
        <div className="w-full max-w-[360px]">
          <Link to="/" className="mb-8 flex items-center justify-center gap-2 lg:hidden" aria-label="EventMS home">
            <span className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-rose-500 to-orange-500 text-white"><CalendarDays aria-hidden="true" className="size-4" /></span>
            <span className="text-sm font-extrabold text-neutral-950">EventMS</span>
          </Link>
          <h1 className="text-2xl font-extrabold tracking-tight text-neutral-950">Welcome back</h1>
          <p className="mt-1 text-sm text-neutral-600">Sign in to book your place.</p>

          {location.state?.registrationSuccess && <div role="status" className="mt-5 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800">Registration successful. Please sign in to continue.</div>}
          {location.state?.passwordResetSuccess && <div role="status" className="mt-5 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800">{location.state?.passwordSetupMessage ?? "Your password has been reset. Please sign in with your new password."}</div>}
          {serverError && (
            <Alert variant="destructive" className="mt-5 border-rose-200 bg-rose-50 text-rose-800">
              <TriangleAlert aria-hidden="true" />
              <AlertDescription className="text-rose-800">
                {serverError}
                {showVerificationLink && <Link to="/verify-email" state={{ email }} onClick={handleVerifyEmail} className="mt-1 block font-semibold !text-rose-700 underline underline-offset-2 hover:!text-rose-800">{sendingVerification ? "Sending verification code..." : "Verify your email"}</Link>}
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="login-email" className="text-xs font-medium text-neutral-900">Email</Label>
              <Input id="login-email" type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? "login-email-error" : undefined} placeholder="you@example.com" className="h-10 border-neutral-300 bg-white text-sm focus-visible:border-neutral-500 focus-visible:ring-neutral-900/10" />
              {errors.email && <p id="login-email-error" role="alert" className="text-xs font-medium text-rose-600">{errors.email}</p>}
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="login-password" className="text-xs font-medium text-neutral-900">Password</Label>
                <Link to="/forgot-password" className="text-xs font-semibold !text-rose-600 hover:underline">Forgot password?</Link>
              </div>
              <div className="relative">
                <Input id="login-password" type={showPassword ? "text" : "password"} autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} aria-invalid={Boolean(errors.password)} aria-describedby={errors.password ? "login-password-error" : undefined} placeholder="Enter your password" className="h-10 border-neutral-300 bg-white pr-11 text-sm focus-visible:border-neutral-500 focus-visible:ring-neutral-900/10" />
                <button type="button" onClick={() => setShowPassword(visible => !visible)} aria-label={showPassword ? "Hide password" : "Show password"} className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-md text-neutral-500 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-neutral-700">
                  {showPassword ? <EyeOff aria-hidden="true" className="size-4" /> : <Eye aria-hidden="true" className="size-4" />}
                </button>
              </div>
              {errors.password && <p id="login-password-error" role="alert" className="text-xs font-medium text-rose-600">{errors.password}</p>}
            </div>
            <Button type="submit" size="lg" disabled={loading} className="h-10 w-full !bg-neutral-950 px-4 text-sm font-semibold !text-white shadow-none hover:!bg-neutral-800">
              <span>{loading ? "Signing you in..." : "Sign in"}</span>
              {loading ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : null}
            </Button>
          </form>
          <p className="mt-5 text-center text-xs text-neutral-600">New here? <Link to="/register" className="font-semibold !text-rose-600 hover:underline">Create an account</Link></p>
        </div>
      </section>
    </main>
  );
}
