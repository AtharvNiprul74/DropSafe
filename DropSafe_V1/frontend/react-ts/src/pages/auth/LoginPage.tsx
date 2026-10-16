import { useState } from 'react';
import type { FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { DEMO_MODE } from '../../api/http';
import { Button, Input, Field, Spinner } from '../../components/ui/primitives';

const DEMO_ACCOUNTS = [
  { email: 'admin@vvce.edu.in', label: 'Organization Admin', desc: 'Full administration, approvals, reports' },
  { email: 'teacher@vvce.edu.in', label: 'Teacher', desc: 'Attendance & assessment uploads' },
  { email: 'mentor@vvce.edu.in', label: 'Mentor', desc: 'Assigned students, counseling, follow-ups' },
];

export default function LoginPage() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation() as { state?: { from?: string } };
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (user) {
    navigate('/dashboard', { replace: true });
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login(email.trim(), password);
      navigate(location.state?.from ?? '/dashboard', { replace: true });
    } catch (err: any) {
      setError(err?.message ?? 'Sign-in failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Brand panel */}
      <div className="hidden w-[46%] flex-col justify-between bg-slate-900 p-10 text-white lg:flex">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 font-bold">DS</span>
          <div>
            <div className="font-bold">DropSafe</div>
            <div className="text-[11px] uppercase tracking-wider text-slate-400">V1 Portal</div>
          </div>
        </div>
        <div>
          <h1 className="text-3xl font-bold leading-tight">
            Student Risk Detection &amp; <span className="text-brand-300">Early Intervention</span>
          </h1>
          <p className="mt-4 max-w-md text-sm text-slate-400">
            Evidence-driven, privacy-preserving decision support. AI predicts — humans decide.
            Every record is isolated by organization, every action is auditable.
          </p>
          <div className="mt-8 space-y-3 text-sm text-slate-300">
            {[
              'Academic + behavioural evidence, preserved unmodified',
              'Student snapshots, predictions and full prediction history',
              'Human-led interventions, counseling and follow-ups',
              'RBAC with mentor access approvals — privacy first',
            ].map((t) => (
              <div key={t} className="flex items-start gap-2.5">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-brand-400" />
                {t}
              </div>
            ))}
          </div>
        </div>
        <div className="text-xs text-slate-500">Students interact via the WhatsApp chatbot — not this portal.</div>
      </div>

      {/* Form panel */}
      <div className="flex flex-1 items-center justify-center bg-white p-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 font-bold text-white">DS</span>
            <span className="font-bold text-slate-900">DropSafe Portal</span>
          </div>

          <h2 className="text-xl font-bold text-slate-900">Sign in</h2>
          <p className="mt-1 text-sm text-slate-500">Authorized portal users only (Admin, Teacher, Mentor).</p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <Field label="Email address" required>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@college.edu.in" autoComplete="email" required />
            </Field>
            <Field label="Password" required>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoComplete="current-password" required />
            </Field>
            {error && <div className="rounded-lg bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-700 ring-1 ring-inset ring-rose-200">{error}</div>}
            <Button type="submit" disabled={busy} className="w-full">
              {busy ? <Spinner className="h-4 w-4 text-white" /> : null}
              {busy ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>

          {DEMO_MODE && (
            <div className="mt-8">
              <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <span className="h-px flex-1 bg-slate-200" /> Demo accounts <span className="h-px flex-1 bg-slate-200" />
              </div>
              <div className="space-y-2">
                {DEMO_ACCOUNTS.map((a) => (
                  <button
                    key={a.email}
                    type="button"
                    onClick={() => {
                      setEmail(a.email);
                      setPassword('demo123');
                    }}
                    className="flex w-full items-center justify-between rounded-xl border border-slate-200 px-3.5 py-2.5 text-left transition hover:border-brand-300 hover:bg-brand-50/50"
                  >
                    <div>
                      <div className="text-sm font-semibold text-slate-800">{a.label}</div>
                      <div className="text-[11px] text-slate-400">{a.desc}</div>
                    </div>
                    <span className="text-[11px] font-medium text-brand-600">Use →</span>
                  </button>
                ))}
              </div>
              <p className="mt-3 text-center text-[11px] text-slate-400">Any password works in demo mode.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
