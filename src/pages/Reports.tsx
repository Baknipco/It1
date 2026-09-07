import { useMemo, useState } from 'react';
import { useStore, DOC_STATUS, clsOf, roleFa } from '../lib/store';
import { I, Btn, Badge, SectionTitle, Num } from '../components/ui';
import { DateRange } from '../components/DatePicker';
import { GroupBars, HBars } from '../components/charts';

type EntityId = 'documents' | 'knowledge' | 'lessons' | 'audit' | 'equipment' | 'users';

const OPS = [
  { k: 'eq', fa: 'برابر' }, { k: 'ne', fa: 'مخالف' }, { k: 'contains', fa: 'شامل' },
  { k: 'starts', fa: 'شروع با' }, { k: 'ends', fa: 'پایان با' }, { k: 'gt', fa: 'بزرگ‌تر' },
  { k: 'lt', fa: 'کوچک‌تر' }, { k: 'in', fa: 'یکی از' }, { k: 'notin', fa: 'هیچ‌یک از' },
  { k: 'null', fa: 'خالی' }, { k: 'notnull', fa: 'غیرخالی' },
];

interface FilterRow { field: string; op: string; value: string }

export function ReportsPage() {
  const s = useStore();
  const [entity, setEntity] = useState<EntityId>('documents');
  const [fields, setFields] = useState<string[]>(['code', 'title', 'dept', 'status', 'createdAt']);
  const [filters, setFilters] = useState<FilterRow[]>([]);
  const [dateField, setDateField] = useState('createdAt');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [group, setGroup] = useState('');
  const [sortF, setSortF] = useState('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [activePreset, setActivePreset] = useState('');

  const fieldDefs = useMemo<Record<EntityId, { key: string; fa: string; get: (r: Record<string, string>) => string }[]>>(() => ({
    documents: [
      { key: 'code', fa: 'کد سند', get: r => r.code }, { key: 'title', fa: 'عنوان', get: r => r.title },
      { key: 'dept', fa: 'واحد', get: r => s.deptName(r.deptId) }, { key: 'type', fa: 'نوع', get: r => r.type },
      { key: 'category', fa: 'دسته', get: r => r.category }, { key: 'status', fa: 'وضعیت', get: r => DOC_STATUS[r.status]?.fa ?? r.status },
      { key: 'classification', fa: 'طبقه‌بندی', get: r => clsOf(r.classification).fa },
      { key: 'owner', fa: 'مالک', get: r => s.userName(r.ownerId) },
      { key: 'sizeKB', fa: 'حجم (KB)', get: r => String(r.sizeKB) },
      { key: 'year', fa: 'سال شمسی', get: r => String(r.year) },
      { key: 'createdAt', fa: 'تاریخ ایجاد', get: r => s.fmt(r.createdAt) }, { key: 'modifiedAt', fa: 'تاریخ تغییر', get: r => s.fmt(r.modifiedAt) },
      { key: 'approvedAt', fa: 'تاریخ تأیید', get: r => r.approvedAt ? s.fmt(r.approvedAt) : '—' },
      { key: 'publishedAt', fa: 'تاریخ انتشار', get: r => r.publishedAt ? s.fmt(r.publishedAt) : '—' },
      { key: 'expiresAt', fa: 'تاریخ انقضا', get: r => r.expiresAt ? s.fmt(r.expiresAt) : '—' },
      { key: 'versions', fa: 'تعداد نسخه', get: r => String(r.versions?.length ?? 1) },
      { key: 'tags', fa: 'برچسب‌ها', get: r => (r.tags as unknown as string[])?.join('، ') ?? '' },
    ],
    knowledge: [
      { key: 'title', fa: 'عنوان', get: r => r.title }, { key: 'dept', fa: 'واحد', get: r => s.deptName(r.deptId) },
      { key: 'ktype', fa: 'نوع دانش', get: r => r.ktype }, { key: 'status', fa: 'وضعیت', get: r => r.status === 'published' ? 'منتشرشده' : 'در بازبینی' },
      { key: 'owner', fa: 'نویسنده', get: r => s.userName(r.ownerId) }, { key: 'views', fa: 'بازدید', get: r => String(r.views) },
      { key: 'score', fa: 'امتیاز کیفیت', get: r => String(Math.round((+r.qa + +r.qf + +r.qc + +r.qv + +r.qu + +r.qp) / 6)) },
      { key: 'createdAt', fa: 'تاریخ ثبت', get: r => s.fmt(r.createdAt) }, { key: 'tags', fa: 'برچسب‌ها', get: r => (r.tags as unknown as string[])?.join('، ') ?? '' },
    ],
    lessons: [
      { key: 'title', fa: 'عنوان', get: r => r.title }, { key: 'dept', fa: 'واحد', get: r => s.deptName(r.deptId) },
      { key: 'problem', fa: 'مسئله', get: r => r.problem }, { key: 'rootCause', fa: 'علت ریشه', get: r => r.rootCause },
      { key: 'status', fa: 'وضعیت', get: r => r.status === 'open' ? 'باز' : 'بسته' }, { key: 'owner', fa: 'ثبت‌کننده', get: r => s.userName(r.ownerId) },
      { key: 'date', fa: 'تاریخ', get: r => s.fmt(r.date) },
    ],
    audit: [
      { key: 'ts', fa: 'زمان', get: r => s.fmt(r.ts, true) }, { key: 'userName', fa: 'کاربر', get: r => r.userName },
      { key: 'action', fa: 'عملیات', get: r => r.action }, { key: 'target', fa: 'هدف', get: r => r.target },
      { key: 'severity', fa: 'شدت', get: r => r.severity === 'critical' ? 'بحرانی' : r.severity === 'warn' ? 'هشدار' : 'عادی' },
      { key: 'ip', fa: 'IP', get: r => r.ip },
    ],
    equipment: [
      { key: 'name', fa: 'تجهیز', get: r => r.name }, { key: 'code', fa: 'کد', get: r => r.code },
      { key: 'dept', fa: 'واحد', get: r => s.deptName(r.deptId) }, { key: 'criticality', fa: 'بحرانیت', get: r => r.criticality },
      { key: 'status', fa: 'وضعیت', get: r => r.status }, { key: 'nextMaintenance', fa: 'PM بعدی', get: r => s.fmt(r.nextMaintenance) },
      { key: 'hoursRun', fa: 'کارکرد (ساعت)', get: r => String(r.hoursRun) },
    ],
    users: [
      { key: 'name', fa: 'نام', get: r => r.name }, { key: 'username', fa: 'نام کاربری', get: r => r.username },
      { key: 'role', fa: 'نقش', get: r => roleFa(r.role) }, { key: 'depts', fa: 'واحدها', get: r => (r.departments as unknown as string[]).map(d => s.deptName(d)).join('، ') },
      { key: 'active', fa: 'فعال', get: r => r.active === 'true' ? 'بله' : 'خیر' }, { key: 'lastLogin', fa: 'آخرین ورود', get: r => r.lastLogin ? s.fmt(r.lastLogin, true) : '—' },
      { key: 'failedLogins', fa: 'ورود ناموفق', get: r => String(r.failedLogins) },
    ],
  }), [s]);

  const dateFields: Record<EntityId, { key: string; fa: string }[]> = {
    documents: [{ key: 'createdAt', fa: 'تاریخ ایجاد' }, { key: 'modifiedAt', fa: 'تاریخ تغییر' }, { key: 'approvedAt', fa: 'تاریخ تأیید' }, { key: 'publishedAt', fa: 'تاریخ انتشار' }, { key: 'expiresAt', fa: 'تاریخ انقضا' }, { key: 'reviewAt', fa: 'تاریخ بازبینی' }],
    knowledge: [{ key: 'createdAt', fa: 'تاریخ ثبت' }, { key: 'modifiedAt', fa: 'تاریخ تغییر' }],
    lessons: [{ key: 'date', fa: 'تاریخ رویداد' }],
    audit: [{ key: 'ts', fa: 'زمان رخداد' }],
    equipment: [{ key: 'nextMaintenance', fa: 'PM بعدی' }, { key: 'lastMaintenance', fa: 'آخرین PM' }],
    users: [{ key: 'lastLogin', fa: 'آخرین ورود' }],
  };

  const rows = useMemo(() => {
    let base: Record<string, unknown>[] = [];
    const toR = (x: object) => JSON.parse(JSON.stringify(x)) as Record<string, unknown>;
    if (entity === 'documents') base = s.visibleDocs().map(d => ({ ...toR(d), versions: d.versions }));
    if (entity === 'knowledge') base = s.data.knowledge.filter(k => s.can('view', { deptId: k.deptId })).map(k => ({ ...toR(k), qa: k.quality.accuracy, qf: k.quality.freshness, qc: k.quality.completeness, qv: k.quality.verification, qu: k.quality.usage, qp: k.quality.approval }));
    if (entity === 'lessons') base = s.data.lessons.filter(l => s.can('view', { deptId: l.deptId })).map(toR);
    if (entity === 'audit') base = s.data.audit.map(toR);
    if (entity === 'equipment') base = s.data.equipment.filter(e => s.can('view', { deptId: e.deptId })).map(toR);
    if (entity === 'users') base = (s.user?.role === 'admin' || s.user?.role === 'security' || s.user?.role === 'executive') ? s.data.users.map(toR) : s.data.users.filter(u => u.id === s.user?.id).map(toR);

    let out = base;
    if (from && to) out = out.filter(r => { const v = (r as Record<string, unknown>)[dateField] as string | undefined; if (!v) return false; const d = String(v).slice(0, 10); return d >= from && d <= to; });
    for (const f of filters) {
      if (!f.field) continue;
      out = out.filter(r => {
        const v = String((r as Record<string, unknown>)[f.field] ?? '');
        const val = f.value.trim();
        switch (f.op) {
          case 'eq': return v === val;
          case 'ne': return v !== val;
          case 'contains': return v.includes(val);
          case 'starts': return v.startsWith(val);
          case 'ends': return v.endsWith(val);
          case 'gt': return +v > +val;
          case 'lt': return +v < +val;
          case 'in': return val.split(',').map(x => x.trim()).includes(v);
          case 'notin': return !val.split(',').map(x => x.trim()).includes(v);
          case 'null': return !v || v === 'undefined';
          case 'notnull': return !!v && v !== 'undefined';
          default: return true;
        }
      });
    }
    if (sortF) out = [...out].sort((a, b) => { const av = String((a as Record<string, unknown>)[sortF] ?? ''); const bv = String((b as Record<string, unknown>)[sortF] ?? ''); return (av.localeCompare(bv, 'fa') || 0) * (sortDir === 'asc' ? 1 : -1); });
    return out;
  }, [s, entity, filters, from, to, dateField, sortF, sortDir]);

  const grouped = useMemo(() => {
    if (!group) return null;
    const m = new Map<string, number>();
    rows.forEach(r => { const k = String((r as Record<string, unknown>)[group] ?? '—'); m.set(k, (m.get(k) || 0) + 1); });
    return [...m.entries()].map(([label, v]) => ({ label, v })).sort((a, b) => b.v - a.v);
  }, [rows, group]);

  const activeFields = fieldDefs[entity].filter(f => fields.includes(f.key));
  const toggleField = (k: string) => setFields(fs => fs.includes(k) ? fs.filter(x => x !== k) : [...fs, k]);

  const exportAs = (kind: 'csv' | 'json' | 'excel') => {
    s.audit('report_export', `${entity}-report`, 'report', `خروجی ${kind} گزارش ${entity} — ${rows.length} ردیف`, 'info');
    if (kind === 'json') {
      const data = rows.map(r => Object.fromEntries(activeFields.map(f => [f.fa, f.get(r as Record<string, string>)])));
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      dl(blob, `nipco-report-${entity}.json`);
    } else {
      const head = activeFields.map(f => `"${f.fa}"`).join(',');
      const body = rows.map(r => activeFields.map(f => `"${String(f.get(r as Record<string, string>)).replace(/"/g, '""')}"`).join(',')).join('\n');
      const blob = new Blob(['\uFEFF' + head + '\n' + body], { type: 'text/csv;charset=utf-8' });
      dl(blob, `nipco-report-${entity}.csv`);
    }
    s.toast(`گزارش با ${rows.length} ردیف خروجی ${kind.toUpperCase()} شد.`, 'ok');
  };
  const dl = (blob: Blob, name: string) => { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click(); URL.revokeObjectURL(a.href); };

  const presets = [
    { id: 'mnt', fa: 'گزارش واحد نگهداری و تعمیرات', icon: 'wrench', apply: () => { setEntity('documents'); setFields(['code', 'title', 'type', 'status', 'classification', 'owner', 'createdAt']); setFilters([{ field: 'deptId', op: 'in', value: 'd-mnt,d-mnt-mech,d-mnt-elec,d-mnt-pm' }]); setGroup('status'); setSortF('createdAt'); setSortDir('desc'); setFrom(''); setTo(''); } },
    { id: 'eng', fa: 'گزارش واحد مهندسی', icon: 'org', apply: () => { setEntity('documents'); setFields(['code', 'title', 'type', 'status', 'classification', 'owner', 'createdAt']); setFilters([{ field: 'deptId', op: 'in', value: 'd-eng,d-eng-design,d-eng-proj' }]); setGroup('status'); setSortF('createdAt'); setSortDir('desc'); setFrom(''); setTo(''); } },
    { id: 'sec', fa: 'گزارش امنیتی (DLP و دسترسی‌ها)', icon: 'shield', apply: () => { setEntity('audit'); setFields(['ts', 'userName', 'action', 'target', 'severity', 'ip']); setFilters([{ field: 'severity', op: 'ne', value: 'info' }]); setGroup('action'); setSortF('ts'); setSortDir('desc'); setFrom(''); setTo(''); } },
    { id: 'exp', fa: 'گزارش اسناد منقضی/در آستانه', icon: 'alert', apply: () => { setEntity('documents'); setFields(['code', 'title', 'dept', 'status', 'expiresAt', 'owner']); setDateField('expiresAt'); const now = new Date(); setFrom(now.toISOString().slice(0, 10)); setTo(new Date(now.getTime() + 45 * 864e5).toISOString().slice(0, 10)); setFilters([]); setGroup('deptId'); setSortF('expiresAt'); setSortDir('asc'); } },
    { id: 'kn', fa: 'گزارش دانش سازمانی', icon: 'bulb', apply: () => { setEntity('knowledge'); setFields(['title', 'dept', 'ktype', 'status', 'owner', 'views', 'score', 'createdAt']); setFilters([]); setGroup('ktype'); setSortF('views'); setSortDir('desc'); setFrom(''); setTo(''); } },
    { id: 'ai', fa: 'گزارش استفاده از AI', icon: 'bot', apply: () => { setEntity('audit'); setFields(['ts', 'userName', 'action', 'target', 'severity']); setFilters([{ field: 'action', op: 'in', value: 'ai_query,ai_answer_denied' }]); setGroup('userName'); setSortF('ts'); setSortDir('desc'); setFrom(''); setTo(''); } },
  ];

  const unitCompare = s.data.departments.filter(d => d.parentId === 'd0' && d.active).slice(0, 6);

  return (
    <div className="space-y-4">
      {/* گزارش‌های ازپیش‌تعریف‌شده */}
      <div className="grid md:grid-cols-3 xl:grid-cols-6 gap-2.5 stagger">
        {presets.map(p => (
          <button key={p.id} onClick={() => { p.apply(); setActivePreset(p.id); s.toast(`گزارش «${p.fa}» بارگذاری شد.`, 'info'); }}
            className={`bg-panel border rounded-xl p-3.5 text-start transition hover:shadow-md hover:-translate-y-0.5 ${activePreset === p.id ? 'border-brand ring-2 ring-brand/20' : 'border-line hover:border-brand/50'}`}>
            <span className="w-8 h-8 rounded-lg bg-brand-soft text-brand flex items-center justify-center mb-2"><I n={p.icon} s={16} /></span>
            <p className="text-[12px] font-bold text-ink leading-5">{p.fa}</p>
          </button>
        ))}
      </div>

      <p className="text-[11px] text-mute flex items-center gap-1.5 -mt-1 anim-fade"><I n="clock" s={13} />Report Scheduling (روزانه / هفتگی / ماهانه) آماده فعال‌سازی است — خروجی دوره‌ای به کارتابل مدیران ارسال خواهد شد.</p>

      <div className="grid xl:grid-cols-[340px_1fr] gap-4 items-start">
        {/* گزارش‌ساز */}
        <div className="bg-panel border border-line rounded-2xl p-5 space-y-5 anim-rise sticky top-[74px]">
          <SectionTitle icon="sliders" sub="Entity ← Fields ← Filter ← Date ← Group ← Sort">گزارش‌ساز پویا</SectionTitle>

          <div>
            <p className="text-[12px] font-bold mb-2">۱. موجودیت (Entity)</p>
            <div className="grid grid-cols-3 gap-1.5">
              {(['documents', 'knowledge', 'lessons', 'audit', 'equipment', 'users'] as EntityId[]).map(e => (
                <button key={e} onClick={() => {
                  const defs: Record<EntityId, string[]> = {
                    documents: ['code', 'title', 'dept', 'status', 'classification', 'createdAt'],
                    knowledge: ['title', 'dept', 'ktype', 'status', 'owner', 'views'],
                    lessons: ['title', 'dept', 'problem', 'status', 'date'],
                    audit: ['ts', 'userName', 'action', 'target', 'severity', 'ip'],
                    equipment: ['name', 'code', 'dept', 'criticality', 'status', 'nextMaintenance'],
                    users: ['name', 'username', 'role', 'depts', 'active', 'lastLogin'],
                  };
                  setEntity(e); setFields(defs[e]); setFilters([]); setGroup(''); setSortF(''); setActivePreset('');
                }}
                  className={`text-[11.5px] font-bold rounded-lg border py-2 transition ${entity === e ? 'bg-night text-gold border-night' : 'border-line text-mute hover:border-brand hover:text-brand'}`}>
                  {{ documents: 'اسناد', knowledge: 'دانش', lessons: 'درس‌ها', audit: 'Audit', equipment: 'تجهیزات', users: 'کاربران' }[e]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[12px] font-bold mb-2">۲. فیلدها ({activeFields.length} انتخاب)</p>
            <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pe-1">
              {fieldDefs[entity].map(f => (
                <button key={f.key} onClick={() => toggleField(f.key)}
                  className={`text-[11px] font-bold rounded-full px-2.5 py-1.5 border transition ${fields.includes(f.key) ? 'bg-brand text-white border-brand' : 'border-line text-mute hover:border-brand'}`}>{f.fa}</button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[12px] font-bold mb-2">۳. فیلترها</p>
            <div className="space-y-2">
              {filters.map((f, i) => (
                <div key={i} className="grid grid-cols-[1fr_95px_1fr_28px] gap-1.5 items-center">
                  <select value={f.field} onChange={e => setFilters(fs => fs.map((x, j) => j === i ? { ...x, field: e.target.value } : x))} className="border border-linedark rounded-lg px-2 py-1.5 text-[11px] bg-panel">
                    <option value="">فیلد…</option>{fieldDefs[entity].map(fd => <option key={fd.key} value={fd.key}>{fd.fa}</option>)}
                  </select>
                  <select value={f.op} onChange={e => setFilters(fs => fs.map((x, j) => j === i ? { ...x, op: e.target.value } : x))} className="border border-linedark rounded-lg px-1.5 py-1.5 text-[11px] bg-panel">
                    {OPS.map(o => <option key={o.k} value={o.k}>{o.fa}</option>)}
                  </select>
                  <input value={f.value} onChange={e => setFilters(fs => fs.map((x, j) => j === i ? { ...x, value: e.target.value } : x))} placeholder="مقدار" className="border border-linedark rounded-lg px-2 py-1.5 text-[11px] bg-panel" disabled={f.op === 'null' || f.op === 'notnull'} />
                  <button onClick={() => setFilters(fs => fs.filter((_, j) => j !== i))} className="text-mute hover:text-crimson flex justify-center"><I n="x" s={14} /></button>
                </div>
              ))}
              <button onClick={() => setFilters(fs => [...fs, { field: '', op: 'contains', value: '' }])} className="text-[11.5px] font-bold text-brand hover:text-brand-deep flex items-center gap-1"><I n="plus" s={13} />افزودن فیلتر</button>
            </div>
          </div>

          <div>
            <p className="text-[12px] font-bold mb-2">۴. بازه تاریخ — مبنای تاریخ</p>
            <select value={dateField} onChange={e => setDateField(e.target.value)} className="w-full border border-linedark rounded-lg px-2.5 py-2 text-[12px] bg-panel mb-2">
              {dateFields[entity].map(d => <option key={d.key} value={d.key}>بر اساس: {d.fa}</option>)}
            </select>
            <DateRange from={from || undefined} to={to || undefined} onChange={(f, t2) => { setFrom(f); setTo(t2); }} calendar={s.calendar} onCalendar={c => s.setCalendar(c)} />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-[12px] font-bold mb-1.5">۵. گروه‌بندی</p>
              <select value={group} onChange={e => setGroup(e.target.value)} className="w-full border border-linedark rounded-lg px-2 py-2 text-[11.5px] bg-panel">
                <option value="">بدون گروه‌بندی</option>{fieldDefs[entity].map(f => <option key={f.key} value={f.key}>{f.fa}</option>)}
              </select>
            </div>
            <div>
              <p className="text-[12px] font-bold mb-1.5">۶. مرتب‌سازی</p>
              <div className="flex gap-1.5">
                <select value={sortF} onChange={e => setSortF(e.target.value)} className="w-full border border-linedark rounded-lg px-2 py-2 text-[11.5px] bg-panel">
                  <option value="">—</option>{fieldDefs[entity].map(f => <option key={f.key} value={f.key}>{f.fa}</option>)}
                </select>
                <button onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')} className="border border-linedark rounded-lg px-2 text-[11px] font-bold hover:border-brand" title="جهت">{sortDir === 'asc' ? '↑' : '↓'}</button>
              </div>
            </div>
          </div>
        </div>

        {/* پیش‌نمایش */}
        <div className="space-y-4">
          <div className="bg-panel border border-line rounded-2xl overflow-hidden anim-rise" id="print-area">
            <div className="px-5 py-3.5 border-b border-line flex items-center justify-between no-print">
              <p className="text-[13px] font-bold">پیش‌نمایش — <span className="text-brand"><Num v={rows.length} fa={s.lang === 'fa'} /></span> ردیف {from && to && <span className="text-mute font-normal text-[11.5px]">• بازه {s.fmt(from)} تا {s.fmt(to)} ({s.calendar === 'jalali' ? 'شمسی' : 'میلادی'})</span>}</p>
              <div className="flex gap-2">
                <Btn size="sm" kind="line" icon="print" onClick={() => { s.audit('report_print', `${entity}-report`, 'report', 'چاپ گزارش', 'info'); window.print(); }}>PDF/چاپ</Btn>
                <Btn size="sm" kind="line" icon="download" onClick={() => exportAs('csv')}>CSV</Btn>
                <Btn size="sm" kind="line" icon="download" onClick={() => exportAs('excel')}>Excel</Btn>
                <Btn size="sm" kind="line" icon="download" onClick={() => exportAs('json')}>JSON</Btn>
              </div>
            </div>
            <div className="hidden print:block p-6">
              <p className="font-display text-[18px]">نیپکو — گزارش {({ documents: 'اسناد', knowledge: 'دانش', lessons: 'درس‌آموخته‌ها', audit: 'Audit', equipment: 'تجهیزات', users: 'کاربران' } as Record<string, string>)[entity]}</p>
              <p className="text-[11px] text-mute mt-1">تولید: {s.fmt(new Date().toISOString(), true)} • توسط {s.user?.name} • بازه: {from && to ? `${s.fmt(from)} تا ${s.fmt(to)}` : 'کل'}</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="bg-paper/80 text-mute">
                    {activeFields.map(f => <th key={f.key} className="text-start font-bold px-4 py-2.5 whitespace-nowrap border-b border-line">{f.fa}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 60).map((r, i) => (
                    <tr key={i} className="hover:bg-brand-soft/30 transition">
                      {activeFields.map(f => <td key={f.key} className="px-4 py-2.5 border-b border-line/60 whitespace-nowrap max-w-[280px] truncate">{f.get(r as Record<string, string>)}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
              {rows.length === 0 && <p className="text-center text-[12.5px] text-mute py-10">رکوردی مطابق فیلترها یافت نشد — بازه تاریخ یا فیلترها را تغییر دهید.</p>}
              {rows.length > 60 && <p className="text-center text-[11px] text-mute py-2.5 bg-paper/60">نمایش ۶۰ ردیف نخست — خروجی کامل شامل همه {rows.length} ردیف است.</p>}
            </div>
          </div>

          {grouped && (
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-panel border border-line rounded-2xl p-5 anim-rise">
                <SectionTitle icon="chart">توزیع بر اساس {fieldDefs[entity].find(f => f.key === group)?.fa}</SectionTitle>
                <HBars rows={grouped.map(g2 => ({ label: g2.label, v: g2.v, color: '#0e6b5c' }))} />
              </div>
              <div className="bg-panel border border-line rounded-2xl p-5 anim-rise">
                <SectionTitle icon="spark">خلاصه اجرایی (AI)</SectionTitle>
                <div className="text-[12.5px] leading-7 text-ink/85 space-y-2">
                  <p>• مجموع رکوردهای این گزارش: <b>{rows.length}</b> مورد{from && to ? ` در بازه ${s.fmt(from)} تا ${s.fmt(to)}` : ''}.</p>
                  <p>• بیشترین سهم: <b>{grouped[0]?.label}</b> با {grouped[0]?.v} رکورد ({grouped[0] ? Math.round((grouped[0].v / rows.length) * 100) : 0}٪).</p>
                  <p>• تعداد گروه‌ها: {grouped.length} — {grouped[grouped.length - 1] ? `کمترین: ${grouped[grouped.length - 1].label}` : ''}.</p>
                  <p className="text-mute text-[11.5px]">توصیه: روند ماهانه این شاخص را در داشبورد واحد دنبال کنید و در صورت انحراف بیش از ۲۰٪ بازبینی فرآیندی انجام دهید.</p>
                </div>
              </div>
            </div>
          )}

          {/* مقایسه واحدها */}
          <div className="bg-panel border border-line rounded-2xl p-5 anim-rise">
            <SectionTitle icon="org" sub="مقایسه عملکرد واحدها — فقط برای مدیریت مجاز">مقایسه واحدها</SectionTitle>
            <GroupBars groups={unitCompare.map(d => d.name)} series={[
              { name: 'اسناد', color: '#0e6b5c', values: unitCompare.map(d => s.data.documents.filter(x => s.inDeptScope(x.deptId, d.id)).length) },
              { name: 'دانش', color: '#e5a52e', values: unitCompare.map(d => s.data.knowledge.filter(x => s.inDeptScope(x.deptId, d.id)).length) },
              { name: 'درس‌آموخته', color: '#52708c', values: unitCompare.map(d => s.data.lessons.filter(x => s.inDeptScope(x.deptId, d.id)).length) },
              { name: 'کاربران', color: '#c03a2e', values: unitCompare.map(d => s.data.users.filter(u => u.departments.some(dep => s.inDeptScope(dep, d.id))).length) },
            ]} />
          </div>
        </div>
      </div>
    </div>
  );
}
