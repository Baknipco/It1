import { useState } from 'react';
import { useStore } from '../lib/store';
import { I, Btn, Badge, SectionTitle, Num } from '../components/ui';

const DOC_LIFECYCLE = [
  { s: 'افزودن سند (Upload)', w: 'همه کاربران مجاز', p: 'upload / create', r: 'سند با وضعیت «پیش‌نویس» و Hash SHA-256 ثبت می‌شود' },
  { s: 'پویش امنیتی (Security Scan)', w: 'سیستم — خودکار', p: '—', r: 'فایل از نظر بدافزار و نوع مجاز بررسی می‌شود' },
  { s: 'استخراج متادیتا', w: 'AI محلی', p: '—', r: 'عنوان، واحد، نوع، طبقه‌بندی و برچسب پیشنهاد می‌شود' },
  { s: 'OCR فارسی', w: 'PaddleOCR — Local', p: 'ocr', r: 'متن اسناد تصویری/PDF استخراج و قابل‌جستجو می‌شود' },
  { s: 'طبقه‌بندی و خلاصه‌سازی', w: 'AI محلی', p: 'ai_summary', r: 'خلاصه اجرایی، کلیدواژه‌ها و نکات کلیدی تولید می‌شود' },
  { s: 'برچسب‌گذاری و Embedding', w: 'bge-m3 — Local', p: '—', r: 'سند برای جستجوی معنایی و RAG نمایه می‌شود' },
  { s: 'بازبینی (Review)', w: 'مدیر واحد', p: 'view / comment', r: 'صحت محتوا و متادیتا بررسی می‌شود' },
  { s: 'تأیید (Approval)', w: 'مدیر واحد', p: 'approve', r: 'سند قابل انتشار می‌شود؛ رد → بازگشت به مالک' },
  { s: 'انتشار (Publish)', w: 'سیستم پس از تأیید', p: '—', r: 'سند در جستجو، آرشیو و RAG افراد مجاز قرار می‌گیرد' },
  { s: 'استفاده', w: 'کاربران مجاز', p: 'view / download / print / ai_query', r: 'هر استفاده در Audit ثبت می‌شود' },
  { s: 'بازبینی دوره‌ای', w: 'مالک سند', p: 'edit / version', r: 'در موعد Review، نسخه جدید ایجاد می‌شود' },
  { s: 'انقضا', w: 'سیستم — هشدار خودکار', p: '—', r: '۳۰ روز قبل اعلان برای مالک و مدیر واحد ارسال می‌شود' },
  { s: 'آرشیو', w: 'مدیر واحد / Admin', p: 'archive', r: 'سند به آرشیو سالانه واحد منتقل و فقط‌خواندنی می‌شود' },
];

const KN_LIFECYCLE = [
  { s: 'ثبت دانش (چند خط توضیح)', w: 'همه کاربران', p: 'create', r: 'ثبت از Text / Voice / Image / Document' },
  { s: 'پردازش AI', w: 'LLM محلی', p: '—', r: 'تبدیل به Problem / Cause / Solution / Result / Recommendation' },
  { s: 'بررسی و تکمیل', w: 'ثبت‌کننده', p: 'edit', r: 'کاربر ساختار پیشنهادی را تأیید یا ویرایش می‌کند' },
  { s: 'تأیید کارشناسی', w: 'مدیر واحد / متخصص', p: 'approve', r: 'امتیاز Verification و Approval ارتقا می‌یابد' },
  { s: 'انتشار', w: 'سیستم', p: '—', r: 'دانش در جستجو و پاسخ‌های دستیار قرار می‌گیرد' },
  { s: 'استفاده و امتیازدهی', w: 'کاربران', p: 'view / comment', r: 'شاخص Usage بر اساس بازدید و ارجاع بالا می‌رود' },
  { s: 'پایش تازگی (Knowledge Decay)', w: 'AI — دوره‌ای', p: '—', r: 'دانش کهنگه شناسایی و Review Request ایجاد می‌شود' },
  { s: 'بهبود / نسخه جدید', w: 'مالک دانش', p: 'version', r: 'تجربه‌های تکمیلی به دانش اضافه می‌شود' },
  { s: 'آرشیو', w: 'مدیر واحد', p: 'archive', r: 'دانش منسوخ با برچسب تاریخی بایگانی می‌شود' },
];

const GUIDES = [
  { id: 'add-doc', t: 'افزودن سند — گام‌به‌گام', steps: ['روی «افزودن سند» کلیک کنید', 'فایل را Drag & Drop یا انتخاب کنید (چند فایل همزمان)', 'پیشنهاد AI برای عنوان، واحد، نوع و طبقه‌بندی را بررسی کنید', 'در صورت نیاز اطلاعات را اصلاح کنید', 'اجازه دانلود/چاپ را تعیین کنید', 'ثبت را بزنید — پردازش در صف پس‌زمینه انجام می‌شود', 'پس از OCR و خلاصه‌سازی، سند به کارتابل مدیر واحد می‌رود', 'پس از تأیید، منتشر می‌شود'] },
  { id: 'add-kn', t: 'ثبت دانش — گام‌به‌گام', steps: ['«ثبت دانش جدید» را بزنید', 'نوع دانش و واحد را انتخاب کنید', 'توضیح ساده خود را بنویسید (یا دکمه میکروفون: تبدیل گفتار به متن روی دستگاه)', '«ساختاربندی با AI» را بزنید', 'شش جزء تولیدشده را بررسی/ویرایش کنید', 'ثبت — دانش به جریان تأیید می‌رود', 'پس از تأیید مدیر، منتشر و قابل جستجو می‌شود'] },
  { id: 'search', t: 'جستجو و دستیار هوشمند', steps: ['جستجوی سازمانی: تایپ کنید — نتایج بین اسناد، دانش، تجهیزات و متخصصان', 'فیلترها: نوع، واحد، طبقه‌بندی', 'دستیار هوشمند: پرسش طبیعی بپرسید (RAG)', 'هر پاسخ منبع (Citation) دارد: کد سند، واحد و تاریخ', 'اگر در منابع مجاز شما نباشد: «اطلاعات موردنظر در بایگانی مجاز یافت نشد»'] },
  { id: 'report', t: 'گزارش‌گیری — ۱۰ گام', steps: ['ورود به مرکز گزارش', 'انتخاب گزارش آماده یا شروع گزارش‌ساز', 'انتخاب موجودیت (اسناد/دانش/Audit…)', 'انتخاب فیلدها', 'افزودن فیلتر (برابر، شامل، بین، …)', 'انتخاب مبنای تاریخ (ایجاد/تأیید/انقضا…)', 'انتخاب بازه «از تاریخ / تا تاریخ» با تقویم شمسی یا میلادی', 'گروه‌بندی و مرتب‌سازی', 'پیش‌نمایش زنده', 'خروجی Excel / CSV / PDF / JSON'] },
  { id: 'perm', t: 'مدیریت دسترسی', steps: ['سطوح: سازمان ← واحد ← نقش ← کاربر ← سند ← فیلد ← عمل', 'عضویت در واحد = دسترسی پیش‌فرض همان واحد، نه کل سازمان', 'دسترسی بین واحدها فقط با Grant صریح (مثلاً یک سند خاص)', 'Time-Based: اعتبار از/تا — پس از انقضا خودکار قطع می‌شود', 'Action-level: مشاهده، دانلود، چاپ، AI، تأیید… جداگانه', 'آزمونگر دسترسی: قبل از اعمال، تصمیم موتور را شبیه‌سازی کنید', 'همه تغییرات در Audit با شدت «بحرانی» ثبت می‌شود'] },
];

export function HelpPage() {
  const s = useStore();
  const [tour, setTour] = useState(false);
  const [step, setStep] = useState(0);
  const [openGuide, setOpenGuide] = useState('add-doc');

  const TOUR = [
    { t: 'داشبورد و نمودار سازمانی', d: 'صفحه اول، نقشه زنده سازمان است. روی هر واحد کلیک کنید تا آرشیو، دانش و آمار همان واحد باز شود. «نگهداری و تعمیرات» و «مهندسی» کاملاً مستقل‌اند.', go: 'dashboard', icon: 'org' },
    { t: 'جستجوی سازمانی', d: 'از نوار بالا یا منو، در همه منابع مجاز خود جستجو کنید — نتایج بر اساس Permission فیلتر می‌شوند.', go: 'search', icon: 'search' },
    { t: 'افزودن سند', d: 'فقط فایل را رها کنید؛ AI واحد، نوع و طبقه‌بندی را پیشنهاد می‌دهد، OCR و خلاصه‌سازی در پس‌زمینه انجام می‌شود.', go: 'documents', icon: 'upload' },
    { t: 'ثبت دانش', d: 'چند خط بنویسید؛ AI آن را به مسئله/علت/راه‌حل/نتیجه/پیشنهاد تبدیل می‌کند.', go: 'knowledge', icon: 'bulb' },
    { t: 'گزارش‌ها', d: 'گزارش‌ساز با فیلتر، بازه تاریخ شمسی/میلادی، گروه‌بندی و خروجی Excel/PDF.', go: 'reports', icon: 'chart' },
    { t: 'کارتابل و اعلان‌ها', d: 'تأییدها، اسناد در آستانه انقضا و دانش‌های کهنگه همه در کارتابل هوشمند شما جمع می‌شوند.', go: 'inbox', icon: 'kanban' },
  ];

  const Stepper = ({ items, color }: { items: { s: string; w: string; p: string; r: string }[]; color: string }) => (
    <div className="relative">
      <div className="absolute top-2 bottom-2 start-[15px] w-0.5 bg-line" />
      <div className="space-y-3">
        {items.map((it, i) => (
          <div key={i} className="relative flex gap-3.5">
            <span className="w-8 h-8 rounded-full text-white font-display text-[13px] flex items-center justify-center pt-0.5 shrink-0 z-10" style={{ background: color }}>{i + 1}</span>
            <div className="flex-1 border border-line rounded-xl p-3.5 bg-panel hover:border-brand/40 transition">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[13px] font-bold">{it.s}</p>
                <Badge color={color}>{it.w}</Badge>
                {it.p !== '—' && <span className="text-[10px] font-bold text-steel bg-steel-soft rounded px-2 py-0.5" dir="ltr">{it.p}</span>}
              </div>
              <p className="text-[12px] text-mute mt-1.5 leading-6">↳ {it.r}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="bg-night text-white rounded-2xl p-6 flex flex-wrap items-center gap-4 anim-rise relative overflow-hidden">
        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(ellipse 400px 200px at 90% 0%, rgba(229,165,46,.4), transparent)' }} />
        <div className="flex-1 min-w-[280px] relative">
          <h1 className="font-display text-[26px] pt-1">مرکز راهنما و آموزش</h1>
          <p className="text-[12.5px] text-white/65 mt-1.5 leading-6 max-w-xl">کل چرخه سامانه را از داخل خود سیستم یاد بگیرید: چرخه حیات سند و دانش، جستجو و RAG، گزارش‌گیری و مدیریت دسترسی.</p>
        </div>
        <Btn kind="gold" icon="play" onClick={() => { setStep(0); setTour(true); }} className="relative">شروع تور تعاملی</Btn>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-panel border border-line rounded-2xl p-5 anim-rise">
          <SectionTitle icon="doc" sub="هر مرحله: چه اتفاقی می‌افتد؟ مسئول کیست؟ چه Permission لازم است؟ نتیجه چیست؟">چرخه حیات سند (Document Lifecycle)</SectionTitle>
          <Stepper items={DOC_LIFECYCLE} color="#0e6b5c" />
        </div>
        <div className="space-y-4">
          <div className="bg-panel border border-line rounded-2xl p-5 anim-rise">
            <SectionTitle icon="bulb" sub="ثبت تا آرشیو — با پایش کهنگی توسط AI">چرخه حیات دانش (Knowledge Lifecycle)</SectionTitle>
            <Stepper items={KN_LIFECYCLE} color="#b87a12" />
          </div>
          <div className="bg-panel border border-line rounded-2xl p-5 anim-rise">
            <SectionTitle icon="shield">اصول امنیت سامانه</SectionTitle>
            <div className="space-y-2 text-[12.5px] leading-7">
              {[
                ['Layered Security', 'ورود ← احراز هویت ← نقش ← محدوده واحد ← Grant کاربر ← ACL سند ← Field ← Action ← طبقه‌بندی ← Audit'],
                ['ضدتوهم', 'دستیار فقط از منابع مجاز پاسخ می‌دهد و منبع cites می‌کند؛ بدون منبع = «یافت نشد».'],
                ['ضدافشا', 'Watermark پویا با هویت کاربر؛ Download/Print/Export بر اساس Grant؛ تلاش‌های مسدودشده در Audit.'],
                ['دوربین فیزیکی', 'توقف ۱۰۰٪ از طریق وب ممکن نیست؛ واترمارک هویت‌دار + سیاست دستگاه، ریسک را حداقل و افشا را قابل اثبات می‌کند.'],
              ].map(([t2, d2], i) => (
                <div key={i} className="border border-line rounded-xl p-3.5">
                  <p className="font-bold text-[12.5px] flex items-center gap-1.5"><I n="lock" s={13} className="text-brand" />{t2}</p>
                  <p className="text-mute text-[12px] mt-1 leading-6">{d2}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-panel border border-line rounded-2xl p-5 anim-rise">
        <SectionTitle icon="help" sub="راهنمای گام‌به‌گام عملیات اصلی">آموزش‌های کاربردی</SectionTitle>
        <div className="grid lg:grid-cols-2 gap-3">
          {GUIDES.map(g => (
            <div key={g.id} className="border border-line rounded-xl overflow-hidden">
              <button onClick={() => setOpenGuide(openGuide === g.id ? '' : g.id)} className="w-full flex items-center justify-between px-4 py-3 hover:bg-paper/60 transition">
                <span className="text-[13px] font-bold">{g.t}</span>
                <I n="chevD" s={15} className={`text-mute transition ${openGuide === g.id ? 'rotate-180' : ''}`} />
              </button>
              {openGuide === g.id && (
                <div className="px-4 pb-4 anim-fade">
                  <ol className="space-y-1.5">
                    {g.steps.map((st2, i) => (
                      <li key={i} className="flex gap-2.5 text-[12.5px] leading-6">
                        <span className="w-5.5 h-5.5 w-6 h-6 shrink-0 rounded-md bg-brand-soft text-brand-deep text-[11px] font-bold flex items-center justify-center mt-0.5"><Num v={i + 1} fa={s.lang === 'fa'} /></span>
                        {st2}
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          ))}
          <div className="border border-line rounded-xl p-4 bg-paper/50">
            <p className="text-[13px] font-bold mb-2 flex items-center gap-2"><I n="info" s={15} className="text-brand" />درباره سامانه</p>
            <p className="text-[12px] text-mute leading-7">
              <b className="text-ink">NIPCO Enterprise KMS</b> — سامانه جامع مدیریت دانش، اسناد، آرشیو و دانش سازمانی هوشمند. کاملاً Offline و On-Premise، با AI محلی (LLM + Embedding + OCR + STT)، Secure RAG، Knowledge Graph، گزارش‌ساز پویا با تقویم شمسی/میلادی و لایه‌های امنیتی End-to-End.
            </p>
            <p className="mt-3 pt-3 border-t border-line text-[11.5px] text-mute" dir="ltr">Designed & Architected by <b className="text-gold-deep">محمد روشندل</b> — Production-Ready | Offline | Secure | Intelligent | Scalable</p>
          </div>
        </div>
      </div>

      {/* تور تعاملی */}
      {tour && (
        <div className="fixed inset-0 z-[96] bg-night/70 anim-fade flex items-center justify-center p-4" onClick={() => setTour(false)}>
          <div className="bg-panel rounded-2xl border border-line shadow-2xl w-full max-w-md anim-pop overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="bg-night text-white p-5">
              <div className="flex items-center gap-2 mb-3">
                {TOUR.map((_, i) => <span key={i} className={`h-1.5 flex-1 rounded-full transition ${i <= step ? 'bg-gold' : 'bg-white/15'}`} />)}
              </div>
              <div className="flex items-center gap-3">
                <span className="w-11 h-11 rounded-xl bg-brand flex items-center justify-center text-gold"><I n={TOUR[step].icon} s={22} /></span>
                <div>
                  <p className="text-[10.5px] text-gold font-bold">گام {step + 1} از {TOUR.length}</p>
                  <h3 className="font-display text-[19px] pt-0.5">{TOUR[step].t}</h3>
                </div>
              </div>
            </div>
            <div className="p-5">
              <p className="text-[13px] leading-7 text-ink/85">{TOUR[step].d}</p>
              <div className="flex items-center justify-between mt-5">
                <button onClick={() => setTour(false)} className="text-[12px] font-bold text-mute hover:text-ink">پایان تور</button>
                <div className="flex gap-2">
                  {step > 0 && <Btn kind="line" size="sm" onClick={() => setStep(st2 => st2 - 1)}>قبلی</Btn>}
                  {step < TOUR.length - 1
                    ? <Btn size="sm" onClick={() => { s.navigate(TOUR[step].go); setStep(st2 => st2 + 1); }}>بعدی — برو به صفحه</Btn>
                    : <Btn size="sm" kind="gold" icon="check" onClick={() => { setTour(false); s.toast('تور کامل شد — سامانه در اختیار شماست!', 'ok'); }}>پایان — شروع کار</Btn>}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
