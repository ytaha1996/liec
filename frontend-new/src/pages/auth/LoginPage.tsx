import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { GenericInput } from '@/components/inputs';
import { LoadingButton } from '@/components/feedback';
import { postJson } from '@/api/client';
import { parseApiError } from '@/api/parseApiError';
import { LoginUser } from '@/redux/user/userReducer';
import { useAppDispatch } from '@/redux/hooks';
import { usePageTitle } from '@/hooks/usePageTitle';
import { BRAND_TEAL } from '@/constants/statusColors';

interface LoginResponse {
  token: string;
  role: string;
  active: boolean;
  user: { email: string; active: boolean; username: string; mobileNumber: string };
}

export default function LoginPage() {
  usePageTitle('Sign in');
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [email, setEmail] = useState('admin@local');
  const [password, setPassword] = useState('Admin123!');
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    setSubmitting(true);
    try {
      const r = await postJson<LoginResponse>('/api/auth/login', { email, password });
      dispatch(
        LoginUser({
          token: r.token,
          active: r.active ?? true,
          role: r.role ?? '',
          isAuthenticated: true,
          user: r.user ?? { email, active: true, username: email, mobileNumber: '' },
        }),
      );
      toast.success('Logged in');
      navigate('/');
    } catch (e) {
      toast.error(parseApiError(e).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 px-4">
      <Card className="max-w-md w-full shadow-lg">
        <CardContent className="p-6 sm:p-8">
          <h1 className="text-2xl font-bold mb-6" style={{ color: BRAND_TEAL }}>
            Admin Login
          </h1>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
            className="flex flex-col gap-3"
          >
            <GenericInput
              name="email"
              title="Email"
              type="email"
              value={email}
              onChange={setEmail}
              disabled={submitting}
              required
            />
            <GenericInput
              name="password"
              title="Password"
              type="password"
              value={password}
              onChange={setPassword}
              disabled={submitting}
              required
            />
            <LoadingButton type="submit" loading={submitting} className="w-full mt-2 py-5">
              Login
            </LoadingButton>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
