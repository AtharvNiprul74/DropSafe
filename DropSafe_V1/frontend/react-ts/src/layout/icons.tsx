/* Minimal outline icon set (SVG, no external dependency). */
import type { SVGProps } from 'react';

// Destructure className (default '') so spread props never override the size
// classes with `undefined` — that bug made icons render at full SVG size.
const P = (d: string) => ({ className = '', ...props }: SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    className={`h-4 w-4 shrink-0 ${className}`}
    {...props}
  >
    <path d={d} />
  </svg>
);

export const icons = {
  dashboard: P('M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z'),
  building: P('M3 21h18M5 21V7l7-4 7 4v14M9 9h1m4 0h1m-6 4h1m4 0h1m-6 4h1m4 0h1'),
  users: P('M17 21v-2a4 4 0 00-4-4H7a4 4 0 00-4 4v2m18 0v-2a4 4 0 00-3-3.87M13 7a4 4 0 11-8 0 4 4 0 018 0zm11 4a4 4 0 01-3 3.87'),
  shield: P('M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z'),
  key: P('M21 2l-2 2m-7.6 7.6a5.5 5.5 0 11-7.78 7.78 5.5 5.5 0 017.78-7.78zm0 0L19 3m-4 1 3 3'),
  layers: P('M12 2 2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5'),
  students: P('M22 10L12 5 2 10l10 5 10-5zM6 12v5c0 1.66 2.69 3 6 3s6-1.34 6-3v-5'),
  edit: P('M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.5-9.5z'),
  upload: P('M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5m5-5v12'),
  pulse: P('M22 12h-4l-3 9L9 3l-3 9H2'),
  chip: P('M9 2v2m6-2v2M9 20v2m6-2v2M2 9h2m-2 6h2m16-6h2m-2 6h2M7 4h10a3 3 0 013 3v10a3 3 0 01-3 3H7a3 3 0 01-3-3V7a3 3 0 013-3zm2 5h6v6H9z'),
  heart: P('M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z'),
  check: P('M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11'),
  clipboard: P('M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2m1-2h6a1 1 0 011 1v2a1 1 0 01-1 1H9a1 1 0 01-1-1V3a1 1 0 011-1z'),
  report: P('M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zM14 2v6h6M16 13H8m8 4H8m2-8H8'),
  lock: P('M19 11H5a2 2 0 00-2 2v7a2 2 0 002 2h14a2 2 0 002-2v-7a2 2 0 00-2-2zM7 11V7a5 5 0 0110 0v4'),
  eye: P('M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zm11 3a3 3 0 100-6 3 3 0 000 6z'),
  bell: P('M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 01-3.4 0'),
  logout: P('M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4m7 14 5-5-5-5m5 5H9'),
  handshake: P('M20 12v6a2 2 0 01-2 2h-3l-3 2-3-2H6a2 2 0 01-2-2v-6m4-7 4-3m6 10-4-3m-4 3-4-3m4 3V5m-4 3L4 5'),
};

export type IconName = keyof typeof icons;

export function Icon({ name, className }: { name: IconName; className?: string }) {
  const C = icons[name];
  return <C className={className} />;
}
