import { useMemo, useRef, useState, useEffect } from 'react';
import { useStore } from '../lib/store';
import { I, Btn, Badge, SectionTitle, Empty, inputCls } from '../components/ui';
import { ragAnswer, RagContext } from '../lib/ai';
import { ChatMsg } from '../lib/types';
import { ClsBadge } from '../components/Layout';

const SUGGESTIONS = [
  'حد هشدار ارتعاش پمپ P-101 چقدر است؟',
  'ریشه خرابی کمپرسور C-3 چه بود؟',
  'برای جوشکاری خط بخار چه پیش‌گرمی لازم است؟',
  'RPO و RTO پشتیبان‌گیری چقدر است؟',
  'نحوه کالیبراسیون ترانسمیترهای فشار چیست؟',
  'قرارداد خرید توربین چه شرایطی دارد؟',
];

export function AssistantPage() {
  const s = useStore();
  const [msgs, setMsgs] = useState<ChatMsg[]>([{
    id: 'm0', role: 'ai', ts: new Date().toISOString(),
    text: 'سلام! دستیار هوشمند نیپکو هستم — کاملاً Local و آفلاین.\nفقط از اسنادی پاسخ می‌دهم که سطح دسترسی شما اجازه می‌دهد (Secure RAG) و هر پاسخ منبع دارد. اگر اطلاعاتی در بایگانی مجاز شما نباشد، صریحاً می‌گویم «یافت نشد».',
  }]);
  const [q, setQ] = useState('');
  const [thinking, setThinking] = useState(false);
  const [stage, setStage] = useState(0);
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs, thinking]);

  const corpus: RagContext[] = useMemo(() => [
    ...s.visibleDocs().filter(d => s.can('ai_query', { doc: d })).map(d => ({
      code: d.code, title: d.title, text: `${d.summary} ${d.text}`, date: s.fmt(d.modifiedAt), dept: s.deptName(d.deptId), kind: 'سند',
    })),
    ...s.data.knowledge.filter(k => k.status === 'published' && s.can('view', { deptId: k.deptId })).map(k => ({
      code: 'K-' + k.id.slice(2), title: k.title, text: `${k.problem ?? ''} ${k.cause ?? ''} ${k.solution ?? ''} ${k.result ?? ''} ${k.recommendation ?? ''} ${k.text}`, date: s.fmt(k.createdAt), dept: s.deptName(k.deptId), kind: 'دانش',
    })),
    ...s.data.lessons.filter(l => s.can('view', { deptId: l.deptId })).map(l => ({
      code: 'L-' + l.id.slice(2), title: l.title, text: `${l.problem} ${l.rootCause} ${l.action} ${l.result} ${l.recommendation}`, date: s.fmt(l.date), dept: s.deptName(l.deptId), kind: 'درس‌آموخته',
    })),
  ], [s]);

  const ask = (text: string) => {
    if (!text.trim() || thinking) return;
    setMsgs(m => [...m, { id: `m${Date.now()}`, role: 'user', text, ts: new Date().toISOString() }]);
    setQ(''); setThinking(true); setStage(0);
    const stages = ['بررسی دسترسی کاربر…', 'بازیابی برداری از منابع مجاز…', 'رتبه‌بندی (Reranking)…', 'تولید پاسخ با LLM محلی…'];
    stages.forEach((_, i) => window.setTimeout(() => setStage(i + 1), (i + 1) * 420));
    s.audit('ai_query', text.slice(0, 80), 'ai', `پرسش از دستیار: «${text.slice(0, 60)}»`, 'info');
    window.setTimeout(() => {
      const a = ragAnswer(text, corpus);
      if (!a.found) s.audit('ai_answer_denied', text.slice(0, 80), 'ai', 'پاسخ به دلیل نبود منبع مجاز رد شد (ضدتوهم)', 'warn');
      setMsgs(m => [...m, { id: `m${Date.now()}a`, role: 'ai', text: a.text, citations: a.citations, ts: new Date().toISOString() }]);
      setThinking(false);
    }, 1900);
  };

  return (
    <div className="grid lg:grid-cols-[1fr_300px] gap-4 items-start">
      <div className="bg-panel border border-line rounded-2xl flex flex-col anim-rise" style={{ height: 'calc(100vh - 130px)' }}>
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-line">
          <span className="w-9 h-9 rounded-xl bg-night text-gold flex items-center justify-center"><I n="bot" s={19} /></span>
          <div>
            <p className="font-display text-[16px] leading-none pt-0.5">دستیار هوشمند نیپکو</p>
            <p className="text-[10.5px] text-mute mt-1 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-glow live-dot" />
              {s.data.settings.ai.llm} • Secure RAG • ضدتوهم
            </p>
          </div>
          <Badge color="#0e6b5c" className="ms-auto">{corpus.length} منبع مجاز</Badge>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-paper/40">
          {msgs.map(m => (
            <div key={m.id} className={`flex gap-2.5 anim-rise ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${m.role === 'user' ? 'bg-brand text-white' : 'bg-night text-gold'}`}>
                <I n={m.role === 'user' ? 'user' : 'bot'} s={15} />
              </span>
              <div className={`max-w-[82%] rounded-2xl px-4 py-3 ${m.role === 'user' ? 'bg-brand text-white rounded-ee-md' : 'bg-panel border border-line rounded-es-md'}`}>
                <p className={`text-[13px] leading-7 whitespace-pre-line ${m.role === 'user' ? '' : 'text-ink'}`}>{m.text}</p>
                {m.citations && m.citations.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-line">
                    <p className="text-[10.5px] font-bold text-mute mb-1.5 flex items-center gap-1"><I n="link" s={11} />منابع استناد (Citation)</p>
                    <div className="flex flex-wrap gap-1.5">
                      {m.citations.map((c, i) => (
                        <button key={i} onClick={() => { const d = s.data.documents.find(x => x.code === c.code); if (d) s.navigate('documents', { open: d.id }); else s.toast(`منبع «${c.title}» در مرکز مربوطه قابل مشاهده است.`, 'info'); }}
                          className="text-[11px] font-bold bg-brand-soft text-brand-deep hover:bg-brand hover:text-white rounded-lg px-2.5 py-1.5 transition text-start">
                          <span dir="ltr">{c.code}</span> — {c.title.slice(0, 40)}{c.title.length > 40 ? '…' : ''}<br />
                          <span className="font-normal opacity-75">{c.dept} • {c.date}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
          {thinking && (
            <div className="flex gap-2.5 anim-fade">
              <span className="w-8 h-8 rounded-lg bg-night text-gold flex items-center justify-center shrink-0"><I n="bot" s={15} /></span>
              <div className="bg-panel border border-line rounded-2xl rounded-es-md px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <span className="w-3.5 h-3.5 border-2 border-brand border-t-transparent rounded-full" style={{ animation: 'spin .7s linear infinite' }} />
                  <span className="text-[12.5px] font-bold text-brand-deep">{['بررسی دسترسی کاربر…', 'بازیابی برداری از منابع مجاز…', 'رتبه‌بندی (Reranking)…', 'تولید پاسخ با LLM محلی…'][stage]}</span>
                </div>
                <div className="flex gap-1 mt-2">
                  {[0, 1, 2, 3].map(i => <span key={i} className={`h-1 flex-1 rounded-full transition-colors ${stage > i ? 'bg-brand' : 'bg-line'}`} />)}
                </div>
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        <div className="p-4 border-t border-line bg-panel">
          <div className="flex flex-wrap gap-1.5 mb-3">
            {SUGGESTIONS.map(sg => (
              <button key={sg} onClick={() => ask(sg)} className="text-[11px] font-semibold border border-line rounded-full px-3 py-1.5 text-mute hover:text-brand hover:border-brand hover:bg-brand-soft transition">{sg}</button>
            ))}
          </div>
          <form onSubmit={e => { e.preventDefault(); ask(q); }} className="flex gap-2">
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="پرسش خود را بنویسید — پاسخ فقط از منابع مجاز شما…" className={`${inputCls} h-11`} />
            <Btn size="lg" icon="send" onClick={() => ask(q)}>پرسش</Btn>
          </form>
        </div>
      </div>

      <div className="space-y-4">
        <div className="bg-panel border border-line rounded-2xl p-5 anim-rise">
          <SectionTitle icon="flow" sub="مسیر امن هر پرسش">RAG چگونه کار می‌کند؟</SectionTitle>
          <div className="space-y-1.5">
            {['احراز هویت', 'بررسی Permission', 'بازیابی امن (Secure Retrieval)', 'جستجوی برداری Local', 'رتبه‌بندی مجدد', 'LLM محلی (بدون اینترنت)', 'پاسخ + استناد منبع'].map((st2, i) => (
              <div key={i} className="flex items-center gap-2.5 text-[12px] font-bold">
                <span className="w-6 h-6 rounded-lg bg-night text-gold flex items-center justify-center text-[10.5px] font-display pt-0.5 shrink-0">{i + 1}</span>
                {st2}
              </div>
            ))}
          </div>
        </div>
        <div className="bg-panel border border-line rounded-2xl p-5 anim-rise">
          <SectionTitle icon="link" sub="Person ↔ Department ↔ Document ↔ Equipment ↔ Project">Knowledge Graph سازمان</SectionTitle>
          <KnowledgeMiniGraph />
        </div>
        <div className="bg-night text-white rounded-2xl p-5 anim-rise">
          <p className="font-display text-[15px] text-gold pt-0.5 mb-2">سیاست ضدتوهم</p>
          <p className="text-[12px] leading-6 text-white/75">اگر پاسخ در اسناد مجاز شما موجود نباشد، دستیار می‌گوید: «اطلاعات موردنظر در بایگانی مجاز فعلی یافت نشد.» — هرگز اطلاعات ساخته نمی‌شود.</p>
          <p className="text-[12px] leading-6 text-white/75 mt-2">اسناد غیرمجاز حتی اگر ID آن‌ها را بدانید، وارد Corpus پاسخ نمی‌شوند (Secure RAG).</p>
        </div>
        <div className="bg-panel border border-line rounded-2xl p-5 anim-rise">
          <SectionTitle icon="list" sub="شکاف‌های دانش شناسایی‌شده">Knowledge Gaps</SectionTitle>
          <div className="space-y-2">
            {['روش تعویض پره‌های توربین', 'تنظیمات رله دیفرانسیل ترانس TR-1', 'رویه خرید اضطراری قطعات'].map((g, i) => (
              <div key={i} className="flex items-center justify-between gap-2 border border-line rounded-lg px-3 py-2">
                <span className="text-[12px] font-semibold">{g}</span>
                <Btn size="sm" kind="ghost" icon="bulb" onClick={() => { s.navigate('knowledge', { add: '1' }); }}>ثبت دانش</Btn>
              </div>
            ))}
            <p className="text-[10.5px] text-mute leading-5">تحلیل پرسش‌های بی‌پاسخ ۳۰ روز اخیر — موضوعاتی که سازمان هنوز دانش ثبت‌شده ندارد.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/** گراف دانش فشرده — ارتباط واحدها، اسناد، تجهیزات و پروژه‌ها */
function KnowledgeMiniGraph() {
  const s = useStore();
  const [hov, setHov] = useState<string | null>(null);
  const units = s.data.departments.filter(d => d.parentId === 'd0' && d.active).slice(0, 7);
  const cx = 150, cy = 120, R = 88;
  const pos = (i: number, n: number) => ({ x: cx + R * Math.cos((Math.PI * 2 * i) / n - Math.PI / 2), y: cy + R * Math.sin((Math.PI * 2 * i) / n - Math.PI / 2) });
  const count = (id: string) => s.data.documents.filter(d => s.inDeptScope(d.deptId, id)).length + s.data.knowledge.filter(k => s.inDeptScope(k.deptId, id)).length;
  return (
    <div>
      <svg viewBox="0 0 300 240" className="w-full block">
        {units.map((u, i) => {
          const p = pos(i, units.length);
          return <line key={`l${i}`} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke={hov === u.id ? u.color : '#d9e2e0'} strokeWidth={hov === u.id ? 2.2 : 1.3} strokeDasharray={hov === u.id ? 'none' : '4 4'} className="transition-all" />;
        })}
        {units.map((u, i) => {
          const p = pos(i, units.length);
          const c = count(u.id);
          const r = 13 + Math.min(12, c * 1.6);
          return (
            <g key={u.id} className="cursor-pointer" onMouseEnter={() => setHov(u.id)} onMouseLeave={() => setHov(null)} onClick={() => s.navigate('documents', { dept: u.id })}>
              <circle cx={p.x} cy={p.y} r={r} fill={u.color} opacity={hov === u.id ? 1 : 0.85} className="transition-all" />
              <text x={p.x} y={p.y + 3.5} textAnchor="middle" fontSize="10" fontWeight="700" fill="#fff">{c}</text>
              <text x={p.x} y={p.y + r + 12} textAnchor="middle" fontSize="9" fontWeight="700" fill={hov === u.id ? u.color : '#5b6b70'}>{u.name}</text>
            </g>
          );
        })}
        <circle cx={cx} cy={cy} r="24" fill="#0d1f1c" />
        <circle cx={cx} cy={cy} r="24" fill="none" stroke="#e5a52e" strokeWidth="1.5" strokeDasharray="3 4" />
        <text x={cx} y={cy - 1} textAnchor="middle" fontSize="9.5" fontWeight="700" fill="#e5a52e">گراف</text>
        <text x={cx} y={cy + 10} textAnchor="middle" fontSize="9.5" fontWeight="700" fill="#fff">دانش</text>
      </svg>
      <p className="text-[10.5px] text-mute leading-5 mt-1">اندازه هر گره = تعداد اسناد و دانش واحد. کلیک روی هر گره، آرشیو همان واحد را باز می‌کند. یال‌های پررنگ، ارتباط‌های فعال پروژه/تجهیز را نشان می‌دهند.</p>
    </div>
  );
}

/* ============================ جستجوی سازمانی ============================ */
export function SearchPage() {
  const s = useStore();
  const [q, setQ] = useState(s.nav.params.q || '');
  const [kind, setKind] = useState('');
  const [fDept, setFDept] = useState('');
  const [fCls, setFCls] = useState('');
  useEffect(() => { if (s.nav.params.q) setQ(s.nav.params.q); }, [s.nav.params.q]);

  const results = useMemo(() => {
    if (q.trim().length < 2) return [];
    const t = q.trim().toLowerCase();
    const hit = (txt: string) => txt.toLowerCase().includes(t);
    const out: { kind: string; title: string; sub: string; snippet: string; id: string; page: string; params: Record<string, string>; cls?: string }[] = [];
    if (!kind || kind === 'doc') s.visibleDocs().filter(d => (!fDept || s.inDeptScope(d.deptId, fDept)) && (!fCls || d.classification === fCls) && (hit(d.title) || hit(d.text) || hit(d.tags.join(' ')) || hit(d.code))).forEach(d => out.push({ kind: 'سند', title: d.title, sub: `${d.code} • ${s.deptName(d.deptId)} • ${s.fmt(d.modifiedAt)}`, snippet: d.summary || d.text.slice(0, 140), id: d.id, page: 'documents', params: { open: d.id }, cls: d.classification }));
    if (!kind || kind === 'kn') s.data.knowledge.filter(k => s.can('view', { deptId: k.deptId }) && (!fDept || s.inDeptScope(k.deptId, fDept)) && (hit(k.title) || hit(k.text) || hit(k.tags.join(' ')))).forEach(k => out.push({ kind: 'دانش', title: k.title, sub: `${k.ktype} • ${s.deptName(k.deptId)}`, snippet: (k.solution || k.text).slice(0, 140), id: k.id, page: 'knowledge', params: {} }));
    if (!kind || kind === 'lesson') s.data.lessons.filter(l => s.can('view', { deptId: l.deptId }) && (hit(l.title) || hit(l.problem) || hit(l.recommendation))).forEach(l => out.push({ kind: 'درس‌آموخته', title: l.title, sub: `${s.deptName(l.deptId)} • ${s.fmt(l.date)}`, snippet: l.recommendation.slice(0, 140), id: l.id, page: 'lessons', params: {} }));
    if (!kind || kind === 'eq') s.data.equipment.filter(e => hit(e.name) || hit(e.code)).forEach(e => out.push({ kind: 'تجهیز', title: e.name, sub: `${e.code} • ${s.deptName(e.deptId)}`, snippet: `بحرانیت ${e.criticality} — PM بعدی: ${s.fmt(e.nextMaintenance)}`, id: e.id, page: 'registry', params: {} }));
    if (!kind || kind === 'expert') s.data.experts.filter(x => hit(x.name) || hit(x.fields.join(' '))).forEach(x => out.push({ kind: 'متخصص', title: x.name, sub: x.fields.join(' • '), snippet: `تجربه ${x.yearsExp} سال — ${x.skills.join('، ')}`, id: x.id, page: 'registry', params: { tab: 'experts' } }));
    if (!kind || kind === 'prj') s.data.projects.filter(p => hit(p.name)).forEach(p => out.push({ kind: 'پروژه', title: p.name, sub: `${p.code} • پیشرفت ${p.progress}٪`, snippet: p.deptIds.map(d => s.deptName(d)).join('، '), id: p.id, page: 'registry', params: { tab: 'projects' } }));
    return out;
  }, [q, kind, fDept, fCls, s]);

  const mark = (txt: string) => {
    if (q.trim().length < 2) return txt;
    const i = txt.toLowerCase().indexOf(q.trim().toLowerCase());
    if (i < 0) return txt.slice(0, 160);
    return <>{txt.slice(Math.max(0, i - 40), i)}<mark className="bg-gold-soft text-gold-deep rounded px-0.5 font-bold">{txt.slice(i, i + q.trim().length)}</mark>{txt.slice(i + q.trim().length, i + q.trim().length + 120)}…</>;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="bg-panel border border-line rounded-2xl p-5 anim-rise">
        <SectionTitle icon="search" sub="جستجوی سراسری در اسناد، دانش، درس‌آموخته‌ها، تجهیزات، متخصصان و پروژه‌ها — فقط منابع مجاز شما">جستجوی سازمانی</SectionTitle>
        <form onSubmit={e => e.preventDefault()} className="flex items-center gap-2 border-2 border-linedark rounded-xl px-4 h-13 h-[52px] focus-within:border-brand transition bg-paper/50">
          <I n="search" s={20} className="text-brand" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="مثلاً: ارتعاش پمپ، کالیبراسیون، قرارداد توربین…" className="bg-transparent text-[15px] focus:outline-none w-full" autoFocus />
          {q && <button onClick={() => setQ('')} className="text-mute hover:text-crimson"><I n="x" s={16} /></button>}
        </form>
        <div className="flex flex-wrap gap-2 mt-3">
          {[['', 'همه'], ['doc', 'اسناد'], ['kn', 'دانش'], ['lesson', 'درس‌آموخته'], ['eq', 'تجهیزات'], ['expert', 'متخصصان'], ['prj', 'پروژه‌ها']].map(([k, l]) => (
            <button key={k} onClick={() => setKind(k)} className={`text-[11.5px] font-bold rounded-full px-3 py-1.5 border transition ${kind === k ? 'bg-night text-gold border-night' : 'border-line text-mute hover:border-brand hover:text-brand'}`}>{l}</button>
          ))}
          <select value={fDept} onChange={e => setFDept(e.target.value)} className={`${inputCls} !w-auto !py-1.5 !text-[11.5px]`}>
            <option value="">همه واحدها</option>{s.data.departments.filter(d => d.active).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <select value={fCls} onChange={e => setFCls(e.target.value)} className={`${inputCls} !w-auto !py-1.5 !text-[11.5px]`}>
            <option value="">همه طبقه‌بندی‌ها</option>{['public', 'internal', 'confidential', 'topsecret'].map(c => <option key={c} value={c}>{c === 'public' ? 'عمومی' : c === 'internal' ? 'داخلی' : c === 'confidential' ? 'محرمانه' : 'بسیار محرمانه'}</option>)}
          </select>
        </div>
      </div>

      {q.trim().length >= 2 && (
        <p className="text-[12px] text-mute anim-fade px-1"><b className="text-brand">{results.length}</b> نتیجه برای «{q}» — نتایج بر اساس دسترسی شما فیلتر شده‌اند (IDOR-Safe).</p>
      )}

      <div className="space-y-2.5 stagger">
        {results.map(r => (
          <button key={`${r.kind}-${r.id}`} onClick={() => s.navigate(r.page, r.params)} className="w-full text-start bg-panel border border-line rounded-xl p-4 hover:border-brand/60 hover:shadow-md transition group">
            <div className="flex items-center gap-2 mb-1.5">
              <Badge color={r.kind === 'سند' ? '#0e6b5c' : r.kind === 'دانش' ? '#b87a12' : r.kind === 'درس‌آموخته' ? '#52708c' : r.kind === 'تجهیز' ? '#c03a2e' : r.kind === 'متخصص' ? '#6e5b8c' : '#7a6a52'}>{r.kind}</Badge>
              {r.cls && <ClsBadge c={r.cls} />}
              <span className="text-[10.5px] text-mute ms-auto">{r.sub}</span>
            </div>
            <h3 className="text-[14px] font-bold text-ink group-hover:text-brand transition">{r.title}</h3>
            <p className="text-[12.5px] text-mute mt-1 leading-6">{mark(r.snippet)}</p>
          </button>
        ))}
      </div>
      {q.trim().length >= 2 && results.length === 0 && (
        <Empty icon="search" text="چیزی یافت نشد" sub="این پرسش به‌عنوان Knowledge Gap ثبت شد — اگر دانشی در این موضوع دارید، ثبت کنید." />
      )}
    </div>
  );
}
