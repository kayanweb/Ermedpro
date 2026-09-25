import { User, DelayReason, ERRecord } from './types';

export const USERS: User[] = [
  { id: 'admin', username: 'admin', password: '123', name: 'د شيماء احمد السيد', role: 'Admin', titleAr: 'Nurse director' },
  { id: '20810', username: '20810', password: '123', name: 'م. محمود عمر', role: 'Nurse', titleAr: 'مشرف تمريض الطوارئ' },
  { id: '21094', username: '21094', password: '123', name: 'MOHAMED ELSAYED ABD ALLAH', role: 'Admin', titleAr: 'Admin' },
];

export const DEFAULT_DOCTORS: Array<{ id: string; name: string; specialty: string }> = [
  { id: 'doc-1', name: 'د شيماء احمد السيد', specialty: 'طوارئ / Nurse director' },
  { id: 'doc-2', name: 'MOHAMED ELSAYED ABD ALLAH', specialty: 'استشاري طوارئ' },
  { id: 'doc-3', name: 'م. محمود عمر', specialty: 'مشرف طوارئ' },
  { id: 'doc-4', name: 'د. أحمد مصطفى', specialty: 'أخصائي طوارئ' },
  { id: 'doc-5', name: 'د. سارة إبراهيم', specialty: 'طبيب مقيم طوارئ' },
  { id: 'doc-6', name: 'د. محمد خالد', specialty: 'أخصائي عظام طوارئ' },
  { id: 'doc-7', name: 'د. ريم عبد العزيز', specialty: 'أخصائي باطنة طوارئ' },
];

export const REASONS: DelayReason[] = [
  { code: 'R01', text: 'Waiting for bed available', textAr: 'في انتظار توفر سرير بالأقسام' },
  { code: 'R02', text: 'Waiting for lab results', textAr: 'في انتظار نتائج الفحوصات المعملية' },
  { code: 'R03', text: 'Waiting for radiology', textAr: 'في انتظار نتائج الأشعة / التقرير' },
  { code: 'R04', text: 'Waiting for consultation', textAr: 'في انتظار استشارة الأخصائي / الاستشاري' },
  { code: 'R05', text: 'Waiting for admin approval', textAr: 'في انتظار الموافقات الإدارية / المالية' },
  { code: 'R06', text: 'Waiting for insurance', textAr: 'في انتظار موافقة شركة التأمين / الهيئة' },
  { code: 'R07', text: 'Waiting for porter', textAr: 'في انتظار عمال النقل الداخلي (Porter)' },
  { code: 'R08', text: 'Equipment preparation', textAr: 'تجهيز المعدات / أجهزة التنفس / المضخات' },
  { code: 'R09', text: 'Receiving dept. overloaded', textAr: 'ضغط عمل وتأخير استلام من القسم المستقبل' },
  { code: 'R10', text: 'Other reason', textAr: 'أسباب سريرية أو إجرائية أخرى' },
];

export const DELAY_REASONS = REASONS;

export const DEPARTMENTS = [
  { id: 'ICU', nameAr: 'العناية المركزة (ICU)', badge: 'bg-blue-100 text-blue-800 border-blue-200' },
  { id: 'Intermediate', nameAr: 'الرعاية المتوسطة (Intermediate)', badge: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  { id: 'Inpatient', nameAr: 'الأقسام الداخلية (Inpatient)', badge: 'bg-purple-100 text-purple-800 border-purple-200' },
] as const;

export const CONTRACT_TYPES = [
  { id: 'hospital_er', nameAr: 'طوارئ المستشفى', nameEn: 'Hospital ER', badge: 'bg-slate-100 text-slate-800 border-slate-300' },
  { id: 'baheya', nameAr: 'مريض بهية (Baheya patient)', nameEn: 'Baheya patient', badge: 'bg-pink-100 text-pink-800 border-pink-300' },
  { id: 'cash', nameAr: 'نقدي (Cash)', nameEn: 'Cash', badge: 'bg-amber-100 text-amber-800 border-amber-300' },
  { id: 'health_ins', nameAr: 'تأمين صحي', nameEn: 'Health Insurance', badge: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  { id: 'corporate', nameAr: 'شركة التجاريون / شركات', nameEn: 'Corporate', badge: 'bg-blue-100 text-blue-800 border-blue-300' },
  { id: 'universal_ins', nameAr: 'تأمين شامل', nameEn: 'Universal Insurance', badge: 'bg-teal-100 text-teal-800 border-teal-300' },
  { id: 'state_funded', nameAr: 'نفقة الدولة', nameEn: 'State Funded', badge: 'bg-purple-100 text-purple-800 border-purple-300' },
  { id: 'syndicate', nameAr: 'تعاقد نقابة', nameEn: 'Syndicate', badge: 'bg-indigo-100 text-indigo-800 border-indigo-300' },
  { id: 'other', nameAr: 'تعاقد آخر (كتابة يدوية)...', nameEn: 'Other (Manual)', badge: 'bg-rose-50 text-rose-800 border-rose-200' },
] as const;

export const CAME_FROM_OPTIONS = [
  'من المنزل',
  'طى الاقدام',
  'إسعاف',
  'تحويل من مستشفى آخر',
  'عيادات خارجية',
];

export const TRIAGE_LEVELS = [
  { id: 'Level 1', nameAr: 'المستوى 1 - إنعاش عاجل (Resuscitation)', badgeBg: 'bg-red-600 text-white', icon: '🚨' },
  { id: 'Level 2', nameAr: 'المستوى 2 - طوارئ حادة (Emergent)', badgeBg: 'bg-rose-500 text-white', icon: '🔴' },
  { id: 'Level 3', nameAr: 'المستوى 3 - عاجل (Urgent)', badgeBg: 'bg-amber-500 text-white', icon: '🟡' },
  { id: 'Level 4', nameAr: 'المستوى 4 - أقل عجلة (Less Urgent)', badgeBg: 'bg-emerald-600 text-white', icon: '🟢' },
  { id: 'Level 5', nameAr: 'المستوى 5 - غير عاجل (Non-Urgent)', badgeBg: 'bg-blue-600 text-white', icon: '🔵' },
];

export const DISCHARGE_TYPES = [
  { id: 'Improved', nameAr: 'تحسن (Discharged / Improved)', badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  { id: 'AMA', nameAr: 'هروب / خروج على المسؤولية (AMA / Absconded)', badgeBg: 'bg-rose-100 text-rose-800 border-rose-300' },
  { id: 'InternalTransfer', nameAr: 'تحويل إلى داخل المستشفى (Internal Hospital Transfer)', badgeBg: 'bg-blue-100 text-blue-800 border-blue-300' },
  { id: 'OutpatientClinic', nameAr: 'تحويل إلى عيادات خارجية (Outpatient Clinic)', badgeBg: 'bg-purple-100 text-purple-800 border-purple-300' },
  { id: 'ExternalTransfer', nameAr: 'تحويل لمستشفى خارجي (External Transfer)', badgeBg: 'bg-amber-100 text-amber-800 border-amber-300' },
  { id: 'Deceased', nameAr: 'وفاة (Deceased)', badgeBg: 'bg-slate-800 text-white' },
];

export const DEFAULT_COLUMN_CONFIG = {
  serial: true,
  date: true,
  patientName: true,
  medicalNo: true,
  orderTime: true,
  actualTime: true,
  delayMinutes: true,
  causesOfDelay: true,
  caseStatus: true,
  triage: true,
  contract: true,
  destination: true,
  bedNo: true,
  dischargeType: true,
  recordedBy: true,
};

export const SAMPLE_HIS_DATA = `Status\tFrequency Number\tMRN\tName\tCame From\tFin. Type\tVisit No\tClosed Date\tClosed Time\tAdded Date&Time\tRegistration Type
Closed\t\t2020123577\tAMAN MOHAMED\tمن المنزل\tطوارئ المستشفى\t418266\t11/09/2026\t10:05:07 PM\t11/09/2026 09:06:45 PM\tNormal
Closed\t\t2017033748\tSAFA AHMED\tطى الاقدام\tطوارئ المستشفى\t418265\t11/09/2026\t10:04:51 PM\t11/09/2026 07:59:53 PM\tNormal
Closed\t\t30226000465\tSHERI HASSAN\tمن المنزل\tطوارئ المستشفى\t418264\t11/09/2026\t6:00:31 PM\t11/09/2026 04:57:41 PM\tNormal
Closed\t\t20226028712\tAFAF IBRAHIM\tطى الاقدام\tشركة التجاريون\t418263\t11/09/2026\t4:15:20 PM\t11/09/2026 03:05:23 PM\tNormal
Closed\t\t20235001192\tMAHMOUD TAWFIK\tإسعاف\tتأمين صحي\t418262\t11/09/2026\t02:45:10 PM\t11/09/2026 01:10:00 PM\tNormal
Closed\t\t20211009844\tNADA KHALED\tمن المنزل\tنقدي\t418261\t11/09/2026\t12:30:00 PM\t11/09/2026 11:55:00 AM\tNormal
Un Paid\t\t20229007621\tYASSER MOSTAFA\tإسعاف\tتأمين شامل\t418260\t\t\t11/09/2026 10:20:00 AM\tEmergency`;

export const SAMPLE_SIMPLE_DATA = `وقت الدخول\tالاسم\tMRN\tوقت الخروج
11/09/2026 08:00\tأحمد محمد إبراهيم\tM001\t11/09/2026 09:30
11/09/2026 08:15\tسارة علي حسن\tM002\t11/09/2026 08:45
11/09/2026 09:00\tمحمد حسن عبد الله\tM003\t11/09/2026 11:15
11/09/2026 10:30\tفاطمة محمود خليل\tM004\t11/09/2026 11:00
11/09/2026 11:15\tعمر خالد الشريف\tM005\t11/09/2026 13:45`;

export const INITIAL_RECORDS: ERRecord[] = [
  {
    id: 'rec-1',
    medical: '2020123577',
    name: 'AMAN MOHAMED',
    dept: 'Inpatient',
    order: '2026-09-11T21:06',
    actual: '2026-09-11T22:05',
    delay: 59,
    reason: 'R01',
    notes: 'تم النقل للقسم الداخلي بعد تجهيز السرير',
    status: 'Transferred',
    recordedBy: 'د شيماء احمد السيد',
    recordedAt: '2026-09-11T22:10:00Z',
    contract: 'طوارئ المستشفى',
    cameFrom: 'من المنزل',
    visitNo: '418266',
    doctorName: 'د شيماء احمد السيد',
  },
  {
    id: 'rec-2',
    medical: '2017033748',
    name: 'SAFA AHMED',
    dept: 'ICU',
    order: '2026-09-11T19:59',
    actual: '2026-09-11T22:04',
    delay: 125,
    reason: 'R01',
    notes: 'حالة حرجة - تأخر سرير العناية المركزة وتجهيز جهاز التنفس',
    status: 'Transferred',
    recordedBy: 'م. محمود عمر',
    recordedAt: '2026-09-11T22:06:00Z',
    contract: 'طوارئ المستشفى',
    cameFrom: 'طى الاقدام',
    visitNo: '418265',
    doctorName: 'د شيماء احمد السيد',
  },
  {
    id: 'rec-3',
    medical: '30226000465',
    name: 'SHERI HASSAN',
    dept: 'Intermediate',
    order: '2026-09-11T16:57',
    actual: '2026-09-11T18:00',
    delay: 63,
    reason: 'R03',
    notes: 'تأخر تقرير الأشعة المقطعية قبل موافقة الرعاية المتوسطة',
    status: 'Transferred',
    recordedBy: 'م. محمود عمر',
    recordedAt: '2026-09-11T18:05:00Z',
    contract: 'طوارئ المستشفى',
    cameFrom: 'من المنزل',
    visitNo: '418264',
    doctorName: 'د شيماء احمد السيد',
  },
  {
    id: 'rec-4',
    medical: '20226028712',
    name: 'AFAF IBRAHIM',
    dept: 'Inpatient',
    order: '2026-09-11T15:05',
    actual: '2026-09-11T16:15',
    delay: 70,
    reason: 'R06',
    notes: 'تأخر موافقة شركة التأمين (التجاريون)',
    status: 'Transferred',
    recordedBy: 'د شيماء احمد السيد',
    recordedAt: '2026-09-11T16:20:00Z',
    contract: 'شركة التجاريون',
    cameFrom: 'طى الاقدام',
    visitNo: '418263',
    doctorName: 'د شيماء احمد السيد',
  },
  {
    id: 'rec-5',
    medical: '20235001192',
    name: 'MAHMOUD TAWFIK',
    dept: 'ICU',
    order: '2026-09-11T13:10',
    actual: '2026-09-11T14:45',
    delay: 95,
    reason: 'R08',
    notes: 'تجهيز جهاز المراقبة والإنعاش الرئوي',
    status: 'Transferred',
    recordedBy: 'م. محمود عمر',
    recordedAt: '2026-09-11T14:50:00Z',
    contract: 'تأمين صحي',
    cameFrom: 'إسعاف',
    visitNo: '418262',
    doctorName: 'د شيماء احمد السيد',
  },
  {
    id: 'rec-6',
    medical: '20211009844',
    name: 'NADA KHALED',
    dept: 'Inpatient',
    order: '2026-09-11T11:55',
    actual: '2026-09-11T12:30',
    delay: 35,
    reason: 'R07',
    notes: 'انتظار نقالة وعامل النقل الداخلي',
    status: 'Transferred',
    recordedBy: 'د شيماء احمد السيد',
    recordedAt: '2026-09-11T12:35:00Z',
    contract: 'نقدي',
    cameFrom: 'من المنزل',
    visitNo: '418261',
    doctorName: 'د شيماء احمد السيد',
  },
  {
    id: 'rec-7',
    medical: '20229007621',
    name: 'YASSER MOSTAFA',
    dept: 'ICU',
    order: '2026-09-11T10:20',
    actual: undefined,
    delay: null,
    reason: 'R01',
    notes: 'طلب سرير عناية عاجل - قيد الانتظار حالياً',
    status: 'Pending',
    recordedBy: 'د شيماء احمد السيد',
    recordedAt: '2026-09-11T10:25:00Z',
    contract: 'تأمين شامل',
    cameFrom: 'إسعاف',
    visitNo: '418260',
    doctorName: 'د شيماء احمد السيد',
  },
  {
    id: 'rec-8',
    medical: '20241005510',
    name: 'HODA ABDELRAHMAN',
    dept: 'Intermediate',
    order: '2026-09-10T18:30',
    actual: '2026-09-10T18:55',
    delay: 25,
    reason: 'R01',
    notes: 'تم النقل خلال الهدف القياسي (<30 دقيقة)',
    status: 'Transferred',
    recordedBy: 'م. محمود عمر',
    recordedAt: '2026-09-10T19:00:00Z',
  },
  {
    id: 'rec-9',
    medical: '20240901234',
    name: 'TARIQ KAMAL',
    dept: 'Inpatient',
    order: '2026-09-10T14:15',
    actual: '2026-09-10T14:40',
    delay: 25,
    reason: 'R02',
    notes: 'نتائج صورة الدم السريعة تمت في الموعد',
    status: 'Transferred',
    recordedBy: 'MOHAMED ELSAYED ABD ALLAH',
    recordedAt: '2026-09-10T14:45:00Z',
  },
];
