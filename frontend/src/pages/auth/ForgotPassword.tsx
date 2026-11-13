import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import AuthCard from '@/components/auth/AuthCard';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { requestPasswordReset } from '@/services/authService';
import { Mail } from 'lucide-react';

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
    <AuthCard title="Forgot your password?" description="We’ll email you a 6-digit code." icon={Mail}>
      {error && <div role="alert" className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-800">{error}</div>}
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <Input label="Email" type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="you@example.com" />
        <Button type="submit" loading={loading} className="h-10 w-full !bg-neutral-950 !text-white hover:!bg-neutral-800" size="lg">
          Send code
        </Button>
      </form>
      <p className="mt-5 text-center text-sm text-neutral-600">
        Remember your password? <Link to="/login" className="font-semibold !text-rose-600 hover:underline">Back to sign in</Link>
      </p>
    </AuthCard>
  );
}
