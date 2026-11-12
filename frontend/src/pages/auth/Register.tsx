import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { register } from '@/services/authService';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import type { UserRole } from '@/types/user';
import axios from 'axios';

interface FieldErrors {
  firstname?: string;
  lastname?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  role?: string;
}

type RegistrationRole = Extract<UserRole, 'ATTENDEE' | 'VENDOR' | 'ORGANIZER'>;

const ROLES: { value: RegistrationRole; label: string; desc: string }[] = [
  { value: 'ATTENDEE',  label: 'Attendee',  desc: 'Browse and register for events' },
  { value: 'ORGANIZER', label: 'Organizer', desc: 'Create and manage events' },
  { value: 'VENDOR',    label: 'Vendor',    desc: 'Apply for vendor stands' },
];

const PASSWORD_RULES = [
  { label: 'At least 8 characters', test: (value: string) => value.length >= 8 },
  { label: 'One uppercase letter', test: (value: string) => /[A-Z]/.test(value) },
  { label: 'One lowercase letter', test: (value: string) => /[a-z]/.test(value) },
  { label: 'One number', test: (value: string) => /\d/.test(value) },
  { label: 'One special character', test: (value: string) => /[^A-Za-z0-9]/.test(value) },
  { label: 'No more than 72 UTF-8 bytes', test: (value: string) => new TextEncoder().encode(value).length <= 72 },
];

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    firstname: '',
    lastname: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: '' as UserRole | '',
  });
  const [errors, setErrors]           = useState<FieldErrors>({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading]         = useState(false);

  const set = (field: keyof typeof form) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      setForm(current => ({ ...current, [field]: event.target.value }));
      setErrors(current => ({ ...current, [field]: undefined }));
      setServerError('');
    };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const password = e.target.value;
    const passwordIsValid = PASSWORD_RULES.every(rule => rule.test(password));
    setForm(f => ({ ...f, password }));
    setErrors(current => ({
      ...current,
      password: password && !passwordIsValid ? 'Password does not meet all requirements' : undefined,
      confirmPassword: form.confirmPassword && password !== form.confirmPassword ? 'Passwords do not match' : undefined,
    }));
  };

  const handleConfirmPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const confirmPassword = e.target.value;
    setForm(f => ({ ...f, confirmPassword }));
    setErrors(current => ({
      ...current,
      confirmPassword: confirmPassword && confirmPassword !== form.password ? 'Passwords do not match' : undefined,
    }));
  };

  const validate = (): boolean => {
    const next: FieldErrors = {};
    if (!form.firstname.trim()) next.firstname = 'First name is required';
    else if (form.firstname.trim().length > 80) next.firstname = 'Use 80 characters or fewer';
    if (!form.lastname.trim()) next.lastname = 'Last name is required';
    else if (form.lastname.trim().length > 80) next.lastname = 'Use 80 characters or fewer';
    if (!form.email.trim()) next.email = 'Email is required';
    else if (form.email.trim().length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      next.email = 'Enter a valid email address (254 characters or fewer)';
    }
    if (!form.password) next.password = 'Password is required';
    else if (!PASSWORD_RULES.every(rule => rule.test(form.password))) next.password = 'Password does not meet all requirements';
    if (!form.confirmPassword) next.confirmPassword = 'Please confirm your password';
    else if (form.password !== form.confirmPassword) next.confirmPassword = 'Passwords do not match';
    if (!form.role)              next.role      = 'Please select a role';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setServerError('');
    if (!validate()) return;
    const role = form.role;
    if (!role) return;
    setLoading(true);
    try {
      await register({
        firstname: form.firstname,
        lastname: form.lastname,
        email: form.email,
        password: form.password,
        role: form.role as UserRole,
      });
      navigate('/verify-email', { replace: true, state: { email: form.email } });
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const msg = err.response?.data?.message;
        setServerError(err.response?.status === 409 ? 'An account with this email already exists.' : (msg ?? 'Something went wrong.'));
      } else {
        setServerError('Your account could not be created. Please try again.');
      }
    } finally { setLoading(false); }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-100 px-4 py-6 sm:px-6">
      <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl shadow-neutral-900/5 sm:p-6">
        <Link to="/" className="mb-4 flex flex-col items-center gap-1.5">
          <img src="/dream-event-logo.jpg" alt="Dream Event Management" className="h-14 w-14 rounded-xl object-cover shadow-sm" />
          <span className="font-extrabold text-neutral-900 tracking-tight">EventMS</span>
        </Link>

          <h1 className="text-center text-xl font-black text-neutral-900 tracking-tight">Create your account</h1>
          <p className="text-center text-sm text-neutral-500 mt-1 mb-5">Get started with EventMS today.</p>

          {serverError && (
            <div className="mb-4 rounded-lg bg-rose-50 border border-rose-100 px-3 py-2.5 text-sm text-rose-700">
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="form-stack !gap-3">
            <div className="grid grid-cols-2 gap-2">
              <Input label="First name" autoComplete="given-name" maxLength={80} required
                value={form.firstname} onChange={set('firstname')} error={errors.firstname} placeholder='e.g Solomon'/>
              <Input label="Last name" autoComplete="family-name" maxLength={80} required
                value={form.lastname} onChange={set('lastname')} error={errors.lastname} placeholder='e.g Khoza'/>
            </div>
            <Input label="Email address" type="email" autoComplete="email" maxLength={254} required
              value={form.email} onChange={set('email')} error={errors.email} placeholder='example@gmail.com' />
            <Input label="Password" type="password" autoComplete="new-password" showPasswordToggle maxLength={72} required
              value={form.password} onChange={handlePasswordChange} error={errors.password} placeholder="••••••••" />
            <div className="-mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]" aria-live="polite">
              {PASSWORD_RULES.filter(rule => rule.label !== 'No more than 72 UTF-8 bytes').map(rule => {
                const passed = rule.test(form.password);
                return (
                  <span key={rule.label} className={passed ? 'text-emerald-600' : 'text-neutral-400'}>
                    <span className="mr-1 font-semibold">{passed ? '✓' : '○'}</span>{rule.label}
                  </span>
                );
              })}
            </div>
            <Input label="Confirm password" type="password" autoComplete="new-password" placeholder="••••••••" maxLength={72} required
              showPasswordToggle value={form.confirmPassword} onChange={handleConfirmPasswordChange} error={errors.confirmPassword}
              helperText={form.confirmPassword && form.password === form.confirmPassword ? 'Passwords match' : undefined} />

            {/* Role selector */}
            <fieldset className="flex flex-col gap-1">
              <legend className="text-sm font-medium text-neutral-700">I am a…</legend>
              <div className="grid grid-cols-3 gap-1.5">
                {ROLES.map(r => (
                  <label
                    key={r.value}
                    className={`rounded-lg border px-2 py-1.5 text-xs font-semibold text-center transition-all duration-150
                      ${form.role === r.value
                        ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
                        : 'bg-white text-neutral-600 border-neutral-200 hover:border-brand-300 hover:text-brand-600'}`}
                  >
                    <input
                      type="radio"
                      name="role"
                      value={r.value}
                      checked={form.role === r.value}
                      required={r.value === ROLES[0].value}
                      onChange={() => {
                        setForm(current => ({ ...current, role: r.value }));
                        setErrors(current => ({ ...current, role: undefined }));
                        setServerError('');
                      }}
                      className="peer sr-only"
                    />
                    <span className={`block rounded-lg border px-2 py-1.5 text-center text-xs font-semibold transition-all duration-150 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-brand-600
                      ${form.role === r.value
                        ? 'border-brand-600 bg-brand-600 text-white shadow-sm'
                        : 'border-neutral-200 bg-white text-neutral-600 hover:border-brand-300 hover:text-brand-600'}`}>
                      {r.label}
                    </span>
                  </label>
                ))}
              </div>
              {errors.role && <p id="registration-role-error" role="alert" className="text-xs font-medium text-rose-600">{errors.role}</p>}
            </fieldset>

            <Button type="submit" loading={loading} className="w-full" size="lg">
              Create account
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-neutral-500">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-brand-600 hover:text-brand-700">Sign in</Link>
          </p>
      </div>
    </main>
  );
}
