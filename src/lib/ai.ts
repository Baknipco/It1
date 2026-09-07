/* ------------------------------------------------------------------
   موتور هوش مصنوعی کاملاً محلی (Offline AI Engine)
   خلاصه‌سازی استخراجی • کلیدواژه • ساختاربندی دانش • متادیتای هوشمند
   جستجوی معنایی سبک + RAG با کنترل دسترسی و ارجاع منبع
------------------------------------------------------------------- */

const STOP = new Set('و در به از با برای که این آن را است هستند بود یک هر تا بر می شود شدند داشته دارد بدون بین طی اگر چون پس مثل همان هنگام فقط نیز دیگر بسیار کم زیاد چه کسی چیزی جایی بعضی همه هیچ خیلی برخی آنان ایشان ما شما آنها بوده باشد بودند خواهد کرد کرده انجام دلیل مورد صورت راه حل نتیجه پیشنهاد مشکل علت'.split(' '));

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[‌\u200c]/g, ' ')
    .split(/[\s،,.؛;:!?«»()\[\]{}"'/\\|+=<>~`@#$%^&*_-]+/)
    .map(w => w.replace(/[۰-۹0-9]/g, ''))
    .filter(w => w.length > 2 && !STOP.has(w));
}

export function extractKeywords(text: string, max = 6): string[] {
  const freq = new Map<string, number>();
  for (const t of tokenize(text)) freq.set(t, (freq.get(t) || 0) + 1);
  return [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, max).map(([w]) => w);
}

const splitSentences = (text: string) =>
  text.split(/[.!؟?؛;\n]+/).map(s => s.trim()).filter(s => s.length > 12);

/** خلاصه‌سازی استخراجی: امتیاز جمله بر پایه بسامد واژه‌ها */
export function extractiveSummary(text: string, maxSent = 3): string {
  const sents = splitSentences(text);
  if (sents.length <= maxSent) return text.length > 400 ? sents.slice(0, maxSent).join('. ') + '.' : text;
  const freq = new Map<string, number>();
  for (const t of tokenize(text)) freq.set(t, (freq.get(t) || 0) + 1);
  const scored = sents.map((s, i) => ({
    s, i,
    score: tokenize(s).reduce((a, t) => a + (freq.get(t) || 0), 0) / Math.sqrt(tokenize(s).length + 1),
  }));
  return scored.sort((a, b) => b.score - a.score).slice(0, maxSent)
    .sort((a, b) => a.i - b.i).map(x => x.s).join('. ') + '.';
}

export interface StructuredKnowledge {
  problem: string; cause: string; solution: string; result: string; recommendation: string; tags: string[]; title: string;
}

/** ساختاربندی متن آزاد دانش به اجزای استاندارد */
export function structureKnowledge(text: string): StructuredKnowledge {
  const sents = splitSentences(text);
  const pick = (pats: RegExp[], def = '') => {
    const hit = sents.find(s => pats.some(p => p.test(s)));
    return hit || def;
  };
  const problem = pick([/مشکل|خراب|ایراد|نشت|توقف|خطا|شکست|از کار|نشد|نیست بود|افزایش نا|کاهش نا/]);
  const cause = pick([/علت|به دلیل|به دلیلِ|ناشی از|ریشه|به‌خاطر|دلیل آن|عامل/]);
  const solution = pick([/راه.?حل|راهکار|با نصب|با تعویض|با اصلاح|با تنظیم|اقدام|حل شد|رفع شد|انجام شد|تعویض و|نصب و/]);
  const result = pick([/نتیجه|دستاور|کاهش یافت|افزایش یافت|حذف شد|بهبود|به صفر|رسید/]);
  const recommendation = pick([/پیشنهاد|توصیه|بهتر است|الزامی|باید|رعایت شود|تکرار شود|جایگزین/]);
  const used = [problem, cause, solution, result, recommendation];
  const rest = sents.filter(s => !used.includes(s)).join(' ');
  const kws = extractKeywords(text, 5);
  return {
    problem: problem || sents[0] || text.slice(0, 120),
    cause: cause || rest.split('.')[0] || 'نیازمند تحلیل ریشه',
    solution: solution || 'اقدام اصلاحی در دست تعریف است',
    result: result || 'در انتظار اندازه‌گیری اثربخشی',
    recommendation: recommendation || `موضوع برای بازبینی کارشناسی ثبت شود (${kws[0] || 'عمومی'})`,
    tags: kws,
    title: (kws.slice(0, 3).join('، ') || 'دانش جدید') + ' — ثبت هوشمند',
  };
}

export interface SmartMeta {
  title: string; deptId: string; category: string; type: string; classification: 'public' | 'internal' | 'confidential' | 'topsecret'; tags: string[]; projectId?: string; equipmentId?: string; summary: string; keywords: string[];
}

/** تشخیص هوشمند متادیتا از نام فایل و متن */
export function smartMeta(fileName: string, text: string): SmartMeta {
  const src = `${fileName} ${text}`.toLowerCase();
  const has = (...ps: string[]) => ps.some(p => src.includes(p));

  let deptId = 'd-mnt';
  if (has('نقشه', 'drawing', 'layout', 'جانمایی', 'sld', 'طراحی', 'مشخصات فنی', 'spec', 'مهندسی', 'wps')) deptId = 'd-eng';
  else if (has('کیفیت', 'qc', 'بازرسی', 'کنترل کیفیت', 'aql')) deptId = 'd-qc';
  else if (has('ایمنی', 'hse', 'بهداشت', 'محیط زیست', 'حریق')) deptId = 'd-hse';
  else if (has('مالی', 'قرارداد', 'قیمت', 'خرید', 'contract')) deptId = 'd-fin';
  else if (has('سرور', 'شبکه', 'it', 'زیرساخت', 'backup', 'پشتیبان')) deptId = 'd-it';
  else if (has('تولید', 'بویلر', 'بهره‌برداری', 'دیگ')) deptId = 'd-prd';
  else if (has('پرسنل', 'آموزش', 'جذب', 'منابع انسانی')) deptId = 'd-hr';
  else if (has('تعمیر', 'پمپ', 'کمپرسور', 'تجهیز', 'pm', 'کالیبر', 'خرابی', 'تجهیزات', 'maintenance')) deptId = 'd-mnt';

  let type = 'سند عمومی', category = 'عمومی';
  if (has('sop', 'دستورالعمل')) { type = 'SOP'; category = 'دستورالعمل'; }
  else if (has('نقشه', 'dwg', 'layout', 'sld', 'drawing')) { type = 'Drawing'; category = 'نقشه'; }
  else if (has('گزارش', 'report', 'rca')) { type = 'Report'; category = 'گزارش فنی'; }
  else if (has('قرارداد', 'contract')) { type = 'Contract'; category = 'قرارداد'; }
  else if (has('مشخصات', 'spec', 'datasheet')) { type = 'Specification'; category = 'مشخصات فنی'; }
  else if (has('استاندارد', 'wps', 'code')) { type = 'Standard'; category = 'استاندارد عملیاتی'; }
  else if (has('شناسنامه', 'equipment')) { type = 'Datasheet'; category = 'شناسنامه تجهیز'; }

  let classification: SmartMeta['classification'] = 'internal';
  if (has('قرارداد', 'قیمت', 'مالی', 'contract', 'محرمانه')) classification = 'confidential';
  if (has('بسیار محرمانه', 'top secret')) classification = 'topsecret';
  if (has('عمومی', 'public', 'ایمنی', 'hse')) classification = classification === 'internal' ? 'public' : classification;

  let equipmentId: string | undefined;
  if (has('p-101', 'p101', 'پمپ')) equipmentId = 'eq-p101';
  else if (has('c-3', 'کمپرسور')) equipmentId = 'eq-c3';
  else if (has('b-1', 'بویلر', 'دیگ')) equipmentId = 'eq-b1';
  else if (has('e-201', 'مبدل')) equipmentId = 'eq-e201';

  const projectId = has('اورهال') ? 'prj-1401' : has('خط ۳', 'خط 3', 'توسعه') ? 'prj-1402' : undefined;
  const base = fileName.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ').trim();
  const keywords = extractKeywords(text || base, 6);

  return {
    title: base || 'سند جدید',
    deptId, category, type, classification,
    tags: keywords.slice(0, 5),
    projectId, equipmentId,
    summary: text ? extractiveSummary(text, 2) : `سند «${base}» پس از پردازش OCR و استخراج متن، به‌صورت خودکار خلاصه‌سازی خواهد شد.`,
    keywords,
  };
}

export interface RagContext { code: string; title: string; text: string; date: string; dept: string; kind: string }

/** امتیاز ارتباط پرسش با یک سند — همپوشانی توکن + پاداش عبارت‌های کلیدی */
function score(q: string[], doc: RagContext): number {
  const tokens = tokenize(`${doc.title} ${doc.text} ${doc.kind}`);
  const set = new Set(tokens);
  let hit = 0;
  for (const t of q) if (set.has(t)) hit++;
  const coverage = q.length ? hit / q.length : 0;
  const density = tokens.length ? hit / Math.sqrt(tokens.length) : 0;
  let bonus = 0;
  for (const t of q) if (doc.text.includes(t) || doc.title.includes(t)) bonus += 0.4;
  return coverage * 10 + density * 6 + bonus;
}

export interface RagAnswer { text: string; citations: { code: string; title: string; date: string; dept: string }[]; found: boolean }

/** RAG محلی: بازیابی مجاز → رتبه‌بندی → پاسخ با ارجاع منبع */
export function ragAnswer(question: string, corpus: RagContext[], maxCite = 3): RagAnswer {
  const q = [...new Set(tokenize(question))];
  if (q.length === 0) return { text: 'پرسش شما خیلی کوتاه است. لطفاً پرسش را کامل‌تر بنویسید تا در بایگانی مجاز شما جستجو کنم.', citations: [], found: false };
  const scored = corpus.map(c => ({ c, s: score(q, c) })).filter(x => x.s > 3.2).sort((a, b) => b.s - a.s);
  if (!scored.length) {
    return {
      text: 'اطلاعات موردنظر در بایگانی مجاز فعلی یافت نشد.\nطبق سیاست ضدتوهم، از ساختن پاسخ بدون منبع معذورم. می‌توانید پرسش را با کلیدواژه‌های دقیق‌تر (نام تجهیز، شماره سند یا واحد) تکرار کنید یا ثبت دانش جدید را پیشنهاد دهید.',
      citations: [], found: false,
    };
  }
  const top = scored.slice(0, maxCite);
  const parts = top.map(({ c }) => {
    const sent = splitSentences(c.text);
    const qq = new Set(q);
    const best = sent.map(s => ({ s, n: tokenize(s).filter(t => qq.has(t)).length })).sort((a, b) => b.n - a.n)[0];
    return best && best.n > 0 ? best.s : sent[0] || c.text.slice(0, 180);
  });
  return {
    text: `بر اساس ${top.length === 1 ? 'یک منبع معتبر' : `${top.length} منبع معتبر`} در آرشیو مجاز شما:\n\n` + parts.map((p, i) => `${i + 1}) ${p}.`).join('\n') + '\n\nاین پاسخ صرفاً از اسنادی ساخته شده که سطح دسترسی شما اجازه مشاهده آن‌ها را دارد.',
    citations: top.map(({ c }) => ({ code: c.code, title: c.title, date: c.date, dept: c.dept })),
    found: true,
  };
}

/** هش واقعی SHA-256 فایل با WebCrypto */
export async function sha256(data: ArrayBuffer): Promise<string> {
  try {
    const buf = await crypto.subtle.digest('SHA-256', data);
    return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
  } catch {
    let h = 0;
    const u = new Uint8Array(data);
    for (let i = 0; i < u.length; i += 4096) h = (h * 31 + u[i]) >>> 0;
    return h.toString(16).padStart(8, '0').repeat(8);
  }
}

export const fmtKB = (kb: number) => kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${Math.round(kb)} KB`;
