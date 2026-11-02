import { useEffect, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { resendVerificationEmail, verifyEmail } from '@/services/authService';

interface LocationState {
  email?: string;
  verificationNotice?: string;
  resendCooldown?: number;
}

export default function VerifyEmail() {
  const location = useLocation();
  const navigate = useNavigate();
  const locationState = (location.state as LocationState | null) ?? {};
  const initialEmail = locationState.email ?? '';
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState('');
  const [serverError, setServerError] = useState('');
  const [notice, setNotice] = useState(locationState.verificationNotice ?? '');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(10 * 60);
  const [resendCooldown, setResendCooldown] = useState(locationState.resendCooldown ?? 60);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSecondsRemaining(seconds => Math.max(0, seconds - 1));
      setResendCooldown(seconds => Math.max(0, seconds - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) =>
    `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setServerError('');
    setNotice('');

    if (!email || !/^\d{6}$/.test(code)) {
      setServerError('Enter your email address and the six-digit code.');
      return;
    }

    setLoading(true);
    try {
      await verifyEmail({ email, code });
      navigate('/login', {
        replace: true,
        state: { registrationSuccess: true, email },
      });
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setServerError(error.response?.data?.message ?? 'The code could not be verified.');
      } else {
        setServerError('The code could not be verified.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email || resendCooldown > 0 || resending) return;

    setServerError('');
    setNotice('');
    setResending(true);
    try {
      const response = await resendVerificationEmail(email);
      setSecondsRemaining(response.data.expiresIn ?? 10 * 60);
      setResendCooldown(response.data.retryAfter ?? 60);
      setCode('');
      setNotice('A new verification code has been sent.');
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const retryAfter = error.response?.data?.retryAfter;
        if (typeof retryAfter === 'number') setResendCooldown(retryAfter);
        setServerError(error.response?.data?.message ?? 'The code could not be resent.');
      } else {
        setServerError('The code could not be resent.');
      }
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-200 px-6 py-12">
      <div className="w-full max-w-sm rounded-xl bg-white border border-neutral-200 shadow-sm p-8">
        <Link to="/" className="flex items-center gap-2 mb-10">
          <span className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </span>
          <span className="font-extrabold text-neutral-900 text-lg tracking-tight">EventMS</span>
        </Link>

        <h1 className="text-2xl font-black text-neutral-900 tracking-tight">Verify your email</h1>
        <p className="text-sm text-neutral-500 mt-2 mb-7">
          We sent a six-digit code to your email address.
        </p>

        <div className="mb-5 rounded-lg border border-brand-100 bg-brand-50 px-4 py-3 text-sm text-brand-800">
          <div className="flex items-center justify-between gap-4">
            <span>Code expires in</span>
            <strong className="font-mono text-base">{formatTime(secondsRemaining)}</strong>
          </div>
        </div>

        {serverError && (
          <div className="mb-5 rounded-lg bg-rose-50 border border-rose-100 px-4 py-3 text-sm text-rose-700">
            {serverError}
          </div>
        )}

        {notice && (
          <div role="status" className="mb-5 rounded-lg bg-emerald-50 border border-emerald-100 px-4 py-3 text-sm text-emerald-700">
            {notice}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="form-stack">
          <Input
            label="Email address"
            type="email"
            autoComplete="email"
            value={email}
            disabled
            onChange={event => setEmail(event.target.value)}
          />
          <Input
            label="Verification code"
            inputMode="numeric"
            maxLength={6}
            autoComplete="one-time-code"
            value={code}
            onChange={event => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
            helperText="Enter the code from the email."
          />
          <Button type="submit" loading={loading} className="w-full" size="lg">
            Verify email
          </Button>
        </form>

        <div className="mt-5 text-center">
          <button
            type="button"
            onClick={handleResend}
            disabled={resendCooldown > 0 || resending || !email}
            className="text-sm font-semibold text-brand-600 hover:text-brand-700 disabled:cursor-not-allowed disabled:text-neutral-400"
          >
            {resending ? 'Sending code...' : resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Resend code'}
          </button>
        </div>

        <p className="mt-6 text-center text-sm text-neutral-500">
          Already verified?{' '}
          <Link to="/login" className="font-semibold text-brand-600 hover:text-brand-700">Sign in</Link>
        </p>
      </div>
    </div>
  );
}