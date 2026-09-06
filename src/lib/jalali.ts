/* ------------------------------------------------------------------
   موتور تبدیل تاریخ جلالی ↔ میلادی — الگوریتم jalaali (Borkowski)
   کاملاً آفلاین و بدون وابستگی
------------------------------------------------------------------- */

const div = (a: number, b: number) => ~~(a / b);
const mod = (a: number, b: number) => a - ~~(a / b) * b;

function jalCal(jy: number) {
  const breaks = [-61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097, 2192, 2262, 2324, 2394, 2456, 3178];
  const bl = breaks.length;
  const gy = jy + 621;
  let leapJ = -14;
  let jp = breaks[0];
  let jump = 0;
  for (let i = 1; i < bl; i += 1) {
    const jm = breaks[i];
    jump = jm - jp;
    if (jy < jm) break;
    leapJ = leapJ + div(jump, 33) * 8 + div(mod(jump, 33), 4);
    jp = jm;
  }
  let n = jy - jp;
  leapJ = leapJ + div(n, 33) * 8 + div(mod(n, 33) + 3, 4);
  if (mod(jump, 33) === 4 && jump - n === 4) leapJ += 1;
  const leapG = div(gy, 4) - div((div(gy, 100) + 1) * 3, 4) - 150;
  const march = 20 + leapJ - leapG;
  if (jump - n < 6) n = n - jump + div(jump + 4, 33) * 33;
  let leap = mod(mod(n + 1, 33) - 1, 4);
  if (leap === -1) leap = 4;
  return { leap, gy, march };
}

function g2d(gy: number, gm: number, gd: number) {
  let d = div((gy + div(gm - 8, 6) + 100100) * 1461, 4) + div(153 * mod(gm + 9, 12) + 2, 5) + gd - 34840408;
  d = d - div(div(gy + 100100 + div(gm - 8, 6), 100) * 3, 4) + 752;
  return d;
}

function d2g(jdn: number) {
  let j = 4 * jdn + 139361631;
  j = j + div(div(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908;
  const i = div(mod(j, 1461), 4) * 5 + 308;
  const gd = div(mod(i, 153), 5) + 1;
  const gm = mod(div(i, 153), 12) + 1;
  const gy = div(j, 1461) - 100100 + div(8 - gm, 6);
  return { gy, gm, gd };
}

export function j2d(jy: number, jm: number, jd: number) {
  const r = jalCal(jy);
  return g2d(r.gy, 3, r.march) + (jm - 1) * 31 - div(jm, 7) * (jm - 7) + jd - 1;
}

export function d2j(jdn: number) {
  const gy = d2g(jdn).gy;
  let jy = gy - 621;
  const r = jalCal(jy);
  const jdn1f = g2d(gy, 3, r.march);
  let k = jdn - jdn1f;
  if (k >= 0) {
    if (k <= 185) return { jy, jm: 1 + div(k, 31), jd: mod(k, 31) + 1 };
    k -= 186;
  } else {
    jy -= 1;
    k += 179;
    if (r.leap === 1) k += 1;
  }
  return { jy, jm: 7 + div(k, 30), jd: mod(k, 30) + 1 };
}

export const toJalali = (iso: string | Date) => {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  return d2j(g2d(d.getFullYear(), d.getMonth() + 1, d.getDate()));
};

export const jalaliToIso = (jy: number, jm: number, jd: number) => {
  const g = d2g(j2d(jy, jm, jd));
  return `${g.gy}-${String(g.gm).padStart(2, '0')}-${String(g.gd).padStart(2, '0')}`;
};

export const gregToIso = (gy: number, gm: number, gd: number) =>
  `${gy}-${String(gm).padStart(2, '0')}-${String(gd).padStart(2, '0')}`;

export const isLeapJalali = (jy: number) => jalCal(jy).leap === 0;
export const jalMonthLen = (jy: number, jm: number) => (jm <= 6 ? 31 : jm <= 11 ? 30 : isLeapJalali(jy) ? 30 : 29);

/** day-of-week index with Saturday = 0 … Friday = 6 */
export const weekdayJalali = (jy: number, jm: number, jd: number) => {
  const g = d2g(j2d(jy, jm, jd));
  const dow = new Date(g.gy, g.gm - 1, g.gd).getDay(); // Sun=0
  return (dow + 1) % 7;
};
export const weekdayGreg = (gy: number, gm: number, gd: number) => (new Date(gy, gm - 1, gd).getDay() + 1) % 7;

export const JAL_MONTHS = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];
export const GREG_MONTHS_EN = ['ژانویه', 'فوریه', 'مارس', 'آوریل', 'مه', 'ژوئن', 'ژوئیه', 'اوت', 'سپتامبر', 'اکتبر', 'نوامبر', 'دسامبر'];
export const WEEKDAYS = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];
export const WEEKDAYS_FULL = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'];

const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
export const faDigits = (v: string | number) => String(v).replace(/[0-9]/g, (d) => FA_DIGITS[+d]);
export const enDigits = (v: string) => v.replace(/[۰-۹]/g, (d) => String(FA_DIGITS.indexOf(d)));

const p2 = (n: number) => String(n).padStart(2, '0');

export function fmtJalali(iso: string | Date, withTime = false) {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  const j = toJalali(d);
  const s = `${faDigits(j.jy)}/${faDigits(p2(j.jm))}/${faDigits(p2(j.jd))}`;
  return withTime ? `${s} — ${faDigits(p2(d.getHours()))}:${faDigits(p2(d.getMinutes()))}` : s;
}
export function fmtGreg(iso: string | Date, withTime = false) {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  const s = `${d.getFullYear()}/${p2(d.getMonth() + 1)}/${p2(d.getDate())}`;
  return withTime ? `${s} — ${p2(d.getHours())}:${p2(d.getMinutes())}` : s;
}
export function fmtJalaliLong(iso: string | Date) {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  const j = toJalali(d);
  return `${faDigits(j.jd)} ${JAL_MONTHS[j.jm - 1]} ${faDigits(j.jy)}`;
}
export function fmtGregLong(iso: string | Date) {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  return `${d.getDate()} ${GREG_MONTHS_EN[d.getMonth()]} ${d.getFullYear()}`;
}
export function fmtWeekdayJalali(iso: string | Date) {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  const j = toJalali(d);
  return `${WEEKDAYS_FULL[weekdayJalali(j.jy, j.jm, j.jd)]}، ${fmtJalaliLong(d)}`;
}

/** ISO offset helper: days from now */
export const isoDays = (days: number, hourOffset = 0) => {
  const d = new Date(Date.now() + days * 864e5 + hourOffset * 36e5);
  return d.toISOString();
};

/** month key (jalali) of an ISO date: "1404-05" */
export const jalMonthKey = (iso: string) => {
  const j = toJalali(iso);
  return `${j.jy}-${p2(j.jm)}`;
};

export const daysBetween = (a: string, b: string) =>
  Math.round((new Date(b).getTime() - new Date(a).getTime()) / 864e5);

/** last N jalali months as [{key,label}] oldest→newest */
export function lastJalaliMonths(n: number) {
  const out: { key: string; label: string }[] = [];
  const now = toJalali(new Date());
  let jy = now.jy, jm = now.jm;
  for (let i = 0; i < n; i++) {
    out.unshift({ key: `${jy}-${p2(jm)}`, label: `${JAL_MONTHS[jm - 1]} ${faDigits(String(jy).slice(2))}` });
    jm--; if (jm === 0) { jm = 12; jy--; }
  }
  return out;
}
