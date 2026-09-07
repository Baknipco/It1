import { useMemo } from 'react';
import { useStore, DOC_STATUS } from '../lib/store';
import { I, Btn, Badge, SectionTitle, Empty, Num } from '../components/ui';
import { daysBetween } from '../lib/jalali';

/** کارتابل هوشمند — My Tasks + گردش کار + اعلان‌ها */
export function InboxPage() {
  const s = useStore();
  const tab = s.nav.params.tab || 'tasks';

  const approvals = s.data.documents.filter(d => (d.status === 'review' || d.status === 'approved') && s.can('approve', { doc: d }));
  const myDocs = s.data.documents.filter(d => d.ownerId === s.user?.id && d.status === 'review');
  const reviews = s.data.knowledge.filter(k => k.status === 'review' && s.can('approve', { deptId: k.deptId }));
  const expiring = s.visibleDocs().filter(d => d.expiresAt && daysBetween(new Date().toISOString(), d.expiresAt) <= 30 && !['archived', 'expired'].includes(d.status));
  const decays = s.data.knowledge.filter(k => k.quality.freshness < 70 && s.can('view', { deptId: k.deptId }));
  const notifs = s.data.notifs.filter(n => n.forUser === s.user?.id || n.forUser === 'all');

  const Task = ({ icon, color, title, sub, btn, onClick, badge }: { icon: string; color: string; title: string; sub: string; btn?: string; onClick?: () => void; badge?: string }) => (
    <div className="flex items-center gap-3 border border-line rounded-xl p-3.5 hover:border-brand/50 transition bg-panel">
      <span className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${color}15`, color }}><I n={icon} s={17} /></span>
      <div className="flex-1 min-w-0">
        <p className="text-[12.5px] font-bold text-ink truncate">{title}</p>
        <p className="text-[11px] text-mute mt-0.5 truncate">{sub}</p>
      </div>
      {badge && <Badge color={color}>{badge}</Badge>}
      {btn && <Btn size="sm" kind="ghost" onClick={onClick}>{btn}</Btn>}
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex gap-2 anim-rise">
        {([['tasks', 'وظایف و گردش کار', 'kanban'], ['notifs', 'اعلان‌ها', 'bell']] as const).map(([k, l, ic]) => (
          <button key={k} onClick={() => s.navigate('inbox', { tab: k })} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-[13px] font-bold transition ${tab === k ? 'bg-night text-gold border-night' : 'bg-panel border-line text-mute hover:border-brand hover:text-ink'}`}>
            <I n={ic} s={16} />{l}
            {k === 'notifs' && notifs.filter(n => !n.read).length > 0 && <span className="bg-crimson text-white text-[10px] rounded-full px-1.5 py-0.5">{notifs.filter(n => !n.read).length}</span>}
          </button>
        ))}
      </div>

      {tab === 'tasks' ? (
        <div className="grid lg:grid-cols-2 gap-4 stagger">
          <div className="bg-panel border border-line rounded-2xl p-5">
            <SectionTitle icon="clock" end={<Badge color="#b87a12"><Num v={approvals.length} fa={s.lang === 'fa'} /></Badge>}>در انتظار تأیید شما (Workflow)</SectionTitle>
            <div className="space-y-2">
              {approvals.map(d => (
                <div key={d.id} className="border border-line rounded-xl p-3.5">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <p className="text-[12.5px] font-bold truncate">{d.title}</p>
                    <Badge color={DOC_STATUS[d.status].color}>{DOC_STATUS[d.status].fa}</Badge>
                  </div>
                  <p className="text-[10.5px] text-mute mb-2.5">{d.code} • {s.deptName(d.deptId)} • مالک: {s.userName(d.ownerId)} • بازبینی: {s.fmt(d.reviewAt)}</p>
                  <div className="flex gap-2">
                    <Btn size="sm" kind="gold" icon="check" onClick={() => {
                      const now = new Date().toISOString();
                      s.setData(dt => ({ ...dt, documents: dt.documents.map(x => x.id === d.id ? { ...x, status: 'published', approvedAt: now, publishedAt: now } : x) }));
                      s.audit('approve', d.code, 'document', `تأیید در گردش کار`, 'warn');
                      s.notify(d.ownerId, 'approval', `سند «${d.title}» تأیید و منتشر شد.`);
                      s.toast('تأیید شد.', 'ok');
                    }}>تأیید</Btn>
                    <Btn size="sm" kind="danger" icon="x" onClick={() => {
                      s.setData(dt => ({ ...dt, documents: dt.documents.map(x => x.id === d.id ? { ...x, status: 'draft' } : x) }));
                      s.audit('reject', d.code, 'document', 'رد در گردش کار', 'warn');
                      s.notify(d.ownerId, 'approval', `سند «${d.title}» رد شد.`);
                      s.toast('رد شد و به مالک اطلاع داده شد.', 'warn');
                    }}>رد</Btn>
                    <Btn size="sm" kind="line" icon="eye" onClick={() => s.navigate('documents', { open: d.id })}>مشاهده</Btn>
                  </div>
                </div>
              ))}
              {reviews.map(k => (
                <div key={k.id} className="border border-line rounded-xl p-3.5">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <p className="text-[12.5px] font-bold truncate">دانش: {k.title}</p>
                    <Badge color="#52708c">دانش</Badge>
                  </div>
                  <p className="text-[10.5px] text-mute mb-2.5">{s.deptName(k.deptId)} • {s.userName(k.ownerId)}</p>
                  <div className="flex gap-2">
                    <Btn size="sm" kind="gold" icon="check" onClick={() => {
                      s.setData(dt => ({ ...dt, knowledge: dt.knowledge.map(x => x.id === k.id ? { ...x, status: 'published', quality: { ...x.quality, approval: 100, verification: 90 } } : x) }));
                      s.audit('knowledge_approve', k.title, 'knowledge', 'تأیید دانش در گردش کار', 'info');
                      s.toast('دانش تأیید شد.', 'ok');
                    }}>تأیید دانش</Btn>
                    <Btn size="sm" kind="line" icon="eye" onClick={() => s.navigate('knowledge')}>مشاهده</Btn>
                  </div>
                </div>
              ))}
              {approvals.length === 0 && reviews.length === 0 && <Empty icon="check" text="وظیفه تأییدی ندارید" sub="همه اسناد و دانش‌های مجاز شما تعیین تکلیف شده‌اند." />}
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-panel border border-line rounded-2xl p-5">
              <SectionTitle icon="alert" end={<Badge color="#c03a2e"><Num v={expiring.length} fa={s.lang === 'fa'} /></Badge>}>اسناد در آستانه انقضا</SectionTitle>
              <div className="space-y-2">
                {expiring.map(d => <Task key={d.id} icon="doc" color="#c03a2e" title={d.title} sub={`انقضا: ${s.fmt(d.expiresAt)} — ${daysBetween(new Date().toISOString(), d.expiresAt!)} روز مانده`} btn="بازبینی" onClick={() => s.navigate('documents', { open: d.id })} />)}
                {expiring.length === 0 && <p className="text-[12px] text-mute text-center py-4">سندی نزدیک انقضا نیست.</p>}
              </div>
            </div>
            <div className="bg-panel border border-line rounded-2xl p-5">
              <SectionTitle icon="refresh" end={<Badge color="#b87a12"><Num v={decays.length} fa={s.lang === 'fa'} /></Badge>}>بازبینی دانش (Knowledge Decay)</SectionTitle>
              <div className="space-y-2">
                {decays.map(k => <Task key={k.id} icon="bulb" color="#b87a12" title={k.title} sub={`تازگی ${k.quality.freshness}٪ — AI احتمال کهنگی داده است`} btn="بررسی" onClick={() => s.navigate('knowledge')} badge="Review" />)}
                {decays.length === 0 && <p className="text-[12px] text-mute text-center py-4">دانش کهنگی شناسایی نشد.</p>}
              </div>
            </div>
            <div className="bg-panel border border-line rounded-2xl p-5">
              <SectionTitle icon="doc">اسناد من در جریان</SectionTitle>
              <div className="space-y-2">
                {myDocs.map(d => <Task key={d.id} icon="doc" color="#52708c" title={d.title} sub={`${d.code} — در انتظار بازبینی مدیر واحد`} btn="مشاهده" onClick={() => s.navigate('documents', { open: d.id })} />)}
                {myDocs.length === 0 && <p className="text-[12px] text-mute text-center py-4">سند در جریانی ندارید.</p>}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-panel border border-line rounded-2xl overflow-hidden anim-rise">
          <div className="px-5 py-3.5 border-b border-line flex items-center justify-between">
            <p className="text-[13px] font-bold">اعلان‌های شما</p>
            <Btn size="sm" kind="ghost" onClick={() => s.markNotifsRead()}>خواندن همه</Btn>
          </div>
          {notifs.length === 0 && <Empty icon="bell" text="اعلانی ندارید" />}
          {notifs.map(n => (
            <div key={n.id} className={`flex items-start gap-3 px-5 py-3.5 border-b border-line/70 last:border-0 ${n.read ? 'opacity-55' : ''}`}>
              <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${n.type === 'security' ? 'bg-crimson-soft text-crimson' : n.type === 'approval' ? 'bg-gold-soft text-gold-deep' : n.type === 'backup' ? 'bg-steel-soft text-steel' : 'bg-brand-soft text-brand'}`}>
                <I n={n.type === 'security' ? 'shield' : n.type === 'approval' ? 'clock' : n.type === 'backup' ? 'db' : n.type === 'expiry' ? 'alert' : 'bell'} s={15} />
              </span>
              <div className="flex-1">
                <p className="text-[12.5px] font-semibold leading-6">{n.text}</p>
                <p className="text-[10.5px] text-mute mt-0.5">{s.fmt(n.ts, true)}</p>
              </div>
              {!n.read && <span className="w-2 h-2 rounded-full bg-brand live-dot mt-2" />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
