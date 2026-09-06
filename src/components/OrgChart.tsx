import { useState } from 'react';
import { Department } from '../lib/types';
import { I } from './ui';

export interface DeptStats { docs: number; knowledge: number; users: number }

/** نمودار سازمانی تعاملی — Clickable / Dynamic / قابل مدیریت توسط Admin */
export function OrgChart({ departments, stats, selected, onSelect, admin, onAdd, onEdit, onToggle, compact = false }: {
  departments: Department[];
  stats: (id: string) => DeptStats;
  selected?: string | null;
  onSelect?: (id: string) => void;
  admin?: boolean;
  onAdd?: (parentId: string) => void;
  onEdit?: (id: string) => void;
  onToggle?: (id: string) => void;
  compact?: boolean;
}) {
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const build = (parentId: string | null): Department[] =>
    departments.filter(d => d.parentId === parentId && (admin || d.active));

  const Node = ({ d }: { d: Department }) => {
    const s = stats(d.id);
    const sel = selected === d.id;
    const children = build(d.id);
    return (
      <li>
        <div className="relative group">
          <button
            onClick={() => onSelect?.(d.id)}
            className={`relative block text-center rounded-xl border transition-all duration-200 min-w-[132px] max-w-[168px] px-3 py-2.5 shadow-sm hover:shadow-md hover:-translate-y-0.5 ${sel ? 'border-brand ring-2 ring-brand/25 bg-brand-soft' : 'border-line bg-panel hover:border-brand/50'} ${!d.active ? 'opacity-50' : ''}`}
            style={{ borderBlockStartWidth: 4, borderBlockStartColor: d.color }}
          >
            <span className="block font-display text-[13.5px] text-ink leading-tight pt-0.5">{d.name}</span>
            <span className="block text-[9.5px] text-mute mt-0.5 tracking-wide" dir="ltr">{d.nameEn}</span>
            {!compact && (
              <span className="flex items-center justify-center gap-2.5 mt-1.5 text-[10px] font-bold text-mute">
                <span className="flex items-center gap-0.5"><I n="doc" s={11} />{s.docs}</span>
                <span className="flex items-center gap-0.5"><I n="bulb" s={11} />{s.knowledge}</span>
                <span className="flex items-center gap-0.5"><I n="user" s={11} />{s.users}</span>
              </span>
            )}
          </button>
          {admin && (
            <div className="absolute -top-2 start-1/2 translate-x-1/2 rtl:-translate-x-1/2 opacity-0 group-hover:opacity-100 transition flex gap-1 z-20">
              <button title="افزودن زیرواحد" onClick={e => { e.stopPropagation(); onAdd?.(d.id); }} className="w-5.5 h-5.5 w-6 h-6 rounded-md bg-brand text-white flex items-center justify-center shadow hover:bg-brand-deep"><I n="plus" s={11} /></button>
              <button title="ویرایش" onClick={e => { e.stopPropagation(); onEdit?.(d.id); setMenuFor(menuFor === d.id ? null : d.id); }} className="w-6 h-6 rounded-md bg-night text-white flex items-center justify-center shadow hover:bg-night3"><I n="edit" s={11} /></button>
            </div>
          )}
        </div>
        {admin && menuFor === d.id && (
          <div className="absolute z-30 -bottom-1 start-1/2 translate-x-1/2 rtl:-translate-x-1/2 translate-y-full bg-panel border border-line rounded-lg shadow-xl p-1 anim-pop w-36">
            <button onClick={() => { onEdit?.(d.id); setMenuFor(null); }} className="w-full text-start text-[12px] font-semibold px-2.5 py-1.5 rounded-md hover:bg-paper flex items-center gap-2"><I n="edit" s={13} />ویرایش واحد</button>
            <button onClick={() => { onAdd?.(d.id); setMenuFor(null); }} className="w-full text-start text-[12px] font-semibold px-2.5 py-1.5 rounded-md hover:bg-paper flex items-center gap-2"><I n="plus" s={13} />افزودن زیرواحد</button>
            <button onClick={() => { onToggle?.(d.id); setMenuFor(null); }} className={`w-full text-start text-[12px] font-semibold px-2.5 py-1.5 rounded-md hover:bg-paper flex items-center gap-2 ${d.active ? 'text-crimson' : 'text-brand'}`}>
              <I n={d.active ? 'eyex' : 'check'} s={13} />{d.active ? 'غیرفعال‌سازی' : 'فعال‌سازی'}
            </button>
          </div>
        )}
        {children.length > 0 && (
          <ul>
            {children.map(c => <Node key={c.id} d={c} />)}
          </ul>
        )}
      </li>
    );
  };

  const roots = build(null);
  return (
    <div className="overflow-x-auto pb-2">
      <ul className="org-tree min-w-max px-4 pt-1">
        {roots.map(r => <Node key={r.id} d={r} />)}
      </ul>
    </div>
  );
}
