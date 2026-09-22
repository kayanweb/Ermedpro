export type UserRole = 'Admin' | 'Doctor' | 'Nurse' | 'Viewer';

export interface User {
  id?: string;
  username: string;
  password?: string;
  name: string;
  role: UserRole;
  titleAr: string;
  active?: boolean;
  createdAt?: string;
}

export interface LoginLog {
  id: string;
  username: string;
  userName: string;
  role: string;
  loginTime: string;
  ip?: string;
  userAgent?: string;
}

export type DepartmentType = 'ICU' | 'Intermediate' | 'Inpatient';

export type BedStatus = 'Available' | 'Occupied' | 'Reserved' | 'Cleaning';

export interface HospitalBed {
  id: string;
  bedNumber: string;
  dept: DepartmentType;
  status: BedStatus;
  patientMrn?: string;
  patientName?: string;
  assignedAt?: string;
  notes?: string;
}

export interface AuditLogItem {
  id: string;
  recordId: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'DEPT_CHANGE' | 'TRANSFER' | 'BED_ASSIGN' | 'BED_STATUS' | 'BULK_IMPORT' | 'USER_CREATE' | 'USER_UPDATE' | 'USER_DELETE' | 'LOGIN' | string;
  changedBy: string;
  userRole?: string;
  patientName: string;
  patientMrn: string;
  details: string;
  timestamp: string;
  category?: 'RECORDS' | 'TRANSFERS' | 'BEDS' | 'USERS' | 'AUTH' | 'GENERAL' | string;
}

export interface UserAuditStat {
  changedBy: string;
  userRole?: string;
  titleAr?: string;
  totalActions: number;
  createdCount: number;
  updatedCount: number;
  transferCount: number;
  bedCount: number;
  deleteCount: number;
  loginCount: number;
  lastActionTime: string;
  lastActionType: string;
  lastActionDetail: string;
}

export interface CaseComment {
  id: string;
  recordId: string;
  userName: string;
  userRole: string;
  text: string;
  createdAt: string;
}

export interface DelayReason {
  code: string;
  text: string;
  textAr: string;
}

export interface ERRecord {
  id: string;
  medical: string; // MRN
  name: string;    // Patient Name
  dept: string;    // ICU | Intermediate | Inpatient | or empty if unassigned from HIS
  order: string;   // ISO or YYYY-MM-DDTHH:mm transfer order time
  actual?: string; // ISO or YYYY-MM-DDTHH:mm actual transfer time
  delay?: number | null; // Delay in minutes
  reason?: string; // Reason code or text
  notes?: string;
  status: 'Pending' | 'Transferred' | 'Cancelled';
  recordedBy: string;
  recordedAt?: string;
  bedNumber?: string;
  riskScore?: 'Low' | 'Medium' | 'High' | 'Critical';
  contract?: string;         // جهة التعاقد / نوع التحمل المالي (Fin. Type: تأمين صحي، نقدي، شركة، طوارئ المستشفى، ...)
  cameFrom?: string;         // طريقة الحضور / جهة الوصول (Came From: من المنزل، إسعاف، طى الاقدام، تحويل)
  visitNo?: string;          // رقم الزيارة (Visit No)
  registrationType?: string; // نوع التسجيل (Registration Type: Normal / Emergency)
  doctorName?: string;       // الطبيب المعالج / الفاحص
  diagnosis?: string;        // التشخيص المبدئي / الشكوى
  triageLevel?: string;      // مستوى الفرز (🚨 Triage Level 1-5)
  dischargeType?: string;    // نوع الخروج (تحسن، هروب، تحويل داخلي، عيادات خارجية، تحويل خارجي، وفاة)
  entryMethod?: 'Manual' | 'Import' | string; // طريقة الإدخال للنموذج (يدوي / سحب وإستيراد من الشيت)
  createdAt?: string;        // تاريخ وساعة كتابة وتسجيل الحالة بداخل النموذج/السيستم
  updatedAt?: string;
}

export interface TableColumnConfig {
  serial: boolean;           // # الرقم المسلسل
  date: boolean;             // Date
  patientName: boolean;      // Patient Name
  medicalNo: boolean;        // Medical No.
  orderTime: boolean;        // Transfer Order Time
  actualTime: boolean;       // Actual Transfer Time
  delayMinutes: boolean;     // Delay / Minutes & Hours
  causesOfDelay: boolean;    // Causes of Delay
  caseStatus: boolean;       // Case
  triage: boolean;           // 🚨 Triage (مستوى الفرز)
  contract: boolean;         // 📊 Contract (التعاقد)
  destination: boolean;      // 💰 Destination ➜ القسم
  bedNo: boolean;            // Bed # السرير
  dischargeType: boolean;    // نوع الخروج
  recordedBy: boolean;       // مدخل البيانات وتاريخ التسجيل
}

export interface ColumnMapping {
  entry_date: number;
  entry_time: number;
  exit_date: number;
  exit_time: number;
  name: number;
  medical: number;
  contract?: number;
  came_from?: number;
  visit_no?: number;
  registration_type?: number;
  doctor?: number;
  dept?: number;
  reason?: number;
}

export interface ParsedHISData {
  headers: string[];
  rows: string[][];
  delimiter: string;
}

export type AppLanguage = 'ar' | 'en';
