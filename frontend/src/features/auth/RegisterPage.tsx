import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router';
import { Button } from '../../components/Button';
import { FormError } from '../../components/FormError';
import { TextField } from '../../components/TextField';
import { getErrorMessage } from '../../lib/api';
import { registerSchema, type RegisterValues } from './auth-schemas';
import { AuthLayout } from './AuthLayout';
import { useAuth } from './use-auth';

export function RegisterPage() {
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterValues>({ resolver: zodResolver(registerSchema) });

  const mutation = useMutation({
    mutationFn: signUp,
    onSuccess: () => navigate('/', { replace: true }),
  });

  return (
    <AuthLayout
      title="Create your account"
      subtitle="You will be the owner of a new organization."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-indigo-400 hover:text-indigo-300">
            Log in
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
          label="Your name"
          autoComplete="name"
          error={errors.name?.message}
          {...register('name')}
        />
        <TextField
          label="Organization name"
          autoComplete="organization"
          placeholder="e.g. Pixel Studio"
          error={errors.organizationName?.message}
          {...register('organizationName')}
        />
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
          autoComplete="new-password"
          error={errors.password?.message}
          {...register('password')}
        />
        {mutation.isError && <FormError message={getErrorMessage(mutation.error)} />}
        <Button type="submit" loading={mutation.isPending} className="w-full">
          Create account
        </Button>
      </form>
    </AuthLayout>
  );
}
