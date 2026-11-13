import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import AuthCard from '@/components/auth/AuthCard';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { useAuth } from '@/context/AuthContext';
import { changePassword } from '@/services/authService';
import { LockKeyhole } from 'lucide-react';

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
    <AuthCard title={user?.mustChangePassword ? 'Choose a new password' : 'Update your password'} description={user?.mustChangePassword ? 'Replace your temporary password to continue.' : 'Change your password to keep your account secure.'} icon={LockKeyhole}>
      {user?.mustChangePassword && <div role="status" className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs leading-relaxed text-amber-900">You signed in with a temporary password. Choose your own to continue.</div>}
      {error && <p role="alert" className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-800">{error}</p>}
      <form onSubmit={submit} className="space-y-4">
        <Input label="Current password" type="password" autoComplete="current-password" value={currentPassword} onChange={event => setCurrentPassword(event.target.value)} required />
        <Input label="New password" type="password" autoComplete="new-password" value={newPassword} onChange={event => setNewPassword(event.target.value)} required minLength={8} />
        <Input label="Confirm new password" type="password" autoComplete="new-password" value={confirmation} onChange={event => setConfirmation(event.target.value)} required minLength={8} />
        {user?.mustChangePassword && <ul className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px] text-neutral-600">{PERMANENT_PASSWORD_RULES.map(rule => <li key={rule.label}>{rule.label}</li>)}</ul>}
        <Button type="submit" loading={loading} className="h-10 w-full !bg-neutral-950 !text-white hover:!bg-neutral-800">Update password</Button>
      </form>
    </AuthCard>
  );
}
