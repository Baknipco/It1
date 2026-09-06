/* ------------------------------------------------------------------
   لایه Application + Business Logic
   مدیریت حالت، ماندگاری، موتور دسترسی چندلایه (Layered Security)،
   Audit، اعلان‌ها و عملیات دامنه
------------------------------------------------------------------- */
import { createContext, useContext, useEffect, useMemo, useRef, useState, createElement, ReactNode } from 'react';
import { AppState, ActionKey, DocItem, User, Grant, Classification } from './types';
import { buildSeed } from './seed';
import { tr, Lang } from './i18n';
import { fmtJalali, fmtGreg, fmtJalaliLong, fmtGregLong, toJalali } from './jalali';

const DATA_KEY = 'nipco-kms-data-v3';
const SESSION_KEY = 'nipco-kms-session-v3';
const PREFS_KEY = 'nipco-kms-prefs-v3';

export interface Toast { id: number; kind: 'ok' | 'warn' | 'err' | 'info'; text: string }
export interface QueueJob { id: number; label: string; pct: number; status: 'run' | 'done' | 'fail' }
export interface NavState { page: string; params: Record<string, string> }

export interface Ctx {
  doc?: DocItem; docId?: string; deptId?: string; projectId?: string; equipmentId?: string;
}
export interface ChainStep { step: string; result: 'pass' | 'deny' | 'skip'; note: string }
export interface Decision { ok: boolean; chain: ChainStep[] }

const nowIso = () => new Date().toISOString();
let _id = 0;
const uid = (p = 'id') => `${p}-${Date.now().toString(36)}-${(++_id).toString(36)}`;

function loadData(): AppState {
  try {
    const raw = localStorage.getItem(DATA_KEY);
    if (raw) { const p = JSON.parse(raw); if (p && p.departments && p.settings) return p as AppState; }
  } catch { /* ignore */ }
  return buildSeed();
}
function loadPrefs() {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { lang: 'fa' as Lang, calendar: 'jalali' as 'jalali' | 'gregorian' };
}

interface StoreApi {
  data: AppState;
  user: User | null;
  lang: Lang; setLang: (l: Lang) => void;
  calendar: 'jalali' | 'gregorian'; setCalendar: (c: 'jalali' | 'gregorian') => void;
  nav: NavState; navigate: (page: string, params?: Record<string, string>) => void;
  toasts: Toast[]; toast: (text: string, kind?: Toast['kind']) => void;
  queue: QueueJob[];
  t: (k: string) => string;
  fmt: (iso?: string, withTime?: boolean) => string;
  fmtLong: (iso?: string) => string;
  fmtDual: (iso?: string) => string;

  login: (u: string, p: string) => { ok: boolean; error?: string };
  logout: () => void;

  can: (action: ActionKey, ctx?: Ctx) => boolean;
  decide: (action: ActionKey, ctx?: Ctx, who?: User | null) => Decision;

  audit: (action: string, target: string, targetType: string, details: string, severity?: 'info' | 'warn' | 'critical') => void;
  notify: (forUser: string, type: 'doc' | 'approval' | 'security' | 'ai' | 'backup' | 'expiry' | 'system', text: string) => void;
  markNotifsRead: () => void;

  deptName: (id?: string) => string;
  userName: (id?: string) => string;
  deptChildren: (id: string) => string[];
  inDeptScope: (deptId: string, scopeDept: string) => boolean;
  visibleDocs: () => DocItem[];

  setData: (fn: (d: AppState) => AppState) => void;
  setSettings: (patch: Partial<AppState['settings']>) => void;
  runBackup: (kind: 'full' | 'differential' | 'incremental') => void;
  restoreFrom: (json: string) => { ok: boolean; error?: string };
  resetDemo: () => void;
}

const StoreCtx = createContext<StoreApi | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setDataState] = useState<AppState>(loadData);
  const [sessionId, setSessionId] = useState<string | null>(() => localStorage.getItem(SESSION_KEY));
  const prefs = useMemo(loadPrefs, []);
  const [lang, setLangState] = useState<Lang>(prefs.lang);
  const [calendar, setCalState] = useState<'jalali' | 'gregorian'>(prefs.calendar);
  const [nav, setNav] = useState<NavState>({ page: 'dashboard', params: {} });
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [queue, setQueue] = useState<QueueJob[]>([]);
  const saveTimer = useRef<number>(0);

  useEffect(() => {
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      try { localStorage.setItem(DATA_KEY, JSON.stringify(data)); } catch { /* quota */ }
    }, 250);
  }, [data]);

  const setData = (fn: (d: AppState) => AppState) => setDataState(prev => fn(prev));

  const user = useMemo(() => data.users.find(u => u.id === sessionId) || null, [data.users, sessionId]);

  const t = (k: string) => tr(lang, k);
  const fmt = (iso?: string, withTime = false) => {
    if (!iso) return '—';
    return calendar === 'jalali' ? fmtJalali(iso, withTime) : fmtGreg(iso, withTime);
  };
  const fmtLong = (iso?: string) => {
    if (!iso) return '—';
    return calendar === 'jalali' ? fmtJalaliLong(iso) : fmtGregLong(iso);
  };
  const fmtDual = (iso?: string) => {
    if (!iso) return '—';
    return calendar === 'jalali' ? `${fmtJalali(iso)} (${fmtGreg(iso)})` : `${fmtGreg(iso)} (${fmtJalali(iso)})`;
  };

  const toast = (text: string, kind: Toast['kind'] = 'info') => {
    const id = Date.now() + Math.random();
    setToasts(ts => [...ts.slice(-3), { id, kind, text }]);
    window.setTimeout(() => setToasts(ts => ts.filter(x => x.id !== id)), 4600);
  };

  const navigate = (page: string, params: Record<string, string> = {}) => {
    setNav({ page, params });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const setLang = (l: Lang) => {
    setLangState(l);
    document.documentElement.dir = l === 'fa' ? 'rtl' : 'ltr';
    document.documentElement.lang = l;
    localStorage.setItem(PREFS_KEY, JSON.stringify({ lang: l, calendar }));
  };
  const setCalendar = (c: 'jalali' | 'gregorian') => {
    setCalState(c);
    localStorage.setItem(PREFS_KEY, JSON.stringify({ lang, calendar: c }));
  };

  /* ------------------------- Audit & Notify ------------------------- */
  const audit: StoreApi['audit'] = (action, target, targetType, details, severity = 'info') => {
    setData(d => ({
      ...d,
      audit: [{
        id: uid('a'), ts: nowIso(), userId: user?.id ?? 'system', userName: user?.name ?? 'سیستم',
        action, target, targetType, details, severity,
        ip: `10.40.${10 + ((user?.name.length ?? 3) % 30)}.${(user?.name.charCodeAt(0) ?? 40) % 250}`,
      }, ...d.audit].slice(0, 600),
    }));
  };

  const notify: StoreApi['notify'] = (forUser, type, text) => {
    setData(d => ({ ...d, notifs: [{ id: uid('n'), ts: nowIso(), forUser, type, text, read: false }, ...d.notifs].slice(0, 200) }));
  };
  const markNotifsRead = () => {
    if (!user) return;
    setData(d => ({ ...d, notifs: d.notifs.map(n => (n.forUser === user.id || n.forUser === 'all') ? { ...n, read: true } : n) }));
  };

  /* ------------------------- Auth ------------------------- */
  const login: StoreApi['login'] = (uname, pass) => {
    const u = data.users.find(x => x.username.toLowerCase() === uname.trim().toLowerCase());
    const record = (ok: boolean, details: string, severity: 'info' | 'warn' | 'critical' = 'warn') => {
      setData(d => ({
        ...d,
        audit: [{ id: uid('a'), ts: nowIso(), userId: u?.id ?? '-', userName: uname, action: ok ? 'login' : 'login_failed', target: uname, targetType: 'auth', details, severity, ip: '10.40.20.114' }, ...d.audit],
        users: u ? d.users.map(x => x.id === u.id ? { ...x, failedLogins: ok ? 0 : x.failedLogins + 1, lastLogin: ok ? nowIso() : x.lastLogin } : x) : d.users,
      }));
    };
    if (!u) { record(false, 'نام کاربری ناشناخته'); return { ok: false, error: 'نام کاربری یا گذرواژه نادرست است.' }; }
    if (!u.active) return { ok: false, error: 'این حساب توسط مدیر غیرفعال شده است.' };
    if (u.accessFrom && new Date(u.accessFrom) > new Date()) return { ok: false, error: 'دسترسی شما هنوز فعال نشده است (محدودیت زمانی).' };
    if (u.accessUntil && new Date(u.accessUntil) < new Date()) return { ok: false, error: 'اعتبار دسترسی شما به پایان رسیده است. با مدیر سیستم تماس بگیرید.' };
    if (u.failedLogins >= data.settings.policy.lockAfter) return { ok: false, error: `حساب به دلیل ${u.failedLogins} بار ورود ناموفق قفل شده است. با مدیر امنیت تماس بگیرید.` };
    if (u.password !== pass) {
      const remain = data.settings.policy.lockAfter - u.failedLogins - 1;
      record(false, `گذرواژه نادرست (تلاش ${u.failedLogins + 1})`);
      return { ok: false, error: remain > 0 ? `گذرواژه نادرست است. ${remain} تلاش دیگر تا قفل شدن حساب.` : 'حساب شما قفل شد.' };
    }
    record(true, 'ورود موفق', 'info');
    setSessionId(u.id);
    localStorage.setItem(SESSION_KEY, u.id);
    setNav({ page: 'dashboard', params: {} });
    return { ok: true };
  };

  const logout = () => {
    audit('logout', user?.username ?? '', 'auth', 'خروج از سامانه');
    setSessionId(null);
    localStorage.removeItem(SESSION_KEY);
  };

  /* ------------------------- Permission Engine ------------------------- */
  const deptChildren = (id: string) => data.departments.filter(d => d.parentId === id).map(d => d.id);
  const inDeptScope = (deptId: string, scopeDept: string) => {
    if (deptId === scopeDept) return true;
    let cur = data.departments.find(d => d.id === deptId);
    let guard = 0;
    while (cur && cur.parentId && guard++ < 10) {
      if (cur.parentId === scopeDept) return true;
      cur = data.departments.find(d => d.id === cur!.parentId);
    }
    return false;
  };

  const grantTimeOk = (g: Grant) => {
    const now = new Date();
    if (g.from && new Date(g.from) > now) return false;
    if (g.until && new Date(g.until) < now) return false;
    return true;
  };

  const decide: StoreApi['decide'] = (action, ctx = {}, who = user) => {
    const chain: ChainStep[] = [];
    const deny = (note: string): Decision => { chain.push({ step: 'نتیجه', result: 'deny', note }); return { ok: false, chain }; };
    const allow = (note: string): Decision => { chain.push({ step: 'نتیجه', result: 'pass', note }); return { ok: true, chain }; };

    if (!who) return deny('کاربر احراز هویت نشده است.');
    chain.push({ step: '۱. احراز هویت', result: 'pass', note: `کاربر: ${who.name}` });

    if (!who.active) return deny('حساب کاربر غیرفعال است.');
    if (who.accessFrom && new Date(who.accessFrom) > new Date()) return deny('دسترسی کاربر هنوز شروع نشده (Time-Based Access).');
    if (who.accessUntil && new Date(who.accessUntil) < new Date()) return deny('اعتبار زمانی دسترسی کاربر تمام شده است.');
    chain.push({ step: '۲. اعتبار حساب و بازه زمانی', result: 'pass', note: 'حساب فعال و در بازه مجاز' });

    if (who.role === 'admin') return allow('نقش «مدیر سامانه» — دسترسی کامل طبق Policy.');

    const doc = ctx.doc ?? (ctx.docId ? data.documents.find(d => d.id === ctx.docId) : undefined);
    const deptId = ctx.deptId ?? doc?.deptId;
    const cls: Classification | null = doc?.classification ?? null;
    const sensitiveActions: ActionKey[] = ['download', 'print', 'export', 'share', 'copy'];

    // ACL صریح سند
    if (doc) {
      const entry = doc.acl.find(a => a.userId === who.id);
      if (entry) {
        if (entry.actions.includes(action)) return allow(`فهرست دسترسی صریح سند (Document ACL): کاربر ${who.name} مجاز به «${action}» روی ${doc.code} است.`);
        chain.push({ step: '۳. سطح سند (ACL)', result: 'skip', note: 'کاربر در ACL سند هست اما این عمل را ندارد' });
      } else chain.push({ step: '۳. سطح سند (ACL)', result: 'skip', note: 'ورودی صریحی برای این کاربر وجود ندارد' });
    }

    // Grantهای صریح (کاربر/نقش × محدوده × عمل × زمان)
    const matched = data.grants.filter(g =>
      grantTimeOk(g) &&
      ((g.subjectType === 'user' && g.subjectId === who.id) || (g.subjectType === 'role' && g.subjectId === who.role)) &&
      g.actions.includes(action) && (
        (g.scopeLevel === 'organization') ||
        (g.scopeLevel === 'department' && !!deptId && inDeptScope(deptId, g.scopeRef!)) ||
        (g.scopeLevel === 'document' && doc?.id === g.scopeRef) ||
        (g.scopeLevel === 'project' && !!ctx.projectId && ctx.projectId === g.scopeRef) ||
        (g.scopeLevel === 'equipment' && !!ctx.equipmentId && ctx.equipmentId === g.scopeRef) ||
        (g.scopeLevel === 'knowledge' || g.scopeLevel === 'folder' || g.scopeLevel === 'category' || g.scopeLevel === 'field')
      )
    );
    if (matched.length) {
      const g = matched[0];
      const sub = g.subjectType === 'user' ? `کاربر ${who.name}` : `نقش «${who.role}»`;
      const expired = data.grants.some(x => x.id === g.id && !grantTimeOk(x));
      if (expired) chain.push({ step: '۴. Grant صریح', result: 'skip', note: 'Grant منقضی شده' });
      else return allow(`Grant صریح: ${sub} در محدوده «${g.scopeLevel}${g.scopeRef ? '/' + g.scopeRef : ''}» مجاز به «${action}» است. ${g.note ?? ''}`);
    } else chain.push({ step: '۴. Grant صریح (کاربر/نقش)', result: 'skip', note: 'Grant فعال مطابقی یافت نشد' });

    // سیاست طبقه‌بندی امنیتی
    if (cls === 'topsecret' && sensitiveActions.includes(action))
      return deny('سند «بسیار محرمانه» است — این عمل فقط با Grant صریح امکان‌پذیر است (DLP فعال).');
    if (doc && action === 'download' && !doc.allowDownload)
      return deny('دانلود این سند توسط مالک غیرفعال شده است (Deny Download).');
    if (doc && (action === 'print') && !doc.allowPrint)
      return deny('چاپ این سند غیرفعال شده است (Secure Mode).');
    chain.push({ step: '۵. سیاست طبقه‌بندی و DLP', result: 'pass', note: cls ? `طبقه‌بندی «${cls}» مانعی ایجاد نکرد` : 'بدون محدودیت سند' });

    // عضویت واحد + نقش
    if (deptId && who.departments.some(d => inDeptScope(deptId, d) || inDeptScope(d, deptId))) {
      const base: ActionKey[] = ['view', 'preview', 'comment', 'ai_query', 'ai_summary', 'create', 'upload'];
      const mgr: ActionKey[] = [...base, 'approve', 'reject', 'download', 'print', 'export', 'report', 'archive', 'restore', 'edit', 'delete', 'version', 'ocr', 'move', 'rename', 'share'];
      const expert: ActionKey[] = [...base, 'download', 'print', 'report', 'ocr', 'edit', 'version'];
      const usr: ActionKey[] = [...base, 'download'];
      const matrix: Record<string, ActionKey[]> = { dept_manager: mgr, expert, user: usr, executive: ['view', 'preview', 'report', 'ai_query'], security: ['view', 'report'], viewer: [] };
      if ((matrix[who.role] || []).includes(action))
        return allow(`عضویت در واحد + نقش «${who.role}» — دسترسی پیش‌فرض واحد (نه سازمان).`);
      chain.push({ step: '۶. عضویت واحد + نقش', result: 'skip', note: `نقش «${who.role}» این عمل را در سطح واحد ندارد` });
    } else chain.push({ step: '۶. عضویت واحد', result: 'skip', note: 'کاربر عضو واحد مربوطه نیست' });

    if (action === 'view' && cls === 'public') return allow('سند «عمومی» است — مشاهده برای همه کاربران فعال مجاز است.');
    return deny('هیچ قاعده‌ای این دسترسی را مجاز نکرد (Default Deny).');
  };

  const can: StoreApi['can'] = (action, ctx) => decide(action, ctx).ok;

  const deptName = (id?: string) => data.departments.find(d => d.id === id)?.name ?? '—';
  const userName = (id?: string) => data.users.find(u => u.id === id)?.name ?? '—';
  const visibleDocs = () => data.documents.filter(d => decide('view', { doc: d }).ok);

  const setSettings = (patch: Partial<AppState['settings']>) =>
    setData(d => ({ ...d, settings: { ...d.settings, ...patch } }));

  const runBackup: StoreApi['runBackup'] = (kind) => {
    const sizeKB = Math.round(JSON.stringify(data).length / 1024) * (kind === 'full' ? 14 : kind === 'differential' ? 3 : 1);
    const rec = { id: uid('bk'), ts: nowIso(), kind, sizeKB, status: 'success' as const, includes: kind === 'full' ? ['Database', 'Documents', 'Media', 'Vector DB', 'Knowledge Graph', 'Config', 'Security Config'] : ['Database', 'Documents'], operator: user?.name ?? 'سیستم' };
    setData(d => ({ ...d, backups: [rec, ...d.backups] }));
    audit('backup_run', rec.id, 'backup', `پشتیبان‌گیری ${kind === 'full' ? 'کامل' : kind === 'differential' ? 'تفاضلی' : 'افزایشی'} — ${sizeKB}KB — رمزنگاری AES-256`, 'info');
    notify('all', 'backup', `پشتیبان‌گیری ${kind === 'full' ? 'کامل' : kind === 'differential' ? 'تفاضلی' : 'افزایشی'} با موفقیت انجام شد.`);
    toast('پشتیبان‌گیری با موفقیت انجام و در مخزن رمزنگاری‌شده ذخیره شد.', 'ok');
  };

  const restoreFrom: StoreApi['restoreFrom'] = (json) => {
    try {
      const p = JSON.parse(json);
      if (!p || !Array.isArray(p.departments) || !Array.isArray(p.documents) || !p.settings)
        return { ok: false, error: 'فایل انتخابی ساختار معتبر پشتیبان نیپکو را ندارد.' };
      setDataState(p as AppState);
      audit('restore', 'full-restore', 'backup', 'بازیابی کامل از فایل پشتیبان', 'critical');
      toast('بازیابی کامل انجام شد. داده‌ها از نسخه پشتیبان جایگزین شدند.', 'ok');
      return { ok: true };
    } catch {
      return { ok: false, error: 'فایل قابل خواندن نیست. مطمئن شوید فایل JSON پشتیبان نیپکو را انتخاب کرده‌اید.' };
    }
  };

  const resetDemo = () => {
    localStorage.removeItem(DATA_KEY);
    setDataState(buildSeed());
    toast('داده‌های نمایشی به حالت اولیه بازنشانی شد.', 'ok');
  };

  /* صف پردازش پس‌زمینه (OCR / خلاصه‌سازی / Embedding) */
  const pushJob = (label: string, onDone?: () => void) => {
    const id = Date.now() + Math.random();
    setQueue(q => [...q, { id, label, pct: 4, status: 'run' }]);
    const tick = () => {
      setQueue(q => q.map(j => {
        if (j.id !== id || j.status !== 'run') return j;
        const pct = Math.min(100, j.pct + 7 + Math.random() * 16);
        if (pct >= 100) { window.setTimeout(() => { setQueue(qq => qq.filter(x => x.id !== id)); onDone?.(); }, 500); return { ...j, pct: 100, status: 'done' as const }; }
        return { ...j, pct };
      }));
    };
    const iv = window.setInterval(tick, 260);
    window.setTimeout(() => window.clearInterval(iv), 6000);
  };

  const api: StoreApi = {
    data, user, lang, setLang, calendar, setCalendar, nav, navigate, toasts, toast, queue,
    t, fmt, fmtLong, fmtDual, login, logout, can, decide, audit, notify, markNotifsRead,
    deptName, userName, deptChildren, inDeptScope, visibleDocs, setData, setSettings, runBackup, restoreFrom, resetDemo,
  };
  (api as unknown as Record<string, unknown>).pushJob = pushJob;

  return createElement(StoreCtx.Provider, { value: api }, children);
}

export function useStore() {
  const s = useContext(StoreCtx);
  if (!s) throw new Error('StoreProvider missing');
  return s as StoreApi & { pushJob: (label: string, onDone?: () => void) => void };
}

/* نقش‌ها */
export const ROLES: { id: string; fa: string; en: string }[] = [
  { id: 'admin', fa: 'مدیر سامانه', en: 'System Admin' },
  { id: 'security', fa: 'مدیر امنیت', en: 'Security Admin' },
  { id: 'executive', fa: 'مدیر ارشد', en: 'Executive' },
  { id: 'dept_manager', fa: 'مدیر واحد', en: 'Dept Manager' },
  { id: 'expert', fa: 'کارشناس/متخصص', en: 'Expert' },
  { id: 'user', fa: 'کاربر', en: 'User' },
  { id: 'viewer', fa: 'مشاهده‌گر', en: 'Viewer' },
];
export const roleFa = (r: string) => ROLES.find(x => x.id === r)?.fa ?? r;

export const CLASSIFICATIONS: { id: Classification; fa: string; color: string; bg: string }[] = [
  { id: 'public', fa: 'عمومی', color: '#5b6b70', bg: '#eef1f0' },
  { id: 'internal', fa: 'داخلی', color: '#0e6b5c', bg: '#e2efec' },
  { id: 'confidential', fa: 'محرمانه', color: '#b87a12', bg: '#faf0d9' },
  { id: 'topsecret', fa: 'بسیار محرمانه', color: '#c03a2e', bg: '#f9e7e4' },
];
export const clsOf = (c?: string) => CLASSIFICATIONS.find(x => x.id === c) ?? CLASSIFICATIONS[1];

export const DOC_STATUS: Record<string, { fa: string; color: string }> = {
  draft: { fa: 'پیش‌نویس', color: '#5b6b70' }, scan: { fa: 'پویش امنیتی', color: '#52708c' },
  processing: { fa: 'در پردازش AI', color: '#52708c' }, review: { fa: 'در انتظار بازبینی', color: '#b87a12' },
  approved: { fa: 'تأییدشده', color: '#0e6b5c' }, published: { fa: 'منتشرشده', color: '#0e6b5c' },
  expired: { fa: 'منقضی', color: '#c03a2e' }, archived: { fa: 'آرشیوشده', color: '#7a6a52' },
};

export const jYear = (iso: string) => toJalali(iso).jy;
