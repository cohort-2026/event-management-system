import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { requestPasswordReset } from '@/services/authService';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      const response = await requestPasswordReset(email.trim());
      const resetUrl = new URLSearchParams({ email: email.trim() });
      navigate(`/reset-password?${resetUrl.toString()}`, {
        state: { resetNotice: response.data.message },
      });
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message ?? 'The reset code could not be sent. Please try again.');
      } else {
        setError('The reset code could not be sent. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-[45%] bg-neutral-800 flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-brand-600 rounded-full opacity-10 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent-500 rounded-full opacity-8 blur-3xl" />
        <Link to="/" className="relative flex items-center gap-2.5">
          <img src="/eventms-logo.avif" alt="" className="h-14 w-14 rounded-xl bg-white p-1.5 object-contain" />
          <span className="font-extrabold text-white text-lg tracking-tight">EventMS</span>
        </Link>
        <div className="relative">
          <h2 className="text-3xl font-black text-white leading-tight tracking-tight">
            Get back to planning great events.
          </h2>
          <p className="text-neutral-300 mt-4 leading-relaxed text-sm">
            Enter the email address linked to your account and we’ll send you a password reset code.
          </p>
          <div className="mt-8 flex flex-col gap-3">
            {['Secure account recovery', 'A one-time reset code', 'Quick access back to EventMS'].map(item => (
              <div key={item} className="flex items-center gap-3">
                <span className="w-5 h-5 rounded-full bg-brand-600/20 border border-brand-500/30 flex items-center justify-center shrink-0">
                  <svg className="w-3 h-3 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </span>
                <span className="text-sm text-neutral-300">{item}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="relative text-xs text-neutral-600">© {new Date().getFullYear()} EventMS</p>
      </div>

      <div className="flex-1 flex items-center justify-center bg-neutral-200 px-6 py-12">
        <div className="w-full max-w-sm">
          <Link to="/" className="lg:hidden flex items-center gap-2 mb-8">
            <img src="/eventms-logo.avif" alt="" className="h-12 w-12 rounded-xl bg-white p-1.5 object-contain" />
            <span className="font-extrabold text-neutral-900 tracking-tight">EventMS</span>
          </Link>

          <h1 className="text-2xl font-black text-neutral-900 tracking-tight">Forgot your password?</h1>
          <p className="text-sm text-neutral-500 mt-1 mb-7">
            Enter your account email and we’ll send you a password reset code.
          </p>

          {error && (
            <div role="alert" className="mb-5 rounded-lg bg-rose-50 border border-rose-100 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} noValidate className="form-stack">
            <Input
              label="Email address"
              type="email"
              autoComplete="email"
              value={email}
              onChange={event => setEmail(event.target.value)}
            />
            <Button type="submit" loading={loading} className="w-full" size="lg">
              Send OTP code
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-neutral-500">
            Remember your password?{' '}
            <Link to="/login" className="font-semibold text-brand-600 hover:text-brand-700">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
