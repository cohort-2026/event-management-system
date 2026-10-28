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
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4 py-12">
      <section className="w-full max-w-lg rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm">
        <Link to="/" className="text-sm font-bold text-brand-700">EventMS</Link>
        <h1 className="mt-6 text-2xl font-black text-neutral-900">Set your organizer password</h1>
        <p className="mt-2 text-sm text-neutral-600">
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
