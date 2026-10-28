import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { useAuth } from '@/context/AuthContext';
import { changePassword } from '@/services/authService';

const PERMANENT_PASSWORD_RULES = [
  { label: 'At least 8 characters', test: (value: string) => value.length >= 8 },
  { label: 'One uppercase letter', test: (value: string) => /[A-Z]/.test(value) },
  { label: 'One lowercase letter', test: (value: string) => /[a-z]/.test(value) },
  { label: 'One number', test: (value: string) => /\d/.test(value) },
  { label: 'One special character', test: (value: string) => /[^A-Za-z0-9]/.test(value) },
  { label: 'No more than 72 UTF-8 bytes', test: (value: string) => new TextEncoder().encode(value).length <= 72 },
];

export default function ChangePassword() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    if (newPassword.length < 8 || new TextEncoder().encode(newPassword).length > 72) {
      setError('Your new password must be between 8 and 72 UTF-8 bytes.');
      return;
    }
    if (user?.mustChangePassword && !PERMANENT_PASSWORD_RULES.every(rule => rule.test(newPassword))) {
      setError('Your permanent password must meet all the listed requirements.');
      return;
    }
    if (newPassword !== confirmation) {
      setError('The new passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const response = await changePassword({ currentPassword, newPassword });
      setUser(response.data.data);
      navigate('/', { replace: true });
    } catch (err) {
      setError(axios.isAxiosError(err)
        ? (err.response?.data?.message ?? 'Your password could not be changed.')
        : 'Your password could not be changed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-neutral-50 px-6">
      <section className="w-full max-w-md bg-white rounded-2xl border border-neutral-200 shadow-sm p-8">
        <h1 className="text-2xl font-bold text-neutral-900">Set a new password</h1>
        <p className="text-sm text-neutral-500 mt-2 mb-6">
          {user?.mustChangePassword
            ? 'Replace your temporary password with a permanent password before continuing.'
            : 'Change your password to keep your account secure.'}
        </p>
        {error && <p role="alert" className="mb-4 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
        <form onSubmit={submit} className="flex flex-col gap-4">
          <Input label="Current password" type="password" autoComplete="current-password" value={currentPassword} onChange={event => setCurrentPassword(event.target.value)} required />
          <Input label="New password" type="password" autoComplete="new-password" value={newPassword} onChange={event => setNewPassword(event.target.value)} required minLength={8} />
          <Input label="Confirm new password" type="password" autoComplete="new-password" value={confirmation} onChange={event => setConfirmation(event.target.value)} required minLength={8} />
          {user?.mustChangePassword && (
            <ul className="list-disc space-y-1 pl-5 text-xs text-neutral-500">
              {PERMANENT_PASSWORD_RULES.map(rule => <li key={rule.label}>{rule.label}</li>)}
            </ul>
          )}
          <Button type="submit" loading={loading} className="w-full">Change password</Button>
        </form>
      </section>
    </main>
  );
}
