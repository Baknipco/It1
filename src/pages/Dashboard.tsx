import { useMemo, useState } from 'react';
import { useStore, DOC_STATUS, clsOf } from '../lib/store';
import { I, Btn, Badge, Drawer, SectionTitle, ProgressBar, Num } from '../components/ui';
import { AreaChart, Donut, GroupBars, HBars, Spark } from '../components/charts';
import { OrgChart } from '../components/OrgChart';
import { lastJalaliMonths, jalMonthKey, daysBetween } from '../lib/jalali';

const WIDGETS = [
  { id: 'trend', fa: 'روند دانش و اسناد' }, { id: 'status', fa: 'وضعیت اسناد' },
  { id: 'compare', fa: 'مقایسه واحدها' }, { id: 'approvals', fa: 'نیازمند تأیید' },
  { id: 'expiring', fa: 'در آستانه انقضا' }, { id: 'activity', fa: 'فعالیت اخیر' },
  { id: 'alerts', fa: 'هشدارها' }, { id: 'storage', fa: 'فضای ذخیره‌سازی' },
];

export function DashboardPage() {
  const s = useStore();
  const [selDept, setSelDept] = useState<string | null>(null);
  const [customize, setCustomize] = useState(false);
  const [hidden, setHidden] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('nipco-widgets') || '[]'); } catch { return []; }
  });
  const toggleWidget = (id: string) => {
    setHidden(h => { const n = h.includes(id) ? h.filter(x => x !== id) : [...h, id]; localStorage.setItem('nipco-widgets', JSON.stringify(n)); return n; });
  };

  const docs = s.visibleDocs();
  const knowledge = s.data.knowledge;
  const months = lastJalaliMonths(12);
  const docSeries = months.map(m => s.data.documents.filter(d => jalMonthKey(d.createdAt) === m.key).length);
  const knSeries = months.map(m => knowledge.filter(k => jalMonthKey(k.createdAt) === m.key).length);
  const trend = months.map((m, i) => docSeries[i] + knSeries[i]);

  const statusParts = useMemo(() => {
    const map: Record<string, number> = {};
    docs.forEach(d => { map[d.status] = (map[d.status] || 0) + 1; });
    return Object.entries(map).map(([k, v]) => ({ label: DOC_STATUS[k]?.fa ?? k, v, color: DOC_STATUS[k]?.color ?? '#5b6b70' }));
  }, [docs]);

  const pending = docs.filter(d => d.status === 'review' || d.status === 'approved');
  const expiring = docs.filter(d => d.expiresAt && daysBetween(new Date().toISOString(), d.expiresAt) <= 45 && d.status !== 'archived' && d.status !== 'expired');
  const totalKB = s.data.documents.reduce((a, d) => a + d.sizeKB, 0);
  const storagePct = Math.min(100, (totalKB / (512 * 1024)) * 100);
  const deptStats = (id: string) => ({
    docs: s.data.documents.filter(d => s.inDeptScope(d.deptId, id)).length,
    knowledge: knowledge.filter(k => s.inDeptScope(k.deptId, id)).length,
    users: s.data.users.filter(u => u.departments.some(dep => s.inDeptScope(dep, id))).length,
  });

  const topUnits = s.data.departments.filter(d => d.parentId === 'd0' && d.active).slice(0, 6);
  const compare = {
    groups: topUnits.map(d => d.name),
    series: [
      { name: 'اسناد', color: '#0e6b5c', values: topUnits.map(d => deptStats(d.id).docs) },
      { name: 'دانش', color: '#e5a52e', values: topUnits.map(d => deptStats(d.id).knowledge) },
      { name: 'کاربران', color: '#52708c', values: topUnits.map(d => deptStats(d.id).users) },
    ],
  };

  const activity = s.data.audit.slice(0, 8);
  const alerts = [
    ...s.data.equipment.filter(e => daysBetween(new Date().toISOString(), e.nextMaintenance) <= 14).map(e => ({ icon: 'wrench', text: `PM تجهیز ${e.code} تا ${daysBetween(new Date().toISOString(), e.nextMaintenance)} روز دیگر`, tone: 'warn' })),
    ...knowledge.filter(k => k.quality.freshness < 70).map(k => ({ icon: 'refresh', text: `دانش «${k.title.slice(0, 38)}…» نیازمند بازبینی (تازگی ${k.quality.freshness}٪)`, tone: 'info' })),
    ...s.data.audit.filter(a => a.severity === 'critical').slice(0, 2).map(a => ({ icon: 'shield', text: a.details, tone: 'crit' })),
  ];

  const sel = s.data.departments.find(d => d.id === selDept);
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'صبح بخیر' : hour < 17 ? 'ظهر بخیر' : 'عصر بخیر';
  const show = (id: string) => !hidden.includes(id);

  return (
    <div className="space-y-5">
      {/* نوار خوش‌آمد + اقدامات سریع */}
      <div className="bg-night text-white rounded-2xl p-5 md:p-6 relative overflow-hidden anim-rise">
        <div className="absolute inset-0 opacity-[0.35]" style={{ backgroundImage: 'radial-gradient(ellipse 500px 240px at 15% 0%, rgba(25,161,132,.5), transparent 60%)' }} />
        <div className="relative flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[260px]">
            <p className="text-[12px] text-white/60">{s.fmtLong(new Date().toISOString())} — <span dir="ltr">{new Date().toLocaleDateString('en-GB')}</span></p>
            <h1 className="font-display text-[26px] md:text-[30px] pt-1.5 leading-tight">{greet}، {s.user?.name} <span className="text-gold">عزیز</span></h1>
            <p className="text-[12.5px] text-white/65 mt-1.5 max-w-xl leading-6">
              {s.data.documents.filter(d => jalMonthKey(d.createdAt) === jalMonthKey(new Date().toISOString())).length} سند و {knowledge.filter(k => jalMonthKey(k.createdAt) === jalMonthKey(new Date().toISOString())).length} دانش این ماه ثبت شده است. {pending.length} مورد در انتظار تأیید دارید.
            </p>
          </div>
          <div className="flex gap-2">
            <Btn kind="gold" icon="plus" onClick={() => s.navigate('documents', { add: '1' })}>افزودن سند</Btn>
            <Btn kind="brand" icon="bulb" onClick={() => s.navigate('knowledge', { add: '1' })}>ثبت دانش</Btn>
            <Btn kind="dark" icon="bot" onClick={() => s.navigate('assistant')}>دستیار هوشمند</Btn>
          </div>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3 stagger">
        {[
          { fa: 'اسناد قابل مشاهده', v: docs.length, icon: 'doc', color: '#0e6b5c', spark: docSeries },
          { fa: 'دانش سازمانی', v: knowledge.length, icon: 'bulb', color: '#b87a12', spark: knSeries },
          { fa: 'درس‌آموخته', v: s.data.lessons.length, icon: 'badgecheck', color: '#52708c', spark: [1, 2, 2, 3, 4] },
          { fa: 'در انتظار تأیید', v: pending.length, icon: 'clock', color: '#b87a12', spark: [3, 2, 4, 2, pending.length || 1] },
          { fa: 'در آستانه انقضا', v: expiring.length, icon: 'alert', color: '#c03a2e', spark: [1, 2, 1, 3, expiring.length || 1] },
          { fa: 'تجهیزات ثبت‌شده', v: s.data.equipment.length, icon: 'wrench', color: '#0e6b5c', spark: [4, 4, 5, 6, 6] },
          { fa: 'متخصصان', v: s.data.experts.length, icon: 'star', color: '#b87a12', spark: [2, 3, 3, 4, 4] },
          { fa: 'رخداد Audit (۷ روز)', v: s.data.audit.length, icon: 'shield', color: '#52708c', spark: [5, 7, 6, 9, 8] },
        ].map((k, i) => (
          <button key={i} onClick={() => i === 0 ? s.navigate('documents') : i === 1 ? s.navigate('knowledge') : i === 2 ? s.navigate('lessons') : i === 3 ? s.navigate('inbox') : i === 4 ? s.navigate('documents', { exp: '1' }) : i === 5 ? s.navigate('registry') : i === 6 ? s.navigate('registry', { tab: 'experts' }) : s.navigate('security', { tab: 'audit' })}
            className="bg-panel border border-line rounded-xl p-3.5 text-start hover:border-brand/60 hover:shadow-md hover:-translate-y-0.5 transition-all group">
            <div className="flex items-center justify-between">
              <span className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${k.color}15`, color: k.color }}><I n={k.icon} s={15} /></span>
              <Spark values={k.spark} color={k.color} w={54} h={20} />
            </div>
            <p className="font-display text-[24px] text-ink pt-2 group-hover:text-brand transition leading-none"><Num v={k.v} fa={s.lang === 'fa'} /></p>
            <p className="text-[10.5px] font-bold text-mute mt-1.5">{k.fa}</p>
          </button>
        ))}
      </div>

      {/* نمودار سازمانی */}
      <div className="bg-panel border border-line rounded-2xl p-5 anim-rise">
        <SectionTitle icon="org" sub="ساختار رسمی سازمان — برای مشاهده آرشیو و اطلاعات هر واحد، روی آن کلیک کنید. «نگهداری و تعمیرات» و «مهندسی» دو واحد کاملاً مستقل هستند."
          end={<div className="flex gap-2">
            <Btn kind="line" size="sm" icon="sliders" onClick={() => setCustomize(true)}>شخصی‌سازی داشبورد</Btn>
            {s.user?.role === 'admin' && <Btn kind="ghost" size="sm" icon="edit" onClick={() => s.navigate('org')}>مدیریت ساختار</Btn>}
          </div>}>
          نمودار سازمانی نیپکو
        </SectionTitle>
        <OrgChart departments={s.data.departments} stats={deptStats} selected={selDept} onSelect={setSelDept} />
        <div className="flex items-center gap-2 mt-2 text-[11px] text-mute">
          <span className="inline-flex items-center gap-1"><I n="info" s={12} />اعداد: اسناد / دانش / کاربران هر واحد</span>
        </div>
      </div>

      {/* ردیف نمودارها */}
      <div className="grid lg:grid-cols-3 gap-4">
        {show('trend') && (
          <div className="lg:col-span-2 bg-panel border border-line rounded-2xl p-5 anim-rise">
            <SectionTitle icon="chart" sub="۱۲ ماه اخیر — تقویم شمسی">روند تولید دانش و اسناد</SectionTitle>
            <AreaChart series={trend} labels={months.map(m => m.label)} />
            <div className="flex gap-4 mt-1 text-[11.5px] font-bold">
              <span className="flex items-center gap-1.5 text-mute"><span className="w-2.5 h-2.5 rounded-[3px] bg-brand" />مجموع اسناد و دانش هر ماه</span>
            </div>
          </div>
        )}
        {show('status') && (
          <div className="bg-panel border border-line rounded-2xl p-5 anim-rise">
            <SectionTitle icon="doc" sub="اسناد در دسترس شما">چرخه حیات اسناد</SectionTitle>
            <Donut parts={statusParts} centerTop={String(docs.length)} centerSub="سند" />
            <div className="mt-4 pt-3 border-t border-line">
              <HBars rows={s.data.departments.filter(d => d.parentId === 'd0' && d.active).slice(0, 5).map(d => ({
                label: d.name, v: deptStats(d.id).docs, color: d.color, hint: `${deptStats(d.id).docs} سند`,
              }))} />
            </div>
          </div>
        )}
      </div>

      {/* مقایسه + ستون‌ها */}
      <div className="grid lg:grid-cols-3 gap-4">
        {show('compare') && (
          <div className="bg-panel border border-line rounded-2xl p-5 anim-rise">
            <SectionTitle icon="org" sub="مقایسه واحدهای اصلی سازمان">واحد به واحد</SectionTitle>
            <GroupBars groups={compare.groups} series={compare.series} />
          </div>
        )}
        {show('approvals') && (
          <div className="bg-panel border border-line rounded-2xl p-5 anim-rise">
            <SectionTitle icon="clock" end={<Badge color="#b87a12"><Num v={pending.length} fa={s.lang === 'fa'} /> مورد</Badge>}>در انتظار تأیید و بازبینی</SectionTitle>
            <div className="space-y-2">
              {pending.slice(0, 5).map(d => (
                <button key={d.id} onClick={() => s.navigate('documents', { open: d.id })} className="w-full text-start flex items-center gap-3 p-2.5 rounded-lg border border-line hover:border-brand/50 hover:bg-brand-soft/40 transition group">
                  <span className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${DOC_STATUS[d.status].color}15`, color: DOC_STATUS[d.status].color }}><I n="doc" s={15} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[12px] font-bold text-ink truncate group-hover:text-brand transition">{d.title}</span>
                    <span className="block text-[10.5px] text-mute mt-0.5">{d.code} • {s.deptName(d.deptId)} • {DOC_STATUS[d.status].fa}</span>
                  </span>
                  <ClsMini c={d.classification} />
                </button>
              ))}
              {pending.length === 0 && <p className="text-[12px] text-mute text-center py-6">موردی در انتظار تأیید نیست.</p>}
            </div>
          </div>
        )}
        {show('expiring') && (
          <div className="bg-panel border border-line rounded-2xl p-5 anim-rise">
            <SectionTitle icon="alert" end={<Btn size="sm" kind="ghost" onClick={() => s.navigate('documents', { exp: '1' })}>همه</Btn>}>اسناد در آستانه انقضا</SectionTitle>
            <div className="space-y-2">
              {expiring.slice(0, 5).map(d => {
                const days = daysBetween(new Date().toISOString(), d.expiresAt!);
                return (
                  <button key={d.id} onClick={() => s.navigate('documents', { open: d.id })} className="w-full text-start p-2.5 rounded-lg border border-line hover:border-crimson/50 transition">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[12px] font-bold text-ink truncate">{d.title}</span>
                      <Badge color={days <= 15 ? '#c03a2e' : '#b87a12'}><Num v={days} fa={s.lang === 'fa'} /> روز</Badge>
                    </div>
                    <div className="mt-1.5"><ProgressBar v={Math.max(4, 100 - days * 2)} color={days <= 15 ? '#c03a2e' : '#b87a12'} h={4} /></div>
                  </button>
                );
              })}
              {expiring.length === 0 && <p className="text-[12px] text-mute text-center py-6">سندی در آستانه انقضا نیست.</p>}
            </div>
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {show('activity') && (
          <div className="bg-panel border border-line rounded-2xl p-5 anim-rise">
            <SectionTitle icon="history" end={<Btn size="sm" kind="ghost" onClick={() => s.navigate('security', { tab: 'audit' })}>Audit کامل</Btn>}>فعالیت اخیر کاربران</SectionTitle>
            <div className="space-y-0.5">
              {activity.map(a => (
                <div key={a.id} className="flex items-start gap-2.5 py-2 border-b border-line/60 last:border-0">
                  <span className={`mt-1 w-2 h-2 rounded-full shrink-0 ${a.severity === 'critical' ? 'bg-crimson' : a.severity === 'warn' ? 'bg-gold' : 'bg-brand'}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] text-ink leading-relaxed"><b>{a.userName}</b> — {a.details}</p>
                    <p className="text-[10.5px] text-mute mt-0.5">{s.fmt(a.ts, true)} • <span dir="ltr">{a.ip}</span></p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {show('alerts') && (
          <div className="bg-panel border border-line rounded-2xl p-5 anim-rise">
            <SectionTitle icon="shield">هشدارهای فعال</SectionTitle>
            <div className="space-y-2">
              {alerts.map((a, i) => (
                <div key={i} className={`flex items-start gap-2.5 rounded-lg border p-3 ${a.tone === 'crit' ? 'border-crimson/40 bg-crimson-soft' : a.tone === 'warn' ? 'border-gold/40 bg-gold-soft' : 'border-line bg-paper/60'}`}>
                  <span className={a.tone === 'crit' ? 'text-crimson' : a.tone === 'warn' ? 'text-gold-deep' : 'text-steel'}><I n={a.icon} s={16} /></span>
                  <p className="text-[12px] font-semibold leading-relaxed text-ink">{a.text}</p>
                </div>
              ))}
              {alerts.length === 0 && <p className="text-[12px] text-mute text-center py-6">هشداری وجود ندارد.</p>}
            </div>
          </div>
        )}
        {show('storage') && (
          <div className="bg-panel border border-line rounded-2xl p-5 anim-rise">
            <SectionTitle icon="db" sub="Storage مجزا از Database">فضای ذخیره‌سازی</SectionTitle>
            <div className="flex items-end justify-between mb-2">
              <p className="font-display text-[26px] text-ink leading-none">{(totalKB / 1024).toFixed(1)} <span className="text-[13px] text-mute">MB</span></p>
              <Badge color="#0e6b5c">{Math.round(storagePct)}٪ از ۵۱۲MB</Badge>
            </div>
            <ProgressBar v={storagePct} h={9} />
            <div className="grid grid-cols-2 gap-2 mt-4">
              {[
                { fa: 'اسناد PDF/DOC', v: Math.round(totalKB * 0.62), c: '#0e6b5c' },
                { fa: 'نقشه‌ها (DWG)', v: Math.round(totalKB * 0.24), c: '#52708c' },
                { fa: 'Vector DB', v: Math.round(totalKB * 0.08), c: '#b87a12' },
                { fa: 'Backup (رمزنگاری)', v: Math.round(totalKB * 0.06), c: '#c03a2e' },
              ].map((x, i) => (
                <div key={i} className="rounded-lg border border-line p-2.5">
                  <p className="text-[11px] font-bold text-ink">{x.fa}</p>
                  <p className="font-display text-[16px] pt-1" style={{ color: x.c }}>{(x.v / 1024).toFixed(2)} MB</p>
                </div>
              ))}
            </div>
            <p className="text-[10.5px] text-mute mt-3 leading-5">فایل‌های بزرگ با Chunk Upload و Deduplication ذخیره می‌شوند؛ نسخه Optimized برای پیش‌نمایش و نسخه Original جدا نگهداری می‌شود.</p>
          </div>
        )}
      </div>

      {/* شخصی‌سازی */}
      {customize && (
        <div className="fixed inset-0 z-[88] bg-night/50 anim-fade flex items-center justify-center p-4" onClick={() => setCustomize(false)}>
          <div className="bg-panel rounded-xl border border-line shadow-2xl p-5 w-full max-w-sm anim-pop" onClick={e => e.stopPropagation()}>
            <h3 className="font-display text-[17px] pt-1 mb-1">شخصی‌سازی داشبورد</h3>
            <p className="text-[11.5px] text-mute mb-4">ویجت‌هایی که می‌خواهید نمایش داده شوند را انتخاب کنید — چیدمان برای شما ذخیره می‌شود.</p>
            <div className="space-y-2">
              {WIDGETS.map(w => (
                <label key={w.id} className="flex items-center gap-2.5 p-2.5 rounded-lg border border-line hover:border-brand/50 cursor-pointer transition">
                  <input type="checkbox" checked={!hidden.includes(w.id)} onChange={() => toggleWidget(w.id)} className="accent-[#0e6b5c] w-4 h-4" />
                  <span className="text-[12.5px] font-bold">{w.fa}</span>
                </label>
              ))}
            </div>
            <div className="flex justify-end mt-4"><Btn onClick={() => setCustomize(false)}>ذخیره و بستن</Btn></div>
          </div>
        </div>
      )}

      {/* پنل واحد انتخابی */}
      <Drawer open={!!sel} onClose={() => setSelDept(null)} title={sel ? `واحد ${sel.name}` : ''}>
        {sel && (() => {
          const st = deptStats(sel.id);
          const mgr = s.data.users.find(u => u.id === sel.managerId);
          const unitDocs = s.data.documents.filter(d => s.inDeptScope(d.deptId, sel.id));
          const cls = ['public', 'internal', 'confidential', 'topsecret'].map(c => ({ label: clsOf(c).fa, v: unitDocs.filter(d => d.classification === c).length, color: clsOf(c).color }));
          return (
            <div className="space-y-4">
              <div className="rounded-xl p-4 text-white relative overflow-hidden" style={{ background: sel.color }}>
                <p className="font-display text-[20px] pt-0.5">{sel.name} <span className="text-[12px] opacity-80" dir="ltr">{sel.nameEn}</span></p>
                <p className="text-[12px] opacity-90 mt-1 leading-6">{sel.desc}</p>
                {mgr && <p className="text-[11.5px] mt-2 font-bold bg-white/15 inline-block rounded-lg px-2.5 py-1">مدیر واحد: {mgr.name}</p>}
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[{ fa: 'سند', v: st.docs, i: 'doc' }, { fa: 'دانش', v: st.knowledge, i: 'bulb' }, { fa: 'کاربر', v: st.users, i: 'user' }].map((x, i) => (
                  <div key={i} className="border border-line rounded-xl p-3 text-center">
                    <p className="font-display text-[22px] text-brand leading-none"><Num v={x.v} fa={s.lang === 'fa'} /></p>
                    <p className="text-[11px] font-bold text-mute mt-1.5 flex items-center justify-center gap-1"><I n={x.i} s={12} />{x.fa}</p>
                  </div>
                ))}
              </div>
              <div>
                <p className="text-[12px] font-bold mb-2">توزیع طبقه‌بندی امنیتی اسناد</p>
                <HBars rows={cls.map(c => ({ label: c.label, v: c.v, color: c.color }))} />
              </div>
              <div>
                <p className="text-[12px] font-bold mb-2">آخرین اسناد واحد</p>
                <div className="space-y-1.5">
                  {unitDocs.slice(0, 4).map(d => (
                    <button key={d.id} onClick={() => { s.navigate('documents', { open: d.id }); }} className="w-full text-start text-[12px] font-semibold p-2 rounded-lg border border-line hover:border-brand/50 truncate block transition">{d.title}</button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <Btn icon="archive" onClick={() => { s.navigate('documents', { dept: sel.id }); }} className="flex-1">آرشیو واحد</Btn>
                <Btn kind="line" icon="book" onClick={() => { s.navigate('knowledge', { dept: sel.id }); }} className="flex-1">دانش واحد</Btn>
              </div>
              <div className="bg-paper rounded-lg p-3 text-[11.5px] text-mute leading-6 border border-line">
                <b className="text-ink">تفکیک دسترسی:</b> آرشیو این واحد مستقل است؛ دسترسی سایر واحدها فقط از طریق Grant صریح و موردی (مثل یک سند خاص) امکان‌پذیر است و در Audit ثبت می‌شود.
              </div>
            </div>
          );
        })()}
      </Drawer>
    </div>
  );
}

function ClsMini({ c }: { c: string }) {
  const x = clsOf(c);
  return <span className="w-2 h-6 rounded-full shrink-0" style={{ background: x.color }} title={x.fa} />;
}
