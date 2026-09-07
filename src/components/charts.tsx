import { useEffect, useRef, useState } from 'react';

function useDrawn() {
  const [d, setD] = useState(false);
  useEffect(() => { const t = window.setTimeout(() => setD(true), 60); return () => window.clearTimeout(t); }, []);
  return d;
}

/** نمودار خطی-مساحتی با انیمیشن ترسیم */
export function AreaChart({ series, labels, color = '#0e6b5c', h = 170, unit = '' }: {
  series: number[]; labels: string[]; color?: string; h?: number; unit?: string;
}) {
  const W = 560, H = h, pad = 8;
  const max = Math.max(...series, 1);
  const pts = series.map((v, i) => [pad + (i * (W - pad * 2)) / Math.max(1, series.length - 1), H - 24 - (v / max) * (H - 44)] as const);
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const area = `${line} L${pts[pts.length - 1][0]},${H - 24} L${pts[0][0]},${H - 24} Z`;
  const [hov, setHov] = useState<number | null>(null);
  const gid = useRef(`g${Math.random().toString(36).slice(2, 7)}`).current;
  const drawn = useDrawn();
  return (
    <div className="relative w-full">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full block" onMouseLeave={() => setHov(null)}>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity=".28" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map(f => (
          <line key={f} x1={pad} x2={W - pad} y1={H - 24 - f * (H - 44)} y2={H - 24 - f * (H - 44)} stroke="#d9e2e0" strokeDasharray="3 5" strokeWidth="1" />
        ))}
        {drawn && <path d={area} fill={`url(#${gid})`} className="anim-fade" />}
        <path d={line} fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" className="anim-dash" style={{ ['--dash' as string]: 900 }} />
        {pts.map((p, i) => (
          <g key={i}>
            <circle cx={p[0]} cy={p[1]} r={hov === i ? 5 : 3} fill={hov === i ? color : '#fbfcfc'} stroke={color} strokeWidth="2" className="transition-all cursor-pointer"
              onMouseEnter={() => setHov(i)} />
            <rect x={p[0] - 24} y={0} width={48} height={H - 20} fill="transparent" onMouseEnter={() => setHov(i)} />
          </g>
        ))}
        {labels.map((l, i) => (
          <text key={i} x={pts[i][0]} y={H - 8} textAnchor="middle" fontSize="10.5" fill="#5b6b70" fontFamily="inherit">{l}</text>
        ))}
      </svg>
      {hov !== null && (
        <div className="chart-tip absolute pointer-events-none bg-night text-white text-[11.5px] font-bold rounded-lg px-2.5 py-1.5 shadow-lg z-10"
          style={{ left: `${(pts[hov][0] / W) * 100}%`, top: `${(pts[hov][1] / H) * 100}%`, transform: 'translate(-50%,-130%)' }}>
          {labels[hov]}: {series[hov]}{unit}
        </div>
      )}
    </div>
  );
}

/** میله‌های افقی با برچسب */
export function HBars({ rows, color = '#0e6b5c' }: { rows: { label: string; v: number; color?: string; hint?: string }[]; color?: string }) {
  const max = Math.max(...rows.map(r => r.v), 1);
  return (
    <div className="space-y-2.5">
      {rows.map((r, i) => (
        <div key={i} className="group">
          <div className="flex items-center justify-between text-[12px] mb-1">
            <span className="font-semibold text-ink truncate me-2">{r.label}</span>
            <span className="font-bold text-mute tabular-nums group-hover:text-brand transition">{r.hint ?? r.v}</span>
          </div>
          <div className="h-[7px] rounded-full bg-line/60 overflow-hidden">
            <div className="h-full rounded-full anim-bar group-hover:opacity-80 transition" style={{ width: `${(r.v / max) * 100}%`, background: r.color ?? color, animationDelay: `${i * 60}ms` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

/** دونات */
export function Donut({ parts, size = 148, thick = 17, centerTop, centerSub }: {
  parts: { v: number; color: string; label: string }[]; size?: number; thick?: number; centerTop: string; centerSub?: string;
}) {
  const total = Math.max(1, parts.reduce((a, p) => a + p.v, 0));
  const R = (size - thick) / 2, C = 2 * Math.PI * R;
  let acc = 0;
  const [hov, setHov] = useState<number | null>(null);
  return (
    <div className="flex items-center gap-4">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={R} fill="none" stroke="#e6eceb" strokeWidth={thick} />
          {parts.map((p, i) => {
            const frac = p.v / total;
            const off = acc; acc += frac;
            return (
              <circle key={i} cx={size / 2} cy={size / 2} r={R} fill="none" stroke={p.color}
                strokeWidth={hov === i ? thick + 3 : thick} strokeLinecap="butt"
                strokeDasharray={`${frac * C} ${C}`} strokeDashoffset={-off * C}
                className="transition-all duration-300 cursor-pointer" onMouseEnter={() => setHov(i)} onMouseLeave={() => setHov(null)} />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="font-display text-[22px] leading-none text-ink pt-1">{hov !== null ? parts[hov].v : centerTop}</span>
          <span className="text-[10.5px] text-mute mt-1 px-2 leading-tight">{hov !== null ? parts[hov].label : centerSub}</span>
        </div>
      </div>
      <div className="space-y-1.5 min-w-0">
        {parts.map((p, i) => (
          <button key={i} onMouseEnter={() => setHov(i)} onMouseLeave={() => setHov(null)}
            className={`flex items-center gap-2 text-[12px] w-full text-start rounded-md px-1.5 py-0.5 transition ${hov === i ? 'bg-paper' : ''}`}>
            <span className="w-2.5 h-2.5 rounded-[4px] shrink-0" style={{ background: p.color }} />
            <span className="text-ink font-semibold truncate">{p.label}</span>
            <span className="text-mute tabular-nums ms-auto font-bold">{p.v}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/** میله‌های گروهی برای مقایسه واحدها */
export function GroupBars({ groups, series }: {
  groups: string[];
  series: { name: string; color: string; values: number[] }[];
}) {
  const max = Math.max(...series.flatMap(s => s.values), 1);
  return (
    <div>
      <div className="flex items-end justify-around gap-2 h-40">
        {groups.map((g, gi) => (
          <div key={gi} className="flex-1 flex flex-col items-center gap-1.5 min-w-0">
            <div className="flex items-end gap-[5px] h-32 w-full justify-center">
              {series.map((s, si) => (
                <div key={si} title={`${s.name}: ${s.values[gi]}`}
                  className="w-3.5 rounded-t-[4px] anim-bar cursor-pointer hover:opacity-75 transition"
                  style={{ height: `${Math.max(3, (s.values[gi] / max) * 100)}%`, background: s.color, animationDelay: `${gi * 70}ms`, transformOrigin: 'bottom' }} />
              ))}
            </div>
            <span className="text-[10.5px] font-bold text-mute truncate max-w-full">{g}</span>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-3 mt-3 justify-center">
        {series.map((s, i) => (
          <span key={i} className="flex items-center gap-1.5 text-[11.5px] font-semibold text-ink">
            <span className="w-2.5 h-2.5 rounded-[4px]" style={{ background: s.color }} />{s.name}
          </span>
        ))}
      </div>
    </div>
  );
}

/** اسپارک‌لاین کوچک */
export function Spark({ values, color = '#0e6b5c', w = 90, h = 28 }: { values: number[]; color?: string; w?: number; h?: number }) {
  const max = Math.max(...values, 1);
  const pts = values.map((v, i) => `${(i * w) / Math.max(1, values.length - 1)},${h - 3 - (v / max) * (h - 6)}`).join(' ');
  return (
    <svg width={w} height={h} className="block">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" className="anim-dash" style={{ ['--dash' as string]: 300 }} />
    </svg>
  );
}
