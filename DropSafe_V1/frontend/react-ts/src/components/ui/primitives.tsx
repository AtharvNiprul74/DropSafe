import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { initials, titleCase } from '../../lib/format';

/* --------------------------------- Button --------------------------------- */

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'success' | 'warning';

const BTN_VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700 focus-visible:ring-brand-500',
  secondary: 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 focus-visible:ring-slate-400',
  danger: 'bg-rose-600 text-white hover:bg-rose-700 focus-visible:ring-rose-500',
  ghost: 'text-slate-600 hover:bg-slate-100 focus-visible:ring-slate-400',
  success: 'bg-emerald-600 text-white hover:bg-emerald-700 focus-visible:ring-emerald-500',
  warning: 'bg-amber-500 text-white hover:bg-amber-600 focus-visible:ring-amber-400',
};

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: 'sm' | 'md' }) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition
        focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1
        disabled:cursor-not-allowed disabled:opacity-50
        ${size === 'sm' ? 'px-2.5 py-1.5 text-xs' : 'px-4 py-2 text-sm'} ${BTN_VARIANTS[variant]} ${className}`}
    />
  );
}

/* --------------------------------- Badge ---------------------------------- */

type Tone = 'slate' | 'green' | 'amber' | 'red' | 'blue' | 'indigo' | 'violet' | 'rose' | 'emerald' | 'cyan';

const TONES: Record<Tone, string> = {
  slate: 'bg-slate-100 text-slate-700 ring-slate-200',
  green: 'bg-green-50 text-green-700 ring-green-200',
  amber: 'bg-amber-50 text-amber-700 ring-amber-200',
  red: 'bg-red-50 text-red-700 ring-red-200',
  blue: 'bg-blue-50 text-blue-700 ring-blue-200',
  indigo: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  violet: 'bg-violet-50 text-violet-700 ring-violet-200',
  rose: 'bg-rose-50 text-rose-700 ring-rose-200',
  emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  cyan: 'bg-cyan-50 text-cyan-700 ring-cyan-200',
};

export function Badge({ tone = 'slate', children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${TONES[tone]}`}>
      {children}
    </span>
  );
}

/** Maps every PRD status to a tone — single source of truth for status colouring. */
const STATUS_TONE: Record<string, Tone> = {
  ACTIVE: 'green',
  INACTIVE: 'slate',
  ARCHIVED: 'slate',
  LOCKED: 'amber',
  PLANNED: 'blue',
  COMPLETED: 'emerald',
  CANCELLED: 'slate',
  FAILED: 'red',
  CREATED: 'blue',
  VALIDATING: 'cyan',
  VALIDATED: 'indigo',
  PROCESSING: 'violet',
  SUCCESS: 'emerald',
  PARTIAL_SUCCESS: 'amber',
  PENDING: 'amber',
  SCHEDULED: 'blue',
  MISSED: 'rose',
  IN_PROGRESS: 'indigo',
  PLANNED_: 'blue',
  GENERATED: 'blue',
  PREDICTED: 'indigo',
  SUPERSEDED: 'slate',
  LOW: 'green',
  MEDIUM: 'amber',
  HIGH: 'red',
  URGENT: 'rose',
  GRADUATED: 'emerald',
  TRANSFERRED: 'blue',
  WITHDRAWN: 'amber',
  QUEUED: 'blue',
  SENT: 'indigo',
  DELIVERED: 'emerald',
  RETIRED: 'slate',
  POSITIVE: 'green',
  NEUTRAL: 'slate',
  NEGATIVE: 'rose',
  ALLOWED: 'green',
  DENIED: 'red',
  PASS: 'green',
  FAIL: 'red',
  APPROVED: 'emerald',
  REJECTED: 'rose',
  UNAVAILABLE: 'slate',
};

export function StatusBadge({ status }: { status?: string | null }) {
  const s = status ?? 'UNAVAILABLE';
  return <Badge tone={STATUS_TONE[s] ?? 'slate'}>{titleCase(s)}</Badge>;
}

/** Risk label badge — explicit component since LOW/MEDIUM/HIGH drives the product's core decision support. */
export function RiskBadge({ label }: { label?: string | null }) {
  if (!label || label === 'UNAVAILABLE') return <Badge tone="slate">Prediction Unavailable</Badge>;
  const tone = label === 'HIGH' ? 'red' : label === 'MEDIUM' ? 'amber' : 'green';
  return <Badge tone={tone}>{label} RISK</Badge>;
}

/* ---------------------------------- Card ---------------------------------- */

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}>{children}</div>;
}

export function CardHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
      <div>
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

/* ---------------------------------- Stat ---------------------------------- */

export function Stat({ label, value, sub, tone = 'slate' }: { label: string; value: ReactNode; sub?: string; tone?: Tone }) {
  const dot: Record<Tone, string> = {
    slate: 'bg-slate-400',
    green: 'bg-green-500',
    amber: 'bg-amber-500',
    red: 'bg-red-500',
    blue: 'bg-blue-500',
    indigo: 'bg-indigo-500',
    violet: 'bg-violet-500',
    rose: 'bg-rose-500',
    emerald: 'bg-emerald-500',
    cyan: 'bg-cyan-500',
  };
  return (
    <Card className="px-4 py-3.5">
      <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
        <span className={`h-2 w-2 rounded-full ${dot[tone]}`} />
        {label}
      </div>
      <div className="mt-1.5 text-2xl font-bold text-slate-900">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-slate-500">{sub}</div>}
    </Card>
  );
}

/* --------------------------------- Fields --------------------------------- */

export function Field({ label, hint, error, required, children }: {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 flex items-center gap-1 text-xs font-semibold text-slate-600">
        {label}
        {required && <span className="text-rose-500">*</span>}
      </span>
      {children}
      {hint && !error && <span className="mt-1 block text-[11px] text-slate-400">{hint}</span>}
      {error && <span className="mt-1 block text-[11px] font-medium text-rose-600">{error}</span>}
    </label>
  );
}

const INPUT_CLS =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 disabled:bg-slate-50 disabled:text-slate-400';

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${INPUT_CLS} ${props.className ?? ''}`} />;
}

export function Select({ children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...props} className={`${INPUT_CLS} ${props.className ?? ''}`}>
      {children}
    </select>
  );
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea rows={3} {...props} className={`${INPUT_CLS} ${props.className ?? ''}`} />;
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center gap-2.5 text-sm text-slate-700"
    >
      <span
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition ${checked ? 'bg-brand-600' : 'bg-slate-300'}`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${checked ? 'translate-x-4' : 'translate-x-1'}`}
        />
      </span>
      {label}
    </button>
  );
}

/* --------------------------------- Loading -------------------------------- */

export function Spinner({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={`animate-spin text-brand-600 ${className}`} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z" />
    </svg>
  );
}

export function FullPageLoading({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex h-full min-h-[320px] w-full flex-col items-center justify-center gap-3 text-slate-500">
      <Spinner className="h-6 w-6" />
      <span className="text-sm">{label}</span>
    </div>
  );
}

/* -------------------------------- Empty state ----------------------------- */

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1.5 px-6 py-12 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm3 3a1 1 0 000 2h6a1 1 0 100-2H7zm0 4a1 1 0 100 2h4a1 1 0 100-2H7z" />
        </svg>
      </div>
      <div className="text-sm font-semibold text-slate-700">{title}</div>
      {description && <p className="max-w-sm text-xs text-slate-500">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

/* ------------------------------- Page header ------------------------------ */

export function PageHeader({ title, subtitle, actions, crumbs }: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  crumbs?: string[];
}) {
  return (
    <div className="mb-6">
      {crumbs && crumbs.length > 0 && (
        <div className="mb-1 text-xs font-medium text-slate-400">{crumbs.join('  /  ')}</div>
      )}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{title}</h1>
          {subtitle && <p className="mt-1 max-w-3xl text-sm text-slate-500">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}

/* ------------------------------ Search input ------------------------------ */

export function SearchInput({ value, onChange, placeholder = 'Search…' }: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="relative">
      <svg className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.45 4.44l3.3 3.3a.75.75 0 11-1.06 1.06l-3.3-3.3A7 7 0 012 9z" clipRule="evenodd" />
      </svg>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-64 rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
      />
    </div>
  );
}

/* --------------------------------- Avatar --------------------------------- */

export function Avatar({ name, className = 'h-8 w-8 text-xs' }: { name?: string; className?: string }) {
  return (
    <span className={`inline-flex items-center justify-center rounded-full bg-brand-100 font-semibold text-brand-700 ${className}`}>
      {initials(name)}
    </span>
  );
}

/* ----------------------------- Key-value list ----------------------------- */

export function KV({ k, v }: { k: string; v: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 text-sm">
      <span className="text-slate-500">{k}</span>
      <span className="text-right font-medium text-slate-800">{v ?? '—'}</span>
    </div>
  );
}
