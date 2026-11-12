import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { setupOrganizerPassword } from '@/services/organizerService';

const PASSWORD_RULES = [
  { label: 'At least 8 characters', test: (value: string) => value.length >= 8 },
  { label: 'One uppercase letter', test: (value: string) => /[A-Z]/.test(value) },
  { label: 'One lowercase letter', test: (value: string) => /[a-z]/.test(value) },
  { label: 'One number', test: (value: string) => /\d/.test(value) },
  { label: 'One special character', test: (value: string) => /[^A-Za-z0-9]/.test(value) },
  { label: 'No more than 72 UTF-8 bytes', test: (value: string) => new TextEncoder().encode(value).length <= 72 },
];

export default function SetupPassword() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const email = searchParams.get('email') ?? '';
  const token = new URLSearchParams(location.hash.slice(1)).get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');

    if (!email || !token) {
      setError('This password setup link is incomplete. Ask your administrator for a new invitation.');
      return;
    }
    if (!PASSWORD_RULES.every(rule => rule.test(password))) {
      setError('Choose a password that meets all the listed requirements.');
      return;
    }
    if (password !== confirmPassword) {
      setError('The passwords do not match.');
      return;
    }

    setSaving(true);
    try {
      const response = await setupOrganizerPassword({ email, token, password });
      navigate('/login', { replace: true, state: { passwordResetSuccess: true, passwordSetupMessage: response.data.message } });
    } catch (err) {
      setError(axios.isAxiosError(err)
        ? (err.response?.data?.message ?? 'Your password could not be set. Please try again.')
        : 'Your password could not be set. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f5f7fb] px-5 py-10 sm:px-8">
      <section className="w-full max-w-lg rounded-3xl border border-slate-200/80 bg-white p-7 shadow-xl shadow-slate-900/[0.06] sm:p-9">
        <Link to="/" className="mb-8 flex items-center gap-2.5 text-sm font-bold text-neutral-900">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </span>
          EventMS
        </Link>
        <span className="mb-3 block text-xs font-bold uppercase tracking-[0.16em] text-brand-700">Finish setting up</span>
        <h1 className="text-3xl font-black tracking-tight text-slate-950">Set your organizer password</h1>
        <p className="mt-2 text-sm leading-6 text-neutral-600">
          {email ? `Create a permanent password for ${email}.` : 'Use the setup link from your invitation email.'}
        </p>

        {error && <p role="alert" className="mt-5 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <Input
            label="New password"
            type="password"
            autoComplete="new-password"
            showPasswordToggle
            value={password}
            onChange={event => setPassword(event.target.value)}
            required
          />
          <Input
            label="Confirm password"
            type="password"
            autoComplete="new-password"
            showPasswordToggle
            value={confirmPassword}
            onChange={event => setConfirmPassword(event.target.value)}
            required
          />
          <ul className="list-disc space-y-1 pl-5 text-xs text-neutral-500">
            {PASSWORD_RULES.map(rule => <li key={rule.label}>{rule.label}</li>)}
          </ul>
          <Button type="submit" loading={saving} className="w-full">Set password</Button>
        </form>
      </section>
    </div>
  );
}
