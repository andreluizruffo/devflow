import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { Button } from '../../components/Button';
import { useAuth } from '../auth/use-auth';

const roleLabels = { OWNER: 'Owner', ADMIN: 'Admin', MEMBER: 'Member' } as const;

// First protected page. Clients, projects and tasks arrive in phases 04–07.
export function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const logoutMutation = useMutation({
    mutationFn: logout,
    onSettled: () => navigate('/login', { replace: true }),
  });

  if (!user) return null;
  const firstName = user.name.split(' ')[0];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <span className="text-lg font-semibold tracking-tight text-indigo-400">DevFlow</span>
          <div className="flex items-center gap-4">
            <span className="hidden text-sm text-slate-400 sm:inline">{user.email}</span>
            <Button
              variant="secondary"
              loading={logoutMutation.isPending}
              onClick={() => logoutMutation.mutate()}
            >
              Log out
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-10">
        <h1 className="text-3xl font-bold tracking-tight">Welcome, {firstName}</h1>
        <p className="mt-2 text-slate-400">Your organizations</p>

        <ul className="mt-6 grid gap-4 sm:grid-cols-2">
          {user.organizations.map((organization) => (
            <li
              key={organization.id}
              className="rounded-xl border border-slate-800 bg-slate-900/60 p-5"
            >
              <p className="font-semibold">{organization.name}</p>
              <p className="mt-1 text-sm text-slate-400">{roleLabels[organization.role]}</p>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
