import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CalendarDays } from 'lucide-react';
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
  { value: 'ATTENDEE',  label: 'Attendee',  desc: 'Book events and get QR tickets. Ready after you verify your email.' },
  { value: 'ORGANIZER', label: 'Organiser', desc: 'Host events. An admin approves your organisation profile first.' },
  { value: 'VENDOR',    label: 'Vendor',    desc: 'Apply for stands. Submit your business profile for approval.' },
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
    <form onSubmit={handleSubmit} noValidate className="min-h-screen bg-white lg:grid lg:grid-cols-[0.9fr_1.1fr]">
      <aside className="flex flex-col border-b border-neutral-200 bg-[#fafafa] p-5 sm:p-8 lg:min-h-screen lg:border-b-0 lg:border-r lg:px-10 lg:py-8">
        <Link to="/" className="flex items-center gap-2 !text-neutral-950" aria-label="EventMS home">
          <span className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-rose-500 to-orange-500 text-white"><CalendarDays aria-hidden="true" className="size-4" /></span>
          <span className="text-sm font-extrabold tracking-tight">EventMS</span>
        </Link>
        <h1 className="mb-4 mt-6 text-xl font-extrabold tracking-tight text-neutral-950 lg:mt-12">Choose how you&apos;ll use EventMS.</h1>

        <fieldset className="flex flex-col gap-2.5">
          <legend className="sr-only">Account type</legend>
          {ROLES.map(role => (
            <label key={role.value} className={`relative cursor-pointer rounded-lg border p-3.5 transition-colors sm:p-4 ${form.role === role.value ? 'border-rose-500 bg-rose-50/70 ring-1 ring-rose-500' : 'border-neutral-200 bg-white hover:border-neutral-400'}`}>
              <input type="radio" name="role" value={role.value} checked={form.role === role.value} required={role.value === ROLES[0].value} onChange={() => {
                setForm(current => ({ ...current, role: role.value }));
                setErrors(current => ({ ...current, role: undefined }));
                setServerError('');
              }} className="peer sr-only" />
              <span className="block pr-6 text-sm font-bold text-neutral-950">{role.label}</span>
              <span className="mt-1 block max-w-xl text-xs leading-relaxed text-neutral-600">{role.desc}</span>
              <span aria-hidden="true" className={`absolute right-3 top-3 flex size-4 items-center justify-center rounded-full border ${form.role === role.value ? 'border-rose-600 bg-rose-600 text-white' : 'border-neutral-300 bg-white'} peer-focus-visible:ring-2 peer-focus-visible:ring-rose-500 peer-focus-visible:ring-offset-2`}>{form.role === role.value ? '✓' : ''}</span>
            </label>
          ))}
          {errors.role && <p id="registration-role-error" role="alert" className="text-xs font-medium text-rose-600">{errors.role}</p>}
        </fieldset>

        <p className="mt-5 text-xs leading-relaxed text-neutral-500 lg:mt-auto lg:pt-8">Your role determines which event tools are available after your email is verified.</p>
      </aside>

      <section className="flex items-center justify-center px-5 py-8 sm:px-8 lg:px-10 lg:py-12">
        <div className="w-full max-w-[500px]">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-extrabold tracking-tight text-neutral-950">Create your account</h2>
              <p className="mt-1 text-sm text-neutral-600">Choose how you&apos;ll use EventMS.</p>
            </div>
            <p className="hidden shrink-0 text-xs text-neutral-600 sm:block">Already registered? <Link to="/login" className="font-semibold !text-rose-600 hover:underline">Sign in</Link></p>
          </div>

          {serverError && <div role="alert" className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-800">{serverError}</div>}

          <div className="space-y-3.5">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Input label="First name" autoComplete="given-name" maxLength={80} required value={form.firstname} onChange={set('firstname')} error={errors.firstname} placeholder="e.g. Solomon" />
              <Input label="Last name" autoComplete="family-name" maxLength={80} required value={form.lastname} onChange={set('lastname')} error={errors.lastname} placeholder="e.g. Khoza" />
            </div>
            <Input label="Email" type="email" autoComplete="email" maxLength={254} required value={form.email} onChange={set('email')} error={errors.email} placeholder="you@example.com" />
            <Input label="Password" type="password" autoComplete="new-password" showPasswordToggle maxLength={72} required value={form.password} onChange={handlePasswordChange} error={errors.password} placeholder="Create a password" />
            <div className="-mt-1 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]" aria-live="polite">
              {PASSWORD_RULES.map(rule => {
                const passed = rule.test(form.password);
                return <span key={rule.label} className={passed ? 'font-medium text-emerald-700' : 'text-neutral-500'}>{passed ? '✓' : '○'} {rule.label}</span>;
              })}
            </div>
            <Input label="Confirm password" type="password" autoComplete="new-password" showPasswordToggle maxLength={72} required value={form.confirmPassword} onChange={handleConfirmPasswordChange} error={errors.confirmPassword} helperText={form.confirmPassword && form.password === form.confirmPassword ? 'Passwords match' : undefined} />
          </div>

          <p className="mt-3 text-xs text-neutral-500">A verification code will be sent to your email.</p>
          <Button type="submit" loading={loading} className="mt-4 h-10 w-full !bg-gradient-to-r !from-rose-600 !to-orange-500 !text-white hover:!brightness-105" size="lg">Create account</Button>
          <p className="mt-5 text-center text-sm text-neutral-600 sm:hidden">Already registered? <Link to="/login" className="font-semibold !text-rose-600 hover:underline">Sign in</Link></p>
        </div>
      </section>
    </form>
  );
}
