import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import AuthCard from '@/components/auth/AuthCard';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { setupOrganizerPassword } from '@/services/organizerService';
import { ShieldCheck } from 'lucide-react';

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
    <AuthCard title="Set up your organiser account" description={email ? `Create a permanent password for ${email}.` : 'Use the setup link from your invitation email.'} icon={ShieldCheck}>
      <div className="mb-4 flex justify-center">
        <span className="rounded-full border border-rose-100 bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-700">Organizer invitation</span>
      </div>
      {error && <p role="alert" className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-800">{error}</p>}
      <form className="space-y-4" onSubmit={handleSubmit}>
        <Input label="Email" type="email" value={email} disabled />
        <Input label="Password" type="password" autoComplete="new-password" showPasswordToggle value={password} onChange={event => setPassword(event.target.value)} required />
        <Input label="Confirm password" type="password" autoComplete="new-password" showPasswordToggle value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} required />
        <ul className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px] text-neutral-600">
          {PASSWORD_RULES.map(rule => <li key={rule.label}>{rule.label}</li>)}
        </ul>
        <Button type="submit" loading={saving} className="h-10 w-full !bg-gradient-to-r !from-rose-600 !to-orange-500 !text-white hover:!brightness-105">Activate account</Button>
      </form>
      <p className="mt-4 text-center text-[11px] text-neutral-500">This invitation link expires in 48 hours.</p>
      <p className="mt-4 text-center text-sm text-neutral-600"><Link to="/login" className="font-semibold !text-rose-600 hover:underline">Back to sign in</Link></p>
    </AuthCard>
  );
}
