/* مدل داده‌های سامانه — لایه Domain */

export type RoleId = 'admin' | 'security' | 'executive' | 'dept_manager' | 'expert' | 'user' | 'viewer';
export type Classification = 'public' | 'internal' | 'confidential' | 'topsecret';
export type DocStatus = 'draft' | 'scan' | 'processing' | 'review' | 'approved' | 'published' | 'expired' | 'archived';

export type ActionKey =
  | 'view' | 'create' | 'edit' | 'delete' | 'upload' | 'download' | 'print' | 'preview'
  | 'share' | 'copy' | 'export' | 'approve' | 'reject' | 'archive' | 'restore' | 'move'
  | 'rename' | 'version' | 'comment' | 'ai_query' | 'ai_summary' | 'ocr' | 'report';

export const ALL_ACTIONS: { key: ActionKey; fa: string }[] = [
  { key: 'view', fa: 'مشاهده' }, { key: 'create', fa: 'ایجاد' }, { key: 'edit', fa: 'ویرایش' },
  { key: 'delete', fa: 'حذف' }, { key: 'upload', fa: 'بارگذاری' }, { key: 'download', fa: 'دانلود' },
  { key: 'print', fa: 'چاپ' }, { key: 'preview', fa: 'پیش‌نمایش' }, { key: 'share', fa: 'اشتراک‌گذاری' },
  { key: 'copy', fa: 'کپی' }, { key: 'export', fa: 'Export' }, { key: 'approve', fa: 'تأیید' },
  { key: 'reject', fa: 'رد' }, { key: 'archive', fa: 'آرشیو' }, { key: 'restore', fa: 'بازیابی' },
  { key: 'move', fa: 'انتقال' }, { key: 'rename', fa: 'تغییر نام' }, { key: 'version', fa: 'نسخه‌بندی' },
  { key: 'comment', fa: 'نظر' }, { key: 'ai_query', fa: 'پرسش AI' }, { key: 'ai_summary', fa: 'خلاصه AI' },
  { key: 'ocr', fa: 'OCR' }, { key: 'report', fa: 'گزارش' },
];

export type ScopeLevel = 'organization' | 'department' | 'document' | 'folder' | 'category' | 'project' | 'equipment' | 'knowledge' | 'field';

export interface Grant {
  id: string;
  subjectType: 'user' | 'role';
  subjectId: string;
  scopeLevel: ScopeLevel;
  scopeRef?: string;
  actions: ActionKey[];
  from?: string;
  until?: string;
  note?: string;
}

export interface User {
  id: string; username: string; name: string; title: string;
  role: RoleId; departments: string[]; active: boolean;
  password: string; accessFrom?: string; accessUntil?: string;
  lastLogin?: string; failedLogins: number;
}

export interface Department {
  id: string; name: string; nameEn: string; parentId: string | null;
  managerId?: string; active: boolean; color: string; desc: string;
}

export interface DocVersion { v: string; date: string; author: string; reason: string; sizeKB: number }

export interface DocItem {
  id: string; code: string; title: string; deptId: string; category: string;
  type: string; format: string; classification: Classification; status: DocStatus;
  ownerId: string; createdAt: string; modifiedAt: string; approvedAt?: string;
  publishedAt?: string; expiresAt?: string; reviewAt?: string; archivedAt?: string;
  tags: string[]; text: string; summary: string; keywords: string[];
  versions: DocVersion[]; sizeKB: number; hash: string;
  projectId?: string; equipmentId?: string; year: number;
  allowDownload: boolean; allowPrint: boolean;
  acl: { userId: string; actions: ActionKey[] }[];
  processing?: { stage: string; pct: number }[];
  dupOf?: string;
}

export interface KnowledgeItem {
  id: string; title: string; deptId: string; category: string;
  ktype: 'تجربه' | 'عیب‌یابی' | 'روش اجرایی' | 'نوآوری';
  status: 'draft' | 'review' | 'published' | 'archived';
  ownerId: string; createdAt: string; modifiedAt: string;
  text: string; problem?: string; cause?: string; solution?: string;
  result?: string; recommendation?: string; tags: string[];
  quality: { accuracy: number; freshness: number; completeness: number; verification: number; usage: number; approval: number };
  views: number; projectId?: string; equipmentId?: string;
}

export interface Lesson {
  id: string; title: string; deptId: string; date: string; ownerId: string;
  situation: string; problem: string; rootCause: string; action: string;
  result: string; recommendation: string; tags: string[]; projectId?: string; status: 'open' | 'closed';
}

export interface Equipment {
  id: string; name: string; code: string; deptId: string; status: 'operational' | 'maintenance' | 'critical' | 'standby';
  criticality: 'A' | 'B' | 'C'; lastMaintenance: string; nextMaintenance: string; hoursRun: number;
}

export interface Project {
  id: string; name: string; code: string; deptIds: string[]; status: 'planning' | 'active' | 'done' | 'hold';
  progress: number; start: string; end: string; managerId: string;
}

export interface Expert {
  id: string; name: string; userId?: string; deptId: string; fields: string[];
  skills: string[]; yearsExp: number; phone: string; available: boolean;
}

export interface ProcessItem { id: string; name: string; code: string; deptId: string; steps: string[]; sla: string }
export interface StandardItem { id: string; name: string; code: string; body: string; deptIds: string[]; year: number; status: 'active' | 'superseded' }

export interface AuditEntry {
  id: string; ts: string; userId: string; userName: string; action: string;
  target: string; targetType: string; details: string; severity: 'info' | 'warn' | 'critical'; ip: string;
}

export interface Notif {
  id: string; ts: string; forUser: string; type: 'doc' | 'approval' | 'security' | 'ai' | 'backup' | 'expiry' | 'system';
  text: string; read: boolean;
}

export interface BackupRecord {
  id: string; ts: string; kind: 'full' | 'differential' | 'incremental';
  sizeKB: number; status: 'success' | 'failed'; includes: string[]; operator: string;
}

export interface Settings {
  companyName: string; welcome: string; footer: string; loginBg: 'grid' | 'solid' | 'accent';
  sessionTimeoutMin: number; defaultCalendar: 'jalali' | 'gregorian';
  ai: { llm: string; embed: string; ocr: string; speech: string };
  policy: { blockCopy: boolean; watermark: boolean; detectCapture: boolean; dlp: boolean; passwordMin: number; lockAfter: number };
}

export interface ChatMsg { id: string; role: 'user' | 'ai'; text: string; citations?: { code: string; title: string; date: string; dept: string }[]; ts: string }

export interface AppState {
  seededAt: string;
  departments: Department[]; users: User[]; documents: DocItem[]; knowledge: KnowledgeItem[];
  lessons: Lesson[]; equipment: Equipment[]; projects: Project[]; experts: Expert[];
  processes: ProcessItem[]; standards: StandardItem[]; grants: Grant[];
  audit: AuditEntry[]; notifs: Notif[]; backups: BackupRecord[]; settings: Settings;
  folders: { id: string; name: string; deptId: string; parentId: string | null }[];
}
