import { useMemo, useRef, useState } from 'react';
import { useStore, ROLES, roleFa, clsOf, DOC_STATUS, Ctx } from '../lib/store';
import { Grant, User, ActionKey, ALL_ACTIONS, ScopeLevel } from '../lib/types';
import { I, Btn, Badge, Modal, Field, inputCls, SectionTitle, Toggle, Empty, Num, ProgressBar } from '../components/ui';
import { OrgChart } from '../components/OrgChart';
import { DatePick, DateRange } from '../components/DatePicker';
import { fmtKB } from '../lib/ai';

/* ============================ کاربران و دسترسی‌ها ============================ */
export function UsersPage() {
  const s = useStore();
  const [tab, setTab] = useState(s.nav.params.tab || 'users');
  const [editing, setEditing] = useState<User | null>(null);
  const [adding, setAdding] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex gap-2 anim-rise">
        {([['users', 'کاربران', 'users'], ['grants', 'دسترسی‌ها (Grants)', 'key'], ['tester', 'آزمونگر دسترسی', 'shield']] as const).map(([k, l, ic]) => (
          <button key={k} onClick={() => setTab(k)} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-[13px] font-bold transition ${tab === k ? 'bg-night text-gold border-night' : 'bg-panel border-line text-mute hover:border-brand hover:text-ink'}`}><I n={ic} s={16} />{l}</button>
        ))}
      </div>

      {tab === 'users' && (
        <div className="bg-panel border border-line rounded-2xl overflow-hidden anim-rise">
          <div className="px-5 py-3.5 border-b border-line flex items-center justify-between">
            <p className="text-[13px] font-bold">{s.data.users.length} کاربر — حداقل ۳۰ کاربر هم‌زمان، قابل توسعه تا ۱۰۰+</p>
            <Btn size="sm" icon="plus" onClick={() => setAdding(true)}>کاربر جدید</Btn>
          </div>
          {s.data.users.map(u => (
            <div key={u.id} className="flex items-center gap-3 px-5 py-3 border-b border-line/70 last:border-0 hover:bg-paper/50 transition">
              <span className={`w-9 h-9 rounded-xl flex items-center justify-center font-display text-[15px] pt-0.5 ${u.active ? 'bg-night text-gold' : 'bg-line text-mute'}`}>{u.name[0]}</span>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-bold flex items-center gap-2">{u.name}<span className="text-[11px] text-mute font-normal" dir="ltr">@{u.username}</span>{!u.active && <Badge color="#c03a2e">غیرفعال</Badge>}{u.failedLogins >= s.data.settings.policy.lockAfter && <Badge color="#b87a12">قفل</Badge>}</p>
                <p className="text-[11px] text-mute mt-0.5 truncate">{u.title} • {roleFa(u.role)} • {u.departments.map(d => s.deptName(d)).join('، ') || 'بدون واحد'}</p>
              </div>
              <div className="hidden md:block text-end text-[10.5px] text-mute">
                <p>آخرین ورود: {u.lastLogin ? s.fmt(u.lastLogin, true) : '—'}</p>
                {u.accessUntil && <p className="text-gold-deep font-bold">اعتبار تا: {s.fmt(u.accessUntil)}</p>}
              </div>
              <Btn size="sm" kind="line" icon="edit" onClick={() => setEditing(u)}>ویرایش</Btn>
              {u.id !== s.user?.id && (
                <Btn size="sm" kind="ghost" icon={u.active ? 'eyex' : 'check'} onClick={() => {
                  s.setData(d => ({ ...d, users: d.users.map(x => x.id === u.id ? { ...x, active: !x.active, failedLogins: 0 } : x) }));
                  s.audit('user_toggle', u.username, 'user', `${u.active ? 'غیرفعال' : 'فعال'}‌سازی کاربر`, 'warn');
                  s.toast(`کاربر ${u.active ? 'غیرفعال' : 'فعال'} شد.`, u.active ? 'warn' : 'ok');
                }}>{u.active ? 'غیرفعال' : 'فعال'}</Btn>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === 'grants' && <GrantsPanel />}
      {tab === 'tester' && <AccessTester />}
      {(adding || editing) && <UserModal user={editing} onClose={() => { setAdding(false); setEditing(null); }} />}
    </div>
  );
}

function UserModal({ user, onClose }: { user: User | null; onClose: () => void }) {
  const s = useStore();
  const [f, setF] = useState<User>(user ?? { id: `u-${Date.now().toString(36)}`, username: '', name: '', title: '', role: 'user', departments: [], active: true, password: '', failedLogins: 0 });
  const save = () => {
    const pol = s.data.settings.policy;
    if (!f.username.trim() || !f.name.trim()) { s.toast('نام و نام کاربری الزامی است.', 'err'); return; }
    if (!user && (!f.password || f.password.length < pol.passwordMin || !/\d/.test(f.password) || !/[a-zA-Zآ-ی]/.test(f.password))) {
      s.toast(`گذرواژه باید حداقل ${pol.passwordMin} کاراکتر و شامل حرف و عدد باشد (Password Policy).`, 'err'); return;
    }
    if (s.data.users.some(x => x.username === f.username && x.id !== f.id)) { s.toast('این نام کاربری قبلاً ثبت شده است.', 'err'); return; }
    s.setData(d => ({ ...d, users: user ? d.users.map(x => x.id === f.id ? { ...f, password: f.password || x.password } : x) : [...d.users, f] }));
    s.audit(user ? 'user_update' : 'user_create', f.username, 'user', `${user ? 'ویرایش' : 'ایجاد'} کاربر — نقش ${roleFa(f.role)} — واحدها: ${f.departments.map(x => s.deptName(x)).join('، ')}`, 'warn');
    s.toast(`کاربر ${user ? 'ویرایش' : 'ایجاد'} شد.`, 'ok');
    onClose();
  };
  return (
    <Modal open onClose={onClose} title={user ? `ویرایش ${user.name}` : 'ایجاد کاربر جدید'} w={620}
      footer={<><Btn kind="line" onClick={onClose}>انصراف</Btn><Btn icon="check" onClick={save}>ذخیره</Btn></>}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="نام و نام خانوادگی" req><input className={inputCls} value={f.name} onChange={e => setF({ ...f, name: e.target.value })} /></Field>
        <Field label="نام کاربری" req><input className={inputCls} dir="ltr" value={f.username} onChange={e => setF({ ...f, username: e.target.value })} /></Field>
        <Field label="عنوان شغلی"><input className={inputCls} value={f.title} onChange={e => setF({ ...f, title: e.target.value })} /></Field>
        <Field label="نقش سیستمی"><select className={inputCls} value={f.role} onChange={e => setF({ ...f, role: e.target.value as User['role'] })}>{ROLES.map(r => <option key={r.id} value={r.id}>{r.fa}</option>)}</select></Field>
        <Field label={user ? 'گذرواژه جدید (خالی = بدون تغییر)' : 'گذرواژه'} req={!user} hint={`حداقل ${s.data.settings.policy.passwordMin} کاراکتر، شامل حرف و عدد`}>
          <input className={inputCls} dir="ltr" type="text" value={f.password} onChange={e => setF({ ...f, password: e.target.value })} />
        </Field>
        <div className="flex items-end pb-2"><Toggle on={f.active} onChange={v => setF({ ...f, active: v })} label="حساب فعال" /></div>
        <div className="col-span-2">
          <Field label="واحدها (چند واحد همزمان)">
            <div className="flex flex-wrap gap-1.5">
              {s.data.departments.filter(d => d.active).map(d => {
                const on = f.departments.includes(d.id);
                return <button key={d.id} onClick={() => setF({ ...f, departments: on ? f.departments.filter(x => x !== d.id) : [...f.departments, d.id] })}
                  className={`text-[11.5px] font-bold rounded-full px-3 py-1.5 border transition ${on ? 'bg-brand text-white border-brand' : 'border-line text-mute hover:border-brand'}`}>{d.name}</button>;
              })}
            </div>
          </Field>
        </div>
        <Field label="اعتبار دسترسی از (Time-Based)"><DatePick value={f.accessFrom} onChange={v => setF({ ...f, accessFrom: v })} calendar={s.calendar} /></Field>
        <Field label="اعتبار دسترسی تا"><DatePick value={f.accessUntil} onChange={v => setF({ ...f, accessUntil: v })} calendar={s.calendar} /></Field>
      </div>
    </Modal>
  );
}

function GrantsPanel() {
  const s = useStore();
  const [adding, setAdding] = useState(false);
  const [g, setG] = useState<Grant>({ id: '', subjectType: 'user', subjectId: '', scopeLevel: 'document', scopeRef: '', actions: ['view'], note: '' });
  const lvlFa: Record<ScopeLevel, string> = { organization: 'سازمان', department: 'واحد', document: 'سند', folder: 'پوشه', category: 'دسته', project: 'پروژه', equipment: 'تجهیز', knowledge: 'دانش', field: 'فیلد' };

  const save = () => {
    if (!g.subjectId || g.actions.length === 0) { s.toast('موضوع و حداقل یک عمل را انتخاب کنید.', 'err'); return; }
    const ng: Grant = { ...g, id: `g-${Date.now().toString(36)}`, scopeRef: g.scopeRef || undefined };
    s.setData(d => ({ ...d, grants: [...d.grants, ng] }));
    s.audit('permission_change', ng.id, 'grant', `ثبت Grant: ${ng.subjectType === 'user' ? s.userName(ng.subjectId) : roleFa(ng.subjectId)} → ${lvlFa[ng.scopeLevel]}${ng.scopeRef ? ` (${ng.scopeRef})` : ''} — اعمال: ${ng.actions.join('،')}${ng.until ? ` تا ${s.fmt(ng.until)}` : ''}`, 'critical');
    s.toast('دسترسی صریح ثبت و در Audit لاگ شد.', 'ok');
    setAdding(false);
    setG({ id: '', subjectType: 'user', subjectId: '', scopeLevel: 'document', scopeRef: '', actions: ['view'], note: '' });
  };

  return (
    <div className="bg-panel border border-line rounded-2xl overflow-hidden anim-rise">
      <div className="px-5 py-3.5 border-b border-line flex items-center justify-between">
        <div>
          <p className="text-[13px] font-bold">Grantهای صریح — Organization ← Department ← Role ← User ← Document ← Field ← Action</p>
          <p className="text-[11px] text-mute mt-0.5">دسترسی بین واحدها فقط Explicit است؛ دسترسی زمان‌دار پس از انقضا خودکار غیرفعال می‌شود.</p>
        </div>
        <Btn size="sm" icon="plus" onClick={() => setAdding(true)}>Grant جدید</Btn>
      </div>
      {s.data.grants.map(gr => {
        const expired = gr.until && new Date(gr.until) < new Date();
        return (
          <div key={gr.id} className={`flex items-center gap-3 px-5 py-3 border-b border-line/70 last:border-0 ${expired ? 'opacity-50' : ''}`}>
            <span className="w-8 h-8 rounded-lg bg-steel-soft text-steel flex items-center justify-center"><I n={gr.scopeLevel === 'document' ? 'doc' : gr.scopeLevel === 'department' ? 'org' : gr.scopeLevel === 'project' ? 'project' : 'key'} s={15} /></span>
            <div className="flex-1 min-w-0">
              <p className="text-[12.5px] font-bold">{gr.subjectType === 'user' ? s.userName(gr.subjectId) : `نقش: ${roleFa(gr.subjectId)}`} <span className="text-mute font-normal">→ {lvlFa[gr.scopeLevel]}{gr.scopeRef ? `: ${gr.scopeLevel === 'department' ? s.deptName(gr.scopeRef) : gr.scopeLevel === 'document' ? s.data.documents.find(x => x.id === gr.scopeRef)?.code : gr.scopeRef}` : ''}</span></p>
              <p className="text-[10.5px] text-mute mt-0.5">{gr.note} • اعمال: {gr.actions.join('، ')}{gr.from ? ` • از ${s.fmt(gr.from)}` : ''}{gr.until ? ` • تا ${s.fmt(gr.until)}` : ''}</p>
            </div>
            {expired && <Badge color="#c03a2e">منقضی — خودکار غیرفعال</Badge>}
            <button onClick={() => { s.setData(d => ({ ...d, grants: d.grants.filter(x => x.id !== gr.id) })); s.audit('permission_change', gr.id, 'grant', 'حذف Grant', 'critical'); s.toast('Grant حذف شد.', 'warn'); }} className="text-mute hover:text-crimson p-1.5 rounded-lg hover:bg-crimson-soft transition"><I n="trash" s={15} /></button>
          </div>
        );
      })}

      <Modal open={adding} onClose={() => setAdding(false)} title="تعریف دسترسی صریح (Grant)" w={640}
        footer={<><Btn kind="line" onClick={() => setAdding(false)}>انصراف</Btn><Btn icon="check" onClick={save}>ثبت Grant</Btn></>}>
        <div className="grid grid-cols-2 gap-3">
          <Field label="موضوع: نوع"><select className={inputCls} value={g.subjectType} onChange={e => setG({ ...g, subjectType: e.target.value as 'user' | 'role', subjectId: '' })}><option value="user">کاربر</option><option value="role">نقش</option></select></Field>
          <Field label="موضوع">
            <select className={inputCls} value={g.subjectId} onChange={e => setG({ ...g, subjectId: e.target.value })}>
              <option value="">انتخاب…</option>
              {g.subjectType === 'user' ? s.data.users.map(u => <option key={u.id} value={u.id}>{u.name}</option>) : ROLES.map(r => <option key={r.id} value={r.id}>{r.fa}</option>)}
            </select>
          </Field>
          <Field label="محدوده (Scope)"><select className={inputCls} value={g.scopeLevel} onChange={e => setG({ ...g, scopeLevel: e.target.value as ScopeLevel })}>{Object.entries(lvlFa).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
          <Field label="مرجع محدوده">
            {g.scopeLevel === 'department' ? (
              <select className={inputCls} value={g.scopeRef} onChange={e => setG({ ...g, scopeRef: e.target.value })}><option value="">انتخاب…</option>{s.data.departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select>
            ) : g.scopeLevel === 'document' ? (
              <select className={inputCls} value={g.scopeRef} onChange={e => setG({ ...g, scopeRef: e.target.value })}><option value="">انتخاب…</option>{s.data.documents.map(d => <option key={d.id} value={d.id}>{d.code} — {d.title.slice(0, 30)}</option>)}</select>
            ) : g.scopeLevel === 'project' ? (
              <select className={inputCls} value={g.scopeRef} onChange={e => setG({ ...g, scopeRef: e.target.value })}><option value="">انتخاب…</option>{s.data.projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
            ) : <input className={inputCls} value={g.scopeRef} onChange={e => setG({ ...g, scopeRef: e.target.value })} placeholder="شناسه (اختیاری)" />}
          </Field>
          <div className="col-span-2">
            <Field label="اعمال مجاز (Action Permission)">
              <div className="flex flex-wrap gap-1.5">
                {ALL_ACTIONS.map(a => {
                  const on = g.actions.includes(a.key);
                  return <button key={a.key} onClick={() => setG({ ...g, actions: on ? g.actions.filter(x => x !== a.key) : [...g.actions, a.key] })}
                    className={`text-[11px] font-bold rounded-full px-2.5 py-1.5 border transition ${on ? 'bg-brand text-white border-brand' : 'border-line text-mute hover:border-brand'}`}>{a.fa}</button>;
                })}
              </div>
            </Field>
          </div>
          <Field label="معتبر از"><DatePick value={g.from} onChange={v => setG({ ...g, from: v })} calendar={s.calendar} /></Field>
          <Field label="معتبر تا (Time-Based)"><DatePick value={g.until} onChange={v => setG({ ...g, until: v })} calendar={s.calendar} /></Field>
          <div className="col-span-2"><Field label="یادداشت"><input className={inputCls} value={g.note} onChange={e => setG({ ...g, note: e.target.value })} placeholder="مثلاً: دسترسی موردی مدیر نت به نقشه خط ۲" /></Field></div>
        </div>
      </Modal>
    </div>
  );
}

function AccessTester() {
  const s = useStore();
  const [uid2, setUid2] = useState(s.data.users[3]?.id ?? '');
  const [docId, setDocId] = useState(s.data.documents[0]?.id ?? '');
  const [action, setAction] = useState<ActionKey>('view');
  const who = s.data.users.find(u => u.id === uid2);
  const doc = s.data.documents.find(d => d.id === docId);
  const decision = who && doc ? s.decide(action, { doc }, who) : null;
  return (
    <div className="grid lg:grid-cols-[320px_1fr] gap-4 items-start anim-rise">
      <div className="bg-panel border border-line rounded-2xl p-5 space-y-3">
        <SectionTitle icon="shield" sub="شبیه‌سازی تصمیم موتور دسترسی برای هر کاربر/سند/عمل — بدون اجرای عمل">آزمونگر دسترسی</SectionTitle>
        <Field label="کاربر"><select className={inputCls} value={uid2} onChange={e => setUid2(e.target.value)}>{s.data.users.map(u => <option key={u.id} value={u.id}>{u.name} ({roleFa(u.role)})</option>)}</select></Field>
        <Field label="سند"><select className={inputCls} value={docId} onChange={e => setDocId(e.target.value)}>{s.data.documents.map(d => <option key={d.id} value={d.id}>{d.code} — {d.title.slice(0, 34)}</option>)}</select></Field>
        <Field label="عمل"><select className={inputCls} value={action} onChange={e => setAction(e.target.value as ActionKey)}>{ALL_ACTIONS.map(a => <option key={a.key} value={a.key}>{a.fa} ({a.key})</option>)}</select></Field>
      </div>
      <div className="bg-panel border border-line rounded-2xl p-5">
        {decision && who && doc && (
          <>
            <div className={`rounded-xl p-4 mb-4 text-white ${decision.ok ? 'bg-brand' : 'bg-crimson'}`}>
              <p className="font-display text-[18px] pt-0.5 flex items-center gap-2"><I n={decision.ok ? 'check' : 'x'} s={20} />{decision.ok ? 'دسترسی مجاز است' : 'دسترسی رد شد (Deny)'}</p>
              <p className="text-[12px] opacity-90 mt-1">{who.name} → «{ALL_ACTIONS.find(a => a.key === action)?.fa}» → {doc.code} ({clsOf(doc.classification).fa})</p>
            </div>
            <p className="text-[12px] font-bold mb-2">زنجیره تصمیم (Layered Security)</p>
            <div className="space-y-1.5">
              {decision.chain.map((c, i) => (
                <div key={i} className={`flex items-start gap-2.5 rounded-lg border p-3 text-[12px] ${c.result === 'pass' ? 'border-brand/30 bg-brand-soft/40' : c.result === 'deny' ? 'border-crimson/30 bg-crimson-soft' : 'border-line bg-paper/60'}`}>
                  <span className={c.result === 'pass' ? 'text-brand' : c.result === 'deny' ? 'text-crimson' : 'text-mute'}><I n={c.result === 'pass' ? 'check' : c.result === 'deny' ? 'x' : 'clock'} s={15} /></span>
                  <div><b>{c.step}</b><p className="text-mute mt-0.5 leading-5">{c.note}</p></div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ============================ ساختار سازمانی ============================ */
export function OrgPage() {
  const s = useStore();
  const [editId, setEditId] = useState<string | null>(null);
  const [addParent, setAddParent] = useState<string | null>(null);
  const [f, setF] = useState({ name: '', nameEn: '', desc: '', color: '#0e6b5c' });
  const stats = (id: string) => ({
    docs: s.data.documents.filter(d => s.inDeptScope(d.deptId, id)).length,
    knowledge: s.data.knowledge.filter(k => s.inDeptScope(k.deptId, id)).length,
    users: s.data.users.filter(u => u.departments.some(dep => s.inDeptScope(dep, id))).length,
  });
  const openEdit = (id: string) => { const d = s.data.departments.find(x => x.id === id); if (d) { setF({ name: d.name, nameEn: d.nameEn, desc: d.desc, color: d.color }); setEditId(id); } };
  const openAdd = (parentId: string) => { setF({ name: '', nameEn: '', desc: '', color: '#52708c' }); setAddParent(parentId); };
  const save = () => {
    if (!f.name.trim()) { s.toast('نام واحد الزامی است.', 'err'); return; }
    if (editId) {
      s.setData(d => ({ ...d, departments: d.departments.map(x => x.id === editId ? { ...x, ...f } : x) }));
      s.audit('dept_update', f.name, 'department', 'ویرایش واحد سازمانی', 'warn');
    } else if (addParent) {
      s.setData(d => ({ ...d, departments: [...d.departments, { id: `d-${Date.now().toString(36)}`, name: f.name, nameEn: f.nameEn || f.name, parentId: addParent, active: true, color: f.color, desc: f.desc }] }));
      s.audit('dept_create', f.name, 'department', `ایجاد زیرواحد زیرمجموعه ${s.deptName(addParent)}`, 'warn');
    }
    s.toast('ساختار سازمانی به‌روزرسانی شد.', 'ok');
    setEditId(null); setAddParent(null);
  };
  return (
    <div className="space-y-4">
      <div className="bg-panel border border-line rounded-2xl p-5 anim-rise">
        <SectionTitle icon="org" sub="ویرایش فقط برای مدیر سامانه — افزودن، ویرایش، جابه‌جایی و غیرفعال‌سازی واحد" end={<Badge color="#0e6b5c">Dynamic Structure</Badge>}>ساختار سازمانی نیپکو</SectionTitle>
        <OrgChart departments={s.data.departments} stats={stats} admin onAdd={openAdd} onEdit={openEdit}
          onToggle={id => { const d = s.data.departments.find(x => x.id === id); if (d) { s.setData(dt => ({ ...dt, departments: dt.departments.map(x => x.id === id ? { ...x, active: !x.active } : x) })); s.audit('dept_toggle', d.name, 'department', `${d.active ? 'غیرفعال' : 'فعال'}‌سازی واحد`, 'warn'); s.toast(`واحد «${d.name}» ${d.active ? 'غیرفعال' : 'فعال'} شد.`, 'warn'); } }} />
      </div>
      <div className="bg-panel border border-line rounded-2xl p-5 anim-rise">
        <SectionTitle icon="folder" sub="Folder-Level Permission برای هر پوشه: View / Upload / Download / Edit / Delete / Share">پوشه‌های آرشیو</SectionTitle>
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-2.5">
          {s.data.folders.map(fo => (
            <div key={fo.id} className="border border-line rounded-xl p-3.5 hover:border-brand/50 transition">
              <p className="text-[13px] font-bold flex items-center gap-2"><I n="folder" s={16} className="text-gold-deep" />{fo.name}</p>
              <p className="text-[11px] text-mute mt-1">{s.deptName(fo.deptId)} • {s.data.documents.filter(x => x.deptId === fo.deptId).length} سند</p>
            </div>
          ))}
        </div>
      </div>
      <Modal open={!!editId || !!addParent} onClose={() => { setEditId(null); setAddParent(null); }} title={editId ? 'ویرایش واحد' : `افزودن زیرواحد به «${s.deptName(addParent ?? '')}»`} w={520}
        footer={<><Btn kind="line" onClick={() => { setEditId(null); setAddParent(null); }}>انصراف</Btn><Btn icon="check" onClick={save}>ذخیره</Btn></>}>
        <div className="space-y-3">
          <Field label="نام واحد" req><input className={inputCls} value={f.name} onChange={e => setF({ ...f, name: e.target.value })} /></Field>
          <Field label="نام انگلیسی"><input className={inputCls} dir="ltr" value={f.nameEn} onChange={e => setF({ ...f, nameEn: e.target.value })} /></Field>
          <Field label="شرح و مأموریت"><textarea className={`${inputCls} min-h-[70px]`} value={f.desc} onChange={e => setF({ ...f, desc: e.target.value })} /></Field>
          <Field label="رنگ سازمانی">
            <div className="flex gap-2">{['#0e6b5c', '#52708c', '#b87a12', '#c03a2e', '#6e5b8c', '#5b8c6e', '#7a5c3e'].map(c => (
              <button key={c} onClick={() => setF({ ...f, color: c })} className={`w-8 h-8 rounded-lg border-2 transition ${f.color === c ? 'border-ink scale-110' : 'border-transparent'}`} style={{ background: c }} />
            ))}</div>
          </Field>
        </div>
      </Modal>
    </div>
  );
}

/* ============================ امنیت و Audit ============================ */
export function SecurityPage() {
  const s = useStore();
  const [tab, setTab] = useState(s.nav.params.tab || 'dash');
  const [from, setFrom] = useState(''); const [to, setTo] = useState('');
  const [fUser, setFUser] = useState(''); const [fAction, setFAction] = useState('');
  const [fSev, setFSev] = useState('');

  const logs = useMemo(() => s.data.audit.filter(a =>
    (!from || !to || (a.ts.slice(0, 10) >= from && a.ts.slice(0, 10) <= to)) &&
    (!fUser || a.userName.includes(fUser)) && (!fAction || a.action.includes(fAction)) && (!fSev || a.severity === fSev)
  ), [s.data.audit, from, to, fUser, fAction, fSev]);

  const failed = s.data.audit.filter(a => a.action === 'login_failed');
  const denied = s.data.audit.filter(a => a.action.includes('denied') || a.action.includes('blocked'));
  const sensitive = s.data.audit.filter(a => a.targetType === 'document' && ['download', 'print', 'view'].includes(a.action));
  const permChanges = s.data.audit.filter(a => a.action === 'permission_change');

  const exportAudit = () => {
    const head = 'زمان,کاربر,عملیات,هدف,نوع,شدت,جزئیات,IP';
    const body = logs.map(a => `"${s.fmt(a.ts, true)}","${a.userName}","${a.action}","${a.target}","${a.targetType}","${a.severity}","${a.details}","${a.ip}"`).join('\n');
    const blob = new Blob(['\uFEFF' + head + '\n' + body], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'nipco-audit.csv'; a.click();
    s.audit('report_export', 'audit-log', 'report', `خروجی CSV لاگ امنیتی — ${logs.length} رویداد`, 'info');
    s.toast('خروجی Audit آماده شد.', 'ok');
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 anim-rise">
        {([['dash', 'داشبورد امنیت', 'shield'], ['audit', 'لاگ Audit', 'list'], ['policy', 'سیاست‌های DLP', 'lock']] as const).map(([k, l, ic]) => (
          <button key={k} onClick={() => setTab(k)} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-[13px] font-bold transition ${tab === k ? 'bg-night text-gold border-night' : 'bg-panel border-line text-mute hover:border-brand hover:text-ink'}`}><I n={ic} s={16} />{l}</button>
        ))}
      </div>

      {tab === 'dash' && (
        <div className="space-y-4 stagger">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { fa: 'ورود ناموفق', v: failed.length, i: 'alert', c: '#c03a2e' },
              { fa: 'دسترسی مسدودشده (DLP)', v: denied.length, i: 'shield', c: '#b87a12' },
              { fa: 'دسترسی اسناد حساس', v: sensitive.length, i: 'doc', c: '#0e6b5c' },
              { fa: 'تغییر دسترسی', v: permChanges.length, i: 'key', c: '#52708c' },
            ].map((x, i) => (
              <div key={i} className="bg-panel border border-line rounded-xl p-4">
                <span className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${x.c}15`, color: x.c }}><I n={x.i} s={16} /></span>
                <p className="font-display text-[26px] pt-2 leading-none"><Num v={x.v} fa={s.lang === 'fa'} /></p>
                <p className="text-[11px] font-bold text-mute mt-1.5">{x.fa}</p>
              </div>
            ))}
          </div>
          <div className="grid lg:grid-cols-2 gap-4">
            <div className="bg-panel border border-line rounded-2xl p-5">
              <SectionTitle icon="alert">رویدادهای بحرانی اخیر</SectionTitle>
              <div className="space-y-2">
                {s.data.audit.filter(a => a.severity !== 'info').slice(0, 6).map(a => (
                  <div key={a.id} className={`flex items-start gap-2.5 rounded-lg border p-3 ${a.severity === 'critical' ? 'border-crimson/40 bg-crimson-soft' : 'border-gold/40 bg-gold-soft'}`}>
                    <I n="alert" s={15} className={a.severity === 'critical' ? 'text-crimson mt-0.5' : 'text-gold-deep mt-0.5'} />
                    <div className="min-w-0"><p className="text-[12px] font-semibold leading-5">{a.details}</p><p className="text-[10.5px] text-mute mt-0.5">{a.userName} • {s.fmt(a.ts, true)} • <span dir="ltr">{a.ip}</span></p></div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-panel border border-line rounded-2xl p-5">
              <SectionTitle icon="history" sub="Session Security — Timeout و کنترل نشست‌های هم‌زمان">نشست‌های فعال</SectionTitle>
              <div className="space-y-2">
                {s.data.users.filter(u => u.lastLogin).slice(0, 5).map(u => (
                  <div key={u.id} className="flex items-center gap-3 border border-line rounded-lg px-3 py-2.5">
                    <span className="w-2 h-2 rounded-full bg-brand-glow live-dot" />
                    <div className="flex-1 min-w-0"><p className="text-[12.5px] font-bold">{u.name}</p><p className="text-[10.5px] text-mute">ورود: {s.fmt(u.lastLogin, true)} • مرورگر سازمانی • IP ثابت</p></div>
                    {u.id !== s.user?.id && <Btn size="sm" kind="ghost" onClick={() => { s.audit('session_kill', u.username, 'auth', 'پایان نشست توسط مدیر', 'warn'); s.toast(`نشست ${u.name} پایان یافت.`, 'warn'); }}>پایان نشست</Btn>}
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-mute mt-3 leading-5">Timeout نشست: {s.data.settings.sessionTimeoutMin} دقیقه • ثبت دستگاه (Device Registration) و حالت Kiosk در استقرار سازمانی فعال است.</p>
            </div>
          </div>
        </div>
      )}

      {tab === 'audit' && (
        <div className="bg-panel border border-line rounded-2xl overflow-hidden anim-rise">
          <div className="px-5 py-4 border-b border-line space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <input className={`${inputCls} !w-40`} placeholder="نام کاربر…" value={fUser} onChange={e => setFUser(e.target.value)} />
              <input className={`${inputCls} !w-40`} placeholder="عملیات (view, print…)…" value={fAction} onChange={e => setFAction(e.target.value)} />
              <select className={`${inputCls} !w-32`} value={fSev} onChange={e => setFSev(e.target.value)}><option value="">همه شدت‌ها</option><option value="info">عادی</option><option value="warn">هشدار</option><option value="critical">بحرانی</option></select>
              <div className="w-[320px]"><DateRange from={from || undefined} to={to || undefined} onChange={(f2, t2) => { setFrom(f2); setTo(t2); }} calendar={s.calendar} onCalendar={c => s.setCalendar(c)} /></div>
              <div className="flex-1" />
              <Btn size="sm" kind="line" icon="download" onClick={exportAudit}>خروجی CSV</Btn>
            </div>
            <p className="text-[11px] text-mute"><Num v={logs.length} fa={s.lang === 'fa'} /> رویداد — همه عملیات (Login، View، Download، Print، AI، Permission…) ثبت می‌شود.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead><tr className="bg-paper/80 text-mute">{['زمان', 'کاربر', 'عملیات', 'هدف', 'شدت', 'جزئیات', 'IP'].map(h => <th key={h} className="text-start font-bold px-4 py-2.5 border-b border-line whitespace-nowrap">{h}</th>)}</tr></thead>
              <tbody>
                {logs.slice(0, 40).map(a => (
                  <tr key={a.id} className="hover:bg-paper/60 transition">
                    <td className="px-4 py-2.5 border-b border-line/60 whitespace-nowrap tabular-nums">{s.fmt(a.ts, true)}</td>
                    <td className="px-4 py-2.5 border-b border-line/60 font-bold whitespace-nowrap">{a.userName}</td>
                    <td className="px-4 py-2.5 border-b border-line/60"><Badge color={a.action.includes('denied') || a.action.includes('blocked') ? '#c03a2e' : a.action === 'login_failed' ? '#b87a12' : '#0e6b5c'}>{a.action}</Badge></td>
                    <td className="px-4 py-2.5 border-b border-line/60 whitespace-nowrap" dir="ltr">{a.target}</td>
                    <td className="px-4 py-2.5 border-b border-line/60"><span className={`font-bold ${a.severity === 'critical' ? 'text-crimson' : a.severity === 'warn' ? 'text-gold-deep' : 'text-mute'}`}>{a.severity === 'critical' ? 'بحرانی' : a.severity === 'warn' ? 'هشدار' : 'عادی'}</span></td>
                    <td className="px-4 py-2.5 border-b border-line/60 max-w-[300px] truncate">{a.details}</td>
                    <td className="px-4 py-2.5 border-b border-line/60 tabular-nums" dir="ltr">{a.ip}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'policy' && (
        <div className="bg-panel border border-line rounded-2xl p-5 anim-rise max-w-2xl">
          <SectionTitle icon="lock" sub="Data Leakage Prevention در سطح Application — Download / Print / Export / Share / Copy">سیاست‌های جلوگیری از خروج اطلاعات</SectionTitle>
          <div className="space-y-3">
            {([
              ['watermark', 'Dynamic Watermark روی اسناد محرمانه (نام کاربر + زمان + شناسه سند)', 'drop'],
              ['blockCopy', 'مسدودی کپی متن از پیش‌نمایش اسناد حساس + ثبت در Audit', 'camx'],
              ['detectCapture', 'تشخیص تلاش Screenshot/PrintScreen در محیط‌های پشتیبانی‌شده + Kiosk Policy', 'eye'],
              ['dlp', 'DLP: کنترل Download / Print / Export / Share بر اساس طبقه‌بندی و Grant', 'shield'],
            ] as const).map(([key, label, ic]) => (
              <div key={key} className="flex items-center gap-3 border border-line rounded-xl p-3.5">
                <span className="w-9 h-9 rounded-lg bg-brand-soft text-brand flex items-center justify-center"><I n={ic} s={17} /></span>
                <p className="flex-1 text-[12.5px] font-semibold leading-6">{label}</p>
                <Toggle on={s.data.settings.policy[key]} onChange={v => {
                  s.setSettings({ policy: { ...s.data.settings.policy, [key]: v } });
                  s.audit('permission_change', key, 'policy', `سیاست ${key} → ${v ? 'فعال' : 'غیرفعال'}`, 'critical');
                  s.toast(`سیاست ${v ? 'فعال' : 'غیرفعال'} شد.`, v ? 'ok' : 'warn');
                }} />
              </div>
            ))}
            <div className="bg-gold-soft border border-gold/40 rounded-xl p-3.5 text-[11.5px] leading-6 text-gold-deep">
              <b>یادداشت امنیتی:</b> وب‌اپلیکیشن نمی‌تواند عکس‌گرفتن با دوربین فیزیکی از مانیتور را ۱۰۰٪ متوقف کند؛ واترمارک پویای هویت‌دار + Audit + محدودیت دستگاه/شبکه، ریسک را به حداقل و افشا را قابل اثبات می‌کند.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================ Backup ============================ */
export function BackupPage() {
  const s = useStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const totalKB = s.data.backups.filter(b => b.status === 'success').reduce((a, b) => a + b.sizeKB, 0);
  const last = s.data.backups[0];

  const exportBackup = () => {
    const blob = new Blob([JSON.stringify(s.data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `nipco-backup-full-${new Date().toISOString().slice(0, 10)}.json`; a.click();
    URL.revokeObjectURL(a.href);
    s.audit('backup_download', 'full-json', 'backup', 'دانلود فایل پشتیبان کامل (رمزنگاری در لایه ذخیره‌سازی)', 'warn');
    s.toast('فایل پشتیبان کامل دانلود شد.', 'ok');
  };

  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-4 gap-3 stagger">
        {[
          { fa: 'آخرین پشتیبان', v: last ? s.fmt(last.ts, true) : '—', i: 'db', c: '#0e6b5c' },
          { fa: 'حجم مخزن Backup', v: fmtKB(totalKB), i: 'archive', c: '#52708c' },
          { fa: 'نسخه‌های موفق', v: s.data.backups.filter(b => b.status === 'success').length, i: 'check', c: '#0e6b5c' },
          { fa: 'نگهداری (Retention)', v: '۹۰ روز', i: 'clock', c: '#b87a12' },
        ].map((x, i) => (
          <div key={i} className="bg-panel border border-line rounded-xl p-4">
            <span className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${x.c}15`, color: x.c }}><I n={x.i} s={16} /></span>
            <p className="font-display text-[17px] pt-2 leading-snug">{x.v}</p>
            <p className="text-[11px] font-bold text-mute mt-1">{x.fa}</p>
          </div>
        ))}
      </div>

      <div className="bg-panel border border-line rounded-2xl p-5 anim-rise">
        <SectionTitle icon="db" sub="Database + Documents + Media + Vector DB + Knowledge Graph + Config + Security Config — رمزنگاری AES-256"
          end={<div className="flex gap-2">
            <Btn size="sm" icon="db" onClick={() => s.runBackup('full')}>Full Backup</Btn>
            <Btn size="sm" kind="line" onClick={() => s.runBackup('differential')}>Differential</Btn>
            <Btn size="sm" kind="line" onClick={() => s.runBackup('incremental')}>Incremental</Btn>
            <Btn size="sm" kind="gold" icon="download" onClick={exportBackup}>دانلود فایل پشتیبان</Btn>
            <Btn size="sm" kind="dark" icon="restore" onClick={() => fileRef.current?.click()}>Restore</Btn>
            <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={e => {
              const f = e.target.files?.[0]; if (!f) return;
              f.text().then(txt => { const r = s.restoreFrom(txt); if (!r.ok) s.toast(r.error ?? 'خطا', 'err'); });
              e.target.value = '';
            }} />
          </div>}>
          تاریخچه پشتیبان‌گیری
        </SectionTitle>
        <div className="space-y-2">
          {s.data.backups.map(b => (
            <div key={b.id} className="flex items-center gap-3 border border-line rounded-xl p-3.5">
              <span className={`w-9 h-9 rounded-lg flex items-center justify-center ${b.status === 'success' ? 'bg-brand-soft text-brand' : 'bg-crimson-soft text-crimson'}`}><I n={b.status === 'success' ? 'check' : 'alert'} s={17} /></span>
              <div className="flex-1 min-w-0">
                <p className="text-[12.5px] font-bold">{{ full: 'پشتیبان کامل (Full)', differential: 'تفاضلی (Differential)', incremental: 'افزایشی (Incremental)' }[b.kind]}</p>
                <p className="text-[10.5px] text-mute mt-0.5">{s.fmt(b.ts, true)} • {fmtKB(b.sizeKB)} • {b.operator} • شامل: {b.includes.join(' + ')}</p>
              </div>
              <Badge color={b.status === 'success' ? '#0e6b5c' : '#c03a2e'}>{b.status === 'success' ? 'موفق' : 'ناموفق'}</Badge>
            </div>
          ))}
        </div>
        <div className="grid md:grid-cols-3 gap-3 mt-4">
          <div className="border border-line rounded-xl p-4"><p className="text-[12px] font-bold mb-1.5">زمان‌بندی</p><p className="text-[11.5px] text-mute leading-6">Full: جمعه ۰۲:۰۰ • Differential: سه‌شنبه ۰۳:۳۰ • Incremental: روزانه ۰۳:۳۰</p></div>
          <div className="border border-line rounded-xl p-4"><p className="text-[12px] font-bold mb-1.5">RPO / RTO</p><p className="text-[11.5px] text-mute leading-6">هدف نقطه بازیابی: ۲۴ ساعت • هدف زمان بازیابی: ۴ ساعت • Point-in-Time با لاگ‌های WAL</p></div>
          <div className="border border-line rounded-xl p-4"><p className="text-[12px] font-bold mb-1.5">Disaster Recovery</p><p className="text-[11.5px] text-mute leading-6">نسخه دوم در سایت پشتیبان • آزمون بازیابی هر ۳ ماه • مستندات DR تحویل سازمان</p></div>
        </div>
      </div>
    </div>
  );
}

/* ============================ مدیریت سیستم ============================ */
export function SystemPage() {
  const s = useStore();
  const st = s.data.settings;
  const [loginCfg, setLoginCfg] = useState({ companyName: st.companyName, welcome: st.welcome, footer: st.footer, loginBg: st.loginBg });
  return (
    <div className="grid lg:grid-cols-2 gap-4 items-start">
      <div className="space-y-4">
        <div className="bg-panel border border-line rounded-2xl p-5 anim-rise">
          <SectionTitle icon="edit" sub="Logo، نام شرکت، پیام خوش‌آمد، پس‌زمینه و Footer — زنده روی صفحه ورود اعمال می‌شود">شخصی‌سازی صفحه Login</SectionTitle>
          <div className="space-y-3">
            <Field label="نام شرکت"><input className={inputCls} value={loginCfg.companyName} onChange={e => setLoginCfg({ ...loginCfg, companyName: e.target.value })} /></Field>
            <Field label="پیام خوش‌آمد"><textarea className={`${inputCls} min-h-[60px]`} value={loginCfg.welcome} onChange={e => setLoginCfg({ ...loginCfg, welcome: e.target.value })} /></Field>
            <Field label="متن Footer"><input className={inputCls} value={loginCfg.footer} onChange={e => setLoginCfg({ ...loginCfg, footer: e.target.value })} /></Field>
            <Field label="پس‌زمینه">
              <div className="flex gap-2">
                {([['grid', 'شبکه‌ای'], ['solid', 'ساده'], ['accent', 'رنگی']] as const).map(([k, l]) => (
                  <button key={k} onClick={() => setLoginCfg({ ...loginCfg, loginBg: k })} className={`flex-1 text-[12px] font-bold rounded-lg border py-2 transition ${loginCfg.loginBg === k ? 'bg-brand text-white border-brand' : 'border-line text-mute hover:border-brand'}`}>{l}</button>
                ))}
              </div>
            </Field>
            <Btn icon="check" onClick={() => { s.setSettings(loginCfg); s.audit('settings_change', 'login-page', 'settings', 'شخصی‌سازی صفحه ورود', 'warn'); s.toast('صفحه ورود شخصی‌سازی شد.', 'ok'); }}>ذخیره تنظیمات ورود</Btn>
          </div>
        </div>
        <div className="bg-panel border border-line rounded-2xl p-5 anim-rise">
          <SectionTitle icon="gear">تنظیمات عمومی</SectionTitle>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div><p className="text-[12.5px] font-bold">تقویم پیش‌فرض شما</p><p className="text-[11px] text-mute mt-0.5">در همه بخش‌های تاریخ‌محور اعمال می‌شود</p></div>
              <div className="flex rounded-lg border border-line overflow-hidden">
                {(['jalali', 'gregorian'] as const).map(c => (
                  <button key={c} onClick={() => s.setCalendar(c)} className={`px-3 py-1.5 text-[11.5px] font-bold transition ${s.calendar === c ? 'bg-night text-gold' : 'text-mute'}`}>{c === 'jalali' ? 'شمسی' : 'میلادی'}</button>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div><p className="text-[12.5px] font-bold">Session Timeout</p><p className="text-[11px] text-mute mt-0.5">{st.sessionTimeoutMin} دقیقه بدون فعالیت</p></div>
              <input type="range" min={10} max={120} step={5} value={st.sessionTimeoutMin} onChange={e => s.setSettings({ sessionTimeoutMin: +e.target.value })} className="accent-[#0e6b5c]" />
            </div>
            <div className="flex items-center justify-between">
              <div><p className="text-[12.5px] font-bold">حداقل طول گذرواژه</p><p className="text-[11px] text-mute mt-0.5">قفل حساب پس از {st.policy.lockAfter} تلاش ناموفق</p></div>
              <Badge color="#0e6b5c">{st.policy.passwordMin} کاراکتر</Badge>
            </div>
            <div className="pt-3 border-t border-line">
              <Btn kind="danger" icon="refresh" onClick={() => { if (confirm('داده‌های نمایشی به حالت اولیه برگردد؟')) s.resetDemo(); }}>بازنشانی داده‌های نمایشی</Btn>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-panel border border-line rounded-2xl p-5 anim-rise">
        <SectionTitle icon="bot" sub="مدیریت مدل‌های AI — همه Local و بدون اینترنت (Air-Gapped)">پشته هوش مصنوعی محلی</SectionTitle>
        <div className="space-y-3">
          {([
            ['llm', 'مدل زبانی (LLM)', ['nipco-llama3-8b (Ollama Local)', 'mistral-7b-fa (Ollama Local)', 'qwen2.5-7b (vLLM Local)']],
            ['embed', 'مدل Embedding', ['bge-m3-fa (Local Embedding)', 'multilingual-e5 (Local)']],
            ['ocr', 'موتور OCR', ['PaddleOCR-Farsi (Local)', 'EasyOCR-fa (Local)']],
            ['speech', 'مدل گفتار (STT)', ['Whisper-small-fa (Local)', 'Whisper-base-fa (Local)']],
          ] as const).map(([key, label, opts]) => (
            <div key={key} className="border border-line rounded-xl p-3.5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[12.5px] font-bold">{label}</p>
                <span className="flex items-center gap-1.5 text-[10.5px] font-bold text-brand"><span className="w-1.5 h-1.5 rounded-full bg-brand-glow live-dot" />فعال • آفلاین</span>
              </div>
              <select className={inputCls} value={st.ai[key]} onChange={e => { s.setSettings({ ai: { ...st.ai, [key]: e.target.value } }); s.audit('settings_change', key, 'ai', `تغییر مدل ${label} به ${e.target.value}`, 'warn'); s.toast('مدل ذخیره شد — در اجرای بعدی Queue اعمال می‌شود.', 'ok'); }}>
                {opts.map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
          ))}
          <div className="bg-night text-white rounded-xl p-4">
            <p className="text-[12px] font-bold text-gold mb-2">Health Check سرویس‌ها</p>
            <div className="grid grid-cols-2 gap-1.5 text-[11px]">
              {['Backend', 'Database', 'AI Runtime', 'Worker', 'Redis', 'Vector DB', 'Storage', 'Reverse Proxy'].map(sv => (
                <p key={sv} className="flex items-center gap-1.5 text-white/75"><span className="w-1.5 h-1.5 rounded-full bg-brand-glow" />{sv}: Healthy</p>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
