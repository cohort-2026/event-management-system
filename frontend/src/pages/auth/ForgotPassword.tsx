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
    <main className="min-h-screen flex items-center justify-center bg-[linear-gradient(135deg,#fff1f2,#eef3f8)] px-4 py-12">
      <section className="w-full max-w-md rounded-3xl border border-rose-200 bg-white p-8 shadow-xl">
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-md">
          <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h1 className="mb-2 text-center text-3xl font-black text-neutral-900">Forgot your password?</h1>
        <p className="mb-7 text-center text-sm leading-relaxed text-neutral-500">
          Enter the email address linked to your account and we’ll send you a password reset code.
        </p>

        {error && (
          <div role="alert" className="mb-5 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
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
          <Button type="submit" loading={loading} className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 focus-visible:ring-blue-500" size="lg">
            Send reset code
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-neutral-500">
          Remember your password?{' '}
          <Link to="/login" className="font-semibold text-rose-700 hover:text-rose-800">Back to sign in</Link>
        </p>
      </section>
    </main>
  );
}
