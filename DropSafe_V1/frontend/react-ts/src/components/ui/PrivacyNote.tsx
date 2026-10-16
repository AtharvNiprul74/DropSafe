import type { ReactNode } from 'react';

/**
 * Privacy callout used across screens to keep PRD §17 (Privacy & Data Visibility)
 * visible inside the product itself.
 */
export function PrivacyNote({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-indigo-100 bg-indigo-50/60 px-4 py-3 text-xs text-indigo-900">
      <svg className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500" viewBox="0 0 20 20" fill="currentColor">
        <path
          fillRule="evenodd"
          d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z"
          clipRule="evenodd"
        />
      </svg>
      <div>
        <span className="font-semibold">{title}.</span> {children}
      </div>
    </div>
  );
}
