import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { resetPassword } from '@/services/authService';

const PASSWORD_RULES = [
  { label: 'At least 8 characters', test: (value: string) => value.length >= 8 },
  { label: 'One lowercase letter', test: (value: string) => /[a-z]/.test(value) },
  { label: 'One uppercase letter', test: (value: string) => /[A-Z]/.test(value) },
  { label: 'One special character', test: (value: string) => /[^A-Za-z0-9]/.test(value) },
  { label: 'One number', test: (value: string) => /\d/.test(value) },
];

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
  const passwordsMismatch = password.length > 0 && password !== confirmPassword;
  const passwordsMatch = password.length > 0 && confirmPassword.length > 0 && password === confirmPassword;

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
    if (!PASSWORD_RULES.every(rule => rule.test(password))) {
      setError('Your password does not meet all requirements.');
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
    <main className="min-h-screen flex items-center justify-center bg-[linear-gradient(135deg,#fff1f2,#eef3f8)] px-4 py-12">
      <section className="w-full max-w-md rounded-3xl border border-rose-200 bg-white p-8 shadow-xl">
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-md">
          <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h1 className="mb-2 text-center text-3xl font-black text-neutral-900">Reset your password</h1>
        <p className="mb-7 text-center text-sm leading-relaxed text-neutral-500">
          Enter the six-digit code sent to <span className="font-semibold text-neutral-700">{email || 'your email'}</span>,
          then choose a new password with at least 8 characters.
        </p>

        {resetNotice && (
          <div role="status" className="mb-5 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {resetNotice}
          </div>
        )}
        {error && (
          <div role="alert" className="mb-5 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
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
            passwordrules="minlength: 8; required: lower; required: upper; required: special; required: digit;"
            showPasswordToggle
            value={password}
            error={passwordsMismatch ? 'Passwords do not match.' : undefined}
            onChange={event => {
              const nextPassword = event.target.value;
              setPassword(nextPassword);
              if (error === 'The passwords do not match.' && nextPassword === confirmPassword) setError('');
            }}
          />
          <ul aria-label="Password requirements" className="mt-2 space-y-1 text-xs text-neutral-500">
            {PASSWORD_RULES.map(rule => {
              const isMet = rule.test(password);
              return (
                <li key={rule.label} className={`flex items-center gap-2 ${isMet ? 'text-emerald-700' : ''}`}>
                  <span aria-hidden="true" className="w-3">{isMet ? '✓' : '•'}</span>
                  {rule.label}
                </li>
              );
            })}
          </ul>
          <Input
            label="Confirm new password"
            type="password"
            autoComplete="new-password"
            showPasswordToggle
            value={confirmPassword}
            error={passwordsMismatch ? 'Passwords do not match.' : undefined}
            helperText={passwordsMatch ? 'Passwords match.' : undefined}
            onChange={event => {
              setConfirmPassword(event.target.value);
              if (error === 'The passwords do not match.') setError('');
            }}
          />
          <Button type="submit" loading={loading} className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 focus-visible:ring-blue-500" size="lg">
            Create new password
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-neutral-500">
          <Link to="/forgot-password" className="font-semibold text-rose-700 hover:text-rose-800">Request a new code</Link>
          {' · '}
          <Link to="/login" className="font-semibold text-rose-700 hover:text-rose-800">Back to sign in</Link>
        </p>
      </section>
    </main>
  );
}
