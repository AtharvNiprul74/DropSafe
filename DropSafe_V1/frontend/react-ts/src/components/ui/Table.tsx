import type { ReactNode, ThHTMLAttributes, TdHTMLAttributes, HTMLAttributes } from 'react';

export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse text-sm">{children}</table>
    </div>
  );
}

export function THead({ children }: { children: ReactNode }) {
  return <thead className="bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">{children}</thead>;
}

export function Th(props: ThHTMLAttributes<HTMLTableCellElement>) {
  return <th {...props} className={`px-4 py-2.5 ${props.className ?? ''}`} />;
}

export function TBody({ children }: { children: ReactNode }) {
  return <tbody className="divide-y divide-slate-100">{children}</tbody>;
}

export function Tr({ children, onClick, className = '', ...rest }: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      {...rest}
      onClick={onClick}
      className={`${onClick ? 'cursor-pointer hover:bg-brand-50/40' : ''} ${className}`}
    >
      {children}
    </tr>
  );
}

export function Td(props: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td {...props} className={`px-4 py-3 align-middle text-slate-700 ${props.className ?? ''}`} />;
}
