import { useState } from 'react';
import { useStore } from '../lib/store';
import { Equipment } from '../lib/types';
import { I, Btn, Badge, Modal, Field, inputCls, SectionTitle, ProgressBar, Num } from '../components/ui';
import { daysBetween } from '../lib/jalali';
import { DatePick } from '../components/DatePicker';

export function RegistryPage() {
  const s = useStore();
  const [tab, setTab] = useState(s.nav.params.tab || 'equipment');
  const [adding, setAdding] = useState(false);
  const [eq, setEq] = useState<Partial<Equipment>>({ criticality: 'B', status: 'operational', deptId: 'd-mnt' });

  const eqDocs = (id: string) => s.data.documents.filter(d => d.equipmentId === id).length;

  const saveEq = () => {
    if (!eq.name || !eq.code) { s.toast('نام و کد تجهیز الزامی است.', 'err'); return; }
    const now = new Date().toISOString();
    s.setData(d => ({ ...d, equipment: [...d.equipment, { id: `eq-${Date.now().toString(36)}`, name: eq.name!, code: eq.code!, deptId: eq.deptId!, status: eq.status as Equipment['status'], criticality: eq.criticality as Equipment['criticality'], lastMaintenance: now, nextMaintenance: eq.nextMaintenance ?? new Date(Date.now() + 90 * 864e5).toISOString(), hoursRun: 0 }] }));
    s.audit('equipment_create', eq.code!, 'equipment', 'ثبت تجهیز جدید', 'info');
    s.toast('تجهیز ثبت شد.', 'ok'); setAdding(false); setEq({ criticality: 'B', status: 'operational', deptId: 'd-mnt' });
  };

  const statusFa: Record<string, [string, string]> = { operational: ['در حال کار', '#0e6b5c'], maintenance: ['تعمیرات', '#b87a12'], critical: ['بحرانی', '#c03a2e'], standby: ['رزرو', '#52708c'] };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 anim-rise">
        {([['equipment', 'تجهیزات', 'wrench'], ['projects', 'پروژه‌ها', 'project'], ['experts', 'متخصصان', 'star'], ['processes', 'فرآیندها', 'flow'], ['standards', 'استانداردها', 'badgecheck']] as const).map(([k, l, ic]) => (
          <button key={k} onClick={() => setTab(k)} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-[13px] font-bold transition ${tab === k ? 'bg-night text-gold border-night' : 'bg-panel border-line text-mute hover:border-brand hover:text-ink'}`}><I n={ic} s={16} />{l}</button>
        ))}
        {tab === 'equipment' && <div className="ms-auto"><Btn icon="plus" onClick={() => setAdding(true)}>ثبت تجهیز</Btn></div>}
      </div>

      {tab === 'equipment' && (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3 stagger">
          {s.data.equipment.map(e => {
            const days = daysBetween(new Date().toISOString(), e.nextMaintenance);
            const [stTxt, stClr] = statusFa[e.status];
            return (
              <div key={e.id} className="bg-panel border border-line rounded-xl p-4 hover:border-brand/50 hover:shadow-md transition group">
                <div className="flex items-center justify-between mb-2">
                  <span className="w-10 h-10 rounded-xl bg-night text-gold flex items-center justify-center"><I n="wrench" s={18} /></span>
                  <div className="flex gap-1.5"><Badge color={stClr}>{stTxt}</Badge><Badge color={e.criticality === 'A' ? '#c03a2e' : e.criticality === 'B' ? '#b87a12' : '#52708c'}>بحرانیت {e.criticality}</Badge></div>
                </div>
                <h3 className="text-[13.5px] font-bold group-hover:text-brand transition">{e.name}</h3>
                <p className="text-[11px] text-mute mt-0.5">{e.code} • {s.deptName(e.deptId)} • کارکرد {String(e.hoursRun).replace(/[0-9]/g, d => '۰۱۲۳۴۵۶۷۸۹'[+d])} ساعت</p>
                <div className="mt-3">
                  <div className="flex justify-between text-[11px] font-bold mb-1"><span className="text-mute">PM بعدی: {s.fmt(e.nextMaintenance)}</span><span className={days <= 7 ? 'text-crimson' : days <= 14 ? 'text-gold-deep' : 'text-brand'}><Num v={days} fa={s.lang === 'fa'} /> روز</span></div>
                  <ProgressBar v={Math.max(4, 100 - days * 1.2)} color={days <= 7 ? '#c03a2e' : days <= 14 ? '#b87a12' : '#0e6b5c'} h={5} />
                </div>
                <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-line/70">
                  <span className="text-[11px] text-mute">{eqDocs(e.id)} سند مرتبط</span>
                  <Btn size="sm" kind="ghost" icon="doc" onClick={() => s.navigate('search', { q: e.code })}>سوابق</Btn>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === 'projects' && (
        <div className="grid md:grid-cols-2 gap-3 stagger">
          {s.data.projects.map(p => (
            <div key={p.id} className="bg-panel border border-line rounded-xl p-5 hover:border-brand/50 transition">
              <div className="flex items-center justify-between mb-2">
                <Badge color={p.status === 'active' ? '#0e6b5c' : p.status === 'planning' ? '#52708c' : p.status === 'hold' ? '#b87a12' : '#7a6a52'}>{{ active: 'در اجرا', planning: 'برنامه‌ریزی', hold: 'متوقف', done: 'تکمیل' }[p.status]}</Badge>
                <span className="text-[10.5px] text-mute" dir="ltr">{p.code}</span>
              </div>
              <h3 className="font-display text-[16px] text-ink pt-1">{p.name}</h3>
              <p className="text-[11.5px] text-mute mt-1">{p.deptIds.map(d => s.deptName(d)).join(' • ')} — مدیر: {s.userName(p.managerId)}</p>
              <div className="flex items-center gap-3 mt-4">
                <div className="flex-1"><ProgressBar v={p.progress} h={8} color={p.progress >= 75 ? '#0e6b5c' : '#e5a52e'} /></div>
                <span className="font-display text-[18px] text-brand leading-none"><Num v={p.progress} fa={s.lang === 'fa'} />٪</span>
              </div>
              <p className="text-[10.5px] text-mute mt-2.5">شروع: {s.fmt(p.start)} — پایان برنامه‌ای: {s.fmt(p.end)}</p>
              <div className="flex gap-2 mt-3">
                <Btn size="sm" kind="line" icon="doc" onClick={() => s.navigate('search', { q: p.name })}>اسناد پروژه</Btn>
                <Btn size="sm" kind="ghost" icon="chart" onClick={() => s.navigate('reports')}>گزارش</Btn>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'experts' && (
        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-3 stagger">
          {s.data.experts.map(x => {
            const kCount = s.data.knowledge.filter(k => k.ownerId === x.userId).length;
            const dCount = s.data.documents.filter(d => d.ownerId === x.userId).length;
            return (
              <div key={x.id} className="bg-panel border border-line rounded-xl p-5 text-center hover:border-brand/50 hover:shadow-md transition">
                <div className="relative inline-block">
                  <span className="w-16 h-16 rounded-2xl bg-night text-gold font-display text-[26px] flex items-center justify-center pt-1 mx-auto">{x.name[0]}</span>
                  <span className={`absolute -bottom-1 -end-1 w-4 h-4 rounded-full border-2 border-panel ${x.available ? 'bg-brand-glow live-dot' : 'bg-linedark'}`} />
                </div>
                <h3 className="text-[14px] font-bold mt-3">{x.name}</h3>
                <p className="text-[11px] text-mute mt-0.5">{s.deptName(x.deptId)} • {String(x.yearsExp).replace(/[0-9]/g, d => '۰۱۲۳۴۵۶۷۸۹'[+d])} سال تجربه</p>
                <div className="flex flex-wrap justify-center gap-1 mt-3">
                  {x.fields.map(f2 => <span key={f2} className="text-[10px] font-bold bg-brand-soft text-brand-deep rounded px-2 py-0.5">{f2}</span>)}
                </div>
                <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-line/70 text-center">
                  <div><p className="font-display text-[17px] text-brand leading-none"><Num v={kCount} fa={s.lang === 'fa'} /></p><p className="text-[10px] text-mute mt-1">دانش ثبت‌شده</p></div>
                  <div><p className="font-display text-[17px] text-gold-deep leading-none"><Num v={dCount} fa={s.lang === 'fa'} /></p><p className="text-[10px] text-mute mt-1">سند</p></div>
                </div>
                <p className="text-[10.5px] text-mute mt-3" dir="ltr">{x.phone}</p>
              </div>
            );
          })}
        </div>
      )}

      {tab === 'processes' && (
        <div className="grid lg:grid-cols-2 gap-3 stagger">
          {s.data.processes.map(p => (
            <div key={p.id} className="bg-panel border border-line rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-display text-[15px] pt-0.5">{p.name}</h3>
                <Badge color="#52708c">{p.code} • SLA: {p.sla}</Badge>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {p.steps.map((st2, i) => (
                  <span key={i} className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold bg-paper border border-line rounded-lg px-2.5 py-1.5">{i + 1}. {st2}</span>
                    {i < p.steps.length - 1 && <I n="chevS" s={12} className="text-linedark rtl:rotate-180" />}
                  </span>
                ))}
              </div>
              <p className="text-[10.5px] text-mute mt-3">مالک فرآیند: {s.deptName(p.deptId)}</p>
            </div>
          ))}
        </div>
      )}

      {tab === 'standards' && (
        <div className="bg-panel border border-line rounded-2xl overflow-hidden anim-rise">
          {s.data.standards.map(st2 => (
            <div key={st2.id} className="flex items-center gap-4 px-5 py-3.5 border-b border-line/70 last:border-0 hover:bg-paper/50 transition">
              <span className="w-10 h-10 rounded-xl bg-gold-soft text-gold-deep flex items-center justify-center font-display text-[13px] pt-0.5">{st2.body.slice(0, 3)}</span>
              <div className="flex-1">
                <p className="text-[13px] font-bold">{st2.name} <span className="text-mute font-normal text-[11px]" dir="ltr">({st2.code})</span></p>
                <p className="text-[11px] text-mute mt-0.5">واحدها: {st2.deptIds.map(d => s.deptName(d)).join('، ')} • نسخه {st2.year}</p>
              </div>
              <Badge color="#0e6b5c">فعال</Badge>
            </div>
          ))}
        </div>
      )}

      <Modal open={adding} onClose={() => setAdding(false)} title="ثبت تجهیز جدید" w={520}
        footer={<><Btn kind="line" onClick={() => setAdding(false)}>انصراف</Btn><Btn icon="check" onClick={saveEq}>ثبت</Btn></>}>
        <div className="grid grid-cols-2 gap-3">
          <Field label="نام تجهیز" req><input className={inputCls} value={eq.name ?? ''} onChange={e => setEq({ ...eq, name: e.target.value })} /></Field>
          <Field label="کد (Tag No.)" req><input className={inputCls} dir="ltr" value={eq.code ?? ''} onChange={e => setEq({ ...eq, code: e.target.value })} /></Field>
          <Field label="واحد"><select className={inputCls} value={eq.deptId} onChange={e => setEq({ ...eq, deptId: e.target.value })}>{s.data.departments.filter(d => d.active).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></Field>
          <Field label="بحرانیت"><select className={inputCls} value={eq.criticality} onChange={e => setEq({ ...eq, criticality: e.target.value as 'A' | 'B' | 'C' })}><option value="A">A — حیاتی</option><option value="B">B — مهم</option><option value="C">C — عادی</option></select></Field>
          <Field label="تاریخ PM بعدی"><DatePick value={eq.nextMaintenance} onChange={v => setEq({ ...eq, nextMaintenance: v })} calendar={s.calendar} /></Field>
          <Field label="وضعیت"><select className={inputCls} value={eq.status} onChange={e => setEq({ ...eq, status: e.target.value as Equipment['status'] })}><option value="operational">در حال کار</option><option value="maintenance">تعمیرات</option><option value="standby">رزرو</option><option value="critical">بحرانی</option></select></Field>
        </div>
      </Modal>
    </div>
  );
}
