import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import dotenv from 'dotenv';
import pg from 'pg';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const { Pool } = pg;
const app = express();
const PORT = 3000;

// Neon PostgreSQL Connection Pool
const NEON_CONNECTION_STRING =
  process.env.DATABASE_URL ||
  'postgresql://neondb_owner:npg_e6SrKQ5DEOto@ep-soft-cloud-aiz54vee-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const isServerless = process.env.VERCEL === '1' || Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME);

const pool = new Pool({
  connectionString: NEON_CONNECTION_STRING,
  ssl: { rejectUnauthorized: false },
  max: isServerless ? 3 : 20,
  idleTimeoutMillis: 15000,
  connectionTimeoutMillis: 8000,
});

// JSON body parsing with large payload support for HIS bulk imports
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Background non-blocking database initialization (ensures tables are created on Neon automatically without blocking API requests)
let dbInitStarted = false;
function ensureDbInitializedAsync() {
  if (dbInitStarted) return;
  dbInitStarted = true;
  initDatabase().catch(err => {
    console.error('Background database initialization warning:', err);
    dbInitStarted = false; // allow retry if failed
  });
}

app.use(async (req: Request, res: Response, next: NextFunction) => {
  if (req.path.startsWith('/api/') && req.path !== '/api/health') {
    ensureDbInitializedAsync();
  }
  next();
});

// Initial database schema setup
async function initDatabase() {
  try {
    // 1. ER Records Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS er_records (
        id VARCHAR(128) PRIMARY KEY,
        medical VARCHAR(128) NOT NULL,
        name VARCHAR(255) NOT NULL,
        dept VARCHAR(128) DEFAULT '',
        order_time VARCHAR(64) NOT NULL,
        actual_time VARCHAR(64),
        delay INTEGER,
        reason VARCHAR(255),
        notes TEXT,
        status VARCHAR(64) DEFAULT 'Pending',
        recorded_by VARCHAR(255) DEFAULT 'System',
        bed_number VARCHAR(50),
        risk_score VARCHAR(50),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      ALTER TABLE er_records ADD COLUMN IF NOT EXISTS bed_number VARCHAR(50);
      ALTER TABLE er_records ADD COLUMN IF NOT EXISTS risk_score VARCHAR(50);
      ALTER TABLE er_records ADD COLUMN IF NOT EXISTS contract VARCHAR(150);
      ALTER TABLE er_records ADD COLUMN IF NOT EXISTS came_from VARCHAR(150);
      ALTER TABLE er_records ADD COLUMN IF NOT EXISTS visit_no VARCHAR(100);
      ALTER TABLE er_records ADD COLUMN IF NOT EXISTS registration_type VARCHAR(100);
      ALTER TABLE er_records ADD COLUMN IF NOT EXISTS doctor_name VARCHAR(255);
      ALTER TABLE er_records ADD COLUMN IF NOT EXISTS diagnosis TEXT;
      ALTER TABLE er_records ADD COLUMN IF NOT EXISTS triage_level VARCHAR(100);
      ALTER TABLE er_records ADD COLUMN IF NOT EXISTS discharge_type VARCHAR(100);
      ALTER TABLE er_records ADD COLUMN IF NOT EXISTS entry_method VARCHAR(50) DEFAULT 'Manual';

      CREATE INDEX IF NOT EXISTS idx_er_records_order_time ON er_records(order_time DESC);
      CREATE INDEX IF NOT EXISTS idx_er_records_medical ON er_records(medical);
      CREATE INDEX IF NOT EXISTS idx_er_records_dept ON er_records(dept);
      CREATE INDEX IF NOT EXISTS idx_er_records_status ON er_records(status);
      CREATE INDEX IF NOT EXISTS idx_er_records_contract ON er_records(contract);

      -- Backfill existing sample records with realistic hospital contracts
      UPDATE er_records SET contract = 'طوارئ المستشفى', came_from = 'من المنزل', visit_no = '418266' WHERE medical = '2020123577' AND (contract IS NULL OR contract = '');
      UPDATE er_records SET contract = 'طوارئ المستشفى', came_from = 'طى الاقدام', visit_no = '418265' WHERE medical = '2017033748' AND (contract IS NULL OR contract = '');
      UPDATE er_records SET contract = 'طوارئ المستشفى', came_from = 'من المنزل', visit_no = '418264' WHERE medical = '30226000465' AND (contract IS NULL OR contract = '');
      UPDATE er_records SET contract = 'شركة التجاريون', came_from = 'طى الاقدام', visit_no = '418263' WHERE medical = '20226028712' AND (contract IS NULL OR contract = '');
      UPDATE er_records SET contract = 'تأمين صحي', came_from = 'إسعاف', visit_no = '418262' WHERE medical = '20235001192' AND (contract IS NULL OR contract = '');
      UPDATE er_records SET contract = 'نقدي', came_from = 'من المنزل', visit_no = '418261' WHERE medical = '20211009844' AND (contract IS NULL OR contract = '');
      UPDATE er_records SET contract = 'تأمين شامل', came_from = 'إسعاف', visit_no = '418260' WHERE medical = '20229007621' AND (contract IS NULL OR contract = '');
      UPDATE er_records SET contract = 'نقدي (Cash)' WHERE (contract IS NULL OR contract = '');
      UPDATE er_records SET came_from = 'من المنزل' WHERE (came_from IS NULL OR came_from = '');
    `);

    // 2. Users Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS hospital_users (
        id VARCHAR(128) PRIMARY KEY,
        username VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL,
        title_ar VARCHAR(255) NOT NULL,
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Seed default users if empty
    const userCountRes = await pool.query('SELECT COUNT(*) as count FROM hospital_users');
    if (parseInt(userCountRes.rows[0].count, 10) === 0) {
      await pool.query(`
        INSERT INTO hospital_users (id, username, password, name, role, title_ar, active)
        VALUES
          ('u-admin', 'admin', 'admin123', 'د. مروان البدري', 'Admin', 'مدير الطوارئ ومسؤول النظام', true),
          ('u-dr-ahmed', 'dr.ahmed', 'doc123', 'د. أحمد سليمان', 'Doctor', 'استشاري طب الطوارئ', true),
          ('u-nurse-sara', 'nurse.sara', 'nurse123', 'م. سارة محمود', 'Nurse', 'مشرفة تمريض الطوارئ', true),
          ('u-viewer-mohamed', 'viewer', 'view123', 'أ. محمد كامل', 'Viewer', 'مراقب جودة وإحصاء (للقراءة فقط)', true)
        ON CONFLICT (username) DO NOTHING;
      `);
    }

    // 3. Login Logs Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS hospital_login_logs (
        id VARCHAR(128) PRIMARY KEY,
        username VARCHAR(100) NOT NULL,
        user_name VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL,
        ip VARCHAR(100),
        login_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 4. Hospital Beds Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS hospital_beds (
        id VARCHAR(128) PRIMARY KEY,
        bed_number VARCHAR(50) UNIQUE NOT NULL,
        dept VARCHAR(100) NOT NULL,
        status VARCHAR(50) DEFAULT 'Available',
        patient_mrn VARCHAR(100),
        patient_name VARCHAR(255),
        assigned_at TIMESTAMP WITH TIME ZONE,
        notes TEXT,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Seed hospital beds if empty
    const bedCountRes = await pool.query('SELECT COUNT(*) as count FROM hospital_beds');
    if (parseInt(bedCountRes.rows[0].count, 10) === 0) {
      console.log('Seeding initial hospital beds across ICU, Intermediate, and Inpatient...');
      const sampleBeds = [
        // ICU Beds (10 beds)
        ['bed-icu-01', 'ICU-B01', 'ICU', 'Occupied', '2017033748', 'SAFA AHMED', 'سرير عناية مع جهاز تنفس صناعي'],
        ['bed-icu-02', 'ICU-B02', 'ICU', 'Available', null, null, 'سرير رعاية مركزة متاح وجاهز'],
        ['bed-icu-03', 'ICU-B03', 'ICU', 'Occupied', '20241005521', 'HOSSAM ELDIN', 'سرير رعاية قلبية مركزة CCU'],
        ['bed-icu-04', 'ICU-B04', 'ICU', 'Available', null, null, 'جاهز للاستقبال الفوري'],
        ['bed-icu-05', 'ICU-B05', 'ICU', 'Cleaning', null, null, 'قيد التعقيم والتجهيز الطبي'],
        ['bed-icu-06', 'ICU-B06', 'ICU', 'Reserved', null, null, 'محجوز لحالة حرجة من العمليات'],
        ['bed-icu-07', 'ICU-B07', 'ICU', 'Available', null, null, 'متاح'],
        ['bed-icu-08', 'ICU-B08', 'ICU', 'Occupied', '20214008892', 'MONA ABDELRAHMAN', 'عناية أعصاب'],
        // Intermediate Beds (10 beds)
        ['bed-im-01', 'IM-B01', 'Intermediate', 'Occupied', '30226000465', 'SHERI HASSAN', 'متابعة حيوية دقيقة'],
        ['bed-im-02', 'IM-B02', 'Intermediate', 'Available', null, null, 'متاح وجاهز للتحويل'],
        ['bed-im-03', 'IM-B03', 'Intermediate', 'Occupied', '20211009844', 'NADA KHALED', 'رعاية متوسطة باطنة'],
        ['bed-im-04', 'IM-B04', 'Intermediate', 'Available', null, null, 'متاح'],
        ['bed-im-05', 'IM-B05', 'Intermediate', 'Cleaning', null, null, 'جاري التنظيف والتعقيم'],
        ['bed-im-06', 'IM-B06', 'Intermediate', 'Available', null, null, 'متاح'],
        ['bed-im-07', 'IM-B07', 'Intermediate', 'Available', null, null, 'متاح'],
        ['bed-im-08', 'IM-B08', 'Intermediate', 'Occupied', '20235001192', 'MAHMOUD TAWFIK', 'متابعة بعد الجلطة'],
        // Inpatient Beds (12 beds)
        ['bed-inp-01', 'INP-301', 'Inpatient', 'Occupied', '2020123577', 'AMAN MOHAMED', 'جناح باطنة الدور الثالث'],
        ['bed-inp-02', 'INP-302', 'Inpatient', 'Occupied', '20226028712', 'AFAF IBRAHIM', 'جناح جراحة الدور الثالث'],
        ['bed-inp-03', 'INP-303', 'Inpatient', 'Available', null, null, 'متاح للاستقبال المباشر'],
        ['bed-inp-04', 'INP-304', 'Inpatient', 'Available', null, null, 'متاح للاستقبال المباشر'],
        ['bed-inp-05', 'INP-305', 'Inpatient', 'Available', null, null, 'متاح'],
        ['bed-inp-06', 'INP-306', 'Inpatient', 'Cleaning', null, null, 'قيد التطهير والتجهيز'],
        ['bed-inp-07', 'INP-401', 'Inpatient', 'Available', null, null, 'جناح الدور الرابع متاح'],
        ['bed-inp-08', 'INP-402', 'Inpatient', 'Available', null, null, 'متاح'],
        ['bed-inp-09', 'INP-403', 'Inpatient', 'Occupied', '20229007621', 'YASSER MOSTAFA', 'جناح باطنة'],
        ['bed-inp-10', 'INP-404', 'Inpatient', 'Available', null, null, 'متاح'],
      ];

      for (const b of sampleBeds) {
        await pool.query(
          `INSERT INTO hospital_beds (id, bed_number, dept, status, patient_mrn, patient_name, notes, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
           ON CONFLICT (bed_number) DO NOTHING`,
          b
        );
      }
    }

    // 5. Audit Logs Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS hospital_audit_logs (
        id VARCHAR(128) PRIMARY KEY,
        record_id VARCHAR(128) NOT NULL,
        action VARCHAR(50) NOT NULL,
        changed_by VARCHAR(255) NOT NULL,
        patient_name VARCHAR(255),
        patient_mrn VARCHAR(100),
        details TEXT,
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      ALTER TABLE hospital_audit_logs ADD COLUMN IF NOT EXISTS user_role VARCHAR(50);
      ALTER TABLE hospital_audit_logs ADD COLUMN IF NOT EXISTS category VARCHAR(50);
      CREATE INDEX IF NOT EXISTS idx_audit_record_id ON hospital_audit_logs(record_id);
      CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON hospital_audit_logs(timestamp DESC);
      CREATE INDEX IF NOT EXISTS idx_audit_changed_by ON hospital_audit_logs(changed_by);
      CREATE INDEX IF NOT EXISTS idx_audit_action ON hospital_audit_logs(action);
    `);

    // 6. Case Comments Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS case_comments (
        id VARCHAR(128) PRIMARY KEY,
        record_id VARCHAR(128) NOT NULL,
        user_name VARCHAR(255) NOT NULL,
        user_role VARCHAR(50) NOT NULL,
        text TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_comments_record ON case_comments(record_id);
    `);

    // Check if er_records has records, seed if 0
    const countRes = await pool.query('SELECT COUNT(*) as count FROM er_records');
    const count = parseInt(countRes.rows[0].count, 10);
    if (count === 0) {
      console.log('Seeding initial approved ER records into Neon PostgreSQL...');
      await pool.query(`
        INSERT INTO er_records (id, medical, name, dept, order_time, actual_time, delay, reason, notes, status, recorded_by, bed_number, risk_score)
        VALUES
          ('rec-1', '2020123577', 'AMAN MOHAMED', 'Inpatient', '2026-09-11T21:06', '2026-09-11T22:05', 59, 'R01', 'تم النقل للقسم الداخلي بعد تجهيز السرير', 'Transferred', 'د. مروان البدري', 'INP-301', 'Low'),
          ('rec-2', '2017033748', 'SAFA AHMED', 'ICU', '2026-09-11T19:59', '2026-09-11T22:04', 125, 'R01', 'حالة حرجة - انتظار شغور سرير عناية مركزة وجهاز تنفس', 'Transferred', 'د. مروان البدري', 'ICU-B01', 'Critical'),
          ('rec-3', '30226000465', 'SHERI HASSAN', 'Intermediate', '2026-09-11T16:57', '2026-09-11T18:00', 63, 'R03', 'انتظار تقرير الأشعة المقطعية وموافقة الاستشاري', 'Transferred', 'د. أحمد سليمان', 'IM-B01', 'Medium'),
          ('rec-4', '20226028712', 'AFAF IBRAHIM', 'Inpatient', '2026-09-11T15:05', '2026-09-11T16:15', 70, 'R06', 'تأخير في استكمال إجراءات وتصديق التأمين الصحي', 'Transferred', 'م. سارة محمود', 'INP-302', 'High'),
          ('rec-5', '20235001192', 'MAHMOUD TAWFIK', 'Inpatient', '2026-09-11T13:10', '2026-09-11T14:45', 95, 'R02', 'انتظار نتائج تحاليل إنزيمات القلب وعينات الدم', 'Transferred', 'د. أحمد سليمان', 'IM-B08', 'High'),
          ('rec-6', '20211009844', 'NADA KHALED', 'Intermediate', '2026-09-11T11:55', '2026-09-11T12:30', 35, 'R07', 'انتظار المساعد التمريضي وحمالة النقل الآمن', 'Transferred', 'م. سارة محمود', 'IM-B03', 'Low'),
          ('rec-7', '20229007621', 'YASSER MOSTAFA', '', '2026-09-11T10:20', '', NULL, 'R01', 'حالة قيد انتظار تخصيص وتجهيز السرير في الطوارئ', 'Pending', 'د. مروان البدري', '', 'Critical'),
          ('rec-8', '20241005521', 'HOSSAM ELDIN', 'ICU', '2026-09-12T01:15', '2026-09-12T01:40', 25, 'R08', 'نقل قياسي وسريع لسرير الرعاية التاجية', 'Transferred', 'د. أحمد سليمان', 'ICU-B03', 'Low'),
          ('rec-9', '20214008892', 'MONA ABDELRAHMAN', '', '2026-09-12T03:30', '', NULL, 'R04', 'انتظار استشارة طبيب المخ والأعصاب المناوب', 'Pending', 'م. سارة محمود', '', 'High')
        ON CONFLICT (id) DO NOTHING;
      `);

      // Seed an initial audit log
      await pool.query(`
        INSERT INTO hospital_audit_logs (id, record_id, action, changed_by, patient_name, patient_mrn, details, user_role, category)
        VALUES
          ('log-1', 'rec-1', 'CREATE', 'د. مروان البدري', 'AMAN MOHAMED', '2020123577', 'تسجيل فتح أمر تحويل من الطوارئ إلى القسم الداخلي', 'Doctor', 'RECORDS'),
          ('log-2', 'rec-2', 'BED_ASSIGN', 'د. مروان البدري', 'SAFA AHMED', '2017033748', 'تخصيص سرير العناية المركزة ICU-B01 للحالة الحرجة', 'Doctor', 'BEDS'),
          ('log-3', 'rec-7', 'CREATE', 'د. مروان البدري', 'YASSER MOSTAFA', '20229007621', 'تسجيل طلب سرير طوارئ عاجل', 'Doctor', 'RECORDS')
        ON CONFLICT (id) DO NOTHING;
      `);
    }

    console.log('Neon PostgreSQL enterprise schema initialized and ready.');
  } catch (error) {
    console.error('Error initializing Neon database schema:', error);
  }
}

// Helper: insert audit log
async function logAudit(
  recordId: string,
  action: string,
  changedBy: string,
  patientName: string,
  patientMrn: string,
  details: string,
  userRole?: string,
  category?: string
) {
  try {
    const id = `audit-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    await pool.query(
      `INSERT INTO hospital_audit_logs (id, record_id, action, changed_by, patient_name, patient_mrn, details, user_role, category, timestamp)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)`,
      [id, recordId || '-', action, changedBy || 'System', patientName || '', patientMrn || '', details, userRole || 'Staff', category || 'GENERAL']
    );
  } catch (err) {
    console.error('Failed to write audit log:', err);
  }
}

// Helper: calculate risk score based on wait time and department
function computeRiskScore(orderTime: string, dept: string, delay?: number | null): 'Low' | 'Medium' | 'High' | 'Critical' {
  let minutes = 0;
  if (delay !== null && delay !== undefined) {
    minutes = delay;
  } else {
    try {
      const orderDate = new Date(orderTime).getTime();
      const now = Date.now();
      minutes = Math.max(0, Math.floor((now - orderDate) / (1000 * 60)));
    } catch {
      minutes = 0;
    }
  }

  if (dept === 'ICU') {
    if (minutes > 45) return 'Critical';
    if (minutes > 25) return 'High';
    if (minutes > 15) return 'Medium';
    return 'Low';
  }

  if (minutes > 60) return 'Critical';
  if (minutes > 40) return 'High';
  if (minutes > 20) return 'Medium';
  return 'Low';
}

// Map PostgreSQL row to client ERRecord
function mapRowToRecord(row: any) {
  return {
    id: row.id,
    medical: row.medical,
    name: row.name,
    dept: row.dept || '',
    order: row.order_time,
    actual: row.actual_time || '',
    delay: row.delay !== null && row.delay !== undefined ? Number(row.delay) : null,
    reason: row.reason || '',
    notes: row.notes || '',
    status: row.status || 'Pending',
    recordedBy: row.recorded_by || 'System',
    bedNumber: row.bed_number || '',
    riskScore: row.risk_score || computeRiskScore(row.order_time, row.dept, row.delay),
    contract: row.contract || '',
    cameFrom: row.came_from || '',
    visitNo: row.visit_no || '',
    registrationType: row.registration_type || '',
    doctorName: row.doctor_name || '',
    diagnosis: row.diagnosis || '',
    triageLevel: row.triage_level || '',
    dischargeType: row.discharge_type || '',
    entryMethod: row.entry_method || 'Manual',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ==========================================
// API ROUTES
// ==========================================

// Health & DB Status
app.get('/api/health', async (req: Request, res: Response) => {
  try {
    const start = Date.now();
    // Test basic connectivity first
    await pool.query('SELECT 1');
    
    // Check if table exists and count
    let recordCount = 0;
    let serverTime = new Date().toISOString();
    try {
      const result = await pool.query('SELECT COUNT(*) as count, NOW() as server_time FROM er_records');
      recordCount = parseInt(result.rows[0].count, 10);
      serverTime = result.rows[0].server_time;
    } catch {
      // table might not be created yet, trigger async init
      ensureDbInitializedAsync();
    }

    const latency = Date.now() - start;
    res.json({
      status: 'ok',
      db: 'Neon PostgreSQL',
      connected: true,
      latencyMs: latency,
      recordCount,
      serverTime,
    });
  } catch (err: any) {
    res.status(500).json({
      status: 'error',
      db: 'Neon PostgreSQL',
      connected: false,
      error: err.message,
    });
  }
});

// GET all records
app.get('/api/records', async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM er_records ORDER BY order_time DESC');
    const records = result.rows.map(mapRowToRecord);
    res.json({ success: true, count: records.length, records });
  } catch (err: any) {
    console.error('Failed to fetch records:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST single record
app.post('/api/records', async (req: Request, res: Response) => {
  try {
    const {
      medical,
      name,
      dept,
      order,
      actual,
      delay,
      reason,
      notes,
      status,
      recordedBy,
      bedNumber,
      contract,
      cameFrom,
      visitNo,
      registrationType,
      doctorName,
      diagnosis,
      triageLevel,
      dischargeType,
      entryMethod,
    } = req.body;
    const id = req.body.id || `rec-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const risk = computeRiskScore(order, dept, delay);

    const query = `
      INSERT INTO er_records (
        id, medical, name, dept, order_time, actual_time, delay, reason, notes, status, recorded_by,
        bed_number, risk_score, contract, came_from, visit_no, registration_type, doctor_name, diagnosis,
        triage_level, discharge_type, entry_method, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, CURRENT_TIMESTAMP)
      RETURNING *;
    `;
    const values = [
      id,
      medical || '',
      name || '',
      dept || '',
      order || new Date().toISOString(),
      actual || null,
      delay !== null && delay !== undefined ? Number(delay) : null,
      reason || '',
      notes || '',
      status || (actual ? 'Transferred' : 'Pending'),
      recordedBy || 'System',
      bedNumber || '',
      risk,
      contract || '',
      cameFrom || '',
      visitNo || '',
      registrationType || '',
      doctorName || '',
      diagnosis || '',
      triageLevel || '',
      dischargeType || '',
      entryMethod || 'Manual',
    ];

    const result = await pool.query(query, values);
    const rec = mapRowToRecord(result.rows[0]);

    // Write audit log
    await logAudit(
      id,
      'CREATE',
      recordedBy || 'System',
      name,
      medical,
      `إنشاء سجل تحويل جديد لقسم (${dept || 'غير محدد'}) - التعاقد: ${contract || 'غير محدد'}`
    );

    res.status(201).json({ success: true, record: rec });
  } catch (err: any) {
    console.error('Failed to create record:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST bulk records (for HIS Import)
app.post('/api/records/bulk', async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const { records, importedBy } = req.body;
    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ success: false, error: 'No records provided' });
    }

    await client.query('BEGIN');
    let inserted = 0;

    for (const r of records) {
      const id = r.id || `his-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
      const risk = computeRiskScore(r.order, r.dept, r.delay);

      const query = `
        INSERT INTO er_records (
          id, medical, name, dept, order_time, actual_time, delay, reason, notes, status, recorded_by,
          bed_number, risk_score, contract, came_from, visit_no, registration_type, doctor_name, diagnosis,
          triage_level, discharge_type, entry_method, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, CURRENT_TIMESTAMP)
        ON CONFLICT (id) DO UPDATE SET
          medical = EXCLUDED.medical,
          name = EXCLUDED.name,
          dept = CASE WHEN EXCLUDED.dept != '' THEN EXCLUDED.dept ELSE er_records.dept END,
          order_time = EXCLUDED.order_time,
          actual_time = EXCLUDED.actual_time,
          delay = EXCLUDED.delay,
          reason = EXCLUDED.reason,
          notes = EXCLUDED.notes,
          status = EXCLUDED.status,
          risk_score = EXCLUDED.risk_score,
          contract = CASE WHEN EXCLUDED.contract != '' THEN EXCLUDED.contract ELSE er_records.contract END,
          came_from = CASE WHEN EXCLUDED.came_from != '' THEN EXCLUDED.came_from ELSE er_records.came_from END,
          visit_no = CASE WHEN EXCLUDED.visit_no != '' THEN EXCLUDED.visit_no ELSE er_records.visit_no END,
          registration_type = CASE WHEN EXCLUDED.registration_type != '' THEN EXCLUDED.registration_type ELSE er_records.registration_type END,
          doctor_name = CASE WHEN EXCLUDED.doctor_name != '' THEN EXCLUDED.doctor_name ELSE er_records.doctor_name END,
          diagnosis = CASE WHEN EXCLUDED.diagnosis != '' THEN EXCLUDED.diagnosis ELSE er_records.diagnosis END,
          triage_level = CASE WHEN EXCLUDED.triage_level != '' THEN EXCLUDED.triage_level ELSE er_records.triage_level END,
          discharge_type = CASE WHEN EXCLUDED.discharge_type != '' THEN EXCLUDED.discharge_type ELSE er_records.discharge_type END,
          entry_method = EXCLUDED.entry_method,
          updated_at = CURRENT_TIMESTAMP;
      `;
      const values = [
        id,
        r.medical || '',
        r.name || '',
        r.dept || '',
        r.order || new Date().toISOString(),
        r.actual || null,
        r.delay !== null && r.delay !== undefined ? Number(r.delay) : null,
        r.reason || '',
        r.notes || 'Imported from HIS',
        r.status || (r.actual ? 'Transferred' : 'Pending'),
        r.recordedBy || 'HIS System',
        r.bedNumber || '',
        risk,
        r.contract || '',
        r.cameFrom || '',
        r.visitNo || '',
        r.registrationType || '',
        r.doctorName || '',
        r.diagnosis || '',
        r.triageLevel || '',
        r.dischargeType || '',
        r.entryMethod || 'Import',
      ];
      await client.query(query, values);
      inserted++;
    }

    await client.query('COMMIT');

    // Audit log for bulk import
    await logAudit(
      'bulk-import',
      'CREATE',
      importedBy || 'HIS Bulk Import',
      'دفعة سجلات HIS',
      '-',
      `استيراد ومزامنة جماعية لعدد ${inserted} سجل مريض من نظام HIS`
    );

    res.json({ success: true, count: inserted });
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('Bulk import error:', err);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    client.release();
  }
});

// PUT update record
app.put('/api/records/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      medical,
      name,
      dept,
      order,
      actual,
      delay,
      reason,
      notes,
      status,
      recordedBy,
      bedNumber,
      contract,
      cameFrom,
      visitNo,
      registrationType,
      doctorName,
      diagnosis,
      triageLevel,
      dischargeType,
      entryMethod,
    } = req.body;
    const risk = computeRiskScore(order, dept, delay);

    const query = `
      UPDATE er_records
      SET
        medical = COALESCE($2, medical),
        name = COALESCE($3, name),
        dept = COALESCE($4, dept),
        order_time = COALESCE($5, order_time),
        actual_time = $6,
        delay = $7,
        reason = COALESCE($8, reason),
        notes = COALESCE($9, notes),
        status = COALESCE($10, status),
        recorded_by = COALESCE($11, recorded_by),
        bed_number = COALESCE($12, bed_number),
        risk_score = $13,
        contract = COALESCE($14, contract),
        came_from = COALESCE($15, came_from),
        visit_no = COALESCE($16, visit_no),
        registration_type = COALESCE($17, registration_type),
        doctor_name = COALESCE($18, doctor_name),
        diagnosis = COALESCE($19, diagnosis),
        triage_level = COALESCE($20, triage_level),
        discharge_type = COALESCE($21, discharge_type),
        entry_method = COALESCE($22, entry_method),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *;
    `;
    const values = [
      id,
      medical,
      name,
      dept,
      order,
      actual || null,
      delay !== null && delay !== undefined ? Number(delay) : null,
      reason,
      notes,
      status,
      recordedBy,
      bedNumber,
      risk,
      contract,
      cameFrom,
      visitNo,
      registrationType,
      doctorName,
      diagnosis,
      triageLevel,
      dischargeType,
      entryMethod,
    ];

    const result = await pool.query(query, values);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Record not found' });
    }

    const updatedRec = mapRowToRecord(result.rows[0]);
    await logAudit(
      id,
      'UPDATE',
      recordedBy || 'System',
      name || updatedRec.name,
      medical || updatedRec.medical,
      `تحديث شامل لبيانات الحالة (القسم: ${dept || 'غير محدد'}, التعاقد: ${contract || updatedRec.contract || 'غير محدد'})`
    );

    res.json({ success: true, record: updatedRec });
  } catch (err: any) {
    console.error('Failed to update record:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH partial update record (e.g. complete transfer, update notes/reason/status)
app.patch('/api/records/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const currentRes = await pool.query('SELECT * FROM er_records WHERE id = $1', [id]);
    if (currentRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Record not found' });
    }
    const current = currentRes.rows[0];

    const {
      medical,
      name,
      dept,
      order,
      actual,
      delay: passedDelay,
      reason,
      notes,
      status,
      recordedBy,
      bedNumber,
      changedBy,
      contract,
      cameFrom,
      visitNo,
      registrationType,
      doctorName,
      diagnosis,
      triageLevel,
      dischargeType,
      entryMethod,
    } = req.body;

    const targetMedical = medical !== undefined ? medical : current.medical;
    const targetName = name !== undefined ? name : current.name;
    const targetDept = dept !== undefined ? dept : current.dept;
    const targetOrder = order !== undefined ? order : current.order_time;
    const targetActual = actual !== undefined ? actual : current.actual_time;
    const targetReason = reason !== undefined ? reason : current.reason;
    const targetNotes = notes !== undefined ? notes : current.notes;
    const targetStatus = status !== undefined ? status : current.status;
    const targetRecordedBy = recordedBy !== undefined ? recordedBy : current.recorded_by;
    const targetBedNumber = bedNumber !== undefined ? bedNumber : current.bed_number;
    const targetContract = contract !== undefined ? contract : current.contract;
    const targetCameFrom = cameFrom !== undefined ? cameFrom : current.came_from;
    const targetVisitNo = visitNo !== undefined ? visitNo : current.visit_no;
    const targetRegistrationType = registrationType !== undefined ? registrationType : current.registration_type;
    const targetDoctorName = doctorName !== undefined ? doctorName : current.doctor_name;
    const targetDiagnosis = diagnosis !== undefined ? diagnosis : current.diagnosis;
    const targetTriageLevel = triageLevel !== undefined ? triageLevel : current.triage_level;
    const targetDischargeType = dischargeType !== undefined ? dischargeType : current.discharge_type;
    const targetEntryMethod = entryMethod !== undefined ? entryMethod : current.entry_method;

    let delay: number | null = current.delay;
    if (passedDelay !== undefined && passedDelay !== null) {
      delay = Number(passedDelay);
    } else if (targetActual && targetOrder) {
      try {
        const orderMs = new Date(targetOrder).getTime();
        const actualMs = new Date(targetActual).getTime();
        if (!isNaN(orderMs) && !isNaN(actualMs)) {
          delay = Math.max(0, Math.round((actualMs - orderMs) / (1000 * 60)));
        }
      } catch {
        // preserve current
      }
    }

    const risk = computeRiskScore(targetOrder, targetDept, delay);

    const query = `
      UPDATE er_records
      SET
        medical = $2,
        name = $3,
        dept = $4,
        order_time = $5,
        actual_time = $6,
        delay = $7,
        reason = $8,
        notes = $9,
        status = $10,
        recorded_by = $11,
        bed_number = $12,
        risk_score = $13,
        contract = $14,
        came_from = $15,
        visit_no = $16,
        registration_type = $17,
        doctor_name = $18,
        diagnosis = $19,
        triage_level = $20,
        discharge_type = $21,
        entry_method = $22,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *;
    `;

    const values = [
      id,
      targetMedical,
      targetName,
      targetDept,
      targetOrder,
      targetActual,
      delay,
      targetReason,
      targetNotes,
      targetStatus,
      targetRecordedBy,
      targetBedNumber,
      risk,
      targetContract,
      targetCameFrom,
      targetVisitNo,
      targetRegistrationType,
      targetDoctorName,
      targetDiagnosis,
      targetTriageLevel,
      targetDischargeType,
      targetEntryMethod,
    ];

    const updateRes = await pool.query(query, values);
    const updatedRec = mapRowToRecord(updateRes.rows[0]);

    const isTransferAction = targetStatus === 'Transferred' && current.status !== 'Transferred';
    const auditAction = isTransferAction ? 'TRANSFER' : 'UPDATE';
    const auditDetail = isTransferAction
      ? `إتمام النقل الفعلي للمريض بنجاح (سبب التأخير: ${targetReason || 'بدون تأخير'}, مدة التأخير: ${delay ?? 0} دقيقة)`
      : `تحديث بيانات الحالة (الحالة: ${targetStatus}, القسم: ${targetDept || 'غير محدد'})`;

    await logAudit(
      id,
      auditAction,
      changedBy || recordedBy || 'Staff',
      updatedRec.name,
      updatedRec.medical,
      auditDetail
    );

    res.json({ success: true, record: updatedRec });
  } catch (err: any) {
    console.error('Failed to patch record:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH update department inline
app.patch('/api/records/:id/dept', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { dept, changedBy } = req.body;

    const result = await pool.query(
      'UPDATE er_records SET dept = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *',
      [id, (dept || '').trim()]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Record not found' });
    }

    const rec = mapRowToRecord(result.rows[0]);
    await logAudit(
      id,
      'DEPT_CHANGE',
      changedBy || 'User',
      rec.name,
      rec.medical,
      `تعديل وجهة نقل المريض إلى قسم: ${dept || 'غير محدد'}`
    );

    res.json({ success: true, record: rec });
  } catch (err: any) {
    console.error('Failed to update department:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST Mark as transferred now
app.post('/api/records/:id/transfer-now', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { transferredBy } = req.body;

    const currentRes = await pool.query('SELECT * FROM er_records WHERE id = $1', [id]);
    if (currentRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Record not found' });
    }
    const current = currentRes.rows[0];

    // Compute actual time and delay
    const now = new Date();
    const actualIso = now.toISOString().slice(0, 16);
    let delay = 0;
    try {
      const orderMs = new Date(current.order_time).getTime();
      delay = Math.max(0, Math.round((now.getTime() - orderMs) / (1000 * 60)));
    } catch {
      delay = 0;
    }

    const updateRes = await pool.query(
      `UPDATE er_records
       SET status = 'Transferred', actual_time = $2, delay = $3, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 RETURNING *`,
      [id, actualIso, delay]
    );

    const rec = mapRowToRecord(updateRes.rows[0]);
    await logAudit(
      id,
      'TRANSFER',
      transferredBy || 'Clinical Staff',
      rec.name,
      rec.medical,
      `إتمام النقل الفعلي للمريض بنجاح بعد تأخير قدره ${delay} دقيقة`
    );

    res.json({ success: true, record: rec });
  } catch (err: any) {
    console.error('Transfer now error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE single record
app.delete('/api/records/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const current = await pool.query('SELECT name, medical FROM er_records WHERE id = $1', [id]);
    const pName = current.rows[0]?.name || '';
    const pMrn = current.rows[0]?.medical || '';

    const result = await pool.query('DELETE FROM er_records WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Record not found' });
    }

    await logAudit(id, 'DELETE', 'Admin', pName, pMrn, 'حذف سجل الحالة نهائياً من قاعدة بيانات الطوارئ');
    res.json({ success: true, id });
  } catch (err: any) {
    console.error('Failed to delete record:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE clear all records
app.delete('/api/records', async (req: Request, res: Response) => {
  try {
    await pool.query('TRUNCATE TABLE er_records');
    await logAudit('all', 'DELETE', 'Admin', 'كافة الحالات', '-', 'تفريغ كامل لقاعدة بيانات سجلات الطوارئ');
    res.json({ success: true, message: 'All records cleared' });
  } catch (err: any) {
    console.error('Failed to clear records:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST reset to approved demo records
app.post('/api/records/reset', async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('TRUNCATE TABLE er_records');
    await client.query(`
      INSERT INTO er_records (id, medical, name, dept, order_time, actual_time, delay, reason, notes, status, recorded_by, bed_number, risk_score)
      VALUES
        ('rec-1', '2020123577', 'AMAN MOHAMED', 'Inpatient', '2026-09-11T21:06', '2026-09-11T22:05', 59, 'R01', 'تم النقل للقسم الداخلي بعد تجهيز السرير', 'Transferred', 'د. مروان البدري', 'INP-301', 'Low'),
        ('rec-2', '2017033748', 'SAFA AHMED', 'ICU', '2026-09-11T19:59', '2026-09-11T22:04', 125, 'R01', 'حالة حرجة - انتظار شغور سرير عناية مركزة وجهاز تنفس', 'Transferred', 'د. مروان البدري', 'ICU-B01', 'Critical'),
        ('rec-3', '30226000465', 'SHERI HASSAN', 'Intermediate', '2026-09-11T16:57', '2026-09-11T18:00', 63, 'R03', 'انتظار تقرير الأشعة المقطعية وموافقة الاستشاري', 'Transferred', 'د. أحمد سليمان', 'IM-B01', 'Medium'),
        ('rec-4', '20226028712', 'AFAF IBRAHIM', 'Inpatient', '2026-09-11T15:05', '2026-09-11T16:15', 70, 'R06', 'تأخير في استكمال إجراءات وتصديق التأمين الصحي', 'Transferred', 'م. سارة محمود', 'INP-302', 'High'),
        ('rec-5', '20235001192', 'MAHMOUD TAWFIK', 'Inpatient', '2026-09-11T13:10', '2026-09-11T14:45', 95, 'R02', 'انتظار نتائج تحاليل إنزيمات القلب وعينات الدم', 'Transferred', 'د. أحمد سليمان', 'IM-B08', 'High'),
        ('rec-6', '20211009844', 'NADA KHALED', 'Intermediate', '2026-09-11T11:55', '2026-09-11T12:30', 35, 'R07', 'انتظار المساعد التمريضي وحمالة النقل الآمن', 'Transferred', 'م. سارة محمود', 'IM-B03', 'Low'),
        ('rec-7', '20229007621', 'YASSER MOSTAFA', '', '2026-09-11T10:20', '', NULL, 'R01', 'حالة قيد انتظار تخصيص وتجهيز السرير في الطوارئ', 'Pending', 'د. مروان البدري', '', 'Critical'),
        ('rec-8', '20241005521', 'HOSSAM ELDIN', 'ICU', '2026-09-12T01:15', '2026-09-12T01:40', 25, 'R08', 'نقل قياسي وسريع لسرير الرعاية التاجية', 'Transferred', 'د. أحمد سليمان', 'ICU-B03', 'Low'),
        ('rec-9', '20214008892', 'MONA ABDELRAHMAN', '', '2026-09-12T03:30', '', NULL, 'R04', 'انتظار استشارة طبيب المخ والأعصاب المناوب', 'Pending', 'م. سارة محمود', '', 'High');
    `);
    await client.query('COMMIT');

    const result = await pool.query('SELECT * FROM er_records ORDER BY order_time DESC');
    res.json({ success: true, records: result.rows.map(mapRowToRecord) });
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('Reset error:', err);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    client.release();
  }
});

// ==========================================
// USER MANAGEMENT ENDPOINTS
// ==========================================

// GET all users
app.get('/api/users', async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT id, username, name, role, title_ar, active, created_at FROM hospital_users ORDER BY created_at ASC');
    res.json({
      success: true,
      users: result.rows.map(r => ({
        id: r.id,
        username: r.username,
        name: r.name,
        role: r.role,
        titleAr: r.title_ar,
        active: r.active,
        createdAt: r.created_at,
      })),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST create user
app.post('/api/users', async (req: Request, res: Response) => {
  try {
    const { username, password, name, role, titleAr } = req.body;
    if (!username || !name) {
      return res.status(400).json({ success: false, error: 'اسم المستخدم والاسم الكامل مطلوبان' });
    }

    const cleanUsername = username.trim().toLowerCase();
    const existing = await pool.query('SELECT id FROM hospital_users WHERE LOWER(username) = $1', [cleanUsername]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ success: false, error: 'اسم المستخدم هذا مسجل مسبقاً، يرجى اختيار اسم مستخدم آخر' });
    }

    const id = `u-${Date.now()}`;
    const result = await pool.query(
      `INSERT INTO hospital_users (id, username, password, name, role, title_ar, active)
       VALUES ($1, $2, $3, $4, $5, $6, true)
       RETURNING id, username, name, role, title_ar, active, created_at`,
      [id, cleanUsername, password || '123456', name.trim(), role || 'Doctor', titleAr || role || 'طاقم طبي']
    );

    // Audit log
    await logAudit(
      id,
      'USER_CREATE',
      req.body.adminName || 'Admin/IT',
      '-',
      '-',
      `إنشاء حساب مستخدم جديد: ${cleanUsername} (${name.trim()}) بالدور: ${role || 'Doctor'} والمسمى: ${titleAr || role}`,
      'Admin',
      'USERS'
    );

    res.status(201).json({ success: true, user: result.rows[0] });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT update user (username, role, active, password, name, titleAr)
app.put('/api/users/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { username, name, role, titleAr, active, password, adminName } = req.body;

    // Check if user exists
    const userCheck = await pool.query('SELECT * FROM hospital_users WHERE id = $1', [id]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'المستخدم غير موجود' });
    }
    const currentUser = userCheck.rows[0];

    // Primary admin protections
    if (currentUser.username === 'admin' || id === 'u-admin') {
      if (active === false) {
        return res.status(400).json({ success: false, error: 'لا يمكن تعطيل حساب المسؤول الرئيسي' });
      }
      if (role && role !== 'Admin') {
        return res.status(400).json({ success: false, error: 'لا يمكن تغيير دور المسؤول الرئيسي' });
      }
    }

    // Check username uniqueness if changed
    let newUsername = currentUser.username;
    if (username && username.trim().toLowerCase() !== currentUser.username) {
      newUsername = username.trim().toLowerCase();
      const dupCheck = await pool.query('SELECT id FROM hospital_users WHERE LOWER(username) = $1 AND id != $2', [newUsername, id]);
      if (dupCheck.rows.length > 0) {
        return res.status(400).json({ success: false, error: 'اسم المستخدم الجديد مستخدم بالفعل لحساب آخر' });
      }
    }

    let query = `
      UPDATE hospital_users
      SET
        username = COALESCE($2, username),
        name = COALESCE($3, name),
        role = COALESCE($4, role),
        title_ar = COALESCE($5, title_ar),
        active = COALESCE($6, active)
    `;
    const values: any[] = [
      id,
      newUsername,
      name ? name.trim() : null,
      role || null,
      titleAr || null,
      active !== undefined ? active : null
    ];

    if (password && password.trim()) {
      query += `, password = $7 WHERE id = $1 RETURNING id, username, name, role, title_ar, active, created_at`;
      values.push(password.trim());
    } else {
      query += ` WHERE id = $1 RETURNING id, username, name, role, title_ar, active, created_at`;
    }

    const result = await pool.query(query, values);

    // Audit log
    await logAudit(
      id,
      'USER_UPDATE',
      adminName || 'Admin/IT',
      '-',
      '-',
      `تحديث حساب المستخدم: ${newUsername} (${name || currentUser.name})${role ? ` - الدور: ${role}` : ''}${active !== undefined ? ` - الحالة: ${active ? 'نشط' : 'معطل'}` : ''}${password ? ' - تم تحديث كلمة المرور' : ''}`,
      'Admin',
      'USERS'
    );

    res.json({ success: true, user: result.rows[0] });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE user
app.delete('/api/users/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (id === 'u-admin') {
      return res.status(400).json({ success: false, error: 'لا يمكن حذف حساب المسؤول الرئيسي' });
    }
    const check = await pool.query('SELECT username, name FROM hospital_users WHERE id = $1', [id]);
    if (check.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'المستخدم غير موجود' });
    }
    if (check.rows[0].username === 'admin') {
      return res.status(400).json({ success: false, error: 'لا يمكن حذف حساب المسؤول الرئيسي' });
    }
    await pool.query('DELETE FROM hospital_users WHERE id = $1', [id]);

    // Audit log
    await logAudit(
      id,
      'USER_DELETE',
      'Admin/IT',
      '-',
      '-',
      `حذف حساب المستخدم نهائياً: ${check.rows[0].username} (${check.rows[0].name})`,
      'Admin',
      'USERS'
    );

    res.json({ success: true, id });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST record user login
app.post('/api/auth/login-log', async (req: Request, res: Response) => {
  try {
    const { username, name, role } = req.body;
    const id = `log-${Date.now()}`;
    const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
    await pool.query(
      `INSERT INTO hospital_login_logs (id, username, user_name, role, ip, login_time)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
      [id, username, name, role, ip]
    );

    // Also write into general audit logs
    await logAudit(
      '-',
      'LOGIN',
      name || username,
      '-',
      '-',
      `تسجيل دخول ناجح للمستخدم (${name || username}) بدور ${role} عبر IP: ${ip}`,
      role,
      'AUTH'
    );

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET login logs
app.get('/api/users/login-logs', async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM hospital_login_logs ORDER BY login_time DESC LIMIT 50');
    res.json({
      success: true,
      logs: result.rows.map(r => ({
        id: r.id,
        username: r.username,
        userName: r.user_name,
        role: r.role,
        ip: r.ip,
        loginTime: r.login_time,
      })),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// HOSPITAL BED MANAGEMENT ENDPOINTS
// ==========================================

// GET all beds
app.get('/api/beds', async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM hospital_beds ORDER BY dept ASC, bed_number ASC');
    res.json({
      success: true,
      beds: result.rows.map(r => ({
        id: r.id,
        bedNumber: r.bed_number,
        dept: r.dept,
        status: r.status,
        patientMrn: r.patient_mrn,
        patientName: r.patient_name,
        assignedAt: r.assigned_at,
        notes: r.notes,
      })),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH update bed status
app.patch('/api/beds/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, patientMrn, patientName, notes } = req.body;

    const result = await pool.query(
      `UPDATE hospital_beds
       SET
         status = COALESCE($2, status),
         patient_mrn = $3,
         patient_name = $4,
         notes = COALESCE($5, notes),
         assigned_at = CASE WHEN $2 = 'Occupied' THEN CURRENT_TIMESTAMP ELSE assigned_at END,
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 RETURNING *`,
      [id, status, patientMrn || null, patientName || null, notes]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Bed not found' });
    }

    const b = result.rows[0];

    // Audit log
    await logAudit(
      id,
      'BED_STATUS',
      req.body.changedBy || 'Staff',
      patientName || b.patient_name || '-',
      patientMrn || b.patient_mrn || '-',
      `تحديث حالة السرير (${b.bed_number} - قسم ${b.dept}) إلى: [${status || b.status}]${notes ? ` - ملاحظات: ${notes}` : ''}`,
      'Nurse',
      'BEDS'
    );

    res.json({
      success: true,
      bed: {
        id: b.id,
        bedNumber: b.bed_number,
        dept: b.dept,
        status: b.status,
        patientMrn: b.patient_mrn,
        patientName: b.patient_name,
        assignedAt: b.assigned_at,
        notes: b.notes,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST assign bed to patient (updates both bed and record!)
app.post('/api/beds/assign', async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const { bedId, recordId, assignedBy } = req.body;
    await client.query('BEGIN');

    // 1. Get bed info
    const bedRes = await client.query('SELECT * FROM hospital_beds WHERE id = $1', [bedId]);
    if (bedRes.rows.length === 0) throw new Error('السرير غير موجود');
    const bed = bedRes.rows[0];

    // 2. Get record info
    const recRes = await client.query('SELECT * FROM er_records WHERE id = $1', [recordId]);
    if (recRes.rows.length === 0) throw new Error('سجل الحالة غير موجود');
    const rec = recRes.rows[0];

    // 3. Update bed
    await client.query(
      `UPDATE hospital_beds
       SET status = 'Occupied', patient_mrn = $2, patient_name = $3, assigned_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [bedId, rec.medical, rec.name]
    );

    // 4. Update patient record with bedNumber and dept matching the bed
    await client.query(
      `UPDATE er_records
       SET bed_number = $2, dept = $3, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [recordId, bed.bed_number, bed.dept]
    );

    await client.query('COMMIT');

    // Audit log
    await logAudit(
      recordId,
      'BED_ASSIGN',
      assignedBy || 'Clinical Staff',
      rec.name,
      rec.medical,
      `تخصيص السرير (${bed.bed_number} - قسم ${bed.dept}) للمريض بنجاح`
    );

    res.json({
      success: true,
      bedNumber: bed.bed_number,
      dept: bed.dept,
      message: `تم ربط السرير ${bed.bed_number} بالمريض ${rec.name}`,
    });
  } catch (err: any) {
    await client.query('ROLLBACK');
    res.status(500).json({ success: false, error: err.message });
  } finally {
    client.release();
  }
});

// ==========================================
// AUDIT LOGS ENDPOINTS
// ==========================================
app.get('/api/audit-logs', async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string, 10) || 300, 2000);
    const userFilter = req.query.user as string;
    const actionFilter = req.query.action as string;
    const categoryFilter = req.query.category as string;
    const search = req.query.search as string;

    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (userFilter && userFilter.trim() && userFilter !== 'ALL') {
      conditions.push(`LOWER(changed_by) = LOWER($${paramIndex})`);
      values.push(userFilter.trim());
      paramIndex++;
    }

    if (actionFilter && actionFilter.trim() && actionFilter !== 'ALL') {
      conditions.push(`action = $${paramIndex}`);
      values.push(actionFilter.trim());
      paramIndex++;
    }

    if (categoryFilter && categoryFilter.trim() && categoryFilter !== 'ALL') {
      conditions.push(`category = $${paramIndex}`);
      values.push(categoryFilter.trim());
      paramIndex++;
    }

    if (search && search.trim()) {
      conditions.push(`(
        patient_name ILIKE $${paramIndex} OR
        patient_mrn ILIKE $${paramIndex} OR
        changed_by ILIKE $${paramIndex} OR
        details ILIKE $${paramIndex}
      )`);
      values.push(`%${search.trim()}%`);
      paramIndex++;
    }

    let query = 'SELECT * FROM hospital_audit_logs';
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    query += ` ORDER BY timestamp DESC LIMIT $${paramIndex}`;
    values.push(limit);

    const result = await pool.query(query, values);
    res.json({
      success: true,
      logs: result.rows.map(r => ({
        id: r.id,
        recordId: r.record_id,
        action: r.action,
        changedBy: r.changed_by,
        userRole: r.user_role || 'Staff',
        patientName: r.patient_name,
        patientMrn: r.patient_mrn,
        details: r.details,
        category: r.category || 'GENERAL',
        timestamp: r.timestamp,
      })),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET aggregated quality stats per user
app.get('/api/audit-logs/user-stats', async (req: Request, res: Response) => {
  try {
    // 1. Fetch all system users
    const usersRes = await pool.query('SELECT username, name, role, title_ar FROM hospital_users');
    const systemUsers = usersRes.rows;

    // 2. Aggregate logs per user
    const statsRes = await pool.query(`
      SELECT 
        changed_by,
        COUNT(*)::int as total_actions,
        COUNT(*) FILTER (WHERE action IN ('CREATE', 'ADD_RECORD'))::int as created_count,
        COUNT(*) FILTER (WHERE action IN ('UPDATE', 'UPDATE_RECORD', 'DEPT_CHANGE'))::int as updated_count,
        COUNT(*) FILTER (WHERE action IN ('TRANSFER', 'TRANSFER_PATIENT'))::int as transfer_count,
        COUNT(*) FILTER (WHERE action IN ('BED_ASSIGN', 'BED_STATUS'))::int as bed_count,
        COUNT(*) FILTER (WHERE action IN ('DELETE'))::int as delete_count,
        COUNT(*) FILTER (WHERE action IN ('LOGIN'))::int as login_count,
        MAX(timestamp) as last_action_time
      FROM hospital_audit_logs
      GROUP BY changed_by
      ORDER BY total_actions DESC
    `);

    // 3. For each user, get their latest log entry details
    const userSummaryMap: Record<string, any> = {};

    for (const row of statsRes.rows) {
      const latestRes = await pool.query(
        'SELECT action, details, timestamp, user_role FROM hospital_audit_logs WHERE changed_by = $1 ORDER BY timestamp DESC LIMIT 1',
        [row.changed_by]
      );
      const latest = latestRes.rows[0];

      // Try to find matching hospital_user by name or username
      const matchedUser = systemUsers.find(
        u => u.name === row.changed_by || u.username.toLowerCase() === row.changed_by.toLowerCase()
      );

      userSummaryMap[row.changed_by] = {
        changedBy: row.changed_by,
        userRole: matchedUser?.role || latest?.user_role || 'Staff',
        titleAr: matchedUser?.title_ar || '',
        totalActions: row.total_actions,
        createdCount: row.created_count,
        updatedCount: row.updated_count,
        transferCount: row.transfer_count,
        bedCount: row.bed_count,
        deleteCount: row.delete_count,
        loginCount: row.login_count,
        lastActionTime: row.last_action_time,
        lastActionType: latest?.action || '-',
        lastActionDetail: latest?.details || '-',
      };
    }

    // Include any registered users who haven't performed actions yet
    for (const u of systemUsers) {
      if (!userSummaryMap[u.name] && !userSummaryMap[u.username]) {
        userSummaryMap[u.name] = {
          changedBy: u.name,
          userRole: u.role,
          titleAr: u.title_ar,
          totalActions: 0,
          createdCount: 0,
          updatedCount: 0,
          transferCount: 0,
          bedCount: 0,
          deleteCount: 0,
          loginCount: 0,
          lastActionTime: '',
          lastActionType: 'لا توجد حركات مسجلة بعد',
          lastActionDetail: 'لم يتم تسجيل نشاط بعد لهذا الحساب',
        };
      }
    }

    res.json({
      success: true,
      stats: Object.values(userSummaryMap).sort((a: any, b: any) => b.totalActions - a.totalActions),
    });
  } catch (err: any) {
    console.error('Failed to compute user audit stats:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// CASE COMMENTS ENDPOINTS
// ==========================================
app.get('/api/records/:id/comments', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM case_comments WHERE record_id = $1 ORDER BY created_at ASC', [id]);
    res.json({
      success: true,
      comments: result.rows.map(r => ({
        id: r.id,
        recordId: r.record_id,
        userName: r.user_name,
        userRole: r.user_role,
        text: r.text,
        createdAt: r.created_at,
      })),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/records/:id/comments', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userName, userRole, text } = req.body;
    const commentId = `comm-${Date.now()}`;

    const result = await pool.query(
      `INSERT INTO case_comments (id, record_id, user_name, user_role, text, created_at)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
       RETURNING *`,
      [commentId, id, userName || 'Anonymous', userRole || 'Staff', text]
    );

    res.status(201).json({
      success: true,
      comment: {
        id: result.rows[0].id,
        recordId: result.rows[0].record_id,
        userName: result.rows[0].user_name,
        userRole: result.rows[0].user_role,
        text: result.rows[0].text,
        createdAt: result.rows[0].created_at,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// ADVANCED ANALYTICS & BI ENDPOINT
// ==========================================
app.get('/api/analytics/advanced', async (req: Request, res: Response) => {
  try {
    // 1. Hourly delay heatmap (0 to 23)
    const recordsRes = await pool.query('SELECT order_time, actual_time, delay, dept, status FROM er_records');
    const records = recordsRes.rows;

    const hourlyMap: Record<number, { count: number; totalDelay: number; criticalCount: number }> = {};
    for (let i = 0; i < 24; i++) {
      hourlyMap[i] = { count: 0, totalDelay: 0, criticalCount: 0 };
    }

    records.forEach(r => {
      try {
        const d = new Date(r.order_time);
        const hour = d.getHours();
        if (!isNaN(hour) && hourlyMap[hour]) {
          hourlyMap[hour].count += 1;
          const del = r.delay ? Number(r.delay) : 0;
          hourlyMap[hour].totalDelay += del;
          if (del > 60) hourlyMap[hour].criticalCount += 1;
        }
      } catch {
        // ignore
      }
    });

    const hourlyHeatmap = Object.entries(hourlyMap).map(([hour, val]) => ({
      hour: parseInt(hour, 10),
      label: `${hour.padStart(2, '0')}:00`,
      cases: val.count,
      avgDelay: val.count > 0 ? Math.round(val.totalDelay / val.count) : 0,
      criticalCases: val.criticalCount,
    }));

    // 2. Department Breakdown
    const deptMap: Record<string, { total: number; completed: number; targetMet: number; totalDelay: number }> = {
      ICU: { total: 0, completed: 0, targetMet: 0, totalDelay: 0 },
      Intermediate: { total: 0, completed: 0, targetMet: 0, totalDelay: 0 },
      Inpatient: { total: 0, completed: 0, targetMet: 0, totalDelay: 0 },
      Unassigned: { total: 0, completed: 0, targetMet: 0, totalDelay: 0 },
    };

    records.forEach(r => {
      const d = r.dept === 'ICU' || r.dept === 'Intermediate' || r.dept === 'Inpatient' ? r.dept : 'Unassigned';
      deptMap[d].total += 1;
      if (r.status === 'Transferred' && r.delay !== null) {
        deptMap[d].completed += 1;
        deptMap[d].totalDelay += Number(r.delay);
        if (Number(r.delay) <= 60) deptMap[d].targetMet += 1;
      }
    });

    const deptStats = Object.entries(deptMap).map(([name, v]) => ({
      name,
      total: v.total,
      completed: v.completed,
      avgDelay: v.completed > 0 ? Math.round(v.totalDelay / v.completed) : 0,
      complianceRate: v.completed > 0 ? Math.round((v.targetMet / v.completed) * 100) : 0,
    }));

    // 3. Bed Occupancy summary
    const bedsRes = await pool.query(`
      SELECT dept, status, COUNT(*) as count
      FROM hospital_beds
      GROUP BY dept, status
    `);

    res.json({
      success: true,
      hourlyHeatmap,
      deptStats,
      rawBeds: bedsRes.rows,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// API 404 JSON FALLBACK (Prevents /api/* from falling through to Vite SPA HTML)
// ==========================================
app.all('/api/*', (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: `API route not found: ${req.method} ${req.originalUrl}`,
  });
});

// ==========================================
// START SERVER & VITE INTEGRATION
// ==========================================
async function startServer() {
  if (process.env.VERCEL === '1') {
    // Under Vercel serverless functions, database and API endpoints are served directly by the exported app
    return;
  }

  try {
    await initDatabase();
  } catch (err) {
    console.error('Initial database setup error:', err);
  }

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT} with Neon PostgreSQL Enterprise`);
  });
}

startServer();

export default app;
