import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/primitives';

export function ForbiddenPage() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 py-24 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-100 text-2xl">🔒</div>
      <h1 className="text-xl font-bold text-slate-900">Access denied</h1>
      <p className="max-w-sm text-sm text-slate-500">
        Your role does not include the permission required for this page. Attempts to access restricted
        resources are recorded in Access Logs (PRD §16).
      </p>
      <Link to="/dashboard">
        <Button variant="secondary">Back to dashboard</Button>
      </Link>
    </div>
  );
}

export function NotFoundPage() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 py-24 text-center">
      <h1 className="text-4xl font-black text-slate-300">404</h1>
      <p className="text-sm text-slate-500">The page you requested does not exist.</p>
      <Link to="/dashboard">
        <Button variant="secondary">Back to dashboard</Button>
      </Link>
    </div>
  );
}
