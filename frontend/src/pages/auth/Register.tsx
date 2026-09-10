import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { register } from '@/services/authService';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import type { UserRole } from '@/types/user';
import axios from 'axios';

interface FieldErrors { firstname?: string; lastname?: string; email?: string; password?: string; role?: string; }

const ROLES: { value: UserRole; label: string; desc: string }[] = [
  { value: 'ATTENDEE',  label: 'Attendee',  desc: 'Browse and register for events' },
  // { value: 'ORGANIZER', label: 'Organizer', desc: 'Create and manage events' },
  { value: 'VENDOR',    label: 'Vendor',    desc: 'Apply for vendor stands' },
];

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ firstname: '', lastname: '', email: '', password: '', role: '' as UserRole | '' });
  const [errors, setErrors]           = useState<FieldErrors>({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading]         = useState(false);

  const set = (field: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [field]: e.target.value }));

  const validate = (): boolean => {
    const next: FieldErrors = {};
    if (!form.firstname.trim())  next.firstname = 'First name is required';
    if (!form.lastname.trim())   next.lastname  = 'Last name is required';
    if (!form.email)             next.email     = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) next.email = 'Enter a valid email address';
    if (!form.password)          next.password  = 'Password is required';
    else if (form.password.length < 8) next.password = 'Minimum 8 characters';
    if (!form.role)              next.role      = 'Please select a role';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setServerError('');
    if (!validate()) return;
    setLoading(true);
    try {
      await register({ firstname: form.firstname, lastname: form.lastname, email: form.email, password: form.password, role: form.role as UserRole });
      navigate('/login', { replace: true, state: { registrationSuccess: true, email: form.email } });
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const msg = err.response?.data?.message;
        setServerError(err.response?.status === 409 ? 'An account with this email already exists.' : (msg ?? 'Something went wrong.'));
      }
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-[45%] bg-neutral-800 flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-brand-600 rounded-full opacity-10 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent-500 rounded-full opacity-8 blur-3xl" />
        <Link to="/" className="relative flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </span>
          <span className="font-extrabold text-white text-lg tracking-tight">EventMS</span>
        </Link>
        <div className="relative">
          <h2 className="text-3xl font-black text-white leading-tight tracking-tight">Join thousands of event professionals.</h2>
          <p className="text-neutral-400 mt-4 leading-relaxed text-sm">
            Whether you're organising, attending or vending — EventMS gives you the tools to make every event a success.
          </p>
          <div className="mt-8 grid grid-cols-1 gap-3">
            {ROLES.map(r => (
              <div key={r.value} className="flex items-center gap-3 bg-white/5 border border-white/8 rounded-xl px-4 py-3">
                <div className="w-8 h-8 rounded-lg bg-brand-600/20 border border-brand-500/20 flex items-center justify-center shrink-0">
                  <span className="text-xs font-black text-brand-400">{r.label.charAt(0)}</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{r.label}</p>
                  <p className="text-xs text-neutral-500">{r.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <p className="relative text-xs text-neutral-600">© {new Date().getFullYear()} EventMS</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center bg-neutral-200 px-6 py-12">
        <div className="w-full max-w-sm">
          <Link to="/" className="lg:hidden flex items-center gap-2 mb-8">
            <span className="w-7 h-7 rounded-lg bg-brand-600 flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </span>
            <span className="font-extrabold text-neutral-900 tracking-tight">EventMS</span>
          </Link>

          <h1 className="text-2xl font-black text-neutral-900 tracking-tight">Create your account</h1>
          <p className="text-sm text-neutral-500 mt-1 mb-7">Get started with EventMS today.</p>

          {serverError && (
            <div className="mb-5 rounded-lg bg-rose-50 border border-rose-100 px-4 py-3 text-sm text-rose-700">
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="form-stack">
            <div className="grid grid-cols-2 gap-3">
              <Input label="First name" autoComplete="given-name"
                value={form.firstname} onChange={set('firstname')} error={errors.firstname} />
              <Input label="Last name" autoComplete="family-name"
                value={form.lastname} onChange={set('lastname')} error={errors.lastname} />
            </div>
            <Input label="Email address" type="email" autoComplete="email"
              value={form.email} onChange={set('email')} error={errors.email} />
            <Input label="Password" type="password" autoComplete="new-password"
              value={form.password} onChange={set('password')} error={errors.password} helperText="Minimum 8 characters" />

            {/* Role selector */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-neutral-700">I am a…</label>
              <div className="grid grid-cols-3 gap-2">
                {ROLES.map(r => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, role: r.value }))}
                    className={`px-3 py-2.5 rounded-lg border text-xs font-semibold transition-all duration-150 text-center
                      ${form.role === r.value
                        ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
                        : 'bg-white text-neutral-600 border-neutral-200 hover:border-brand-300 hover:text-brand-600'}`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
              {errors.role && <p className="text-xs text-rose-600 font-medium">{errors.role}</p>}
            </div>

            <Button type="submit" loading={loading} className="w-full" size="lg">
              Create account
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-neutral-500">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-brand-600 hover:text-brand-700">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
