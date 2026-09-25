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
  { id: 'Category 1', nameAr: 'Category 1 (RED) - إنعاش فوري (Seen immediately)', badgeBg: 'bg-red-600 text-white', icon: '🚨' },
  { id: 'Category 2', nameAr: 'Category 2 (ORANGE) - طارئ جداً خلال 10 د (Seen within 10 mins)', badgeBg: 'bg-orange-500 text-white', icon: '🟠' },
  { id: 'Category 3', nameAr: 'Category 3 (GREEN) - عاجل خلال 30 د (Seen within 30 mins)', badgeBg: 'bg-emerald-600 text-white', icon: '🟢' },
  { id: 'Category 4', nameAr: 'Category 4 (BLUE) - شبه عاجل خلال 60 د (Seen within 60 mins)', badgeBg: 'bg-blue-600 text-white', icon: '🔵' },
  { id: 'Category 5', nameAr: 'Category 5 (white) - غير عاجل خلال 120 د (Seen within 120 mins)', badgeBg: 'bg-slate-100 text-slate-800 border border-slate-300', icon: '⚪' },
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

export const SAMPLE_HIS_DATA = `10126278921	HEBA ABDALLA SNOSY MAHMOUD	من المنزل	مرضى بهية	418937	13/09/2026	1:45:38 AM	12/09/2026 11:40:05 PM	Normal
Closed		10123225664	FADIA MOHAMMED FAHMY MOHAMMED	من المنزل	مرضى بهية	422490	18/09/2026	1:36:31 AM	17/09/2026 11:33:36 PM	Normal
Closed		20226032924	RANYA MOHAMED GOMAA ALI	من المنزل	نقدى	421045	16/09/2026	2:05:00 AM	15/09/2026 11:30:57 PM	Normal
Closed		20225021519	HEND HELMY ABDELMOATI SHAHIN	من المنزل	مرضى بهية	420310	15/09/2026	9:32:39 AM	14/09/2026 11:25:35 PM	Normal
Closed		10123224260	AMANI AHMED SULTAN RAGAB	من المنزل	مرضى بهية	419587	14/09/2026	3:22:27 AM	13/09/2026 11:23:02 PM	Normal
Closed		20226030597	NEMAT ABD ELGANY AHMED KABEL	من المنزل	مرضى بهية	419586	14/09/2026	4:19:35 AM	13/09/2026 11:21:56 PM	Normal
Closed		20225017076	MANAR FOAD MOHAMED MOHAMED	من المنزل	مرضى بهية	422488	18/09/2026	1:46:23 AM	17/09/2026 11:13:25 PM	Normal
Closed		20225017637	Lenda ASAAD IBRAHIM BABKR	من المنزل	مرضى بهية	414353	08/09/2026	9:46:46 AM	07/09/2026 10:49:32 PM	Normal
Closed		10126278787	NORAA GOMAA AID ALI	من المنزل	مرضى بهية	411471	03/09/2026	12:31:17 AM	02/09/2026 10:43:42 PM	Normal
Closed		20224011416	KARIMA HASSAN MAHMOUD ABD EL KADER	من المنزل	نقدى	418936	13/09/2026	1:45:28 AM	12/09/2026 10:35:36 PM	Normal
Closed		10124237108	SALAH HAMAD SALEH AL OMIRI	من المنزل	مجلس الوزراء مركز المعلومات ودعم اتخاذ القرار - 1	413665	07/09/2026	1:18:50 AM	06/09/2026 10:30:26 PM	Normal
Closed		20226031345	NADYA MOHAMED SALEM ABDO	من المنزل	مرضى بهية	412158	04/09/2026	12:13:29 AM	03/09/2026 10:21:45 PM	Normal
Closed		20223004442	nadia abdo BRTLH WAHBA	من المنزل	مرضى بهية	421042	16/09/2026	1:20:21 AM	15/09/2026 10:20:15 PM	Normal
Closed		10124246438	AMIRA AHMED MOHAMMED HUSNI	من المنزل	مرضى بهية	414984	09/09/2026	2:11:41 AM	08/09/2026 10:01:14 PM	Normal
Closed		20226029612	MAREEM ZAKARIA ASAAD ESKANDAR	من المنزل	مرضى بهية	422506	18/09/2026	11:58:08 PM	18/09/2026 09:59:41 PM	Normal
Closed		10125259957	ASMAA ABOBAKR SROR AHMED	من المنزل	مرضى بهية	418259	11/09/2026	12:13:10 AM	10/09/2026 09:52:15 PM	Normal
Closed		20225026523	HAMIDA MOHAMED MOHAMED SAYED	من المنزل	مرضى بهية	418257	10/09/2026	10:34:03 PM	10/09/2026 09:45:43 PM	Normal
Not Started		20226028732	SARA HASSAN ALI GOMAA	من المنزل	مرضى بهية				05/09/2026 09:42:37 PM	Normal
Closed		20226030601	ABEER RAGHEB IBRAHIM SOLIMAN	من المنزل	مرضى بهية	421819	17/09/2026	12:30:38 AM	16/09/2026 09:41:28 PM	Normal
Closed		10123229652	MAGDA SHAFEK MOHAMMED ATEA	من المنزل	مصر الخير - 1	423936	21/09/2026	1:09:35 AM	20/09/2026 09:36:57 PM	Normal`;

export const SAMPLE_EXCEL_LOGBOOK_DATA = `9/1/2026	سحر عدلي محمد عبدالفتاح	2020116131	12.30 PM	13.00PM	30 MIN TO INP	NONE
9/1/2026	هاله سيد احمد فاضل	10124248158	09.30 PM	10.00 PM	30 MIN TO INP	NONE
9/2/2026	صبرين عبد المحسن طه قنديل	10124238749	8.00 PM	8.30 PM	30 MIN TO INTERMEDIATE NONE	NONE
9/2/2026	ثوما محمد عبد الحميد	P 20226033044	9.30 PM	10.00 PM	30 MIN ICU	NONE
9/2/2026	نورا جمعه عيد علي	10126278787	12.15 AM	12.30 AM	15 MIN TO INP	NONE
9/3/2026	فطوماطه دياريسو دياريسو غير معروف	P20226031653	1.00 PM	6.00 PM	5 HRS TO ICU	UN AVAILABLE BEDS
9/3/2026	سحر احمد محمد علي	20223002039	3.30 PM	4.00 PM	30 MIN TO INP	NONE
9/3/2026	حنان احمد عبد المنعم	10123224325	1.00 PM	5.00 PM		UN AVAILABLE BEDS
9/4/2026	اماني احمد سلطان رجب	10123224260	03.00 PM	03.15 PM	15 MIN TO INP	NONE
9/4/2026	ياسمين سيد حسن حسن	20224006883	9.30 PM	10.00 PM	15 MIN TO INP	NONE
9/5/2026	ندا محمود عبده سعد	20225024339	6:00 PM	8 PM	2 HRS TO INP	LABS RESULTS
9/5/2026	مروة نعيم ايوب الخطيب	P 20226030846	6.30 PM	7.00 PM	30 MIN TO INP	NONE
9/5/2026	ايات امين نجيب فرج	2021169923	10.30 PM	11.00 PM	30 MIN TO INTERMEDIATE	NONE
9/6/2026	غادة مصطفى احمد مصطفى	20226032079	6.30 PM	7.00 PM	30 MIN TO INP	NONE
9/6/2026	نجاة كامل حسن عمران	20225026071	2.30 PM	3.00 PM	30 MIN TO INP	NONE
9/7/2026	حليمة محمد قنديل مصطفى	P 20225026323	2.30 PM	3.00 PM	30 MIN TO INP	NONE
9/7/2026	سالي اسحق نجيب زاخر	10125260930	2.30 PM	3.00 PM	30 MIN TO ICU	NONE
9/7/2026	شيماء خلف الله احمد	2022211892	7.30 PM	8.10 PM	40 MIN TO ICU	PREPARING BED
9/8/2026	سامية سعد عبدالهادي مرسي	20224009379	6.00 PM	6.30 PM	30 MIN TO INP	NONE
9/8/2026	سحر السيد ابراهيم المرسي	20224006273	7.30 PM	8.00 PM	30 MIN TO ICU	NONE
9/8/2026	ماجدة محمد علي يوسف	2019099227	5.30 PM	6.00 PM	30 MIN TO INP	NONE
9/8/2026	منال محمد عبدالمنعم شهاب	10123227275	8.00 PM	8.30 PM	30 MIN TO INP	NONE
9/8/2026	اميرة احمد محمد حسني	10124246438	11.30 PM	12.00 AM	30 MIN TO INP	NONE
9/9/2026	عبداللطيف السيد محمد عوض الله	P 2020117788	1.30 PM	2.00 PM	30 MIN TO INP	NONE
9/9/2026	محمد عبدالفتاح محمد السيد	P 20226033380	5.30 PM	6.00 PM	30 MIN TO ICU	NONE
10/9/2026	عفاف محمد محمد عويس	p20226029317	direct admtion	direct admtion	to icu	NONE
12/9/2026	سها صبحي امام محمد	2022185117	7.40 AM	8.20 AM	40 MIN TO ICU	NONE
12/9/2026	اشواق احمد محسن محمد	P 20226032679	6.30 AM	9.15 AM	2.30 HRS TO INTER	CONTRACT AGREEMENT
13/9/2026	منار محمود محمد المغازي	P 20226032028	7.30 PM	8.00 PM	30 MIN TO INP	NONE
13/9/2026	انعام فوزي جيرة قلنس	10125261714	7.00 PM	7.40 PM	40 MIN TO INTER	NONE
13/9/2026	ايمان حسن محمود حسن	10125272207	7.30 PM	8.00 PM	30 MIN TO INP	NONE
13/9/2026	انصاف حمدي ابراهيم عبدالغني	20225025981	7.40 PM	8.15 PM	35 MIN TO INP	NONE
13/9/2026	اماني احمد سلطان رجب	10123224260	1.30 AM (14/9)	2.00 AM (14/9)	30 MIN TO ICU	NONE
14/9/2026	صباح احمد ابراهيم امين	2020128451	9.45 AM	10.00 AM	15 MIN TO ICU	SAVING LIFE
14/9/2026	منال محمود مصطفى عبدربه	2021155518	4.00 PM	4.30 PM	30 MIN TO INP	NONE
14/9/2026	فوزية عبدالعظيم عبدالجواد جوهري	P 10126283616	9.30 PM	10.00 PM	30 MIN TO INP	NONE
15/9/2026	سامية سعد عبدالهادي مرسي	20224009379	10.30 AM	11.00 AM	30 MIN TO INP	NONE
15/9/2026	دعاء رضا توفيق هلال	2022196254	3.00 PM	3.30 PM	30 MIN TO INP	NONE
15/9/2026	جيهان محمد علي سليمان	P 20226029786	6.00 PM	8.00 PM	2 HRS TO INP	CONTRACT AGREEMENT
16/9/2026	ياسمين صلاح عطا سعد الله	10125260929	2.30 PM	3.00 PM	30 MIN TO INTER	NONE
16/9/2026	زينب علي عبدربه عبدالرحمن	2022182353	7.00 PM	9.00 PM	2 HRS TO ICU	UN AVAILABLE BEDS
17/9/2026	زمزم سعيد عفيفي عفيفي	20224007262	1.30 AM	2.00 AM	30 MIN TO ICU	NONE
17/9/2026	مريم غايس اندراوس قلنس	20224007955	6.30 PM	7.30 PM	60 MIN TO ICU	LABS RESULTS
17/9/2026	تركيا يحي حسين خضير	P 20226099661	6.00 PM	8.00 PM	120 MIN TO ICU	CONTRACT AGREEMENT
17/9/2026	امال طه خالد نجم الدين	2022210654	4.30 PM	5.00 PM	30 MIN TO INTER	NONE
17/9/2026	رشا تواب لويس طناس	2020127035	6.30 PM	7.00 PM	30 MIN TO INP	NONE
17/9/2026	منار فؤاد محمد محمد	20225017076	1.00 AM (18/9)	1.20 AM (18/9)	20 MIN TO INP	NONE
18/9/2026	هانم محمود محمد جبريل	20225024094	12.30 PM	1.00 PM	30 MIN TO INP	NONE
19/9/2026	انصاف حمدي ابراهيم عبدالغني	20225025981	11.30 AM	12.00 PM	30 MIN TO INP	NONE
19/9/2026	هدي حافظ محمد حافظ	2023218053	11.30 AM	12.00 PM	30 MIN TO INP	NONE
19/9/2026	امل كامل سعيد مرجان	2019111949	3.30 PM	4.30 PM	60 MIN TO INP	DOPPLER RESULT
20/9/2026	مينا عبدالله ميلاد عبدالله	p 10126281817	2.00 PM	2.30 PM	30 min to inp	NONE
20/9/2026	كريمة سيد محمد ابراهيم	2022201591	5.00 PM	5.20 PM	20 MIN TO INTER	NONE
20/9/2026	منه الله محمود عبده محمد	10126278123	6.00 PM	6.30 PM	30 MIN TO INP	NONE
21/9/2026	اسماء ابو بكر سرور احمد	10125259957	2.30 PM	3.00 PM	30 MIN TO ICU	NONE
21/9/2026	صلاح حماد صالح العميري	P 10124237108	6.00 PM	8.00 PM	120 MIN TO INP	CONTRACT AGREEMENT
21/9/2026	عزيزة جمعه محمد جمعه	10123228343	9.00 PM	11:00 PM	120 MIN TO ICU	LABS RESULTS
22/9/2026	منال حسن محمد عبدالرحيم	20223004999	4.00 PM	6.00PM	120 MIN TO ICU	UN AVAILABLE BEDS
22/9/2026	ايات احمد يالم محمد	12820	8.30 PM	9.00 PM	30 MIN TO INTER	NONE
24/9/2026	سحر فارس عبد المجيد سليمان	2022214206	8.00 PM	8.05 PM	5 MIN TO INP	NONE
24/9/2026	امال محمد خليفه عبد الهادى	20220114594	8.00 PM	8.10 PM	10 MIN TO ICU	NONE
24/9/2026	ايمان احمد عبد الحليم عبد المجيد	2020131372	10.00 PM	10.10 PM	10 MIN TO INP	NONE
24/9/2026	ساره محمد محمود عتمان	202014223	11.30 PM	11.35 PM	5 MIN TO ICU	NONE`;

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
