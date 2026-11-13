import { useEffect, useState, type FormEvent } from "react";
import {
  Link,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import axios from "axios";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { resetPassword, requestPasswordReset } from "@/services/authService";
import { LockKeyhole } from "lucide-react";

interface FieldErrors {
  code?: string;
  password?: string;
  confirmPassword?: string;
}

const PASSWORD_RULES = [
  { label: "At least 8 characters", test: (value: string) => value.length >= 8 },
  { label: "One uppercase letter", test: (value: string) => /[A-Z]/.test(value) },
  { label: "One lowercase letter", test: (value: string) => /[a-z]/.test(value) },
  { label: "One number", test: (value: string) => /\d/.test(value) },
  { label: "One special character", test: (value: string) => /[^A-Za-z0-9]/.test(value) },
];

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const email = searchParams.get("email") ?? "";
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [notice, setNotice] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setResendCooldown((seconds) => Math.max(0, seconds - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  const handlePasswordChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextPassword = event.target.value;
    const passwordIsValid = PASSWORD_RULES.every((rule) => rule.test(nextPassword));
    setPassword(nextPassword);
    setFieldErrors((current) => ({
      ...current,
      password: nextPassword && !passwordIsValid
        ? "Password does not meet all requirements"
        : undefined,
      confirmPassword: confirmPassword && nextPassword !== confirmPassword
        ? "Passwords do not match"
        : undefined,
    }));
  };

  const handleConfirmPasswordChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextConfirmPassword = event.target.value;
    setConfirmPassword(nextConfirmPassword);
    setFieldErrors((current) => ({
      ...current,
      confirmPassword: nextConfirmPassword && nextConfirmPassword !== password
        ? "Passwords do not match"
        : undefined,
    }));
  };

  const validate = (): boolean => {
    const next: FieldErrors = {};
    if (!/^\d{6}$/.test(code)) {
      next.code = "Enter the six-digit code sent to your email.";
    }
    if (!password) {
      next.password = "Password is required";
    } else if (!PASSWORD_RULES.every((rule) => rule.test(password))) {
      next.password = "Password does not meet all requirements";
    }
    if (!confirmPassword) {
      next.confirmPassword = "Please confirm your password";
    } else if (password !== confirmPassword) {
      next.confirmPassword = "Passwords do not match";
    }
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleResendCode = async () => {
    if (resendCooldown > 0 || resending) return;

    setServerError("");
    setNotice("");

    if (!email) {
      setServerError("Your email address is missing. Please try again.");
      return;
    }

    setResending(true);

    try {
      const response = await requestPasswordReset(email);
      setResendCooldown(response.data.retryAfter ?? 60);
      setNotice(response.data.message || "A new password reset code has been sent.");
      setCode("");
      setFieldErrors((current) => ({ ...current, code: undefined }));
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const retryAfter = err.response?.data?.retryAfter;
        if (typeof retryAfter === "number") setResendCooldown(retryAfter);
        setServerError(
          err.response?.data?.message ??
            "Failed to resend OTP. Please try again.",
        );
      } else {
        setServerError("Failed to resend OTP. Please try again.");
      }
    } finally {
      setResending(false);
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setServerError("");
    setNotice("");

    if (!email) {
      setServerError("The email address is missing. Request a new reset code.");
      return;
    }
    if (!validate()) return;

    setLoading(true);
    try {
      await resetPassword({ email, code, password });
      navigate("/login", {
        replace: true,
        state: { passwordResetSuccess: true },
      });
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setServerError(
          err.response?.data?.message ??
            "Your password could not be reset. Please try again.",
        );
      } else {
        setServerError("Your password could not be reset. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f7f7f5] px-4 py-8">
      <div className="hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-brand-600 rounded-full opacity-10 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent-500 rounded-full opacity-8 blur-3xl" />
        <Link to="/" className="relative flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center">
            <svg
              className="w-4 h-4 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
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
          <h2 className="text-3xl font-black text-white leading-tight tracking-tight">
            Get back to planning great events.
          </h2>
          <p className="text-neutral-300 mt-4 leading-relaxed text-sm">
            Verify your reset code and choose a new password to get back into
            your EventMS account.
          </p>
          <div className="mt-8 flex flex-col gap-3">
            {[
              "Enter your one-time reset code",
              "Choose a secure new password",
              "Return to managing your events",
            ].map((item) => (
              <div key={item} className="flex items-center gap-3">
                <span className="w-5 h-5 rounded-full bg-brand-600/20 border border-brand-500/30 flex items-center justify-center shrink-0">
                  <svg
                    className="w-3 h-3 text-brand-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </span>
                <span className="text-sm text-neutral-300">{item}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="relative text-xs text-neutral-600">
          © {new Date().getFullYear()} EventMS
        </p>
      </div>

      <div className="w-full">
        <div className="mx-auto w-full max-w-[380px] rounded-lg border border-neutral-200 bg-white p-5 shadow-[0_12px_35px_-24px_rgba(15,23,42,0.35)] sm:p-7">
          <Link to="/" className="mb-5 flex justify-center" aria-label="EventMS home">
            <span className="flex size-10 items-center justify-center rounded-lg bg-gradient-to-br from-rose-500 to-orange-500 text-white shadow-sm">
              <LockKeyhole aria-hidden="true" className="size-5" />
            </span>
          </Link>

          <h1 className="text-center text-xl font-extrabold tracking-tight text-neutral-950">
            Reset your password
          </h1>
          <p className="mt-2 mb-5 text-center text-sm text-neutral-600">
            Enter the six-digit code sent to{" "}
            <span className="font-semibold text-neutral-900">
              {email || "your email"}
            </span>
            , then choose a new password.
          </p>

          {notice && (
            <div
              role="status"
              className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800"
            >
              {notice}
            </div>
          )}
          {serverError && (
            <div
              role="alert"
              className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-800"
            >
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <Input
              label="Enter OTP code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(event) => {
                const nextCode = event.target.value.replace(/\D/g, "").slice(0, 6);
                setCode(nextCode);
                setFieldErrors((current) => ({
                  ...current,
                  code: nextCode && !/^\d{6}$/.test(nextCode)
                    ? "Enter the six-digit code sent to your email."
                    : undefined,
                }));
              }}
              error={fieldErrors.code}
              placeholder="000000"
              className="text-center font-mono tracking-[0.3em]"
            />
            <Input
              label="New password"
              type="password"
              autoComplete="new-password"
              showPasswordToggle
              value={password}
              onChange={handlePasswordChange}
              error={fieldErrors.password}
            />
            <div className="-mt-1 grid grid-cols-2 gap-x-3 gap-y-1 text-xs" aria-live="polite">
              {PASSWORD_RULES.map((rule) => {
                const passed = rule.test(password);
                return (
                  <span key={rule.label} className={passed ? "text-emerald-600" : "text-neutral-400"}>
                    <span className="mr-1 font-semibold">{passed ? "✓" : "○"}</span>{rule.label}
                  </span>
                );
              })}
            </div>
            <Input
              label="Confirm new password"
              type="password"
              autoComplete="new-password"
              showPasswordToggle
              value={confirmPassword}
              onChange={handleConfirmPasswordChange}
              error={fieldErrors.confirmPassword}
              helperText={confirmPassword && password === confirmPassword ? "Passwords match" : undefined}
            />
            <Button
              type="submit"
              loading={loading}
              className="h-10 w-full !bg-neutral-950 !text-white hover:!bg-neutral-800"
              size="lg"
            >
              Save new password
            </Button>
          </form>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-2 text-center text-sm">
            <span className="text-neutral-600">Didn't receive the code?</span>
            <button
              type="button"
              onClick={handleResendCode}
              disabled={resendCooldown > 0 || resending || loading || !email}
              className="font-semibold !text-rose-600 hover:underline disabled:cursor-not-allowed disabled:!text-neutral-400"
            >
              {resending
                ? "Sending..."
                : resendCooldown > 0
                  ? `Resend in ${resendCooldown}s`
                  : "Resend code"}
            </button>
            <div className="flex basis-full items-center justify-center gap-1.5 pt-2">
              <span className="text-neutral-600">Already have your password?</span>
              <Link
                to="/login"
                className="font-semibold !text-rose-600 hover:underline"
              >
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
