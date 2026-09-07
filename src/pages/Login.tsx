import { useState } from 'react';
import { useStore } from '../lib/store';
import { I } from '../components/ui';
import { tr } from '../lib/i18n';

const SERVICES = [
  { n: 'پایگاه داده', v: 'PostgreSQL 16 — Local', ok: true },
  { n: 'موتور AI/RAG', v: 'Ollama • bge-m3 — Local', ok: true },
  { n: 'OCR فارسی', v: 'PaddleOCR — Local', ok: true },
  { n: 'Vector DB', v: 'Qdrant — Local', ok: true },
  { n: 'صف پردازش', v: 'Redis Worker — Local', ok: true },
  { n: 'فضای ذخیره‌سازی', v: 'Object Storage — On-Prem', ok: true },
];

export function LoginPage() {
  const s = useStore();
  const [u, setU] = useState('');
  const [p, setP] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const set = s.data.settings;
  const fa = s.lang === 'fa';

  const doLogin = () => {
    setErr('');
    if (!u.trim() || !p) { setErr(fa ? 'نام کاربری و گذرواژه را وارد کنید.' : 'Enter username and password.'); return; }
    setBusy(true);
    window.setTimeout(() => {
      const r = s.login(u, p);
      setBusy(false);
      if (!r.ok) setErr(r.error ?? 'خطا');
      else s.toast(`${fa ? 'خوش آمدید؛ ورود شما در Audit ثبت شد.' : 'Welcome — login audited.'}`, 'ok');
    }, 550);
  };

  const quick = [
    { label: 'مدیر سامانه', u: 'm.ravoshandel', p: 'Admin@1404' },
    { label: 'مدیر نگهداری و تعمیرات', u: 'r.ghasemi', p: 'Mnt@1404' },
    { label: 'مدیر مهندسی', u: 's.mohammadi', p: 'Eng@1404' },
    { label: 'کاربر نت', u: 'h.naderi', p: 'User@1404' },
    { label: 'مشاهده‌گر', u: 'guest.nipco', p: 'Guest@1404' },
  ];

  return (
    <div className={`min-h-screen flex ${fa ? '' : 'ltr'}`} dir={fa ? 'rtl' : 'ltr'}>
      {/* پنل برند */}
      <div className={`hidden lg:flex flex-col w-[46%] bg-nightgrid text-white relative overflow-hidden ${set.loginBg === 'solid' ? '!bg-night' : ''}`}>
        <div className="p-9 flex-1 flex flex-col">
          <div className="flex items-center gap-3">
            <span className="w-11 h-11 rounded-xl bg-brand flex items-center justify-center shadow-xl shadow-brand/40">
              <svg width="24" height="24" viewBox="0 0 32 32" fill="none"><path d="M9 23V9l7 9 7-9v14" stroke="#F5C86B" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </span>
            <div>
              <p className="font-display text-[22px] leading-none pt-1">نیپکو <span className="text-gold">KMS</span></p>
              <p className="text-[10px] text-white/50 tracking-[0.2em] mt-1" dir="ltr">NIPCO ENTERPRISE KMS</p>
            </div>
            <span className="ms-auto text-[10.5px] font-bold border border-brand-glow/40 text-brand-glow rounded-full px-3 py-1 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-glow live-dot" />v2.4 — Production
            </span>
          </div>

          <div className="mt-12 anim-rise">
            <h1 className="font-display text-[42px] leading-[1.25] text-white">
              حافظه <span className="text-gold">دیجیتال</span> و<br />هوشمند سازمان
            </h1>
            <p className="text-white/65 text-[14.5px] leading-8 mt-5 max-w-md">
              دانش را ثبت کن؛ سیستم آن را بفهمد، سازمان آن را حفظ کند و افراد مجاز دوباره از آن استفاده کنند.
            </p>
          </div>

          <div className="mt-10 anim-rise" style={{ animationDelay: '.15s' }}>
            <p className="text-[11px] font-bold text-white/40 mb-3 tracking-wide">سرویس‌های داخلی — وضعیت لحظه‌ای</p>
            <div className="grid grid-cols-2 gap-2 max-w-md">
              {SERVICES.map((sv, i) => (
                <div key={i} className="flex items-center gap-2.5 bg-white/4 border border-white/8 rounded-lg px-3 py-2 hover:border-brand-glow/40 transition group">
                  <span className="w-2 h-2 rounded-full bg-brand-glow live-dot" style={{ animationDelay: `${i * 300}ms` }} />
                  <div className="min-w-0">
                    <p className="text-[11.5px] font-bold truncate">{sv.n}</p>
                    <p className="text-[9.5px] text-white/45 truncate" dir="ltr">{sv.v}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-auto flex items-end justify-between">
            <div className="text-[10.5px] text-white/40 space-y-1">
              <p className="flex items-center gap-1.5"><I n="lock" s={12} />Air-Gapped • بدون هیچ اتصال اینترنتی</p>
              <p className="flex items-center gap-1.5"><I n="shield" s={12} />Layered Security + Audit کامل</p>
            </div>
            <div className="text-end">
              <p className="text-[10px] text-white/40" dir="ltr">Designed & Architected by</p>
              <p className="font-display text-[16px] text-gold pt-0.5">محمد روشندل</p>
            </div>
          </div>
        </div>
      </div>

      {/* فرم ورود */}
      <div className="flex-1 bg-blueprint flex items-center justify-center p-6 relative">
        <button onClick={() => s.setLang(fa ? 'en' : 'fa')} className="absolute top-5 end-5 flex items-center gap-1.5 text-[12px] font-bold text-mute hover:text-brand border border-line bg-panel rounded-lg px-3 py-1.5 transition">
          <I n="globe" s={14} />{tr(fa ? 'en' : 'fa', 'language')}
        </button>

        <div className="w-full max-w-[420px] anim-rise">
          <div className="lg:hidden flex items-center gap-2.5 mb-6">
            <span className="w-10 h-10 rounded-xl bg-brand flex items-center justify-center">
              <svg width="22" height="22" viewBox="0 0 32 32" fill="none"><path d="M9 23V9l7 9 7-9v14" stroke="#F5C86B" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </span>
            <p className="font-display text-[20px] text-ink">نیپکو <span className="text-brand">KMS</span></p>
          </div>

          <div className="bg-panel border border-line rounded-2xl shadow-xl shadow-ink/5 p-7">
            <h2 className="font-display text-[24px] text-ink pt-1">{fa ? 'ورود به سامانه' : 'Sign in'}</h2>
            <p className="text-[12.5px] text-mute mt-2 leading-6">{set.welcome}</p>

            <div className="mt-5 space-y-3.5">
              <label className="block">
                <span className="block text-[12px] font-bold mb-1.5">{fa ? 'نام کاربری' : 'Username'}</span>
                <div className="flex items-center gap-2 border border-linedark rounded-lg px-3 py-2.5 focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/15 transition bg-panel">
                  <span className="text-mute"><I n="user" s={16} /></span>
                  <input dir="ltr" value={u} onChange={e => setU(e.target.value)} onKeyDown={e => e.key === 'Enter' && doLogin()}
                    placeholder="username" className="bg-transparent text-[13.5px] focus:outline-none w-full text-left" autoComplete="username" />
                </div>
              </label>
              <label className="block">
                <span className="block text-[12px] font-bold mb-1.5">{fa ? 'گذرواژه' : 'Password'}</span>
                <div className="flex items-center gap-2 border border-linedark rounded-lg px-3 py-2.5 focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/15 transition bg-panel">
                  <span className="text-mute"><I n="lock" s={16} /></span>
                  <input dir="ltr" type={showPass ? 'text' : 'password'} value={p} onChange={e => setP(e.target.value)} onKeyDown={e => e.key === 'Enter' && doLogin()}
                    placeholder="••••••••" className="bg-transparent text-[13.5px] focus:outline-none w-full text-left" autoComplete="current-password" />
                  <button onClick={() => setShowPass(v => !v)} className="text-mute hover:text-brand transition"><I n={showPass ? 'eyex' : 'eye'} s={16} /></button>
                </div>
              </label>

              {err && (
                <div className="flex items-start gap-2 bg-crimson-soft text-crimson text-[12px] font-semibold rounded-lg px-3 py-2.5 anim-pop leading-relaxed">
                  <span className="mt-0.5"><I n="alert" s={14} /></span>{err}
                </div>
              )}

              <button onClick={doLogin} disabled={busy}
                className="w-full bg-brand text-white font-bold text-[14px] rounded-lg py-3 hover:bg-brand-deep transition active:scale-[.98] shadow-lg shadow-brand/25 disabled:opacity-60 flex items-center justify-center gap-2">
                {busy ? <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full" style={{ animation: 'spin .7s linear infinite' }} />{fa ? 'در حال احراز هویت…' : 'Authenticating…'}</> : <>{fa ? 'ورود امن' : 'Secure Sign-in'}<I n="send" s={15} /></>}
              </button>

              <p className="text-[10.5px] text-mute text-center leading-5">
                {fa ? 'احراز هویت تک‌مرحله‌ای مطابق سیاست سازمان — 2FA فعال نیست. Policy گذرواژه: حداقل ۸ کاراکتر، حرف و عدد.' : 'Single-factor per org policy — 2FA disabled. Password policy: min 8 chars.'}
              </p>
            </div>
          </div>

          <div className="mt-4 bg-night/95 rounded-xl p-4 text-white">
            <p className="text-[11px] font-bold text-gold mb-2.5 flex items-center gap-1.5"><I n="key" s={13} />{fa ? 'حساب‌های آزمایشی — کلیک کنید:' : 'Demo accounts — click to fill:'}</p>
            <div className="flex flex-wrap gap-1.5">
              {quick.map(qk => (
                <button key={qk.u} onClick={() => { setU(qk.u); setP(qk.p); setErr(''); }}
                  className="text-[11px] font-semibold bg-white/8 hover:bg-brand border border-white/10 hover:border-brand rounded-lg px-2.5 py-1.5 transition">
                  {qk.label}
                </button>
              ))}
            </div>
          </div>

          <p className="text-center text-[11px] text-mute mt-5">
            {set.companyName} — <span dir="ltr" className="font-semibold">{set.footer}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
