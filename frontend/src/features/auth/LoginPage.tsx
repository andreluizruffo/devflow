import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Link, useLocation, useNavigate } from 'react-router';
import { Button } from '../../components/Button';
import { FormError } from '../../components/FormError';
import { TextField } from '../../components/TextField';
import { getErrorMessage } from '../../lib/api';
import { loginSchema, type LoginValues } from './auth-schemas';
import { AuthLayout } from './AuthLayout';
import { useAuth } from './use-auth';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  // If ProtectedRoute sent the user here, go back to the page they wanted.
  const from = (location.state as { from?: string } | null)?.from ?? '/';

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });

  const mutation = useMutation({
    mutationFn: login,
    onSuccess: () => navigate(from, { replace: true }),
  });

  return (
    <AuthLayout
      title="Log in to DevFlow"
      subtitle="Welcome back. Enter your details to continue."
      footer={
        <>
          No account yet?{' '}
          <Link to="/register" className="font-medium text-indigo-400 hover:text-indigo-300">
            Create one
          </Link>
        </>
      }
    >
      <form
        onSubmit={handleSubmit((values) => mutation.mutate(values))}
        noValidate
        className="space-y-4"
      >
        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...register('email')}
        />
        <TextField
          label="Password"
          type="password"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register('password')}
        />
        {mutation.isError && <FormError message={getErrorMessage(mutation.error)} />}
        <Button type="submit" loading={mutation.isPending} className="w-full">
          Log in
        </Button>
      </form>
    </AuthLayout>
  );
}
