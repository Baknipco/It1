import { useEffect, useMemo, useRef, useState } from 'react';
import { useStore, clsOf, DOC_STATUS, roleFa, Ctx } from '../lib/store';
import { DocItem, ActionKey, Classification, ALL_ACTIONS } from '../lib/types';
import { I, Btn, Badge, Modal, Drawer, Field, inputCls, Toggle, SectionTitle, Empty, Watermark, Num } from '../components/ui';
import { ClsBadge } from '../components/Layout';
import { smartMeta, extractiveSummary, sha256, fmtKB } from '../lib/ai';
import { toJalali } from '../lib/jalali';

const TEXT_EXT = ['txt', 'md', 'csv', 'rtf', 'json', 'log'];

export function DocumentsPage() {
  const s = useStore();
  const [q, setQ] = useState('');
  const [fDept, setFDept] = useState(s.nav.params.dept || '');
  const [fStatus, setFStatus] = useState('');
  const [fCls, setFCls] = useState('');
  const [fYear, setFYear] = useState('');
  const [fExp, setFExp] = useState(s.nav.params.exp === '1');
  const [addOpen, setAddOpen] = useState(s.nav.params.add === '1');
  const [openId, setOpenId] = useState(s.nav.params.open || '');

  useEffect(() => {
    if (s.nav.params.dept) setFDept(s.nav.params.dept);
    if (s.nav.params.open) setOpenId(s.nav.params.open);
    if (s.nav.params.add === '1') setAddOpen(true);
    if (s.nav.params.exp === '1') setFExp(true);
  }, [s.nav.params]);

  const years = useMemo(() => [...new Set(s.data.documents.map(d => d.year))].sort((a, b) => b - a), [s.data.documents]);
  const docs = useMemo(() => {
    let list = s.visibleDocs();
    if (fDept) list = list.filter(d => s.inDeptScope(d.deptId, fDept));
    if (fStatus) list = list.filter(d => d.status === fStatus);
    if (fCls) list = list.filter(d => d.classification === fCls);
    if (fYear) list = list.filter(d => d.year === +fYear);
    if (fExp) list = list.filter(d => d.expiresAt && (new Date(d.expiresAt).getTime() - Date.now()) / 864e5 <= 45 && !['archived', 'expired'].includes(d.status));
    if (q.trim()) {
      const t = q.trim().toLowerCase();
      list = list.filter(d => (d.title + d.code + d.tags.join(' ') + d.text).toLowerCase().includes(t));
    }
    return list.sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt));
  }, [s, fDept, fStatus, fCls, fYear, fExp, q]);

  const sel = s.data.documents.find(d => d.id === openId);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 anim-rise">
        <div className="flex items-center gap-2 bg-panel border border-line rounded-lg px-3 h-10 w-72 focus-within:border-brand transition">
          <I n="search" s={15} className="text-mute" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="جستجو در عنوان، کد، برچسب و متن…" className="bg-transparent text-[12.5px] focus:outline-none w-full" />
        </div>
        <select value={fDept} onChange={e => setFDept(e.target.value)} className={`${inputCls} !w-auto h-10`}>
          <option value="">همه واحدها</option>
          {s.data.departments.filter(d => d.active).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <select value={fStatus} onChange={e => setFStatus(e.target.value)} className={`${inputCls} !w-auto h-10`}>
          <option value="">همه وضعیت‌ها</option>
          {Object.entries(DOC_STATUS).map(([k, v]) => <option key={k} value={k}>{v.fa}</option>)}
        </select>
        <select value={fCls} onChange={e => setFCls(e.target.value)} className={`${inputCls} !w-auto h-10`}>
          <option value="">همه طبقه‌بندی‌ها</option>
          {['public', 'internal', 'confidential', 'topsecret'].map(c => <option key={c} value={c}>{clsOf(c).fa}</option>)}
        </select>
        <select value={fYear} onChange={e => setFYear(e.target.value)} className={`${inputCls} !w-auto h-10`}>
          <option value="">همه سال‌ها</option>
          {years.map(y => <option key={y} value={y}>{s.lang === 'fa' ? `${'۰۱۲۳۴۵۶۷۸۹'.split('').map(c => c).join('') && String(y).replace(/[0-9]/g, d => '۰۱۲۳۴۵۶۷۸۹'[+d])}` : y}</option>)}
        </select>
        <label className="flex items-center gap-2 text-[12px] font-bold text-ink bg-panel border border-line rounded-lg px-3 h-10 cursor-pointer hover:border-brand transition">
          <input type="checkbox" checked={fExp} onChange={e => setFExp(e.target.checked)} className="accent-[#0e6b5c]" />در آستانه انقضا
        </label>
        <div className="flex-1" />
        <Btn icon="plus" onClick={() => setAddOpen(true)}>افزودن سند</Btn>
      </div>

      <p className="text-[11.5px] text-mute anim-fade"><Num v={docs.length} fa={s.lang === 'fa'} /> سند بر اساس دسترسی شما نمایش داده می‌شود (Permission Engine فعال — اسناد غیرمجاز حتی در جستجو هم دیده نمی‌شوند).</p>

      <div className="bg-panel border border-line rounded-2xl overflow-hidden anim-rise">
        <div className="grid grid-cols-[110px_1fr_130px_110px_90px_90px] gap-2 px-4 py-2.5 border-b border-line text-[10.5px] font-bold text-mute bg-paper/70 items-center">
          <span>کد سند</span><span>عنوان</span><span>واحد</span><span>طبقه‌بندی</span><span>وضعیت</span><span>بروزرسانی</span>
        </div>
        {docs.length === 0 && <Empty icon="doc" text="سندی مطابق فیلترها یافت نشد" sub="فیلترها را تغییر دهید یا سند جدیدی اضافه کنید." />}
        {docs.map(d => (
          <button key={d.id} onClick={() => { setOpenId(d.id); s.audit('view', d.code, 'document', `باز کردن سند «${d.title}»`, 'info'); }}
            className="w-full grid grid-cols-[110px_1fr_130px_110px_90px_90px] gap-2 px-4 py-3 border-b border-line/70 last:border-0 items-center text-start hover:bg-brand-soft/40 transition group">
            <span className="text-[11.5px] font-bold text-steel" dir="ltr">{d.code}</span>
            <span className="min-w-0">
              <span className="block text-[13px] font-bold text-ink truncate group-hover:text-brand transition">{d.title}</span>
              <span className="block text-[10.5px] text-mute mt-0.5">{d.type} • {fmtKB(d.sizeKB)} • v{d.versions[0]?.v ?? '1.0'} • <span dir="ltr">{d.format.toUpperCase()}</span></span>
            </span>
            <span className="text-[11.5px] font-semibold text-mute truncate">{s.deptName(d.deptId)}</span>
            <span><ClsBadge c={d.classification} /></span>
            <span><Badge color={DOC_STATUS[d.status].color}>{DOC_STATUS[d.status].fa}</Badge></span>
            <span className="text-[11px] text-mute tabular-nums">{s.fmt(d.modifiedAt)}</span>
          </button>
        ))}
      </div>

      {addOpen && <AddDocModal onClose={() => setAddOpen(false)} />}
      {sel && <DocDrawer doc={sel} onClose={() => setOpenId('')} />}
    </div>
  );
}

/* ============================ افزودن سند ============================ */
function AddDocModal({ onClose }: { onClose: () => void }) {
  const s = useStore();
  const [file, setFile] = useState<{ name: string; sizeKB: number; text: string; hash: string; format: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const [meta, setMeta] = useState<ReturnType<typeof smartMeta> | null>(null);
  const [title, setTitle] = useState(''); const [deptId, setDeptId] = useState('d-mnt');
  const [category, setCategory] = useState(''); const [type, setType] = useState('');
  const [cls, setCls] = useState<Classification>('internal');
  const [tags, setTags] = useState(''); const [projectId, setProjectId] = useState('');
  const [equipmentId, setEquipmentId] = useState('');
  const [allowDl, setAllowDl] = useState(true); const [allowPr, setAllowPr] = useState(true);
  const [dupWarn, setDupWarn] = useState<DocItem | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (f: File) => {
    setBusy(true);
    const ext = f.name.split('.').pop()?.toLowerCase() ?? 'bin';
    let text = '';
    try {
      if (TEXT_EXT.includes(ext)) text = await f.text();
      else if (f.size < 400000) { const buf = await f.arrayBuffer(); text = ''; void buf; }
    } catch { /* binary */ }
    const hash = await sha256(await f.arrayBuffer().catch(() => new ArrayBuffer(8)));
    const m = smartMeta(f.name, text);
    setFile({ name: f.name, sizeKB: Math.max(1, Math.round(f.size / 1024)), text, hash, format: ext });
    setMeta(m);
    setTitle(m.title); setDeptId(m.deptId); setCategory(m.category); setType(m.type);
    setCls(m.classification); setTags(m.tags.join('، '));
    setProjectId(m.projectId ?? ''); setEquipmentId(m.equipmentId ?? '');
    setAllowDl(m.classification !== 'topsecret'); setAllowPr(m.classification !== 'topsecret');
    const dup = s.data.documents.find(d => d.hash === hash);
    setDupWarn(dup ?? null);
    setBusy(false);
    s.toast(`AI متادیتای «${f.name}» را پیشنهاد داد — بررسی و تأیید کنید.`, 'info');
  };

  const save = () => {
    if (!file || !title.trim()) { s.toast('عنوان سند الزامی است.', 'err'); return; }
    const now = new Date().toISOString();
    const code = `${deptId.replace('d-', '').toUpperCase().slice(0, 3)}-${type.slice(0, 3).toUpperCase() || 'DOC'}-${1000 + s.data.documents.length + 15}`;
    const doc: DocItem = {
      id: `doc-${Date.now().toString(36)}`, code, title: title.trim(), deptId, category: category || 'عمومی',
      type: type || 'سند عمومی', format: file.format, classification: cls, status: 'processing',
      ownerId: s.user!.id, createdAt: now, modifiedAt: now, reviewAt: new Date(Date.now() + 3 * 864e5).toISOString(),
      tags: tags.split(/[،,]/).map(t => t.trim()).filter(Boolean), text: file.text || `سند «${title}» — متن کامل پس از OCR در دسترس خواهد بود.`,
      summary: file.text ? extractiveSummary(file.text, 2) : meta?.summary ?? 'در حال پردازش', keywords: meta?.keywords ?? [],
      versions: [{ v: '1.0', date: now, author: s.user!.name, reason: 'انتشار اولیه', sizeKB: file.sizeKB }],
      sizeKB: file.sizeKB, hash: file.hash, projectId: projectId || undefined, equipmentId: equipmentId || undefined,
      year: toJalali(now).jy, allowDownload: allowDl, allowPrint: allowPr, acl: [], dupOf: dupWarn?.id,
    };
    s.setData(d => ({ ...d, documents: [doc, ...d.documents] }));
    s.audit('upload', code, 'document', `بارگذاری «${file.name}» (${fmtKB(file.sizeKB)}) — SHA-256 ثبت شد`, 'info');
    s.notify('all', 'doc', `سند جدید «${title}» در صف پردازش هوشمند قرار گرفت.`);
    onClose();
    s.toast('سند ثبت شد؛ پردازش پس‌زمینه (پویش امنیتی ← OCR ← خلاصه‌سازی ← نمایه‌سازی) آغاز شد.', 'ok');

    const stages = ['پویش امنیتی فایل', 'استخراج متادیتا', cls === 'public' ? 'OCR فارسی' : 'OCR + رمزنگاری At-Rest', 'خلاصه‌سازی AI', 'برچسب‌گذاری و Embedding', 'نمایه‌سازی جستجو'];
    stages.forEach((st, i) => s.pushJob(`${st} — ${code}`));
    window.setTimeout(() => {
      s.setData(d => ({ ...d, documents: d.documents.map(x => x.id === doc.id ? { ...x, status: 'review', processing: undefined } : x) }));
      const mgr = s.data.users.find(u => u.role === 'dept_manager' && u.departments.includes(deptId));
      if (mgr) s.notify(mgr.id, 'approval', `سند «${title}» (${code}) آماده بازبینی و تأیید شماست.`);
      s.toast(`پردازش «${code}» کامل شد — سند برای بازبینی ارسال شد.`, 'ok');
    }, 3200);
  };

  return (
    <Modal open onClose={onClose} title="افزودن سند جدید — Smart Upload" w={720}
      footer={<>
        <Btn kind="line" onClick={onClose}>انصراف</Btn>
        <Btn icon="check" disabled={!file || busy} onClick={save}>ثبت و شروع پردازش هوشمند</Btn>
      </>}>
      {!file ? (
        <div
          onDragOver={e => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={e => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files?.[0]; if (f) handleFile(f); }}
          className={`border-2 border-dashed rounded-2xl p-10 text-center transition-all cursor-pointer ${drag ? 'border-brand bg-brand-soft scale-[1.01]' : 'border-linedark hover:border-brand'}`}
          onClick={() => inputRef.current?.click()}>
          <input ref={inputRef} type="file" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
          <div className="w-16 h-16 mx-auto rounded-2xl bg-brand-soft text-brand flex items-center justify-center mb-4"><I n="upload" s={30} /></div>
          <p className="font-display text-[19px] text-ink pt-1">فایل را اینجا رها کنید</p>
          <p className="text-[12.5px] text-mute mt-2 leading-6">یا کلیک کنید و فایل را انتخاب کنید — انتخاب چندتایی و Drag & Drop پشتیبانی می‌شود.<br />PDF / DOCX / XLSX / DWG / تصاویر / ویدئو / صدا — Chunk Upload با قابلیت Resume</p>
          <div className="flex flex-wrap justify-center gap-1.5 mt-4">
            {['PDF', 'DOCX', 'XLSX', 'DWG', 'JPG', 'MP4', 'MP3', 'TXT', 'MD'].map(f => <span key={f} className="text-[10px] font-bold bg-paper border border-line rounded px-2 py-1 text-mute" dir="ltr">{f}</span>)}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-3 bg-brand-soft/60 border border-brand/25 rounded-xl p-3">
            <span className="w-10 h-10 rounded-lg bg-brand text-white flex items-center justify-center"><I n="doc" s={18} /></span>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-bold text-ink truncate" dir="ltr">{file.name}</p>
              <p className="text-[11px] text-mute mt-0.5">{fmtKB(file.sizeKB)} • SHA-256: <span dir="ltr" className="font-mono">{file.hash.slice(0, 18)}…</span></p>
            </div>
            {busy ? <span className="w-4 h-4 border-2 border-brand border-t-transparent rounded-full" style={{ animation: 'spin .7s linear infinite' }} /> : <Btn kind="ghost" size="sm" icon="refresh" onClick={() => { setFile(null); setMeta(null); }}>فایل دیگر</Btn>}
          </div>

          {dupWarn && (
            <div className="flex items-start gap-2.5 bg-gold-soft border border-gold/40 rounded-xl p-3 text-[12px] font-semibold text-gold-deep leading-relaxed anim-pop">
              <I n="alert" s={16} className="mt-0.5" />
              <span>تشخیص تکراری (Hash Duplicate): سندی با اثر انگشت یکسان با کد <b dir="ltr">{dupWarn.code}</b> موجود است — «{dupWarn.title}». می‌توانید به‌جای ثبت جدید، نسخه جدید همان سند ایجاد کنید.</span>
            </div>
          )}

          <div className="bg-night rounded-xl p-3.5 text-white">
            <p className="text-[11.5px] font-bold text-gold flex items-center gap-1.5 mb-2"><I n="spark" s={14} />پیشنهاد هوشمند AI (کاملاً Local — بدون اینترنت)</p>
            <div className="flex flex-wrap gap-1.5">
              <span className="text-[11px] bg-white/8 rounded-lg px-2.5 py-1">واحد: <b>{s.deptName(meta?.deptId)}</b></span>
              <span className="text-[11px] bg-white/8 rounded-lg px-2.5 py-1">نوع: <b>{meta?.type}</b></span>
              <span className="text-[11px] bg-white/8 rounded-lg px-2.5 py-1">طبقه‌بندی: <b>{clsOf(meta?.classification).fa}</b></span>
              {(meta?.keywords ?? []).slice(0, 5).map(k => <span key={k} className="text-[11px] bg-brand/25 text-brand-glow rounded-lg px-2.5 py-1">#{k}</span>)}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            <div className="md:col-span-2"><Field label="عنوان سند" req><input className={inputCls} value={title} onChange={e => setTitle(e.target.value)} /></Field></div>
            <Field label="واحد مالک" req>
              <select className={inputCls} value={deptId} onChange={e => setDeptId(e.target.value)}>
                {s.data.departments.filter(d => d.active).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </Field>
            <Field label="طبقه‌بندی امنیتی">
              <select className={inputCls} value={cls} onChange={e => setCls(e.target.value as Classification)}>
                {['public', 'internal', 'confidential', 'topsecret'].map(c => <option key={c} value={c}>{clsOf(c).fa}</option>)}
              </select>
            </Field>
            <Field label="دسته"><input className={inputCls} value={category} onChange={e => setCategory(e.target.value)} placeholder="دستورالعمل، نقشه، گزارش…" /></Field>
            <Field label="نوع سند"><input className={inputCls} value={type} onChange={e => setType(e.target.value)} placeholder="SOP / Drawing / Report…" /></Field>
            <Field label="پروژه مرتبط">
              <select className={inputCls} value={projectId} onChange={e => setProjectId(e.target.value)}>
                <option value="">—</option>{s.data.projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </Field>
            <Field label="تجهیز مرتبط">
              <select className={inputCls} value={equipmentId} onChange={e => setEquipmentId(e.target.value)}>
                <option value="">—</option>{s.data.equipment.map(q => <option key={q.id} value={q.id}>{q.name}</option>)}
              </select>
            </Field>
            <div className="md:col-span-2"><Field label="برچسب‌ها (با ویرگول جدا کنید)"><input className={inputCls} value={tags} onChange={e => setTags(e.target.value)} /></Field></div>
            <div className="md:col-span-2 flex flex-wrap gap-6 border border-line rounded-xl p-3.5">
              <Toggle on={allowDl} onChange={setAllowDl} label="اجازه دانلود (Allow Download)" />
              <Toggle on={allowPr} onChange={setAllowPr} label="اجازه چاپ (Allow Print)" />
              <span className="text-[11px] text-mute leading-5 flex items-center gap-1.5"><I n="camx" s={15} />واترمارک پویا برای محرمانه به‌بالا خودکار فعال است</span>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}

/* ============================ جزئیات سند ============================ */
function DocDrawer({ doc, onClose }: { doc: DocItem; onClose: () => void }) {
  const s = useStore();
  const [tab, setTab] = useState<'info' | 'content' | 'versions' | 'access'>('info');
  const [viewer, setViewer] = useState(false);
  const [compare, setCompare] = useState(false);
  const ctx: Ctx = { doc };
  const canDl = s.can('download', ctx) && doc.allowDownload;
  const canPr = s.can('print', ctx) && doc.allowPrint;
  const canApprove = s.can('approve', ctx);
  const isOwnerOrAdmin = s.user?.id === doc.ownerId || s.user?.role === 'admin';
  const docGrants = s.data.grants.filter(g => g.scopeLevel === 'document' && g.scopeRef === doc.id);
  const sensitive = doc.classification === 'confidential' || doc.classification === 'topsecret';

  const doDownload = () => {
    if (!canDl) { s.audit('download_denied', doc.code, 'document', `تلاش دانلود «${doc.code}» مسدود شد (DLP)`, 'critical'); s.toast('دانلود این سند بر اساس سیاست DLP غیرفعال است؛ تلاش شما در Audit ثبت شد.', 'err'); return; }
    const blob = new Blob([`${doc.code} — ${doc.title}\n\n${doc.text}`], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = `${doc.code}.txt`; a.click();
    URL.revokeObjectURL(a.href);
    s.audit('download', doc.code, 'document', `دانلود «${doc.code}»`, 'warn');
    s.toast('فایل دانلود شد و رویداد آن در Audit ثبت گردید.', 'ok');
  };
  const doPrint = () => {
    if (!canPr) { s.audit('print_denied', doc.code, 'document', `تلاش چاپ «${doc.code}» مسدود شد`, 'critical'); s.toast('چاپ این سند غیرفعال است (Secure Mode). رویداد ثبت شد.', 'err'); return; }
    s.audit('print', doc.code, 'document', `چاپ «${doc.code}»`, 'warn');
    window.print();
  };
  const decideStatus = (ok: boolean) => {
    const now = new Date().toISOString();
    s.setData(d => ({ ...d, documents: d.documents.map(x => x.id === doc.id ? { ...x, status: ok ? 'published' : 'draft', approvedAt: ok ? now : x.approvedAt, publishedAt: ok ? now : x.publishedAt, modifiedAt: now } : x) }));
    s.audit(ok ? 'approve' : 'reject', doc.code, 'document', `${ok ? 'تأیید و انتشار' : 'رد'} سند «${doc.code}»`, 'warn');
    s.notify(doc.ownerId, 'approval', `سند شما «${doc.title}» ${ok ? 'تأیید و منتشر شد.' : 'رد شد — برای جزئیات به کارتابل مراجعه کنید.'}`);
    s.toast(ok ? 'سند تأیید و منتشر شد.' : 'سند رد شد و به مالک اطلاع داده شد.', ok ? 'ok' : 'warn');
  };
  const doArchive = () => {
    s.setData(d => ({ ...d, documents: d.documents.map(x => x.id === doc.id ? { ...x, status: 'archived', archivedAt: new Date().toISOString() } : x) }));
    s.audit('archive', doc.code, 'document', `آرشیو «${doc.code}»`, 'info');
    s.toast('سند به آرشیو منتقل شد.', 'ok');
  };

  return (
    <Drawer open onClose={onClose} w={680} title={<span className="flex items-center gap-2">{doc.code}<ClsBadge c={doc.classification} /></span>}>
      <div className="space-y-4">
        <div>
          <h3 className="font-display text-[19px] text-ink leading-relaxed">{doc.title}</h3>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <Badge color={DOC_STATUS[doc.status].color}>{DOC_STATUS[doc.status].fa}</Badge>
            <Badge color="#52708c">{doc.type}</Badge>
            <Badge color="#7a6a52">سال {String(doc.year).replace(/[0-9]/g, d => '۰۱۲۳۴۵۶۷۸۹'[+d])}</Badge>
            <span className="text-[11.5px] text-mute">مالک: <b className="text-ink">{s.userName(doc.ownerId)}</b></span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Btn icon="eye" onClick={() => setViewer(true)}>پیش‌نمایش امن</Btn>
          <Btn kind="line" icon="download" onClick={doDownload} disabled={!canDl} title={canDl ? '' : 'دانلود غیرفعال'}>دانلود</Btn>
          <Btn kind="line" icon="print" onClick={doPrint} disabled={!canPr} title={canPr ? '' : 'چاپ غیرفعال'}>چاپ</Btn>
          {canApprove && (doc.status === 'review' || doc.status === 'approved') && <>
            <Btn kind="gold" icon="check" onClick={() => decideStatus(true)}>تأیید و انتشار</Btn>
            <Btn kind="danger" icon="x" onClick={() => decideStatus(false)}>رد</Btn>
          </>}
          {(doc.status === 'published' || doc.status === 'expired') && (isOwnerOrAdmin || s.can('archive', ctx)) && <Btn kind="dark" icon="archive" onClick={doArchive}>آرشیو</Btn>}
        </div>

        <div className="flex border-b border-line gap-1">
          {([['info', 'جزئیات'], ['content', 'خلاصه و محتوا'], ['versions', `نسخه‌ها (${doc.versions.length})`], ['access', 'دسترسی‌ها']] as const).map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} className={`px-3.5 py-2 text-[12.5px] font-bold rounded-t-lg border-b-2 transition ${tab === k ? 'border-brand text-brand' : 'border-transparent text-mute hover:text-ink'}`}>{l}</button>
          ))}
        </div>

        {tab === 'info' && (
          <div className="grid grid-cols-2 gap-3 text-[12.5px]">
            {[
              ['واحد مالک', s.deptName(doc.deptId)], ['دسته', doc.category],
              ['فرمت', doc.format.toUpperCase()], ['حجم', fmtKB(doc.sizeKB)],
              ['ایجاد', s.fmtDual(doc.createdAt)], ['آخرین بروزرسانی', s.fmtDual(doc.modifiedAt)],
              ['تأیید', doc.approvedAt ? s.fmtDual(doc.approvedAt) : '—'], ['انتشار', doc.publishedAt ? s.fmtDual(doc.publishedAt) : '—'],
              ['انقضا', doc.expiresAt ? s.fmtDual(doc.expiresAt) : '—'], ['بازبینی بعدی', doc.reviewAt ? s.fmtDual(doc.reviewAt) : '—'],
              ['پروژه', doc.projectId ? s.data.projects.find(p => p.id === doc.projectId)?.name : '—'],
              ['تجهیز', doc.equipmentId ? s.data.equipment.find(q => q.id === doc.equipmentId)?.name : '—'],
            ].map(([k, v], i) => (
              <div key={i} className="border border-line rounded-lg p-2.5"><p className="text-[10.5px] font-bold text-mute">{k}</p><p className="font-bold text-ink mt-1">{v}</p></div>
            ))}
            <div className="col-span-2 border border-line rounded-lg p-2.5">
              <p className="text-[10.5px] font-bold text-mute mb-1.5">برچسب‌ها</p>
              <div className="flex flex-wrap gap-1.5">{doc.tags.map(t => <span key={t} className="text-[11px] font-bold bg-brand-soft text-brand-deep rounded-md px-2 py-1">#{t}</span>)}</div>
            </div>
            <div className="col-span-2 border border-line rounded-lg p-2.5">
              <p className="text-[10.5px] font-bold text-mute mb-1">اثر انگشت SHA-256</p>
              <p className="font-mono text-[11px] text-steel break-all" dir="ltr">{doc.hash}</p>
            </div>
          </div>
        )}

        {tab === 'content' && (
          <div className="space-y-3">
            <div className="bg-brand-soft/50 border border-brand/20 rounded-xl p-4">
              <p className="text-[11px] font-bold text-brand-deep flex items-center gap-1.5 mb-2"><I n="spark" s={14} />خلاصه اجرایی (تولیدشده توسط AI محلی)</p>
              <p className="text-[13px] leading-7 text-ink">{doc.summary}</p>
            </div>
            <div className="bg-paper border border-line rounded-xl p-4 secure-page relative overflow-hidden"
              onCopy={e => { if (s.data.settings.policy.blockCopy && sensitive) { e.preventDefault(); s.audit('copy_blocked', doc.code, 'document', `تلاش کپی متن «${doc.code}» مسدود شد`, 'warn'); s.toast('کپی از این سند به دلیل سیاست DLP مسدود و ثبت شد.', 'warn'); } }}
              onContextMenu={e => { if (sensitive) e.preventDefault(); }}>
              {sensitive && <Watermark lines={[`User: ${s.user?.name}`, `Doc: ${doc.code}`, s.fmt(new Date().toISOString(), true)]} />}
              <p className="text-[13px] leading-8 text-ink/90 whitespace-pre-line relative z-0">{doc.text}</p>
            </div>
            <p className="text-[11px] text-mute flex items-center gap-1.5"><I n="info" s={13} />کلیدواژه‌ها: {doc.keywords.join(' • ') || doc.tags.join(' • ')}</p>
          </div>
        )}

        {tab === 'versions' && (
          <div className="space-y-2">
            {doc.versions.map((v, i) => (
              <div key={i} className="flex items-center gap-3 border border-line rounded-xl p-3">
                <span className="w-9 h-9 rounded-lg bg-night text-gold font-display flex items-center justify-center text-[13px] pt-0.5">{v.v}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[12.5px] font-bold text-ink">{v.reason}</p>
                  <p className="text-[11px] text-mute mt-0.5">{v.author} • {s.fmtDual(v.date)} • {fmtKB(v.sizeKB)}</p>
                </div>
                {i === 0 && <Badge color="#0e6b5c">فعال</Badge>}
              </div>
            ))}
            {doc.versions.length > 1 && <Btn kind="line" icon="layers" onClick={() => setCompare(true)}>مقایسه نسخه‌ها (Diff)</Btn>}
            {compare && (
              <div className="grid grid-cols-2 gap-2 anim-pop">
                {doc.versions.slice(0, 2).map((v, i) => (
                  <div key={i} className={`border rounded-xl p-3 ${i === 0 ? 'border-brand bg-brand-soft/40' : 'border-line bg-paper'}`}>
                    <p className="text-[11px] font-bold mb-1.5">{i === 0 ? `نسخه ${v.v} (جدید)` : `نسخه ${v.v} (قبلی)`}</p>
                    <p className="text-[11.5px] leading-6 text-mute">{v.reason} — توسط {v.author}. {i === 0 ? <mark className="bg-gold-soft text-gold-deep rounded px-1">این تغییرات نسبت به نسخه قبل اعمال شده است.</mark> : 'متن پایه این نسخه.'}</p>
                    <p className="text-[10.5px] text-mute mt-2">حجم: {fmtKB(v.sizeKB)} {i === 0 && doc.versions[1] && <span className={v.sizeKB >= doc.versions[1].sizeKB ? 'text-brand font-bold' : 'text-crimson font-bold'}>({v.sizeKB >= doc.versions[1].sizeKB ? '+' : ''}{v.sizeKB - doc.versions[1].sizeKB}KB)</span>}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'access' && (
          <div className="space-y-3">
            <div>
              <p className="text-[12px] font-bold mb-2">زنجیره تصمیم دسترسی شما (Layered Security)</p>
              <div className="space-y-1.5">
                {s.decide('view', ctx).chain.map((c, i) => (
                  <div key={i} className={`flex items-start gap-2 rounded-lg border p-2.5 text-[12px] ${c.result === 'pass' ? 'border-brand/30 bg-brand-soft/40' : c.result === 'deny' ? 'border-crimson/30 bg-crimson-soft' : 'border-line bg-paper/60'}`}>
                    <span className={c.result === 'pass' ? 'text-brand' : c.result === 'deny' ? 'text-crimson' : 'text-mute'}><I n={c.result === 'pass' ? 'check' : c.result === 'deny' ? 'x' : 'clock'} s={14} /></span>
                    <div><b>{c.step}</b><p className="text-mute mt-0.5 leading-5">{c.note}</p></div>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {(['view', 'download', 'print', 'export', 'share', 'ai_query', 'ai_summary', 'approve'] as ActionKey[]).map(a => {
                const ok = s.can(a, ctx) && !(a === 'download' && !doc.allowDownload) && !(a === 'print' && !doc.allowPrint);
                return (
                  <div key={a} className="flex items-center justify-between border border-line rounded-lg px-3 py-2 text-[12px] font-bold">
                    <span>{ALL_ACTIONS.find(x => x.key === a)?.fa ?? a}</span>
                    <span className={ok ? 'text-brand' : 'text-crimson'}>{ok ? 'مجاز' : 'غیرمجاز'}</span>
                  </div>
                );
              })}
            </div>
            <div>
              <p className="text-[12px] font-bold mb-2">ACL سند (دسترسی صریح فردی)</p>
              {doc.acl.length === 0 && docGrants.length === 0 && <p className="text-[12px] text-mute">دسترسی صریحی تعریف نشده — فقط قواعد واحد/نقش اعمال می‌شود. عضویت در واحد به معنی دسترسی کامل نیست.</p>}
              {doc.acl.map((a, i) => (
                <div key={i} className="flex items-center justify-between border border-line rounded-lg px-3 py-2 mb-1.5 text-[12px]">
                  <b>{s.userName(a.userId)}</b>
                  <span className="text-mute">{a.actions.join('، ')}</span>
                </div>
              ))}
              {docGrants.map(g => (
                <div key={g.id} className="flex items-center justify-between border border-line rounded-lg px-3 py-2 mb-1.5 text-[12px]">
                  <b>{g.subjectType === 'user' ? s.userName(g.subjectId) : `نقش: ${roleFa(g.subjectId)}`}</b>
                  <span className="text-mute">{g.actions.join('، ')}{g.until ? ` — تا ${s.fmt(g.until)}` : ''}</span>
                </div>
              ))}
            </div>
            {sensitive && (
              <div className="bg-gold-soft border border-gold/40 rounded-xl p-3 text-[11.5px] leading-6 text-gold-deep flex gap-2">
                <I n="camx" s={16} className="mt-0.5 shrink-0" />
                <span><b>سیاست ضد افشا:</b> Watermark پویا با نام کاربر و زمان فعال است. جلوگیری از Screenshot/Print در حد توان مرورگر اعمال شده؛ برای دوربین فیزیکی، ردپای واترمارک هویت را قابل اثبات می‌کند. همه دسترسی‌ها Audit می‌شوند.</span>
              </div>
            )}
          </div>
        )}
      </div>

      {viewer && <SecureViewer doc={doc} onClose={() => setViewer(false)} />}
    </Drawer>
  );
}

/* ============================ پیش‌نمایش امن ============================ */
function SecureViewer({ doc, onClose }: { doc: DocItem; onClose: () => void }) {
  const s = useStore();
  const sensitive = doc.classification !== 'public' && doc.classification !== 'internal';
  useEffect(() => {
    s.audit('preview', doc.code, 'document', `پیش‌نمایش امن «${doc.code}» با Watermark`, 'info');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const paras = doc.text.split(/(?<=[.।])\s+|(?<=است)\s+(?=[A-Zآ-ی])/).filter(Boolean);
  return (
    <div className="fixed inset-0 z-[95] bg-night/85 anim-fade flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-panel rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl anim-pop" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-5 py-3 border-b border-line">
          <span className="w-8 h-8 rounded-lg bg-crimson text-white flex items-center justify-center"><I n="lock" s={15} /></span>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-bold truncate">{doc.code} — Secure Mode</p>
            <p className="text-[10.5px] text-mute">Watermark پویا فعال • {sensitive ? 'کپی و کلیک‌راست محدود' : 'حالت استاندارد'}</p>
          </div>
          <ClsBadge c={doc.classification} />
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-paper text-mute hover:text-ink"><I n="x" s={16} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 relative bg-[#f7f8f7]">
          {sensitive && <Watermark strong lines={[`CONFIDENTIAL`, `User: ${s.user?.name} (${s.user?.id})`, `Date: ${s.fmt(new Date().toISOString(), true)}`, `Document ID: ${doc.code}`]} />}
          <article className="secure-page max-w-xl mx-auto bg-white border border-line rounded-xl shadow-sm p-8 relative"
            onCopy={e => { if (s.data.settings.policy.blockCopy && sensitive) { e.preventDefault(); s.audit('copy_blocked', doc.code, 'document', 'تلاش کپی در Secure Viewer مسدود شد', 'warn'); s.toast('کپی مسدود و در Audit ثبت شد.', 'warn'); } }}
            onContextMenu={e => { if (sensitive) e.preventDefault(); }}>
            <p className="text-[10px] font-bold text-mute border-b border-line pb-3 mb-4 flex justify-between"><span dir="ltr">{doc.code}</span><span>Rev {doc.versions[0]?.v}</span></p>
            <h2 className="font-display text-[20px] text-ink leading-relaxed mb-4">{doc.title}</h2>
            {paras.map((p, i) => <p key={i} className="text-[13.5px] leading-8 text-ink/85 mb-4 text-justify">{p}</p>)}
            <p className="text-[10px] text-mute border-t border-line pt-3 mt-6 flex justify-between"><span>تولید پیش‌نمایش: موتور اسناد نیپکو — Offline</span><span>صفحه ۱ از ۱</span></p>
          </article>
        </div>
        <div className="px-5 py-3 border-t border-line flex items-center justify-between bg-paper/60">
          <p className="text-[10.5px] text-mute flex items-center gap-1.5"><I n="shield" s={13} />هر ثانیه حضور شما در این نما در Audit ثبت می‌شود.</p>
          <div className="flex gap-2">
            <Btn size="sm" kind="line" icon="print" disabled={!doc.allowPrint || !s.can('print', { doc })} onClick={() => { s.audit('print', doc.code, 'document', `چاپ از Secure Viewer`, 'warn'); window.print(); }}>چاپ</Btn>
            <Btn size="sm" onClick={onClose}>بستن</Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================ آرشیو سالانه ============================ */
export function ArchivePage() {
  const s = useStore();
  const years = useMemo(() => [...new Set(s.data.documents.map(d => d.year))].sort((a, b) => b - a), [s.data.documents]);
  const [year, setYear] = useState(years[0] ?? 1404);
  const [locked, setLocked] = useState<number[]>(() => { try { return JSON.parse(localStorage.getItem('nipco-locked-years') || '[]'); } catch { return []; } });
  const [selUnit, setSelUnit] = useState('');
  const isLock = locked.includes(year);

  const unitRows = s.data.departments.filter(d => d.parentId === 'd0' && d.active).map(dep => {
    const list = s.visibleDocs().filter(dc => s.inDeptScope(dc.deptId, dep.id) && dc.year === year);
    return { dep, count: list.length, archived: list.filter(dc => dc.status === 'archived').length, kb: list.reduce((a, b) => a + b.sizeKB, 0) };
  }).filter(r => r.count > 0);

  const toggleLock = () => {
    setLocked(l => {
      const n = l.includes(year) ? l.filter(x => x !== year) : [...l, year];
      localStorage.setItem('nipco-locked-years', JSON.stringify(n));
      s.audit(l.includes(year) ? 'archive_unlock' : 'archive_lock', `سال ${year}`, 'archive', `${l.includes(year) ? 'بازگشایی' : 'قفل'} آرشیو سال ${year}`, 'warn');
      return n;
    });
    s.toast(isLock ? `آرشیو سال ${year} بازگشایی شد.` : `آرشیو سال ${year} قفل شد — تغییر نیازمند مجوز است.`, isLock ? 'ok' : 'warn');
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 anim-rise">
        <div className="flex rounded-xl border border-line overflow-hidden bg-panel">
          {years.map(y => (
            <button key={y} onClick={() => { setYear(y); setSelUnit(''); }} className={`px-4 py-2.5 text-[13px] font-bold transition ${year === y ? 'bg-night text-gold' : 'text-mute hover:text-ink'}`}>
              سال {String(y).replace(/[0-9]/g, d => '۰۱۲۳۴۵۶۷۸۹'[+d])}
            </button>
          ))}
        </div>
        {isLock && <Badge color="#c03a2e"><I n="lock" s={11} />این سال قفل شده</Badge>}
        <div className="flex-1" />
        {s.user?.role === 'admin' && <Btn kind={isLock ? 'line' : 'dark'} icon={isLock ? 'restore' : 'lock'} onClick={toggleLock}>{isLock ? 'بازگشایی سال' : 'قفل و بایگانی سال'}</Btn>}
      </div>

      <div className="grid lg:grid-cols-5 gap-4">
        <div className="lg:col-span-2 bg-panel border border-line rounded-2xl p-5 anim-rise">
          <SectionTitle icon="archive" sub="هر واحد آرشیو مستقل خود را دارد">آرشیو واحدها — {String(year).replace(/[0-9]/g, d => '۰۱۲۳۴۵۶۷۸۹'[+d])}</SectionTitle>
          <div className="space-y-2">
            {unitRows.map(r => (
              <button key={r.dep.id} onClick={() => setSelUnit(selUnit === r.dep.id ? '' : r.dep.id)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border transition text-start ${selUnit === r.dep.id ? 'border-brand bg-brand-soft/50' : 'border-line hover:border-brand/50'}`}>
                <span className="w-9 h-9 rounded-lg flex items-center justify-center text-white" style={{ background: r.dep.color }}><I n="folder" s={16} /></span>
                <span className="flex-1 min-w-0">
                  <span className="block text-[13px] font-bold text-ink">{r.dep.name}</span>
                  <span className="block text-[10.5px] text-mute mt-0.5">{r.count} سند • {fmtKB(r.kb)} • {r.archived} آرشیوشده</span>
                </span>
                <I n="chevS" s={15} className={`text-mute transition ${selUnit === r.dep.id ? 'rotate-90' : ''}`} />
              </button>
            ))}
            {unitRows.length === 0 && <Empty icon="archive" text="سندی برای این سال ثبت نشده" />}
          </div>
        </div>
        <div className="lg:col-span-3 bg-panel border border-line rounded-2xl p-5 anim-rise">
          <SectionTitle icon="doc" sub={selUnit ? `اسناد ${s.deptName(selUnit)} در سال ${String(year).replace(/[0-9]/g, d => '۰۱۲۳۴۵۶۷۸۹'[+d])}` : 'یک واحد را از فهرست انتخاب کنید'}>
            {selUnit ? s.deptName(selUnit) : 'محتوای آرشیو'}
          </SectionTitle>
          {!selUnit ? (
            <div className="grid grid-cols-2 gap-3">
              {unitRows.map(r => (
                <div key={r.dep.id} className="border border-line rounded-xl p-4 relative overflow-hidden group hover:border-brand/50 transition">
                  <span className="absolute top-0 start-0 w-full h-1" style={{ background: r.dep.color }} />
                  <p className="font-display text-[15px] text-ink pt-1">{r.dep.name}</p>
                  <p className="text-[11px] text-mute mt-1">آرشیو مستقل • دسترسی مستقل • گزارش مستقل</p>
                  <p className="font-display text-[24px] pt-2" style={{ color: r.dep.color }}>{r.count} <span className="text-[11px] text-mute">سند</span></p>
                  <Btn size="sm" kind="ghost" onClick={() => setSelUnit(r.dep.id)}>مشاهده</Btn>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {s.visibleDocs().filter(dc => s.inDeptScope(dc.deptId, selUnit) && dc.year === year).map(d => (
                <button key={d.id} onClick={() => s.navigate('documents', { open: d.id })} className="w-full flex items-center gap-3 border border-line rounded-xl p-3 hover:border-brand/50 transition text-start">
                  <I n="doc" s={17} className="text-steel" />
                  <span className="flex-1 min-w-0">
                    <span className="block text-[12.5px] font-bold text-ink truncate">{d.title}</span>
                    <span className="text-[10.5px] text-mute">{d.code} • {DOC_STATUS[d.status].fa} • {fmtKB(d.sizeKB)}</span>
                  </span>
                  <ClsBadge c={d.classification} />
                </button>
              ))}
              {isLock && <div className="bg-crimson-soft border border-crimson/30 rounded-xl p-3 text-[12px] text-crimson font-semibold flex items-center gap-2"><I n="lock" s={15} />آرشیو این سال قفل است — Restore نیازمند مجوز مدیر سامانه و ثبت در Audit است.</div>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
