import { useMemo, useState } from 'react';
import { useStore } from '../lib/store';
import { KnowledgeItem, Lesson } from '../lib/types';
import { I, Btn, Badge, Modal, Drawer, Field, inputCls, SectionTitle, Empty, ProgressBar, Num } from '../components/ui';
import { structureKnowledge } from '../lib/ai';

const KTYPES = ['تجربه', 'عیب‌یابی', 'روش اجرایی', 'نوآوری'];

export function KnowledgePage() {
  const s = useStore();
  const [q, setQ] = useState('');
  const [fDept, setFDept] = useState(s.nav.params.dept || '');
  const [fType, setFType] = useState('');
  const [addOpen, setAddOpen] = useState(s.nav.params.add === '1');
  const [openId, setOpenId] = useState('');

  const list = useMemo(() => {
    let l = s.data.knowledge.filter(k => s.can('view', { deptId: k.deptId }));
    if (fDept) l = l.filter(k => s.inDeptScope(k.deptId, fDept));
    if (fType) l = l.filter(k => k.ktype === fType);
    if (q.trim()) { const t = q.trim().toLowerCase(); l = l.filter(k => (k.title + k.text + k.tags.join(' ')).toLowerCase().includes(t)); }
    return l.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [s, q, fDept, fType]);

  const sel = s.data.knowledge.find(k => k.id === openId);
  const qScore = (k: KnowledgeItem) => { const q = k.quality; return Math.round((q.accuracy + q.freshness + q.completeness + q.verification + q.usage + q.approval) / 6); };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 anim-rise">
        <div className="flex items-center gap-2 bg-panel border border-line rounded-lg px-3 h-10 w-72 focus-within:border-brand transition">
          <I n="search" s={15} className="text-mute" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="جستجو در دانش سازمانی…" className="bg-transparent text-[12.5px] focus:outline-none w-full" />
        </div>
        <select value={fDept} onChange={e => setFDept(e.target.value)} className={`${inputCls} !w-auto h-10`}>
          <option value="">همه واحدها</option>
          {s.data.departments.filter(d => d.active).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <select value={fType} onChange={e => setFType(e.target.value)} className={`${inputCls} !w-auto h-10`}>
          <option value="">همه انواع</option>{KTYPES.map(t => <option key={t}>{t}</option>)}
        </select>
        <div className="flex-1" />
        <Btn icon="bulb" onClick={() => setAddOpen(true)}>ثبت دانش جدید</Btn>
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3 stagger">
        {list.map(k => (
          <button key={k.id} onClick={() => setOpenId(k.id)} className="text-start bg-panel border border-line rounded-xl p-4 hover:border-brand/60 hover:shadow-md hover:-translate-y-0.5 transition-all group">
            <div className="flex items-center justify-between mb-2">
              <Badge color={k.ktype === 'عیب‌یابی' ? '#c03a2e' : k.ktype === 'نوآوری' ? '#52708c' : k.ktype === 'روش اجرایی' ? '#0e6b5c' : '#b87a12'}>{k.ktype}</Badge>
              <span className={`text-[11px] font-bold ${k.status === 'published' ? 'text-brand' : 'text-gold-deep'}`}>{k.status === 'published' ? 'منتشرشده' : 'در بازبینی'}</span>
            </div>
            <h3 className="text-[13.5px] font-bold text-ink leading-6 group-hover:text-brand transition">{k.title}</h3>
            <p className="text-[12px] text-mute mt-1.5 leading-6 line-clamp-2">{k.problem || k.text.slice(0, 120)}</p>
            <div className="flex items-center gap-2 mt-3">
              <span className="text-[10.5px] font-bold text-mute w-16">کیفیت دانش</span>
              <div className="flex-1"><ProgressBar v={qScore(k)} color={qScore(k) > 80 ? '#0e6b5c' : qScore(k) > 60 ? '#b87a12' : '#c03a2e'} h={5} /></div>
              <span className="text-[11px] font-bold tabular-nums">{qScore(k)}٪</span>
            </div>
            <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-line/70 text-[10.5px] text-mute">
              <span>{s.deptName(k.deptId)} • {s.userName(k.ownerId)}</span>
              <span className="flex items-center gap-2.5">
                <span className="flex items-center gap-1"><I n="eye" s={12} /><Num v={k.views} fa={s.lang === 'fa'} /></span>
                <span>{s.fmt(k.createdAt)}</span>
              </span>
            </div>
          </button>
        ))}
      </div>
      {list.length === 0 && <Empty icon="bulb" text="دانشی یافت نشد" sub="اولین دانش را ثبت کنید — AI آن را ساختاربندی می‌کند." />}

      {addOpen && <CaptureModal onClose={() => setAddOpen(false)} />}
      {sel && <KnowledgeDrawer k={sel} onClose={() => setOpenId('')} score={qScore(sel)} />}
    </div>
  );
}

function CaptureModal({ onClose }: { onClose: () => void }) {
  const s = useStore();
  const [raw, setRaw] = useState('');
  const [deptId, setDeptId] = useState(s.user?.departments[0] ?? 'd-mnt');
  const [ktype, setKtype] = useState('تجربه');
  const [st, setSt] = useState<ReturnType<typeof structureKnowledge> | null>(null);
  const [thinking, setThinking] = useState(false);
  const [listening, setListening] = useState(false);

  const doStructure = () => {
    if (raw.trim().length < 20) { s.toast('حداقل چند جمله بنویسید تا AI بتواند ساختاربندی کند.', 'warn'); return; }
    setThinking(true);
    s.pushJob('ساختاربندی دانش — Local LLM');
    window.setTimeout(() => { setSt(structureKnowledge(raw)); setThinking(false); s.toast('AI دانش شما را به ساختار استاندارد تبدیل کرد — بررسی و تأیید کنید.', 'ok'); }, 900);
  };

  const voice = () => {
    const SR = (window as unknown as Record<string, unknown>).webkitSpeechRecognition as (new () => { lang: string; continuous: boolean; onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void; onend: () => void; start: () => void; stop: () => void }) | undefined;
    if (!SR) { s.toast('تشخیص گفتار در این مرورگر در دسترس نیست — متن را تایپ کنید. (در استقرار سازمانی، Whisper-Fa کاملاً Offline استفاده می‌شود.)', 'warn'); return; }
    const r = new SR();
    r.lang = 'fa-IR'; r.continuous = false;
    setListening(true);
    r.onresult = (e) => { const tx = e.results[0]?.[0]?.transcript ?? ''; setRaw(v => (v ? v + ' ' : '') + tx); };
    r.onend = () => { setListening(false); s.toast('صوت شما به متن تبدیل شد (پردازش روی دستگاه).', 'ok'); };
    r.start();
    window.setTimeout(() => { try { r.stop(); } catch { /* noop */ } }, 12000);
  };

  const save = () => {
    if (!st) return;
    const now = new Date().toISOString();
    const k: KnowledgeItem = {
      id: `k-${Date.now().toString(36)}`, title: st.title.replace(' — ثبت هوشمند', ''), deptId, category: 'ثبت سریع', ktype: ktype as KnowledgeItem['ktype'],
      status: 'review', ownerId: s.user!.id, createdAt: now, modifiedAt: now,
      text: raw, problem: st.problem, cause: st.cause, solution: st.solution, result: st.result, recommendation: st.recommendation,
      tags: st.tags, quality: { accuracy: 60, freshness: 100, completeness: 70, verification: 20, usage: 0, approval: 0 }, views: 0,
    };
    s.setData(d => ({ ...d, knowledge: [k, ...d.knowledge] }));
    s.audit('knowledge_create', k.title, 'knowledge', 'ثبت دانش سریع با ساختاربندی AI محلی', 'info');
    s.notify('all', 'doc', `دانش جدید «${k.title}» در انتظار بازبینی ثبت شد.`);
    s.toast('دانش ثبت شد و برای تأیید به جریان کاری رفت.', 'ok');
    onClose();
  };

  return (
    <Modal open onClose={onClose} title="ثبت دانش جدید — فقط توضیح دهید، AI ساختار می‌دهد" w={760}
      footer={<>
        <Btn kind="line" onClick={onClose}>انصراف</Btn>
        {!st ? <Btn icon="spark" disabled={thinking} onClick={doStructure}>{thinking ? 'در حال پردازش…' : 'ساختاربندی با AI محلی'}</Btn>
          : <Btn icon="check" onClick={save}>تأیید و ثبت دانش</Btn>}
      </>}>
      {!st ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="واحد">
              <select className={inputCls} value={deptId} onChange={e => setDeptId(e.target.value)}>
                {s.data.departments.filter(d => d.active).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </Field>
            <Field label="نوع دانش">
              <select className={inputCls} value={ktype} onChange={e => setKtype(e.target.value)}>{KTYPES.map(t => <option key={t}>{t}</option>)}</select>
            </Field>
          </div>
          <Field label="توضیح ساده شما — همان‌طور که برای همکارتان تعریف می‌کنید" req>
            <textarea className={`${inputCls} min-h-[150px] leading-7`} value={raw} onChange={e => setRaw(e.target.value)}
              placeholder="مثال: پمپ P-101 دوباره نشتی داشت. بعد از دو بار تعویض سیل فهمیدیم شافت در ناحیه بوش ساییده شده. با نصب بوش جدید و هم‌راستایی لیزری مشکل برای همیشه حل شد. پیشنهاد می‌کنم قبل از تعویض مجدد سیل، شافت بررسی شود." />
          </Field>
          <div className="flex items-center justify-between">
            <button onClick={voice} className={`flex items-center gap-2 text-[12px] font-bold rounded-lg border px-3 py-2 transition ${listening ? 'border-crimson text-crimson bg-crimson-soft' : 'border-line text-ink hover:border-brand hover:text-brand'}`}>
              <I n="mic" s={15} />{listening ? 'در حال شنیدن… (Speech-to-Text روی دستگاه)' : 'ورودی صوتی (Offline STT)'}
            </button>
            <span className="text-[11px] text-mute">Text / Voice / Image / Video — معماری Knowledge Capture</span>
          </div>
        </div>
      ) : (
        <div className="space-y-3 anim-pop">
          <div className="bg-night rounded-xl p-3.5 text-white flex items-center gap-2.5">
            <I n="spark" s={18} className="text-gold" />
            <p className="text-[12px] leading-6">AI محلی متن شما را به شش جزء استاندارد دانش تبدیل کرد. هر بخش قابل ویرایش است — پس از تأیید شما وارد سازمان می‌شود.</p>
          </div>
          {([['problem', 'مسئله (Problem)', '#c03a2e'], ['cause', 'علت (Cause)', '#b87a12'], ['solution', 'راه‌حل (Solution)', '#0e6b5c'], ['result', 'نتیجه (Result)', '#52708c'], ['recommendation', 'پیشنهاد (Recommendation)', '#6e5b8c']] as const).map(([key, label, color]) => (
            <Field key={key} label={label}>
              <textarea className={`${inputCls} min-h-[64px] leading-6`} value={st[key] ?? ''} onChange={e => setSt({ ...st, [key]: e.target.value })} style={{ borderInlineStartWidth: 3, borderInlineStartColor: color }} />
            </Field>
          ))}
          <Field label="برچسب‌های پیشنهادی AI">
            <div className="flex flex-wrap gap-1.5">
              {st.tags.map(tg => <span key={tg} className="text-[11.5px] font-bold bg-brand-soft text-brand-deep rounded-lg px-2.5 py-1.5">#{tg}</span>)}
            </div>
          </Field>
        </div>
      )}
    </Modal>
  );
}

function KnowledgeDrawer({ k, onClose, score }: { k: KnowledgeItem; onClose: () => void; score: number }) {
  const s = useStore();
  const canApprove = s.can('approve', { deptId: k.deptId });
  const approve = () => {
    s.setData(d => ({ ...d, knowledge: d.knowledge.map(x => x.id === k.id ? { ...x, status: 'published', quality: { ...x.quality, approval: 100, verification: 90 } } : x) }));
    s.audit('knowledge_approve', k.title, 'knowledge', 'تأیید و انتشار دانش', 'info');
    s.notify(k.ownerId, 'approval', `دانش «${k.title}» تأیید و منتشر شد.`);
    s.toast('دانش تأیید و منتشر شد.', 'ok');
  };
  return (
    <Drawer open onClose={onClose} w={640} title="جزئیات دانش">
      <div className="space-y-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge color="#0e6b5c">{k.ktype}</Badge>
            <Badge color={k.status === 'published' ? '#0e6b5c' : '#b87a12'}>{k.status === 'published' ? 'منتشرشده' : 'در بازبینی'}</Badge>
            <Badge color={score > 80 ? '#0e6b5c' : '#b87a12'}>کیفیت {score}٪</Badge>
          </div>
          <h3 className="font-display text-[19px] leading-relaxed">{k.title}</h3>
          <p className="text-[11.5px] text-mute mt-1">{s.deptName(k.deptId)} • {s.userName(k.ownerId)} • {s.fmtDual(k.createdAt)} • {k.views} بازدید</p>
        </div>
        {([['مسئله', k.problem, '#c03a2e'], ['علت ریشه‌ای', k.cause, '#b87a12'], ['راه‌حل اجراشده', k.solution, '#0e6b5c'], ['نتیجه', k.result, '#52708c'], ['پیشنهاد به سازمان', k.recommendation, '#6e5b8c']] as const).map(([l, v, c], i) => v && (
          <div key={i} className="border border-line rounded-xl p-3.5" style={{ borderInlineStartWidth: 4, borderInlineStartColor: c }}>
            <p className="text-[11px] font-bold mb-1.5" style={{ color: c }}>{l}</p>
            <p className="text-[13px] leading-7 text-ink">{v}</p>
          </div>
        ))}
        <div>
          <p className="text-[12px] font-bold mb-2">شاخص‌های کیفیت دانش (Knowledge Quality)</p>
          <div className="grid grid-cols-2 gap-2">
            {([['دقت', k.quality.accuracy], ['تازگی', k.quality.freshness], ['کامل بودن', k.quality.completeness], ['تأیید کارشناسی', k.quality.verification], ['میزان استفاده', k.quality.usage], ['تأیید نهایی', k.quality.approval]] as const).map(([l, v], i) => (
              <div key={i} className="border border-line rounded-lg p-2.5">
                <div className="flex justify-between text-[11px] font-bold mb-1.5"><span className="text-mute">{l}</span><span>{v}٪</span></div>
                <ProgressBar v={v} h={4} color={v > 75 ? '#0e6b5c' : v > 45 ? '#b87a12' : '#c03a2e'} />
              </div>
            ))}
          </div>
          {k.quality.freshness < 70 && <p className="mt-2 text-[11.5px] text-gold-deep bg-gold-soft border border-gold/40 rounded-lg p-2.5 flex items-center gap-2"><I n="refresh" s={14} />AI این دانش را «احتمالاً منسوخ» شناسایی کرده — Review Request برای مالک ایجاد شده است.</p>}
        </div>
        <div className="flex flex-wrap gap-1.5">{k.tags.map(tg => <span key={tg} className="text-[11px] font-bold bg-paper border border-line rounded-md px-2 py-1">#{tg}</span>)}</div>
        {canApprove && k.status === 'review' && <Btn kind="gold" icon="check" onClick={approve}>تأیید و انتشار دانش</Btn>}
      </div>
    </Drawer>
  );
}

/* ============================ درس‌آموخته‌ها ============================ */
export function LessonsPage() {
  const s = useStore();
  const [add, setAdd] = useState(false);
  const [f, setF] = useState<Partial<Lesson>>({ deptId: s.user?.departments[0] ?? 'd-mnt', status: 'open' });
  const list = s.data.lessons.filter(l => s.can('view', { deptId: l.deptId })).sort((a, b) => b.date.localeCompare(a.date));

  const save = () => {
    if (!f.title || !f.problem) { s.toast('عنوان و مسئله الزامی است.', 'warn'); return; }
    const l: Lesson = {
      id: `l-${Date.now().toString(36)}`, title: f.title!, deptId: f.deptId!, date: new Date().toISOString(), ownerId: s.user!.id,
      situation: f.situation ?? '', problem: f.problem!, rootCause: f.rootCause ?? '', action: f.action ?? '',
      result: f.result ?? '', recommendation: f.recommendation ?? '', tags: (f.tags as string[] | undefined) ?? [], status: 'open',
    };
    s.setData(d => ({ ...d, lessons: [l, ...d.lessons] }));
    s.audit('lesson_create', l.title, 'lesson', 'ثبت درس‌آموخته جدید', 'info');
    s.toast('درس‌آموخته با ساختار استاندارد ثبت شد.', 'ok');
    setAdd(false); setF({ deptId: s.user?.departments[0] ?? 'd-mnt' });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between anim-rise">
        <SectionTitle icon="bulb" sub="ساختار استاندارد: موقعیت ← مسئله ← ریشه ← اقدام ← نتیجه ← پیشنهاد">درس‌آموخته‌های سازمان</SectionTitle>
        <Btn icon="plus" onClick={() => setAdd(true)}>ثبت درس‌آموخته</Btn>
      </div>
      <div className="grid lg:grid-cols-2 gap-3 stagger">
        {list.map(l => (
          <div key={l.id} className="bg-panel border border-line rounded-xl p-4 hover:border-brand/50 transition group">
            <div className="flex items-center justify-between mb-2">
              <Badge color={l.status === 'open' ? '#b87a12' : '#0e6b5c'}>{l.status === 'open' ? 'باز — در پیگیری' : 'بسته‌شده'}</Badge>
              <span className="text-[10.5px] text-mute">{s.fmt(l.date)} • {s.deptName(l.deptId)}</span>
            </div>
            <h3 className="text-[13.5px] font-bold leading-6 group-hover:text-brand transition">{l.title}</h3>
            <div className="mt-3 space-y-1.5 text-[12px] leading-6">
              <p><b className="text-crimson">مسئله:</b> <span className="text-ink/85">{l.problem}</span></p>
              <p><b className="text-gold-deep">ریشه:</b> <span className="text-ink/85">{l.rootCause}</span></p>
              <p><b className="text-brand-deep">اقدام:</b> <span className="text-ink/85">{l.action}</span></p>
              <p><b className="text-steel">پیشنهاد:</b> <span className="text-ink/85">{l.recommendation}</span></p>
            </div>
            {l.status === 'open' && s.user?.role !== 'viewer' && (
              <Btn size="sm" kind="ghost" icon="check" className="mt-3" onClick={() => { s.setData(d => ({ ...d, lessons: d.lessons.map(x => x.id === l.id ? { ...x, status: 'closed' } : x) })); s.toast('اقدامات درس‌آموخته تکمیل و بسته شد.', 'ok'); }}>بستن اقدامات</Btn>
            )}
          </div>
        ))}
      </div>

      <Modal open={add} onClose={() => setAdd(false)} title="ثبت درس‌آموخته" w={680}
        footer={<><Btn kind="line" onClick={() => setAdd(false)}>انصراف</Btn><Btn icon="check" onClick={save}>ثبت</Btn></>}>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2"><Field label="عنوان" req><input className={inputCls} value={f.title ?? ''} onChange={e => setF({ ...f, title: e.target.value })} /></Field></div>
          <Field label="واحد"><select className={inputCls} value={f.deptId} onChange={e => setF({ ...f, deptId: e.target.value })}>{s.data.departments.filter(d => d.active).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></Field>
          <Field label="پروژه مرتبط"><select className={inputCls} value={(f as Lesson).projectId ?? ''} onChange={e => setF({ ...f, projectId: e.target.value || undefined })}><option value="">—</option>{s.data.projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
          {([['situation', 'موقعیت (Situation)'], ['problem', 'مسئله (Problem)'], ['rootCause', 'علت ریشه‌ای (Root Cause)'], ['action', 'اقدام (Action)'], ['result', 'نتیجه (Result)'], ['recommendation', 'پیشنهاد (Recommendation)']] as const).map(([k, l]) => (
            <div key={k} className="col-span-2"><Field label={l}><textarea className={`${inputCls} min-h-[60px] leading-6`} value={(f[k] as string) ?? ''} onChange={e => setF({ ...f, [k]: e.target.value })} /></Field></div>
          ))}
        </div>
      </Modal>
    </div>
  );
}
