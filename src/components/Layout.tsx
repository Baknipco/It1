import { ReactNode, useMemo, useRef, useState } from 'react';
import { useStore, roleFa, clsOf } from '../lib/store';
import { I, useClickOut, useNow } from './ui';
import { fmtWeekdayJalali, fmtGregLong, faDigits } from '../lib/jalali';

const MENU: { group: string; items: { id: string; icon: string; roles?: string[] }[] }[] = [
  { group: 'نمای کلی', items: [
    { id: 'dashboard', icon: 'dashboard' }, { id: 'search', icon: 'search' },
    { id: 'assistant', icon: 'bot' }, { id: 'inbox', icon: 'kanban' },
  ]},
  { group: 'محتوا و دانش', items: [
    { id: 'documents', icon: 'doc' }, { id: 'archive', icon: 'archive' },
    { id: 'knowledge', icon: 'book' }, { id: 'lessons', icon: 'bulb' },
  ]},
  { group: 'سازمان', items: [
    { id: 'org', icon: 'org' }, { id: 'registry', icon: 'wrench' },
    { id: 'users', icon: 'users', roles: ['admin', 'security', 'executive'] },
  ]},
  { group: 'مدیریت و حاکمیت', items: [
    { id: 'reports', icon: 'chart' }, { id: 'security', icon: 'shield', roles: ['admin', 'security'] },
    { id: 'backup', icon: 'db', roles: ['admin', 'security'] }, { id: 'system', icon: 'gear', roles: ['admin'] },
  ]},
  { group: 'یادگیری', items: [{ id: 'help', icon: 'help' }] },
];

const PAGE_FA: Record<string, string> = {
  dashboard: 'داشبورد', search: 'جستجوی سازمانی', assistant: 'دستیار هوشمند', inbox: 'کارتابل هوشمند',
  documents: 'مرکز اسناد', archive: 'آرشیو سالانه', knowledge: 'مرکز دانش', lessons: 'درس‌آموخته‌ها',
  org: 'ساختار سازمانی', registry: 'تجهیزات، پروژه‌ها و متخصصان', users: 'کاربران و دسترسی‌ها',
  reports: 'مرکز گزارش و گزارش‌ساز', security: 'امنیت و Audit', backup: 'پشتیبان‌گیری و بازیابی',
  system: 'مدیریت سیستم', help: 'راهنما و آموزش',
};

function TopBar() {
  const s = useStore();
  const now = useNow(1000);
  const [q, setQ] = useState('');
  const [bellOpen, setBellOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);
  useClickOut(bellRef, () => setBellOpen(false));
  useClickOut(userRef, () => setUserOpen(false));

  const myNotifs = useMemo(() => s.data.notifs.filter(n => n.forUser === s.user?.id || n.forUser === 'all').slice(0, 8), [s.data.notifs, s.user]);
  const unread = myNotifs.filter(n => !n.read).length;

  return (
    <header className="sticky top-0 z-40 bg-panel/90 backdrop-blur border-b border-line">
      <div className="flex items-center gap-3 px-5 h-[58px]">
        <div>
          <h1 className="font-display text-[17px] text-ink leading-none pt-0.5">{PAGE_FA[s.nav.page] ?? 'نیپکو'}</h1>
          <p className="text-[10.5px] text-mute mt-1 flex items-center gap-1.5">
            <span>{fmtWeekdayJalali(now)}</span>
            <span className="text-linedark">|</span>
            <span dir="ltr">{fmtGregLong(now)}</span>
            <span className="text-linedark">|</span>
            <span className="tabular-nums font-bold text-brand">{faDigits(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`)}</span>
          </p>
        </div>

        <div className="flex-1" />

        <form onSubmit={e => { e.preventDefault(); if (q.trim()) { s.navigate('search', { q: q.trim() }); setQ(''); } }}
          className="hidden md:flex items-center gap-2 bg-paper border border-line rounded-lg px-3 h-9 w-64 focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/10 transition">
          <span className="text-mute"><I n="search" s={15} /></span>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder={s.t('searchPlaceholder')} className="bg-transparent text-[12.5px] focus:outline-none w-full placeholder:text-mute/70" />
          <kbd className="text-[10px] text-mute border border-line rounded px-1 hidden lg:block">↵</kbd>
        </form>

        <button onClick={() => s.setCalendar(s.calendar === 'jalali' ? 'gregorian' : 'jalali')} title="تغییر تقویم"
          className="h-9 px-2.5 rounded-lg border border-line text-[11.5px] font-bold text-ink hover:border-brand hover:text-brand transition flex items-center gap-1.5">
          <I n="cal" s={14} />{s.calendar === 'jalali' ? 'شمسی' : 'Miladi'}
        </button>
        <button onClick={() => s.setLang(s.lang === 'fa' ? 'en' : 'fa')} title="Language"
          className="h-9 px-2.5 rounded-lg border border-line text-[11.5px] font-bold text-ink hover:border-brand hover:text-brand transition flex items-center gap-1.5" dir="ltr">
          <I n="globe" s={14} />{s.lang === 'fa' ? 'EN' : 'فا'}
        </button>

        <div className="relative" ref={bellRef}>
          <button onClick={() => { setBellOpen(o => !o); }} className="relative w-9 h-9 rounded-lg border border-line flex items-center justify-center text-ink hover:border-brand hover:text-brand transition">
            <I n="bell" s={16} />
            {unread > 0 && <span className="absolute -top-1.5 -end-1.5 min-w-[17px] h-[17px] px-1 rounded-full bg-crimson text-white text-[10px] font-bold flex items-center justify-center live-dot">{unread}</span>}
          </button>
          {bellOpen && (
            <div className="absolute top-full mt-2 end-0 w-[340px] bg-panel border border-line rounded-xl shadow-xl anim-pop overflow-hidden z-50">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-line">
                <span className="font-display text-[14px] pt-0.5">{s.t('notifications')}</span>
                <button onClick={() => s.markNotifsRead()} className="text-[11px] font-bold text-brand hover:text-brand-deep">خواندن همه</button>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {myNotifs.length === 0 && <p className="p-5 text-center text-[12px] text-mute">اعلانی ندارید.</p>}
                {myNotifs.map(n => (
                  <button key={n.id} onClick={() => { s.navigate('inbox'); setBellOpen(false); }} className={`w-full text-start px-4 py-2.5 border-b border-line/60 hover:bg-paper transition ${n.read ? 'opacity-60' : ''}`}>
                    <p className="text-[12px] font-semibold text-ink leading-relaxed">{n.text}</p>
                    <p className="text-[10.5px] text-mute mt-0.5">{s.fmt(n.ts, true)}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="relative" ref={userRef}>
          <button onClick={() => setUserOpen(o => !o)} className="flex items-center gap-2.5 h-9 ps-1 pe-2 rounded-lg border border-line hover:border-brand transition">
            <span className="w-7 h-7 rounded-lg bg-night text-gold font-display text-[13px] flex items-center justify-center pt-0.5">{s.user?.name?.[0]}</span>
            <span className="hidden sm:block text-start">
              <span className="block text-[12px] font-bold text-ink leading-none">{s.user?.name}</span>
              <span className="block text-[10px] text-mute mt-0.5">{s.user ? roleFa(s.user.role) : ''}</span>
            </span>
            <I n="chevD" s={13} className="text-mute" />
          </button>
          {userOpen && (
            <div className="absolute top-full mt-2 end-0 w-60 bg-panel border border-line rounded-xl shadow-xl anim-pop z-50 overflow-hidden">
              <div className="px-4 py-3 border-b border-line bg-paper/60">
                <p className="text-[13px] font-bold text-ink">{s.user?.name}</p>
                <p className="text-[11px] text-mute mt-0.5">{s.user?.title} • {s.user?.departments.map(d => s.deptName(d)).join('، ')}</p>
              </div>
              <button onClick={() => { s.navigate('help'); setUserOpen(false); }} className="w-full text-start px-4 py-2.5 text-[12.5px] font-semibold hover:bg-paper flex items-center gap-2"><I n="help" s={15} />راهنما و آموزش</button>
              <button onClick={() => { s.logout(); }} className="w-full text-start px-4 py-2.5 text-[12.5px] font-semibold hover:bg-crimson-soft text-crimson flex items-center gap-2 border-t border-line"><I n="out" s={15} />{s.t('logout')}</button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function Sidebar() {
  const s = useStore();
  const role = s.user?.role ?? '';
  const allowed = (roles?: string[]) => !roles || roles.includes(role) || role === 'admin';
  return (
    <aside className="w-[228px] shrink-0 bg-night text-white flex flex-col sticky top-0 h-screen z-30 no-print">
      <div className="px-4 pt-4 pb-3 border-b border-white/8">
        <div className="flex items-center gap-2.5">
          <span className="w-9 h-9 rounded-xl bg-brand flex items-center justify-center shadow-lg shadow-brand/30">
            <svg width="20" height="20" viewBox="0 0 32 32" fill="none"><path d="M9 23V9l7 9 7-9v14" stroke="#F5C86B" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </span>
          <div>
            <p className="font-display text-[17px] leading-none pt-0.5">نیپکو <span className="text-gold">KMS</span></p>
            <p className="text-[9.5px] text-white/50 mt-1 tracking-wider" dir="ltr">ENTERPRISE KNOWLEDGE</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-2 px-2.5">
        {MENU.map(g => {
          const items = g.items.filter(i => allowed(i.roles));
          if (!items.length) return null;
          return (
            <div key={g.group} className="mb-1">
              <p className="text-[10px] font-bold text-white/35 px-2.5 pt-2.5 pb-1.5">{g.group}</p>
              {items.map(i => {
                const active = s.nav.page === i.id || (i.id === 'documents' && s.nav.page === 'archive');
                return (
                  <button key={i.id} onClick={() => s.navigate(i.id)}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-[8.5px] rounded-lg text-[13px] font-semibold mb-0.5 transition-all duration-150
                      ${active ? 'bg-brand text-white shadow-md shadow-brand/25' : 'text-white/65 hover:text-white hover:bg-white/6'}`}>
                    <I n={i.icon} s={16} />
                    {i.id === 'documents' ? s.t('documentCenter') : PAGE_FA[i.id]}
                    {active && <span className="ms-auto w-1.5 h-1.5 rounded-full bg-gold" />}
                  </button>
                );
              })}
            </div>
          );
        })}
      </nav>

      <div className="p-3 border-t border-white/8">
        <div className="flex items-center gap-2 text-[10.5px] text-white/50 mb-2">
          <span className="w-2 h-2 rounded-full bg-brand-glow live-dot" />
          {s.t('offlineReady')} • On-Premise
        </div>
        <p className="text-[10px] text-white/40 leading-relaxed" dir="ltr">Designed & Architected by</p>
        <p className="text-[12px] font-bold text-gold font-display pt-0.5">محمد روشندل</p>
      </div>
    </aside>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  const s = useStore();
  return (
    <div className={`min-h-screen bg-blueprint flex ${s.lang === 'en' ? 'ltr' : ''}`} dir={s.lang === 'en' ? 'ltr' : 'rtl'}>
      <Sidebar />
      <div className="flex-1 min-w-0 flex flex-col">
        <TopBar />
        <main className="flex-1 p-5 max-w-[1460px] w-full mx-auto">{children}</main>
      </div>

      {/* صف پردازش پس‌زمینه */}
      {s.queue.length > 0 && (
        <div className="fixed bottom-4 start-[244px] z-[80] w-[320px] anim-rise no-print">
          <div className="bg-night text-white rounded-xl shadow-2xl border border-white/10 overflow-hidden">
            <div className="px-4 py-2.5 flex items-center gap-2 border-b border-white/10">
              <span className="w-3.5 h-3.5 border-2 border-gold border-t-transparent rounded-full" style={{ animation: 'spin .8s linear infinite' }} />
              <span className="text-[12px] font-bold">پردازش‌های پس‌زمینه — صف هوشمند</span>
            </div>
            <div className="p-3 space-y-2.5">
              {s.queue.map(j => (
                <div key={j.id}>
                  <div className="flex justify-between text-[11px] mb-1"><span className="font-semibold text-white/85 truncate">{j.label}</span><span className="text-gold font-bold tabular-nums">{Math.round(j.pct)}٪</span></div>
                  <div className="h-1.5 bg-white/10 rounded-full"><div className="h-full bg-gold rounded-full transition-all" style={{ width: `${j.pct}%` }} /></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Toasts */}
      <div className="fixed top-4 end-4 z-[100] space-y-2 w-[340px] no-print">
        {s.toasts.map(t => (
          <div key={t.id} className={`anim-slide flex items-start gap-2.5 rounded-xl border px-3.5 py-3 shadow-lg bg-panel text-[12.5px] font-semibold leading-relaxed
            ${t.kind === 'ok' ? 'border-brand/40 text-brand-deep' : t.kind === 'err' ? 'border-crimson/40 text-crimson' : t.kind === 'warn' ? 'border-gold/50 text-gold-deep' : 'border-line text-ink'}`}>
            <span className="mt-0.5"><I n={t.kind === 'ok' ? 'check' : t.kind === 'err' ? 'alert' : t.kind === 'warn' ? 'alert' : 'info'} s={16} /></span>
            {t.text}
          </div>
        ))}
      </div>
    </div>
  );
}

export function ClsBadge({ c }: { c?: string }) {
  const x = clsOf(c);
  return (
    <span className="inline-flex items-center gap-1 text-[10.5px] font-bold px-2 py-[3px] rounded-md" style={{ color: x.color, background: x.bg }}>
      <I n={c === 'topsecret' ? 'lock' : c === 'confidential' ? 'key' : c === 'internal' ? 'shield' : 'globe'} s={11} />{x.fa}
    </span>
  );
}
