import { useMemo, useRef, useState } from 'react';
import {
  JAL_MONTHS, GREG_MONTHS_EN, WEEKDAYS, weekdayJalali, weekdayGreg, jalMonthLen,
  toJalali, jalaliToIso, gregToIso, fmtJalali, fmtGreg, faDigits,
} from '../lib/jalali';
import { I, useClickOut } from './ui';

type Cal = 'jalali' | 'gregorian';

const todayIso = () => new Date().toISOString().slice(0, 10);
const shiftDay = (iso: string, days: number) => { const d = new Date(iso); d.setDate(d.getDate() + days); return d.toISOString().slice(0, 10); };

function presets(cal: Cal) {
  const t = new Date();
  const tIso = todayIso();
  const j = toJalali(t);
  const out: { k: string; fa: string; en: string; from: string; to: string }[] = [];
  const push = (k: string, fa: string, en: string, from: string, to: string) => out.push({ k, fa, en, from: from.slice(0, 10), to: to.slice(0, 10) });
  push('today', 'امروز', 'Today', tIso, tIso);
  push('yesterday', 'دیروز', 'Yesterday', shiftDay(tIso, -1), shiftDay(tIso, -1));
  const dow = (t.getDay() + 1) % 7;
  push('week', 'هفته جاری', 'This Week', shiftDay(tIso, -dow), shiftDay(tIso, 6 - dow));
  if (cal === 'jalali') {
    push('month', 'ماه جاری', 'This Month', jalaliToIso(j.jy, j.jm, 1), jalaliToIso(j.jy, j.jm, jalMonthLen(j.jy, j.jm)));
    const pm = j.jm === 1 ? { y: j.jy - 1, m: 12 } : { y: j.jy, m: j.jm - 1 };
    push('lastmonth', 'ماه قبل', 'Last Month', jalaliToIso(pm.y, pm.m, 1), jalaliToIso(pm.y, pm.m, jalMonthLen(pm.y, pm.m)));
    const sm = Math.floor((j.jm - 1) / 3) * 3 + 1;
    push('season', 'فصل جاری', 'This Season', jalaliToIso(j.jy, sm, 1), jalaliToIso(j.jy, sm + 2, jalMonthLen(j.jy, sm + 2)));
    push('year', 'سال جاری', 'This Year', jalaliToIso(j.jy, 1, 1), jalaliToIso(j.jy, 12, jalMonthLen(j.jy, 12)));
  } else {
    push('month', 'ماه جاری', 'This Month', gregToIso(t.getFullYear(), t.getMonth() + 1, 1), tIso);
    const lm = new Date(t.getFullYear(), t.getMonth() - 1, 1);
    push('lastmonth', 'ماه قبل', 'Last Month', gregToIso(lm.getFullYear(), lm.getMonth() + 1, 1), gregToIso(t.getFullYear(), t.getMonth(), 0));
    const sq = Math.floor(t.getMonth() / 3) * 3;
    push('season', 'فصل جاری', 'This Season', gregToIso(t.getFullYear(), sq + 1, 1), tIso);
    push('year', 'سال جاری', 'This Year', gregToIso(t.getFullYear(), 1, 1), tIso);
  }
  return out;
}

function Grid({ cal, view, onView, onPick, marks }: {
  cal: Cal; view: { y: number; m: number }; onView: (v: { y: number; m: number }) => void;
  onPick: (iso: string) => void; marks: string[];
}) {
  const cells = useMemo(() => {
    const arr: (string | null)[] = [];
    if (cal === 'jalali') {
      const fw = weekdayJalali(view.y, view.m, 1);
      const len = jalMonthLen(view.y, view.m);
      for (let i = 0; i < fw; i++) arr.push(null);
      for (let d = 1; d <= len; d++) arr.push(jalaliToIso(view.y, view.m, d));
    } else {
      const fw = weekdayGreg(view.y, view.m, 1);
      const len = new Date(view.y, view.m, 0).getDate();
      for (let i = 0; i < fw; i++) arr.push(null);
      for (let d = 1; d <= len; d++) arr.push(gregToIso(view.y, view.m, d));
    }
    return arr;
  }, [cal, view]);
  const months = cal === 'jalali' ? JAL_MONTHS : GREG_MONTHS_EN;
  const years = cal === 'jalali' ? Array.from({ length: 16 }, (_, i) => 1398 + i) : Array.from({ length: 16 }, (_, i) => 2019 + i);
  const tIso = todayIso();
  const nav = (dir: 1 | -1) => {
    let { y, m } = view;
    m += dir;
    if (m < 1) { m = 12; y--; } if (m > 12) { m = 1; y++; }
    onView({ y, m });
  };
  return (
    <div className="w-64">
      <div className="flex items-center justify-between mb-2">
        <button onClick={() => nav(-1)} className="p-1 rounded-md hover:bg-paper text-mute hover:text-brand transition rtl:rotate-180"><I n="chevS" s={15} /></button>
        <div className="flex items-center gap-1">
          <select value={view.m} onChange={e => onView({ ...view, m: +e.target.value })} className="text-[12px] font-bold bg-transparent border-0 focus:outline-none cursor-pointer text-ink">
            {months.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <select value={view.y} onChange={e => onView({ ...view, y: +e.target.value })} className="text-[12px] font-bold bg-transparent border-0 focus:outline-none cursor-pointer text-ink" dir="ltr">
            {years.map(y => <option key={y} value={y}>{cal === 'jalali' ? faDigits(y) : y}</option>)}
          </select>
        </div>
        <button onClick={() => nav(1)} className="p-1 rounded-md hover:bg-paper text-mute hover:text-brand transition rtl:rotate-180 rotate-180"><I n="chevS" s={15} /></button>
      </div>
      <div className="grid grid-cols-7 text-center mb-1">
        {WEEKDAYS.map((w, i) => <span key={i} className="text-[10.5px] font-bold text-mute py-1">{w}</span>)}
      </div>
      <div className="grid grid-cols-7 gap-[3px]">
        {cells.map((iso, i) => iso === null ? <span key={i} /> : (
          <button key={i} onClick={() => onPick(iso)}
            className={`h-8 rounded-lg text-[12px] font-semibold transition relative
              ${iso === tIso ? 'ring-1 ring-brand text-brand' : 'text-ink hover:bg-brand-soft hover:text-brand'}
              ${marks.includes(iso) ? 'bg-brand text-white! hover:text-white! hover:bg-brand-deep' : ''}`}>
            {cal === 'jalali' ? faDigits(+iso.slice(8)) : +iso.slice(8)}
          </button>
        ))}
      </div>
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-line">
        <button onClick={() => { onView(cal === 'jalali' ? (() => { const j = toJalali(new Date()); return { y: j.jy, m: j.jm }; })() : { y: new Date().getFullYear(), m: new Date().getMonth() + 1 }); onPick(tIso); }}
          className="text-[11.5px] font-bold text-brand hover:text-brand-deep transition">امروز</button>
        <div className="flex rounded-lg border border-line overflow-hidden">
          {(['jalali', 'gregorian'] as Cal[]).map(c => (
            <button key={c} onClick={() => {
              const base = view;
              if (c === cal) return;
              if (c === 'jalali') { const j = toJalali(new Date(`${base.y}-${String(base.m).padStart(2, '0')}-15`)); onView({ y: j.jy, m: j.jm }); }
              else { const d = new Date(cal === 'jalali' ? jalaliToIso(base.y, base.m, 15) : gregToIso(base.y, base.m, 15)); onView({ y: d.getFullYear(), m: d.getMonth() + 1 }); }
            }}
              className={`px-2 py-1 text-[10.5px] font-bold transition ${cal === c ? 'bg-night text-white' : 'text-mute hover:text-ink'}`}>
              {c === 'jalali' ? 'شمسی' : 'میلادی'}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/** انتخابگر تاریخ تکی */
export function DatePick({ value, onChange, calendar, onCalendar, label }: {
  value?: string; onChange: (iso: string) => void; calendar: Cal; onCalendar?: (c: Cal) => void; label?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useClickOut(ref, () => setOpen(false));
  const view = useMemo(() => {
    const base = value ? new Date(value) : new Date();
    if (calendar === 'jalali') { const j = toJalali(base); return { y: j.jy, m: j.jm }; }
    return { y: base.getFullYear(), m: base.getMonth() + 1 };
  }, [value, calendar]);
  const [v, setV] = useState(view);
  return (
    <div className="relative" ref={ref}>
      {label && <span className="block text-[12px] font-bold text-ink mb-1.5">{label}</span>}
      <button onClick={() => { setV(view); setOpen(o => !o); }}
        className="w-full flex items-center gap-2 text-[13px] border border-linedark rounded-lg px-3 py-2 bg-panel hover:border-brand transition text-start">
        <span className="text-brand"><I n="cal" s={15} /></span>
        <span className={value ? 'text-ink font-semibold' : 'text-mute'}>{value ? (calendar === 'jalali' ? fmtJalali(value) : fmtGreg(value)) : 'انتخاب تاریخ'}</span>
        <span className="ms-auto text-[10px] font-bold text-mute border border-line rounded px-1.5 py-0.5">{calendar === 'jalali' ? 'شمسی' : 'میلادی'}</span>
      </button>
      {open && (
        <div className="absolute z-50 top-full mt-1.5 start-0 bg-panel border border-line rounded-xl shadow-xl p-3 anim-pop">
          <Grid cal={calendar} view={v} onView={setV} marks={value ? [value.slice(0, 10)] : []}
            onPick={iso => { onChange(iso); setOpen(false); }} />
          {onCalendar && (
            <div className="flex justify-end mt-2">
              <button onClick={() => onCalendar(calendar === 'jalali' ? 'gregorian' : 'jalali')} className="text-[11px] font-bold text-steel hover:text-brand flex items-center gap-1"><I n="refresh" s={12} />تغییر تقویم پیش‌فرض</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** انتخابگر بازه «از تاریخ / تا تاریخ» با پیش‌تنظیم‌ها */
export function DateRange({ from, to, onChange, calendar, onCalendar, fa = true }: {
  from?: string; to?: string; onChange: (from: string, to: string) => void;
  calendar: Cal; onCalendar: (c: Cal) => void; fa?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useClickOut(ref, () => setOpen(false));
  const [pick, setPick] = useState<'from' | 'to'>('from');
  const init = (which: 'from' | 'to') => {
    const base = (which === 'from' ? from : to) ? new Date(which === 'from' ? from! : to!) : new Date();
    return calendar === 'jalali' ? (() => { const j = toJalali(base); return { y: j.jy, m: j.jm }; })() : { y: base.getFullYear(), m: base.getMonth() + 1 };
  };
  const [v, setV] = useState(() => init('from'));
  const f = (iso?: string) => iso ? (calendar === 'jalali' ? fmtJalali(iso) : fmtGreg(iso)) : '—';
  return (
    <div className="relative" ref={ref}>
      <div className="grid grid-cols-2 gap-2">
        {(['from', 'to'] as const).map(which => (
          <button key={which} onClick={() => { setPick(which); setV(init(which)); setOpen(true); }}
            className={`flex flex-col items-start rounded-lg border px-3 py-2 transition text-start ${open && pick === which ? 'border-brand ring-2 ring-brand/15' : 'border-linedark hover:border-brand'}`}>
            <span className="text-[10.5px] font-bold text-mute flex items-center gap-1">{which === 'from' ? 'از تاریخ' : 'تا تاریخ'}<I n="cal" s={11} /></span>
            <span className="text-[13px] font-bold text-ink mt-0.5 tabular-nums">{f(which === 'from' ? from : to)}</span>
          </button>
        ))}
      </div>
      {open && (
        <div className="absolute z-50 top-full mt-1.5 start-0 bg-panel border border-line rounded-xl shadow-xl p-3.5 anim-pop w-[300px]">
          <div className="flex flex-wrap gap-1.5 mb-3">
            {presets(calendar).map(p => (
              <button key={p.k} onClick={() => { onChange(p.from, p.to); setOpen(false); }}
                className="text-[11px] font-bold px-2.5 py-1 rounded-full border border-line hover:border-brand hover:text-brand hover:bg-brand-soft transition text-ink">
                {fa ? p.fa : p.en}
              </button>
            ))}
          </div>
          <Grid cal={calendar} view={v} onView={setV} marks={[from?.slice(0, 10), to?.slice(0, 10)].filter(Boolean) as string[]}
            onPick={iso => {
              if (pick === 'from') { onChange(iso, to && to >= iso ? to : iso); setPick('to'); }
              else { onChange(from && from <= iso ? from : iso, iso); setOpen(false); }
            }} />
          <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t border-line">
            <button onClick={() => onCalendar(calendar === 'jalali' ? 'gregorian' : 'jalali')} className="text-[11px] font-bold text-steel hover:text-brand flex items-center gap-1">
              <I n="refresh" s={12} />تقویم: {calendar === 'jalali' ? 'شمسی ← میلادی' : 'میلادی ← شمسی'}
            </button>
            <button onClick={() => setOpen(false)} className="text-[11px] font-bold text-mute hover:text-ink">بستن</button>
          </div>
        </div>
      )}
    </div>
  );
}
