/* Lightweight SVG charts (no chart dependency) for dashboards & risk views. */

export function Donut({
  segments,
  size = 148,
  stroke = 22,
  centerLabel,
  centerValue,
}: {
  segments: { value: number; color: string; label: string }[];
  size?: number;
  stroke?: number;
  centerLabel?: string;
  centerValue?: string | number;
}) {
  const total = Math.max(
    segments.reduce((s, x) => s + x.value, 0),
    1,
  );
  const r = (size - stroke) / 2;
  const cx = size / 2;
  const C = 2 * Math.PI * r;
  let acc = 0;

  return (
    <div className="flex items-center gap-5">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={cx} cy={cx} r={r} fill="none" stroke="#e2e8f0" strokeWidth={stroke} />
        {segments.map((s, i) => {
          const frac = s.value / total;
          const dash = `${frac * C} ${C}`;
          const offset = -acc * C;
          acc += frac;
          return (
            <circle
              key={i}
              cx={cx}
              cy={cx}
              r={r}
              fill="none"
              stroke={s.color}
              strokeWidth={stroke}
              strokeDasharray={dash}
              strokeDashoffset={offset}
              transform={`rotate(-90 ${cx} ${cx})`}
              strokeLinecap="butt"
            />
          );
        })}
        {centerValue !== undefined && (
          <>
            <text x="50%" y="47%" textAnchor="middle" className="fill-slate-900 text-xl font-bold">
              {centerValue}
            </text>
            <text x="50%" y="60%" textAnchor="middle" className="fill-slate-400 text-[9px]">
              {centerLabel}
            </text>
          </>
        )}
      </svg>
      <div className="space-y-1.5">
        {segments.map((s, i) => (
          <div key={i} className="flex items-center gap-2 text-xs text-slate-600">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} />
            <span className="font-medium">{s.label}</span>
            <span className="text-slate-400">· {s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Trend line for prediction history (risk probability over time). */
export function TrendLine({
  points,
  height = 64,
  width = 260,
}: {
  points: { label: string; value: number }[];
  height?: number;
  width?: number;
}) {
  if (points.length === 0) return <div className="text-xs text-slate-400">No history yet</div>;
  const max = 100;
  const stepX = points.length > 1 ? width / (points.length - 1) : width;
  const coords = points.map((p, i) => `${i * stepX},${height - (p.value / max) * (height - 8) - 4}`);
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      <polyline points={coords.join(' ')} fill="none" stroke="#4550e6" strokeWidth="2" strokeLinejoin="round" />
      {coords.map((c, i) => {
        const [x, y] = c.split(',').map(Number);
        return (
          <g key={i}>
            <circle cx={x} cy={y} r="3" fill="#4550e6" />
            <text x={x} y={y - 6} textAnchor="middle" className="fill-slate-500 text-[9px]">
              {Math.round(points[i].value)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/** Horizontal meter used for snapshot feature values (0–100). */
export function Meter({ value, tone = 'indigo' }: { value: number; tone?: 'indigo' | 'green' | 'amber' | 'red' | 'slate' }) {
  const colors = {
    indigo: 'bg-indigo-500',
    green: 'bg-emerald-500',
    amber: 'bg-amber-500',
    red: 'bg-rose-500',
    slate: 'bg-slate-400',
  } as const;
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-full rounded-full bg-slate-100">
        <div className={`h-2 rounded-full ${colors[tone]}`} style={{ width: `${v}%` }} />
      </div>
      <span className="w-9 text-right text-xs font-semibold text-slate-600">{Math.round(v)}</span>
    </div>
  );
}
