import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { resetPassword } from '@/services/authService';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const email = searchParams.get('email') ?? '';
  const resetNotice = typeof location.state?.resetNotice === 'string' ? location.state.resetNotice : '';
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');

    if (!email) {
      setError('The email address is missing. Request a new reset code.');
      return;
    }
    if (!/^\d{6}$/.test(code)) {
      setError('Enter the six-digit code sent to your email.');
      return;
    }
    if (password.length < 8) {
      setError('Your password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('The passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await resetPassword({ email, code, password });
      navigate('/login', { replace: true, state: { passwordResetSuccess: true } });
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message ?? 'Your password could not be reset. Please try again.');
      } else {
        setError('Your password could not be reset. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-[45%] bg-neutral-800 flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-brand-600 rounded-full opacity-10 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent-500 rounded-full opacity-8 blur-3xl" />
        <Link to="/" className="relative flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </span>
          <span className="font-extrabold text-white text-lg tracking-tight">EventMS</span>
        </Link>
        <div className="relative">
          <h2 className="text-3xl font-black text-white leading-tight tracking-tight">
            Get back to planning great events.
          </h2>
          <p className="text-neutral-300 mt-4 leading-relaxed text-sm">
            Verify your reset code and choose a new password to get back into your EventMS account.
          </p>
          <div className="mt-8 flex flex-col gap-3">
            {['Enter your one-time reset code', 'Choose a secure new password', 'Return to managing your events'].map(item => (
              <div key={item} className="flex items-center gap-3">
                <span className="w-5 h-5 rounded-full bg-brand-600/20 border border-brand-500/30 flex items-center justify-center shrink-0">
                  <svg className="w-3 h-3 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </span>
                <span className="text-sm text-neutral-300">{item}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="relative text-xs text-neutral-600">© {new Date().getFullYear()} EventMS</p>
      </div>

      <div className="flex-1 flex items-center justify-center bg-neutral-200 px-6 py-12">
        <div className="w-full max-w-sm">
          <Link to="/" className="lg:hidden flex items-center gap-2 mb-8">
            <span className="w-7 h-7 rounded-lg bg-brand-600 flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </span>
            <span className="font-extrabold text-neutral-900 tracking-tight">EventMS</span>
          </Link>

          <h1 className="text-2xl font-black text-neutral-900 tracking-tight">Reset your password</h1>
          <p className="text-sm text-neutral-500 mt-1 mb-7">
            Enter the six-digit code sent to <span className="font-semibold text-neutral-700">{email || 'your email'}</span>, then choose a new password.
          </p>

          {resetNotice && (
            <div role="status" className="mb-5 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              {resetNotice}
            </div>
          )}
          {error && (
            <div role="alert" className="mb-5 rounded-lg bg-rose-50 border border-rose-100 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="form-stack">
            <Input
              label="Password reset code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={event => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
            />
            <Input
              label="New password"
              type="password"
              autoComplete="new-password"
              showPasswordToggle
              value={password}
              onChange={event => setPassword(event.target.value)}
            />
            <Input
              label="Confirm new password"
              type="password"
              autoComplete="new-password"
              showPasswordToggle
              value={confirmPassword}
              onChange={event => setConfirmPassword(event.target.value)}
            />
            <Button type="submit" loading={loading} className="w-full" size="lg">
              Create new password
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-neutral-500">
            <Link to="/forgot-password" className="font-semibold text-brand-600 hover:text-brand-700">Request a new code</Link>
            {' · '}
            <Link to="/login" className="font-semibold text-brand-600 hover:text-brand-700">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
