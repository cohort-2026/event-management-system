import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { CalendarDays } from "lucide-react";
import { requestPasswordReset } from "@/services/authService";
import { Button } from "@/components/ui/primitives/button";
import { Input } from "@/components/ui/primitives/input";
import { Label } from "@/components/ui/label";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Enter a valid email address.");
      return;
    }

    setLoading(true);
    try {
      const response = await requestPasswordReset(email.trim());
      const resetUrl = new URLSearchParams({ email: email.trim() });
      navigate(`/reset-password?${resetUrl.toString()}`, {
        state: { resetNotice: response.data.message },
      });
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message ?? "The reset code could not be sent. Please try again.");
      } else {
        setError("The reset code could not be sent. Please try again.");
      }
    } finally {
      setLoading(false);
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
          <h2 className="text-4xl font-black leading-tight tracking-tight xl:text-5xl">
            Your seat at your next event is one step away.
          </h2>
        </div>
        <p className="relative text-xs text-white/65">© {new Date().getFullYear()} EventMS</p>
      </aside>

      <section className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-8">
        <div className="w-full max-w-[360px]">
          <Link to="/" className="mb-8 flex items-center justify-center gap-2 lg:hidden" aria-label="EventMS home">
            <span className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-rose-500 to-orange-500 text-white"><CalendarDays aria-hidden="true" className="size-4" /></span>
            <span className="text-sm font-extrabold text-neutral-950">EventMS</span>
          </Link>
          <h1 className="text-2xl font-extrabold tracking-tight text-neutral-950">Forgot your password?</h1>
          <p className="mt-1 text-sm text-neutral-600">We’ll email you a 6-digit reset code.</p>

          {error && <div role="alert" className="mt-5 rounded-md border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-800">{error}</div>}

          <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="forgot-email" className="text-xs font-medium text-neutral-900">Email</Label>
              <Input id="forgot-email" type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} aria-invalid={Boolean(error && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))} placeholder="you@example.com" className="h-10 border-neutral-300 bg-white text-sm focus-visible:border-neutral-500 focus-visible:ring-neutral-900/10" />
            </div>
            <Button type="submit" size="lg" disabled={loading} className="h-10 w-full !bg-neutral-950 px-4 text-sm font-semibold !text-white shadow-none hover:!bg-neutral-800">
              {loading ? "Sending reset code..." : "Send reset code"}
            </Button>
          </form>
          <p className="mt-5 text-center text-xs text-neutral-600">Remember your password? <Link to="/login" className="font-semibold !text-rose-600 hover:underline">Sign in</Link></p>
        </div>
      </section>
    </main>
  );
}
