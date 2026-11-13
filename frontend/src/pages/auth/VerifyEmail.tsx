import { useEffect, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { resendVerificationEmail, verifyEmail } from '@/services/authService';
import { Mail } from 'lucide-react';

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
  const [emailEditable, setEmailEditable] = useState(false);
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
    <div className="min-h-screen flex items-center justify-center bg-[#f7f7f5] px-4 py-8">
      <div className="w-full max-w-[380px] rounded-lg border border-neutral-200 bg-white p-5 shadow-[0_12px_35px_-24px_rgba(15,23,42,0.35)] sm:p-7">
        <Link to="/" className="mb-5 flex justify-center" aria-label="EventMS home">
          <span className="flex size-10 items-center justify-center rounded-lg bg-gradient-to-br from-rose-500 to-orange-500 text-white shadow-sm">
            <Mail aria-hidden="true" className="size-5" />
          </span>
        </Link>

        <h1 className="text-center text-xl font-extrabold tracking-tight text-neutral-950">Check your email</h1>
        <p className="mt-2 mb-5 text-center text-sm text-neutral-600">
          We sent a six-digit code to your email address.
        </p>

        <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <div className="flex items-center justify-center gap-2">
            <span>Code expires in</span>
            <strong className="font-mono text-sm">{formatTime(secondsRemaining)}</strong>
          </div>
        </div>

        {serverError && (
          <div className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-800">
            {serverError}
          </div>
        )}

        {notice && (
          <div role="status" className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800">
            {notice}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <Input
            label="Email address"
            type="email"
            autoComplete="email"
            value={email}
            disabled={!emailEditable}
            onChange={event => setEmail(event.target.value)}
          />
          <div className="flex flex-col gap-2">
            <label htmlFor="verification-code" className="text-sm font-medium text-neutral-800">Verification code</label>
            <div className="relative">
              <input id="verification-code" type="text" inputMode="numeric" maxLength={6} autoComplete="one-time-code" aria-label="Six-digit verification code" value={code} onChange={event => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} className="absolute inset-0 z-10 h-full w-full cursor-text opacity-0" />
              <div aria-hidden="true" className="flex justify-center gap-2">
                {Array.from({ length: 6 }, (_, index) => <span key={index} className={`flex h-10 w-9 items-center justify-center rounded-md border bg-white text-lg font-semibold text-neutral-950 sm:w-10 ${index === code.length ? 'border-rose-500 ring-2 ring-rose-100' : 'border-neutral-300'}`}>{code[index] ?? ''}</span>)}
              </div>
            </div>
            <p className="text-xs text-neutral-500">Enter the code from the email.</p>
          </div>
          <Button type="submit" loading={loading} className="h-10 w-full !bg-neutral-950 !text-white hover:!bg-neutral-800" size="lg">
            Verify email
          </Button>
        </form>

        <div className="mt-5 text-center">
          <button
            type="button"
            onClick={handleResend}
            disabled={resendCooldown > 0 || resending || !email}
            className="text-sm font-semibold !text-rose-600 hover:underline disabled:cursor-not-allowed disabled:!text-neutral-400"
          >
            {resending ? 'Sending code...' : resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Resend code'}
          </button>
        </div>

        <p className="mt-4 text-center text-sm text-neutral-600">
          Wrong address?{' '}
          <button type="button" onClick={() => {
            setEmailEditable(value => !value);
            setCode('');
            setResendCooldown(0);
            setNotice('');
            setServerError('');
          }} className="font-semibold !text-rose-600 hover:underline">
            {emailEditable ? 'Use this email' : 'Change email'}
          </button>
        </p>
      </div>
    </div>
  );
}