import { ReactNode, useEffect, useRef, useState } from 'react';

/* ------------------------------------------------------------------
   آیکن‌های اختصاصی سامانه — Inline SVG (24×24, stroke)
------------------------------------------------------------------- */
const P: Record<string, ReactNode> = {
  dashboard: <><rect x="3" y="3" width="8" height="10" rx="1.5" /><rect x="13" y="3" width="8" height="6" rx="1.5" /><rect x="13" y="11" width="8" height="10" rx="1.5" /><rect x="3" y="15" width="8" height="6" rx="1.5" /></>,
  doc: <><path d="M6 2.8h8.5L19 7.3V21.2H6z" /><path d="M14 3v4.5h4.6" /><path d="M9 12h6M9 15.5h6M9 8.5h2.5" /></>,
  book: <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15.5H6.5A2.5 2.5 0 0 0 4 21z" /><path d="M4 18.5A2.5 2.5 0 0 1 6.5 16H20" /><path d="M9 7.5h7M9 11h5" /></>,
  archive: <><rect x="3" y="4" width="18" height="5" rx="1" /><path d="M5 9v10.5h14V9" /><path d="M10 13h4" /></>,
  org: <><rect x="9" y="3" width="6" height="4.5" rx="1" /><rect x="2.5" y="15" width="6" height="4.5" rx="1" /><rect x="15.5" y="15" width="6" height="4.5" rx="1" /><path d="M12 7.5V11M5.5 15v-2.2h13V15M12 11v1.8" /></>,
  users: <><circle cx="9" cy="8" r="3.2" /><path d="M3.2 20c.5-3.5 2.8-5.4 5.8-5.4s5.3 1.9 5.8 5.4" /><circle cx="17" cy="9.5" r="2.3" /><path d="M15.6 14.9c2.9-.6 5 1.3 5.4 4.3" /></>,
  user: <><circle cx="12" cy="8" r="3.6" /><path d="M5 20.4c.6-4 3.2-6.1 7-6.1s6.4 2.1 7 6.1" /></>,
  star: <><path d="M12 3.2l2.6 5.4 5.9.8-4.3 4.1 1 5.9-5.2-2.8-5.2 2.8 1-5.9L3.5 9.4l5.9-.8z" /></>,
  wrench: <><path d="M14.2 6.3a4.3 4.3 0 0 1 5.6-1.2l-3 3 .5 2.6 2.6.5 3-3a4.3 4.3 0 0 1-5.7 5.5L8.5 22.4a2 2 0 0 1-2.9-2.9l8.6-8.6z" transform="scale(.82) translate(2.4 1.2)" /></>,
  project: <><rect x="3" y="7" width="18" height="13" rx="1.5" /><path d="M8 7V4.5h8V7" /><path d="M7.5 12.5l3 3 6-6" /></>,
  flow: <><circle cx="5.5" cy="6" r="2.2" /><circle cx="18.5" cy="6" r="2.2" /><circle cx="12" cy="18" r="2.2" /><path d="M7.7 6h8.6M6.4 8.1l4.5 7.8M17.6 8.1l-4.5 7.8" /></>,
  badgecheck: <><circle cx="12" cy="12" r="8.5" /><path d="M8.4 12.2l2.5 2.5 4.7-5" /></>,
  bulb: <><path d="M12 3a6 6 0 0 1 3.7 10.7c-.8.7-1.2 1.5-1.2 2.5h-5c0-1-.4-1.8-1.2-2.5A6 6 0 0 1 12 3z" /><path d="M9.8 19h4.4M10.5 21.4h3" /></>,
  search: <><circle cx="10.5" cy="10.5" r="6.2" /><path d="M15.3 15.3L21 21" /></>,
  bot: <><rect x="4" y="7.5" width="16" height="11" rx="2.5" /><circle cx="9.3" cy="12.8" r="1.15" fill="currentColor" stroke="none" /><circle cx="14.7" cy="12.8" r="1.15" fill="currentColor" stroke="none" /><path d="M12 7.5V4.6M9.5 4.6h5" /><path d="M9.3 15.8c1.7 1 3.7 1 5.4 0" /></>,
  kanban: <><rect x="3" y="4" width="5.4" height="16" rx="1.2" /><rect x="9.9" y="4" width="5.4" height="10" rx="1.2" /><rect x="16.8" y="4" width="5.4" height="13" rx="1.2" /></>,
  bell: <><path d="M12 3.5a5.6 5.6 0 0 1 5.6 5.6c0 4.2 1.5 5.6 1.5 5.6H4.9s1.5-1.4 1.5-5.6A5.6 5.6 0 0 1 12 3.5z" /><path d="M9.8 17.8a2.3 2.3 0 0 0 4.4 0" /></>,
  chart: <><path d="M3.5 3.5v17h17" /><path d="M7.5 16.5V10M12 16.5V6.5M16.5 16.5v-7.5" /></>,
  sliders: <><path d="M5 5v14M12 5v14M19 5v14" /><circle cx="5" cy="9" r="2.1" fill="var(--color-panel)" /><circle cx="12" cy="15" r="2.1" fill="var(--color-panel)" /><circle cx="19" cy="7" r="2.1" fill="var(--color-panel)" /></>,
  shield: <><path d="M12 3l7.5 3v5.6c0 4.6-3 7.9-7.5 9.4-4.5-1.5-7.5-4.8-7.5-9.4V6z" /><path d="M8.8 12l2.2 2.2 4.2-4.4" /></>,
  list: <><path d="M8.5 6h12M8.5 12h12M8.5 18h12" /><circle cx="4.5" cy="6" r="1.1" fill="currentColor" stroke="none" /><circle cx="4.5" cy="12" r="1.1" fill="currentColor" stroke="none" /><circle cx="4.5" cy="18" r="1.1" fill="currentColor" stroke="none" /></>,
  db: <><ellipse cx="12" cy="5.5" rx="7.5" ry="2.8" /><path d="M4.5 5.5v13c0 1.6 3.4 2.8 7.5 2.8s7.5-1.2 7.5-2.8v-13" /><path d="M4.5 12c0 1.6 3.4 2.8 7.5 2.8s7.5-1.2 7.5-2.8" /></>,
  gear: <><circle cx="12" cy="12" r="3.1" /><path d="M12 2.8l1.2 2.6 2.8-.6 1 2.7 2.9.4-.6 2.8 2.2 1.9-2.2 1.9.6 2.8-2.9.4-1 2.7-2.8-.6L12 21.2l-1.2-2.6-2.8.6-1-2.7-2.9-.4.6-2.8-2.2-1.9 2.2-1.9-.6-2.8 2.9-.4 1-2.7 2.8.6z" transform="scale(.9) translate(1.3 1.3)" /></>,
  help: <><circle cx="12" cy="12" r="8.6" /><path d="M9.6 9.4a2.5 2.5 0 0 1 4.9.6c0 1.6-2.4 2-2.4 3.6" /><circle cx="12" cy="16.6" r=".9" fill="currentColor" stroke="none" /></>,
  out: <><path d="M14 4H6.5A1.5 1.5 0 0 0 5 5.5v13A1.5 1.5 0 0 0 6.5 20H14" /><path d="M10 12h10.5M17 8.5l3.5 3.5-3.5 3.5" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  upload: <><path d="M12 15V4M7.5 8.5L12 4l4.5 4.5" /><path d="M4 15.5v3A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5v-3" /></>,
  download: <><path d="M12 4v11M7.5 10.5L12 15l4.5-4.5" /><path d="M4 15.5v3A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5v-3" /></>,
  print: <><path d="M7 8V3.5h10V8" /><rect x="4" y="8" width="16" height="8.5" rx="1.2" /><path d="M7 14h10v6.5H7z" /></>,
  eye: <><path d="M2.8 12S6.5 5.8 12 5.8 21.2 12 21.2 12 17.5 18.2 12 18.2 2.8 12 2.8 12z" /><circle cx="12" cy="12" r="2.8" /></>,
  eyex: <><path d="M4 4l16 16" /><path d="M9.9 6.3A9 9 0 0 1 12 5.8c5.5 0 9.2 6.2 9.2 6.2a17 17 0 0 1-3 3.5M6.2 8.2A16 16 0 0 0 2.8 12S6.5 18.2 12 18.2a9 9 0 0 0 3.6-.7" /></>,
  lock: <><rect x="5.5" y="10.5" width="13" height="9.5" rx="1.5" /><path d="M8 10.5V7.8a4 4 0 0 1 8 0v2.7" /><circle cx="12" cy="15.2" r="1.1" fill="currentColor" stroke="none" /></>,
  clock: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7v5.2l3.4 2" /></>,
  cal: <><rect x="3.5" y="5" width="17" height="15.5" rx="1.5" /><path d="M3.5 9.5h17M8 3v4M16 3v4" /></>,
  filter: <path d="M4 5.5h16l-6.2 7.2v5.8l-3.6 2v-7.8z" />,
  x: <path d="M6 6l12 12M18 6L6 18" />,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  chevD: <path d="M6 9.5l6 6 6-6" />,
  chevS: <path d="M9 6l6 6-6 6" />,
  edit: <><path d="M14.5 5.5l4 4L8 20H4v-4z" /><path d="M12.5 7.5l4 4" /></>,
  trash: <><path d="M5 7h14M10 7V4.8h4V7" /><path d="M6.5 7l1 13h9l1-13" /><path d="M10.2 11v5M13.8 11v5" /></>,
  share: <><circle cx="6" cy="12" r="2.4" /><circle cx="17.5" cy="5.5" r="2.4" /><circle cx="17.5" cy="18.5" r="2.4" /><path d="M8.2 10.8l7.2-4.1M8.2 13.2l7.2 4.1" /></>,
  alert: <><path d="M12 3.5L22 20H2z" /><path d="M12 10v4.5" /><circle cx="12" cy="17" r=".9" fill="currentColor" stroke="none" /></>,
  info: <><circle cx="12" cy="12" r="8.6" /><path d="M12 11v5.5" /><circle cx="12" cy="7.8" r=".95" fill="currentColor" stroke="none" /></>,
  spark: <><path d="M12 3l1.9 5.6L19.5 10l-5.6 1.9L12 17.5l-1.9-5.6L4.5 10l5.6-1.4z" /><path d="M18.5 15.5l.9 2.6 2.6.9-2.6.9-.9 2.6-.9-2.6-2.6-.9 2.6-.9z" transform="scale(.85) translate(2.5 1)" /></>,
  globe: <><circle cx="12" cy="12" r="8.6" /><path d="M3.4 12h17.2M12 3.4c2.6 2.3 3.9 5.2 3.9 8.6s-1.3 6.3-3.9 8.6c-2.6-2.3-3.9-5.2-3.9-8.6s1.3-6.3 3.9-8.6z" /></>,
  folder: <><path d="M3.5 6.5A1.5 1.5 0 0 1 5 5h4.5l2 2.5H19A1.5 1.5 0 0 1 20.5 9v9.5A1.5 1.5 0 0 1 19 20H5a1.5 1.5 0 0 1-1.5-1.5z" /></>,
  tag: <><path d="M3.8 11.5V4.5h7l9 9-7 7z" /><circle cx="8" cy="8.7" r="1.2" /></>,
  link: <><path d="M9.5 14.5l5-5" /><path d="M8 12l-2.6 2.6a3.5 3.5 0 0 0 5 5L13 17M16 12l2.6-2.6a3.5 3.5 0 0 0-5-5L11 7" /></>,
  key: <><circle cx="8" cy="15.5" r="4.2" /><path d="M11 12.5L20 3.5M16.5 7l2.8 2.8M14 9.5l2 2" /></>,
  restore: <><path d="M4 12a8 8 0 1 1 2.3 5.6" /><path d="M4 13v-4.5h4.5" /><path d="M12 8v4.5l3 1.8" /></>,
  send: <path d="M20.5 3.5L3.5 10l6.5 2.5 2.5 6.5z M20.5 3.5L10 12.5" />,
  mic: <><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3" /></>,
  camx: <><path d="M3 8.5A1.5 1.5 0 0 1 4.5 7h2.8L9 4.8h6L16.7 7h2.8A1.5 1.5 0 0 1 21 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5z" /><path d="M5 4.5l14 15" /><circle cx="12" cy="13" r="3.4" /></>,
  drop: <path d="M12 3.5s6 6.6 6 11a6 6 0 0 1-12 0c0-4.4 6-11 6-11z" />,
  layers: <><path d="M12 3.5l9 4.5-9 4.5-9-4.5z" /><path d="M3.6 12.5l8.4 4.2 8.4-4.2M3.6 16.5L12 20.7l8.4-4.2" /></>,
  home: <><path d="M4 11l8-7 8 7" /><path d="M6 10v10h12V10" /><path d="M10 20v-6h4v6" /></>,
  refresh: <><path d="M20 12a8 8 0 1 1-2.3-5.6" /><path d="M20 4v4.5h-4.5" /></>,
  play: <path d="M8 5.5l11 6.5-11 6.5z" />,
  history: <><path d="M4.5 5.5V10H9" /><path d="M4.8 10A8 8 0 1 1 4 12" /><path d="M12 8v4.5l3 1.8" /></>,
  move: <><path d="M12 3v18M3 12h18" /><path d="M9 6l3-3 3 3M9 18l3 3 3-3M6 9l-3 3 3 3M18 9l3 3-3 3" /></>,
};

export function I({ n, s = 18, className = '' }: { n: string; s?: number; className?: string }) {
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
      strokeLinecap="round" strokeLinejoin="round" className={`shrink-0 ${className}`} aria-hidden>
      {P[n] ?? <circle cx="12" cy="12" r="8" />}
    </svg>
  );
}

/* ------------------------------------------------------------------ */
export function Btn({ children, onClick, kind = 'brand', size = 'md', icon, disabled, title, className = '' }: {
  children?: ReactNode; onClick?: () => void; kind?: 'brand' | 'ghost' | 'line' | 'danger' | 'gold' | 'dark';
  size?: 'sm' | 'md' | 'lg'; icon?: string; disabled?: boolean; title?: string; className?: string;
}) {
  const base = 'inline-flex items-center justify-center gap-1.5 font-semibold transition-all duration-150 active:scale-[.97] disabled:opacity-40 disabled:pointer-events-none rounded-lg whitespace-nowrap';
  const kinds: Record<string, string> = {
    brand: 'bg-brand text-white hover:bg-brand-deep shadow-sm shadow-brand/20',
    dark: 'bg-night text-white hover:bg-night3',
    ghost: 'text-brand hover:bg-brand-soft',
    line: 'border border-linedark bg-panel hover:border-brand hover:text-brand',
    danger: 'bg-crimson text-white hover:bg-[#a02f25] shadow-sm shadow-crimson/20',
    gold: 'bg-gold text-night hover:bg-[#d19520]',
  };
  const sizes: Record<string, string> = { sm: 'text-xs px-2.5 py-1.5', md: 'text-[13px] px-3.5 py-2', lg: 'text-sm px-5 py-2.5' };
  return (
    <button title={title} disabled={disabled} onClick={onClick} className={`${base} ${kinds[kind]} ${sizes[size]} ${className}`}>
      {icon && <I n={icon} s={size === 'sm' ? 14 : 16} />}
      {children}
    </button>
  );
}

export function Badge({ children, color = '#5b6b70', bg, className = '' }: { children: ReactNode; color?: string; bg?: string; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-[3px] rounded-md leading-none ${className}`}
      style={{ color, background: bg ?? `${color}18` }}>
      {children}
    </span>
  );
}

export function Dot({ color }: { color: string }) {
  return <span className="inline-block w-2 h-2 rounded-full shrink-0" style={{ background: color }} />;
}

export function Modal({ open, onClose, title, children, w = 640, footer }: {
  open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; w?: number; footer?: ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 anim-fade" style={{ background: 'rgba(13,31,28,.55)', backdropFilter: 'blur(3px)' }} onClick={onClose}>
      <div className="bg-panel rounded-xl border border-line shadow-2xl anim-pop w-full max-h-[88vh] flex flex-col" style={{ maxWidth: w }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-line">
          <h3 className="font-display text-lg text-ink leading-none pt-1">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-paper text-mute hover:text-ink transition"><I n="x" s={16} /></button>
        </div>
        <div className="p-5 overflow-y-auto grow">{children}</div>
        {footer && <div className="px-5 py-3.5 border-t border-line flex items-center justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}

export function Drawer({ open, onClose, title, children, w = 520 }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; w?: number }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[85] anim-fade" style={{ background: 'rgba(13,31,28,.45)' }} onClick={onClose}>
      <aside className="absolute top-0 bottom-0 start-0 bg-panel border-e border-line shadow-2xl w-full anim-slide overflow-y-auto" style={{ maxWidth: w }} onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-panel/95 backdrop-blur z-10 flex items-center justify-between px-5 py-4 border-b border-line">
          <h3 className="font-display text-lg text-ink leading-none pt-1">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-paper text-mute hover:text-ink transition"><I n="x" s={16} /></button>
        </div>
        <div className="p-5">{children}</div>
      </aside>
    </div>
  );
}

export function Field({ label, children, hint, req }: { label: string; children: ReactNode; hint?: string; req?: boolean }) {
  return (
    <label className="block">
      <span className="block text-[12px] font-bold text-ink mb-1.5">{label}{req && <span className="text-crimson"> *</span>}</span>
      {children}
      {hint && <span className="block text-[11px] text-mute mt-1">{hint}</span>}
    </label>
  );
}
export const inputCls = 'w-full text-[13px] border border-linedark rounded-lg px-3 py-2 bg-panel focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/15 transition placeholder:text-mute/60';

export function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button type="button" onClick={() => onChange(!on)} className="inline-flex items-center gap-2 group">
      <span className={`relative w-9 h-5 rounded-full transition-colors ${on ? 'bg-brand' : 'bg-linedark'}`}>
        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${on ? 'start-[18px]' : 'start-0.5'}`} />
      </span>
      {label && <span className="text-[12.5px] font-semibold text-ink group-hover:text-brand transition">{label}</span>}
    </button>
  );
}

export function ProgressBar({ v, color = 'var(--color-brand)', h = 6 }: { v: number; color?: string; h?: number }) {
  return (
    <div className="w-full rounded-full bg-line/70 overflow-hidden" style={{ height: h }}>
      <div className="h-full rounded-full anim-bar" style={{ width: `${Math.min(100, Math.max(0, v))}%`, background: color }} />
    </div>
  );
}

export function SectionTitle({ icon, children, sub, end }: { icon?: string; children: ReactNode; sub?: string; end?: ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-3 mb-3">
      <div>
        <h2 className="font-display text-[19px] text-ink leading-none pt-0.5 flex items-center gap-2">
          {icon && <span className="text-brand"><I n={icon} s={19} /></span>}{children}
        </h2>
        {sub && <p className="text-[12px] text-mute mt-1.5">{sub}</p>}
      </div>
      {end}
    </div>
  );
}

export function Empty({ icon = 'search', text, sub }: { icon?: string; text: string; sub?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-14 h-14 rounded-2xl bg-paper border border-line flex items-center justify-center text-mute mb-3"><I n={icon} s={26} /></div>
      <p className="font-bold text-[13.5px] text-ink">{text}</p>
      {sub && <p className="text-[12px] text-mute mt-1 max-w-sm">{sub}</p>}
    </div>
  );
}

/* ------------------------------------------------------------------
   Watermark پویا — مخصوص اسناد محرمانه
------------------------------------------------------------------- */
export function Watermark({ lines, strong = false }: { lines: string[]; strong?: boolean }) {
  const [, force] = useState(0);
  useEffect(() => { const iv = window.setInterval(() => force(x => x + 1), 60000); return () => window.clearInterval(iv); }, []);
  const rows = Array.from({ length: 24 });
  return (
    <div className="watermark" style={{ opacity: strong ? 0.75 : 0.55 }}>
      {rows.map((_, i) => (
        <span key={i}>
          <b>CONFIDENTIAL — نیپکو</b>
          {lines.join(' • ')}
        </span>
      ))}
    </div>
  );
}

/* عدد فارسی/انگلیسی بر اساس زبان */
export function Num({ v, fa = true }: { v: number | string; fa?: boolean }) {
  const s = String(v);
  if (!fa) return <>{s}</>;
  return <>{s.replace(/[0-9]/g, d => '۰۱۲۳۴۵۶۷۸۹'[+d])}</>;
}

export function useClickOut(ref: React.RefObject<HTMLElement | null>, onOut: () => void) {
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onOut(); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [ref, onOut]);
}

export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(new Date());
  useEffect(() => { const iv = window.setInterval(() => setNow(new Date()), intervalMs); return () => window.clearInterval(iv); }, [intervalMs]);
  return now;
}
