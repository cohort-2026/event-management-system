import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { register } from '@/services/authService';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Button from '@/components/ui/Button';
import Textarea from '@/components/ui/Textarea';
import type { UserRole } from '@/types/user';
import axios from 'axios';

interface FieldErrors {
  firstname?: string;
  lastname?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  role?: string;
  businessName?: string;
  contactPerson?: string;
  contactEmail?: string;
  contactPhone?: string;
  supportingDocuments?: string;
}

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
  const [form, setForm] = useState({ firstname: '', lastname: '', email: '', password: '', confirmPassword: '', role: '' as UserRole | '' });
  const [vendorProfile, setVendorProfile] = useState({
    businessName: '',
    businessDescription: '',
    businessRegistrationNumber: '',
    contactPerson: '',
    contactEmail: '',
    contactPhone: '',
    productsServices: '',
  });
  const [supportingDocuments, setSupportingDocuments] = useState<File[]>([]);
  const [errors, setErrors]           = useState<FieldErrors>({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading]         = useState(false);

  const set = (field: keyof typeof form) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      setForm(current => ({ ...current, [field]: event.target.value }));
      setErrors(current => ({ ...current, [field]: undefined }));
      setServerError('');
    };

  const setVendorField = (field: keyof typeof vendorProfile) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setVendorProfile(current => ({ ...current, [field]: event.target.value }));

  const selectRole = (role: UserRole) => {
    setForm(current => ({ ...current, role }));
    setErrors(current => ({ ...current, role: undefined }));
    if (role === 'VENDOR') {
      setVendorProfile(current => ({
        ...current,
        contactPerson: current.contactPerson || `${form.firstname} ${form.lastname}`.trim(),
        contactEmail: current.contactEmail || form.email,
      }));
    }
  };

  const handleSupportingDocuments = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    const invalidFile = files.find(file => file.type !== 'application/pdf' || !file.name.toLowerCase().endsWith('.pdf'));
    if (files.length > 10) {
      setErrors(current => ({ ...current, supportingDocuments: 'Upload no more than 10 PDF documents.' }));
    } else if (invalidFile) {
      setErrors(current => ({ ...current, supportingDocuments: 'Choose PDF documents only.' }));
    } else if (files.some(file => file.size > 10 * 1024 * 1024)) {
      setErrors(current => ({ ...current, supportingDocuments: 'Each PDF must be 10 MB or smaller.' }));
    } else {
      setSupportingDocuments(files);
      setErrors(current => ({ ...current, supportingDocuments: undefined }));
    }
    event.target.value = '';
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
    if (form.role === 'VENDOR') {
      if (vendorProfile.businessName.trim().length < 2) next.businessName = 'Enter a business name';
      if (vendorProfile.contactPerson.trim().length < 2) next.contactPerson = 'Enter a contact person';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(vendorProfile.contactEmail.trim())) next.contactEmail = 'Enter a valid business email address';
      if (!/^\+?[0-9\s().-]{7,30}$/.test(vendorProfile.contactPhone.trim()) || vendorProfile.contactPhone.replace(/\D/g, '').length < 7) {
        next.contactPhone = 'Enter a valid phone number';
      }
      if (supportingDocuments.length === 0) next.supportingDocuments = 'Upload at least one supporting PDF.';
    }
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
        ...(form.role === 'VENDOR' ? {
          vendorProfile: {
            ...vendorProfile,
            businessName: vendorProfile.businessName.trim(),
            businessDescription: vendorProfile.businessDescription.trim(),
            businessRegistrationNumber: vendorProfile.businessRegistrationNumber.trim(),
            contactPerson: vendorProfile.contactPerson.trim(),
            contactEmail: vendorProfile.contactEmail.trim(),
            contactPhone: vendorProfile.contactPhone.trim(),
            productsServices: vendorProfile.productsServices.split(/[\n,]/).map(item => item.trim()).filter(Boolean),
          },
          supportingDocuments,
        } : {}),
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
              <Input label="First name" autoComplete="given-name" maxLength={80} required
                value={form.firstname} onChange={set('firstname')} error={errors.firstname} placeholder='e.g Solomon'/>
              <Input label="Last name" autoComplete="family-name" maxLength={80} required
                value={form.lastname} onChange={set('lastname')} error={errors.lastname} placeholder='e.g Khoza'/>
            </div>
            <Input label="Email address" type="email" autoComplete="email" maxLength={254} required
              value={form.email} onChange={set('email')} error={errors.email} placeholder='example@gmail.com' />
            <Input label="Password" type="password" autoComplete="new-password" showPasswordToggle maxLength={72} required
              value={form.password} onChange={handlePasswordChange} error={errors.password} placeholder="••••••••" />
            <div className="-mt-1 grid grid-cols-2 gap-x-3 gap-y-1 text-xs" aria-live="polite">
              {PASSWORD_RULES.map(rule => {
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
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-neutral-700">I am a…</label>
              <div className="grid grid-cols-2 gap-2">
                {ROLES.map(r => (
                  <label
                    key={r.value}
                    type="button"
                    onClick={() => selectRole(r.value)}
                    className={`px-3 py-2.5 rounded-lg border text-xs font-semibold transition-all duration-150 text-center
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
                    <span className={`block rounded-lg border px-3 py-2.5 text-center text-xs font-semibold transition-all duration-150 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-brand-600
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

            {form.role === 'ORGANIZER' && (
              <section aria-labelledby="organizer-details-heading" className="space-y-4 rounded-lg border border-brand-100 bg-brand-50/50 p-4">
                <div>
                  <h2 id="organizer-details-heading" className="text-sm font-bold text-neutral-900">Organizer details</h2>
                  <p className="mt-1 text-xs text-neutral-600">These details identify your organization on the events you manage.</p>
                </div>
                <Input
                  label="Organization name"
                  autoComplete="organization"
                  maxLength={120}
                  required
                  value={form.organizationName}
                  onChange={set('organizationName')}
                  error={errors.organizationName}
                  helperText="Required so attendees know who is hosting your events."
                />
                <Input
                  label="Phone number (optional)"
                  type="tel"
                  autoComplete="tel"
                  maxLength={30}
                  value={form.phone}
                  onChange={set('phone')}
                  error={errors.phone}
                  helperText="A contact number for questions about your events."
                />
                <Textarea
                  label="Organization description (optional)"
                  maxLength={500}
                  value={form.organizationDescription}
                  onChange={set('organizationDescription')}
                  error={errors.organizationDescription}
                  helperText="A short introduction that can help attendees understand your organization."
                />
                <p className="text-xs text-neutral-600">
                  Verify your email to sign in. An admin must approve your completed profile before you can create events.
                </p>
              </section>
            )}

            {form.role === 'VENDOR' && (
              <section aria-labelledby="vendor-profile-heading" className="space-y-4 rounded-lg border border-neutral-200 bg-white p-4">
                <div>
                  <h2 id="vendor-profile-heading" className="text-base font-bold text-neutral-900">Business profile</h2>
                  <p className="mt-1 text-xs text-neutral-500">Add the details vendors need to apply for event stands.</p>
                </div>
                <Input label="Business or trading name" value={vendorProfile.businessName} onChange={setVendorField('businessName')} required maxLength={120} error={errors.businessName} />
                <Input label="Business registration number" value={vendorProfile.businessRegistrationNumber} onChange={setVendorField('businessRegistrationNumber')} maxLength={100} />
                <Textarea label="Business description" value={vendorProfile.businessDescription} onChange={setVendorField('businessDescription')} maxLength={2000} />
                <Input label="Contact person" value={vendorProfile.contactPerson} onChange={setVendorField('contactPerson')} required maxLength={120} error={errors.contactPerson} />
                <Input label="Business email address" type="email" value={vendorProfile.contactEmail} onChange={setVendorField('contactEmail')} required maxLength={254} error={errors.contactEmail} />
                <Input label="Business phone number" type="tel" value={vendorProfile.contactPhone} onChange={setVendorField('contactPhone')} required maxLength={30} error={errors.contactPhone} />
                <Textarea label="Products or services offered" value={vendorProfile.productsServices} onChange={setVendorField('productsServices')} maxLength={2000} helperText="Separate items with commas or new lines." />
                <Input
                  label="Supporting documents (PDF)"
                  type="file"
                  accept=".pdf,application/pdf"
                  multiple
                  required
                  onChange={handleSupportingDocuments}
                  error={errors.supportingDocuments}
                  helperText={supportingDocuments.length ? `${supportingDocuments.length} PDF${supportingDocuments.length === 1 ? '' : 's'} selected · Up to 10 files, 10 MB each.` : 'Upload at least one PDF, such as a business registration certificate.'}
                />
                {supportingDocuments.length > 0 && (
                  <ul aria-label="Selected supporting documents" className="-mt-2 divide-y divide-neutral-100 rounded-md border border-neutral-200 px-3">
                    {supportingDocuments.map(file => <li key={`${file.name}-${file.lastModified}`} className="truncate py-2 text-xs text-neutral-600">{file.name}</li>)}
                  </ul>
                )}
              </section>
            )}

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
