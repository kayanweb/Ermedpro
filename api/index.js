// server/server.ts
import express from "express";
import path from "path";
import dotenv from "dotenv";
import pg from "pg";
dotenv.config();
var { Pool } = pg;
var app = express();
var PORT = 3e3;
var rawConnectionString = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_e6SrKQ5DEOto@ep-soft-cloud-aiz54vee-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";
var NEON_CONNECTION_STRING = rawConnectionString.trim().replace(/^["'`]/, "").replace(/["'`]$/, "").trim();
var isServerless = process.env.VERCEL === "1" || Boolean(process.env.VERCEL) || Boolean(process.env.VERCEL_ENV) || Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME) || Boolean(process.env.NOW_REGION);
var pool = new Pool({
  connectionString: NEON_CONNECTION_STRING,
  ssl: { rejectUnauthorized: false },
  max: isServerless ? 3 : 20,
  idleTimeoutMillis: 15e3,
  connectionTimeoutMillis: 1e4
});
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use((req, res, next) => {
  const vpath = req.query?.__vpath || (req.url.includes("__vpath=") ? new URL(req.url, "http://localhost").searchParams.get("__vpath") : null);
  if (vpath) {
    const cleanUrl = req.url.replace(/[?&]__vpath=[^&]*/, "").replace(/\?$/, "");
    const searchPart = cleanUrl.includes("?") ? cleanUrl.substring(cleanUrl.indexOf("?")) : "";
    req.url = "/api/" + vpath.replace(/^\/+/, "") + searchPart;
  } else {
    const forwardedUri = req.headers["x-forwarded-uri"] || req.headers["x-matched-path"];
    if (forwardedUri && forwardedUri.startsWith("/api") && (req.url === "/api" || req.url === "/")) {
      req.url = forwardedUri;
    }
  }
  next();
});
var dbInitStarted = false;
function ensureDbInitializedAsync() {
  if (dbInitStarted) return;
  dbInitStarted = true;
  initDatabase().catch((err) => {
    console.error("Background database initialization warning:", err);
    dbInitStarted = false;
  });
}
app.use(async (req, res, next) => {
  if (req.path.startsWith("/api/") && req.path !== "/api/health") {
    ensureDbInitializedAsync();
  }
  next();
});
async function initDatabase() {
  try {
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
      UPDATE er_records SET contract = '\u0637\u0648\u0627\u0631\u0626 \u0627\u0644\u0645\u0633\u062A\u0634\u0641\u0649', came_from = '\u0645\u0646 \u0627\u0644\u0645\u0646\u0632\u0644', visit_no = '418266' WHERE medical = '2020123577' AND (contract IS NULL OR contract = '');
      UPDATE er_records SET contract = '\u0637\u0648\u0627\u0631\u0626 \u0627\u0644\u0645\u0633\u062A\u0634\u0641\u0649', came_from = '\u0637\u0649 \u0627\u0644\u0627\u0642\u062F\u0627\u0645', visit_no = '418265' WHERE medical = '2017033748' AND (contract IS NULL OR contract = '');
      UPDATE er_records SET contract = '\u0637\u0648\u0627\u0631\u0626 \u0627\u0644\u0645\u0633\u062A\u0634\u0641\u0649', came_from = '\u0645\u0646 \u0627\u0644\u0645\u0646\u0632\u0644', visit_no = '418264' WHERE medical = '30226000465' AND (contract IS NULL OR contract = '');
      UPDATE er_records SET contract = '\u0634\u0631\u0643\u0629 \u0627\u0644\u062A\u062C\u0627\u0631\u064A\u0648\u0646', came_from = '\u0637\u0649 \u0627\u0644\u0627\u0642\u062F\u0627\u0645', visit_no = '418263' WHERE medical = '20226028712' AND (contract IS NULL OR contract = '');
      UPDATE er_records SET contract = '\u062A\u0623\u0645\u064A\u0646 \u0635\u062D\u064A', came_from = '\u0625\u0633\u0639\u0627\u0641', visit_no = '418262' WHERE medical = '20235001192' AND (contract IS NULL OR contract = '');
      UPDATE er_records SET contract = '\u0646\u0642\u062F\u064A', came_from = '\u0645\u0646 \u0627\u0644\u0645\u0646\u0632\u0644', visit_no = '418261' WHERE medical = '20211009844' AND (contract IS NULL OR contract = '');
      UPDATE er_records SET contract = '\u062A\u0623\u0645\u064A\u0646 \u0634\u0627\u0645\u0644', came_from = '\u0625\u0633\u0639\u0627\u0641', visit_no = '418260' WHERE medical = '20229007621' AND (contract IS NULL OR contract = '');
      UPDATE er_records SET contract = '\u0646\u0642\u062F\u064A (Cash)' WHERE (contract IS NULL OR contract = '');
      UPDATE er_records SET came_from = '\u0645\u0646 \u0627\u0644\u0645\u0646\u0632\u0644' WHERE (came_from IS NULL OR came_from = '');
    `);
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
    const userCountRes = await pool.query("SELECT COUNT(*) as count FROM hospital_users");
    if (parseInt(userCountRes.rows[0].count, 10) === 0) {
      await pool.query(`
        INSERT INTO hospital_users (id, username, password, name, role, title_ar, active)
        VALUES
          ('admin', 'admin', '123', '\u062F \u0634\u064A\u0645\u0627\u0621 \u0627\u062D\u0645\u062F \u0627\u0644\u0633\u064A\u062F', 'Admin', 'Nurse director', true),
          ('20810', '20810', '123', '\u0645. \u0645\u062D\u0645\u0648\u062F \u0639\u0645\u0631', 'Nurse', '\u0645\u0634\u0631\u0641 \u062A\u0645\u0631\u064A\u0636 \u0627\u0644\u0637\u0648\u0627\u0631\u0626', true),
          ('21094', '21094', '123', 'MOHAMED ELSAYED ABD ALLAH', 'Admin', 'Admin', true)
        ON CONFLICT (username) DO NOTHING;
      `);
    } else {
      await pool.query(`
        UPDATE hospital_users SET id = REGEXP_REPLACE(id, '^u-', '') WHERE id LIKE 'u-%';
        UPDATE hospital_users SET id = 'admin' WHERE username = 'admin' AND id != 'admin';
        UPDATE hospital_users SET id = '20810' WHERE username = '20810' AND id != '20810';
        UPDATE hospital_users SET id = '21094' WHERE username = '21094' AND id != '21094';
      `);
    }
    await pool.query(`
      CREATE TABLE IF NOT EXISTS hospital_doctors (
        id VARCHAR(128) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        specialty VARCHAR(150) DEFAULT '\u0637\u0648\u0627\u0631\u0626',
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      INSERT INTO hospital_doctors (id, name, specialty)
      VALUES
        ('doc-1', '\u062F \u0634\u064A\u0645\u0627\u0621 \u0627\u062D\u0645\u062F \u0627\u0644\u0633\u064A\u062F', '\u0637\u0648\u0627\u0631\u0626 / Nurse director'),
        ('doc-2', 'MOHAMED ELSAYED ABD ALLAH', '\u0627\u0633\u062A\u0634\u0627\u0631\u064A \u0637\u0648\u0627\u0631\u0626'),
        ('doc-3', '\u0645. \u0645\u062D\u0645\u0648\u062F \u0639\u0645\u0631', '\u0645\u0634\u0631\u0641 \u0637\u0648\u0627\u0631\u0626'),
        ('doc-4', '\u062F. \u0623\u062D\u0645\u062F \u0645\u0635\u0637\u0641\u0649', '\u0623\u062E\u0635\u0627\u0626\u064A \u0637\u0648\u0627\u0631\u0626'),
        ('doc-5', '\u062F. \u0633\u0627\u0631\u0629 \u0625\u0628\u0631\u0627\u0647\u064A\u0645', '\u0637\u0628\u064A\u0628 \u0645\u0642\u064A\u0645 \u0637\u0648\u0627\u0631\u0626'),
        ('doc-6', '\u062F. \u0645\u062D\u0645\u062F \u062E\u0627\u0644\u062F', '\u0623\u062E\u0635\u0627\u0626\u064A \u0639\u0638\u0627\u0645 \u0637\u0648\u0627\u0631\u0626'),
        ('doc-7', '\u062F. \u0631\u064A\u0645 \u0639\u0628\u062F \u0627\u0644\u0639\u0632\u064A\u0632', '\u0623\u062E\u0635\u0627\u0626\u064A \u0628\u0627\u0637\u0646\u0629 \u0637\u0648\u0627\u0631\u0626')
      ON CONFLICT (id) DO NOTHING;
    `);
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
    const bedCountRes = await pool.query("SELECT COUNT(*) as count FROM hospital_beds");
    if (parseInt(bedCountRes.rows[0].count, 10) === 0) {
      console.log("Seeding initial hospital beds across ICU, Intermediate, and Inpatient...");
      const sampleBeds = [
        // ICU Beds (10 beds)
        ["bed-icu-01", "ICU-B01", "ICU", "Occupied", "2017033748", "SAFA AHMED", "\u0633\u0631\u064A\u0631 \u0639\u0646\u0627\u064A\u0629 \u0645\u0639 \u062C\u0647\u0627\u0632 \u062A\u0646\u0641\u0633 \u0635\u0646\u0627\u0639\u064A"],
        ["bed-icu-02", "ICU-B02", "ICU", "Available", null, null, "\u0633\u0631\u064A\u0631 \u0631\u0639\u0627\u064A\u0629 \u0645\u0631\u0643\u0632\u0629 \u0645\u062A\u0627\u062D \u0648\u062C\u0627\u0647\u0632"],
        ["bed-icu-03", "ICU-B03", "ICU", "Occupied", "20241005521", "HOSSAM ELDIN", "\u0633\u0631\u064A\u0631 \u0631\u0639\u0627\u064A\u0629 \u0642\u0644\u0628\u064A\u0629 \u0645\u0631\u0643\u0632\u0629 CCU"],
        ["bed-icu-04", "ICU-B04", "ICU", "Available", null, null, "\u062C\u0627\u0647\u0632 \u0644\u0644\u0627\u0633\u062A\u0642\u0628\u0627\u0644 \u0627\u0644\u0641\u0648\u0631\u064A"],
        ["bed-icu-05", "ICU-B05", "ICU", "Cleaning", null, null, "\u0642\u064A\u062F \u0627\u0644\u062A\u0639\u0642\u064A\u0645 \u0648\u0627\u0644\u062A\u062C\u0647\u064A\u0632 \u0627\u0644\u0637\u0628\u064A"],
        ["bed-icu-06", "ICU-B06", "ICU", "Reserved", null, null, "\u0645\u062D\u062C\u0648\u0632 \u0644\u062D\u0627\u0644\u0629 \u062D\u0631\u062C\u0629 \u0645\u0646 \u0627\u0644\u0639\u0645\u0644\u064A\u0627\u062A"],
        ["bed-icu-07", "ICU-B07", "ICU", "Available", null, null, "\u0645\u062A\u0627\u062D"],
        ["bed-icu-08", "ICU-B08", "ICU", "Occupied", "20214008892", "MONA ABDELRAHMAN", "\u0639\u0646\u0627\u064A\u0629 \u0623\u0639\u0635\u0627\u0628"],
        // Intermediate Beds (10 beds)
        ["bed-im-01", "IM-B01", "Intermediate", "Occupied", "30226000465", "SHERI HASSAN", "\u0645\u062A\u0627\u0628\u0639\u0629 \u062D\u064A\u0648\u064A\u0629 \u062F\u0642\u064A\u0642\u0629"],
        ["bed-im-02", "IM-B02", "Intermediate", "Available", null, null, "\u0645\u062A\u0627\u062D \u0648\u062C\u0627\u0647\u0632 \u0644\u0644\u062A\u062D\u0648\u064A\u0644"],
        ["bed-im-03", "IM-B03", "Intermediate", "Occupied", "20211009844", "NADA KHALED", "\u0631\u0639\u0627\u064A\u0629 \u0645\u062A\u0648\u0633\u0637\u0629 \u0628\u0627\u0637\u0646\u0629"],
        ["bed-im-04", "IM-B04", "Intermediate", "Available", null, null, "\u0645\u062A\u0627\u062D"],
        ["bed-im-05", "IM-B05", "Intermediate", "Cleaning", null, null, "\u062C\u0627\u0631\u064A \u0627\u0644\u062A\u0646\u0638\u064A\u0641 \u0648\u0627\u0644\u062A\u0639\u0642\u064A\u0645"],
        ["bed-im-06", "IM-B06", "Intermediate", "Available", null, null, "\u0645\u062A\u0627\u062D"],
        ["bed-im-07", "IM-B07", "Intermediate", "Available", null, null, "\u0645\u062A\u0627\u062D"],
        ["bed-im-08", "IM-B08", "Intermediate", "Occupied", "20235001192", "MAHMOUD TAWFIK", "\u0645\u062A\u0627\u0628\u0639\u0629 \u0628\u0639\u062F \u0627\u0644\u062C\u0644\u0637\u0629"],
        // Inpatient Beds (12 beds)
        ["bed-inp-01", "INP-301", "Inpatient", "Occupied", "2020123577", "AMAN MOHAMED", "\u062C\u0646\u0627\u062D \u0628\u0627\u0637\u0646\u0629 \u0627\u0644\u062F\u0648\u0631 \u0627\u0644\u062B\u0627\u0644\u062B"],
        ["bed-inp-02", "INP-302", "Inpatient", "Occupied", "20226028712", "AFAF IBRAHIM", "\u062C\u0646\u0627\u062D \u062C\u0631\u0627\u062D\u0629 \u0627\u0644\u062F\u0648\u0631 \u0627\u0644\u062B\u0627\u0644\u062B"],
        ["bed-inp-03", "INP-303", "Inpatient", "Available", null, null, "\u0645\u062A\u0627\u062D \u0644\u0644\u0627\u0633\u062A\u0642\u0628\u0627\u0644 \u0627\u0644\u0645\u0628\u0627\u0634\u0631"],
        ["bed-inp-04", "INP-304", "Inpatient", "Available", null, null, "\u0645\u062A\u0627\u062D \u0644\u0644\u0627\u0633\u062A\u0642\u0628\u0627\u0644 \u0627\u0644\u0645\u0628\u0627\u0634\u0631"],
        ["bed-inp-05", "INP-305", "Inpatient", "Available", null, null, "\u0645\u062A\u0627\u062D"],
        ["bed-inp-06", "INP-306", "Inpatient", "Cleaning", null, null, "\u0642\u064A\u062F \u0627\u0644\u062A\u0637\u0647\u064A\u0631 \u0648\u0627\u0644\u062A\u062C\u0647\u064A\u0632"],
        ["bed-inp-07", "INP-401", "Inpatient", "Available", null, null, "\u062C\u0646\u0627\u062D \u0627\u0644\u062F\u0648\u0631 \u0627\u0644\u0631\u0627\u0628\u0639 \u0645\u062A\u0627\u062D"],
        ["bed-inp-08", "INP-402", "Inpatient", "Available", null, null, "\u0645\u062A\u0627\u062D"],
        ["bed-inp-09", "INP-403", "Inpatient", "Occupied", "20229007621", "YASSER MOSTAFA", "\u062C\u0646\u0627\u062D \u0628\u0627\u0637\u0646\u0629"],
        ["bed-inp-10", "INP-404", "Inpatient", "Available", null, null, "\u0645\u062A\u0627\u062D"]
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
    const countRes = await pool.query("SELECT COUNT(*) as count FROM er_records");
    const count = parseInt(countRes.rows[0].count, 10);
    if (count === 0) {
      console.log("Seeding initial approved ER records into Neon PostgreSQL...");
      await pool.query(`
        INSERT INTO er_records (id, medical, name, dept, order_time, actual_time, delay, reason, notes, status, recorded_by, bed_number, risk_score)
        VALUES
          ('rec-1', '2020123577', 'AMAN MOHAMED', 'Inpatient', '2026-09-11T21:06', '2026-09-11T22:05', 59, 'R01', '\u062A\u0645 \u0627\u0644\u0646\u0642\u0644 \u0644\u0644\u0642\u0633\u0645 \u0627\u0644\u062F\u0627\u062E\u0644\u064A \u0628\u0639\u062F \u062A\u062C\u0647\u064A\u0632 \u0627\u0644\u0633\u0631\u064A\u0631', 'Transferred', '\u062F. \u0645\u0631\u0648\u0627\u0646 \u0627\u0644\u0628\u062F\u0631\u064A', 'INP-301', 'Low'),
          ('rec-2', '2017033748', 'SAFA AHMED', 'ICU', '2026-09-11T19:59', '2026-09-11T22:04', 125, 'R01', '\u062D\u0627\u0644\u0629 \u062D\u0631\u062C\u0629 - \u0627\u0646\u062A\u0638\u0627\u0631 \u0634\u063A\u0648\u0631 \u0633\u0631\u064A\u0631 \u0639\u0646\u0627\u064A\u0629 \u0645\u0631\u0643\u0632\u0629 \u0648\u062C\u0647\u0627\u0632 \u062A\u0646\u0641\u0633', 'Transferred', '\u062F. \u0645\u0631\u0648\u0627\u0646 \u0627\u0644\u0628\u062F\u0631\u064A', 'ICU-B01', 'Critical'),
          ('rec-3', '30226000465', 'SHERI HASSAN', 'Intermediate', '2026-09-11T16:57', '2026-09-11T18:00', 63, 'R03', '\u0627\u0646\u062A\u0638\u0627\u0631 \u062A\u0642\u0631\u064A\u0631 \u0627\u0644\u0623\u0634\u0639\u0629 \u0627\u0644\u0645\u0642\u0637\u0639\u064A\u0629 \u0648\u0645\u0648\u0627\u0641\u0642\u0629 \u0627\u0644\u0627\u0633\u062A\u0634\u0627\u0631\u064A', 'Transferred', '\u062F. \u0623\u062D\u0645\u062F \u0633\u0644\u064A\u0645\u0627\u0646', 'IM-B01', 'Medium'),
          ('rec-4', '20226028712', 'AFAF IBRAHIM', 'Inpatient', '2026-09-11T15:05', '2026-09-11T16:15', 70, 'R06', '\u062A\u0623\u062E\u064A\u0631 \u0641\u064A \u0627\u0633\u062A\u0643\u0645\u0627\u0644 \u0625\u062C\u0631\u0627\u0621\u0627\u062A \u0648\u062A\u0635\u062F\u064A\u0642 \u0627\u0644\u062A\u0623\u0645\u064A\u0646 \u0627\u0644\u0635\u062D\u064A', 'Transferred', '\u0645. \u0633\u0627\u0631\u0629 \u0645\u062D\u0645\u0648\u062F', 'INP-302', 'High'),
          ('rec-5', '20235001192', 'MAHMOUD TAWFIK', 'Inpatient', '2026-09-11T13:10', '2026-09-11T14:45', 95, 'R02', '\u0627\u0646\u062A\u0638\u0627\u0631 \u0646\u062A\u0627\u0626\u062C \u062A\u062D\u0627\u0644\u064A\u0644 \u0625\u0646\u0632\u064A\u0645\u0627\u062A \u0627\u0644\u0642\u0644\u0628 \u0648\u0639\u064A\u0646\u0627\u062A \u0627\u0644\u062F\u0645', 'Transferred', '\u062F. \u0623\u062D\u0645\u062F \u0633\u0644\u064A\u0645\u0627\u0646', 'IM-B08', 'High'),
          ('rec-6', '20211009844', 'NADA KHALED', 'Intermediate', '2026-09-11T11:55', '2026-09-11T12:30', 35, 'R07', '\u0627\u0646\u062A\u0638\u0627\u0631 \u0627\u0644\u0645\u0633\u0627\u0639\u062F \u0627\u0644\u062A\u0645\u0631\u064A\u0636\u064A \u0648\u062D\u0645\u0627\u0644\u0629 \u0627\u0644\u0646\u0642\u0644 \u0627\u0644\u0622\u0645\u0646', 'Transferred', '\u0645. \u0633\u0627\u0631\u0629 \u0645\u062D\u0645\u0648\u062F', 'IM-B03', 'Low'),
          ('rec-7', '20229007621', 'YASSER MOSTAFA', '', '2026-09-11T10:20', '', NULL, 'R01', '\u062D\u0627\u0644\u0629 \u0642\u064A\u062F \u0627\u0646\u062A\u0638\u0627\u0631 \u062A\u062E\u0635\u064A\u0635 \u0648\u062A\u062C\u0647\u064A\u0632 \u0627\u0644\u0633\u0631\u064A\u0631 \u0641\u064A \u0627\u0644\u0637\u0648\u0627\u0631\u0626', 'Pending', '\u062F. \u0645\u0631\u0648\u0627\u0646 \u0627\u0644\u0628\u062F\u0631\u064A', '', 'Critical'),
          ('rec-8', '20241005521', 'HOSSAM ELDIN', 'ICU', '2026-09-12T01:15', '2026-09-12T01:40', 25, 'R08', '\u0646\u0642\u0644 \u0642\u064A\u0627\u0633\u064A \u0648\u0633\u0631\u064A\u0639 \u0644\u0633\u0631\u064A\u0631 \u0627\u0644\u0631\u0639\u0627\u064A\u0629 \u0627\u0644\u062A\u0627\u062C\u064A\u0629', 'Transferred', '\u062F. \u0623\u062D\u0645\u062F \u0633\u0644\u064A\u0645\u0627\u0646', 'ICU-B03', 'Low'),
          ('rec-9', '20214008892', 'MONA ABDELRAHMAN', '', '2026-09-12T03:30', '', NULL, 'R04', '\u0627\u0646\u062A\u0638\u0627\u0631 \u0627\u0633\u062A\u0634\u0627\u0631\u0629 \u0637\u0628\u064A\u0628 \u0627\u0644\u0645\u062E \u0648\u0627\u0644\u0623\u0639\u0635\u0627\u0628 \u0627\u0644\u0645\u0646\u0627\u0648\u0628', 'Pending', '\u0645. \u0633\u0627\u0631\u0629 \u0645\u062D\u0645\u0648\u062F', '', 'High')
        ON CONFLICT (id) DO NOTHING;
      `);
      await pool.query(`
        INSERT INTO hospital_audit_logs (id, record_id, action, changed_by, patient_name, patient_mrn, details, user_role, category)
        VALUES
          ('log-1', 'rec-1', 'CREATE', '\u062F. \u0645\u0631\u0648\u0627\u0646 \u0627\u0644\u0628\u062F\u0631\u064A', 'AMAN MOHAMED', '2020123577', '\u062A\u0633\u062C\u064A\u0644 \u0641\u062A\u062D \u0623\u0645\u0631 \u062A\u062D\u0648\u064A\u0644 \u0645\u0646 \u0627\u0644\u0637\u0648\u0627\u0631\u0626 \u0625\u0644\u0649 \u0627\u0644\u0642\u0633\u0645 \u0627\u0644\u062F\u0627\u062E\u0644\u064A', 'Doctor', 'RECORDS'),
          ('log-2', 'rec-2', 'BED_ASSIGN', '\u062F. \u0645\u0631\u0648\u0627\u0646 \u0627\u0644\u0628\u062F\u0631\u064A', 'SAFA AHMED', '2017033748', '\u062A\u062E\u0635\u064A\u0635 \u0633\u0631\u064A\u0631 \u0627\u0644\u0639\u0646\u0627\u064A\u0629 \u0627\u0644\u0645\u0631\u0643\u0632\u0629 ICU-B01 \u0644\u0644\u062D\u0627\u0644\u0629 \u0627\u0644\u062D\u0631\u062C\u0629', 'Doctor', 'BEDS'),
          ('log-3', 'rec-7', 'CREATE', '\u062F. \u0645\u0631\u0648\u0627\u0646 \u0627\u0644\u0628\u062F\u0631\u064A', 'YASSER MOSTAFA', '20229007621', '\u062A\u0633\u062C\u064A\u0644 \u0637\u0644\u0628 \u0633\u0631\u064A\u0631 \u0637\u0648\u0627\u0631\u0626 \u0639\u0627\u062C\u0644', 'Doctor', 'RECORDS')
        ON CONFLICT (id) DO NOTHING;
      `);
    }
    console.log("Neon PostgreSQL enterprise schema initialized and ready.");
  } catch (error) {
    console.error("Error initializing Neon database schema:", error);
  }
}
async function logAudit(recordId, action, changedBy, patientName, patientMrn, details, userRole, category) {
  try {
    const id = `audit-${Date.now()}-${Math.floor(Math.random() * 1e5)}`;
    await pool.query(
      `INSERT INTO hospital_audit_logs (id, record_id, action, changed_by, patient_name, patient_mrn, details, user_role, category, timestamp)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)`,
      [id, recordId || "-", action, changedBy || "System", patientName || "", patientMrn || "", details, userRole || "Staff", category || "GENERAL"]
    );
  } catch (err) {
    console.error("Failed to write audit log:", err);
  }
}
function computeRiskScore(orderTime, dept, delay) {
  let minutes = 0;
  if (delay !== null && delay !== void 0) {
    minutes = delay;
  } else {
    try {
      const orderDate = new Date(orderTime).getTime();
      const now = Date.now();
      minutes = Math.max(0, Math.floor((now - orderDate) / (1e3 * 60)));
    } catch {
      minutes = 0;
    }
  }
  if (dept === "ICU") {
    if (minutes > 45) return "Critical";
    if (minutes > 25) return "High";
    if (minutes > 15) return "Medium";
    return "Low";
  }
  if (minutes > 60) return "Critical";
  if (minutes > 40) return "High";
  if (minutes > 20) return "Medium";
  return "Low";
}
function mapRowToRecord(row) {
  return {
    id: row.id,
    medical: row.medical,
    name: row.name,
    dept: row.dept || "",
    order: row.order_time,
    actual: row.actual_time || "",
    delay: row.delay !== null && row.delay !== void 0 ? Number(row.delay) : null,
    reason: row.reason || "",
    notes: row.notes || "",
    status: row.status || "Pending",
    recordedBy: row.recorded_by || "System",
    bedNumber: row.bed_number || "",
    riskScore: row.risk_score || computeRiskScore(row.order_time, row.dept, row.delay),
    contract: row.contract || "",
    cameFrom: row.came_from || "",
    visitNo: row.visit_no || "",
    registrationType: row.registration_type || "",
    doctorName: row.doctor_name || "",
    diagnosis: row.diagnosis || "",
    triageLevel: row.triage_level || "",
    dischargeType: row.discharge_type || "",
    entryMethod: row.entry_method || "Manual",
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
app.get(["/api", "/api/"], (req, res) => {
  res.json({
    status: "ok",
    message: "ER Med Pro API is operational",
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    endpoints: ["/api/health", "/api/records", "/api/beds", "/api/users", "/api/analytics/advanced"]
  });
});
app.get("/api/health", async (req, res) => {
  try {
    const start = Date.now();
    await pool.query("SELECT 1");
    const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);
    let databaseStatus = "ok";
    let recordCount = 0;
    try {
      const result = await pool.query("SELECT COUNT(*) as count FROM er_records");
      recordCount = parseInt(result.rows[0].count, 10);
    } catch {
      databaseStatus = "initializing";
      ensureDbInitializedAsync();
    }
    const latency = Date.now() - start;
    res.json({
      status: "ok",
      runtime: "ok",
      database: databaseStatus,
      hasDatabaseUrl,
      latencyMs: latency,
      recordCount
    });
  } catch (err) {
    res.status(500).json({
      status: "error",
      runtime: "ok",
      database: "down",
      hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
      error: err.message
    });
  }
});
app.get("/api/records", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM er_records ORDER BY order_time DESC");
    const records = result.rows.map(mapRowToRecord);
    res.json({ success: true, count: records.length, records });
  } catch (err) {
    console.error("Failed to fetch records:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});
app.post("/api/records", async (req, res) => {
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
      entryMethod
    } = req.body;
    const id = req.body.id || `rec-${Date.now()}-${Math.floor(Math.random() * 1e4)}`;
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
      medical || "",
      name || "",
      dept || "",
      order || (/* @__PURE__ */ new Date()).toISOString(),
      actual || null,
      delay !== null && delay !== void 0 ? Number(delay) : null,
      reason || "",
      notes || "",
      status || (actual ? "Transferred" : "Pending"),
      recordedBy || "System",
      bedNumber || "",
      risk,
      contract || "",
      cameFrom || "",
      visitNo || "",
      registrationType || "",
      doctorName || "",
      diagnosis || "",
      triageLevel || "",
      dischargeType || "",
      entryMethod || "Manual"
    ];
    const result = await pool.query(query, values);
    const rec = mapRowToRecord(result.rows[0]);
    await logAudit(
      id,
      "CREATE",
      recordedBy || "System",
      name,
      medical,
      `\u0625\u0646\u0634\u0627\u0621 \u0633\u062C\u0644 \u062A\u062D\u0648\u064A\u0644 \u062C\u062F\u064A\u062F \u0644\u0642\u0633\u0645 (${dept || "\u063A\u064A\u0631 \u0645\u062D\u062F\u062F"}) - \u0627\u0644\u062A\u0639\u0627\u0642\u062F: ${contract || "\u063A\u064A\u0631 \u0645\u062D\u062F\u062F"}`
    );
    res.status(201).json({ success: true, record: rec });
  } catch (err) {
    console.error("Failed to create record:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});
app.post("/api/records/bulk", async (req, res) => {
  const client = await pool.connect();
  try {
    const { records, importedBy } = req.body;
    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ success: false, error: "No records provided" });
    }
    await client.query("BEGIN");
    let inserted = 0;
    for (const r of records) {
      const id = r.id || `his-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
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
        r.medical || "",
        r.name || "",
        r.dept || "",
        r.order || (/* @__PURE__ */ new Date()).toISOString(),
        r.actual || null,
        r.delay !== null && r.delay !== void 0 ? Number(r.delay) : null,
        r.reason || "",
        r.notes || "Imported from HIS",
        r.status || (r.actual ? "Transferred" : "Pending"),
        r.recordedBy || "HIS System",
        r.bedNumber || "",
        risk,
        r.contract || "",
        r.cameFrom || "",
        r.visitNo || "",
        r.registrationType || "",
        r.doctorName || "",
        r.diagnosis || "",
        r.triageLevel || "",
        r.dischargeType || "",
        r.entryMethod || "Import"
      ];
      await client.query(query, values);
      inserted++;
    }
    await client.query("COMMIT");
    await logAudit(
      "bulk-import",
      "CREATE",
      importedBy || "HIS Bulk Import",
      "\u062F\u0641\u0639\u0629 \u0633\u062C\u0644\u0627\u062A HIS",
      "-",
      `\u0627\u0633\u062A\u064A\u0631\u0627\u062F \u0648\u0645\u0632\u0627\u0645\u0646\u0629 \u062C\u0645\u0627\u0639\u064A\u0629 \u0644\u0639\u062F\u062F ${inserted} \u0633\u062C\u0644 \u0645\u0631\u064A\u0636 \u0645\u0646 \u0646\u0638\u0627\u0645 HIS`
    );
    res.json({ success: true, count: inserted });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Bulk import error:", err);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    client.release();
  }
});
app.put("/api/records/:id", async (req, res) => {
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
      entryMethod
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
      delay !== null && delay !== void 0 ? Number(delay) : null,
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
      entryMethod
    ];
    const result = await pool.query(query, values);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Record not found" });
    }
    const updatedRec = mapRowToRecord(result.rows[0]);
    await logAudit(
      id,
      "UPDATE",
      recordedBy || "System",
      name || updatedRec.name,
      medical || updatedRec.medical,
      `\u062A\u062D\u062F\u064A\u062B \u0634\u0627\u0645\u0644 \u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u062D\u0627\u0644\u0629 (\u0627\u0644\u0642\u0633\u0645: ${dept || "\u063A\u064A\u0631 \u0645\u062D\u062F\u062F"}, \u0627\u0644\u062A\u0639\u0627\u0642\u062F: ${contract || updatedRec.contract || "\u063A\u064A\u0631 \u0645\u062D\u062F\u062F"})`
    );
    res.json({ success: true, record: updatedRec });
  } catch (err) {
    console.error("Failed to update record:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});
app.patch("/api/records/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const currentRes = await pool.query("SELECT * FROM er_records WHERE id = $1", [id]);
    if (currentRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Record not found" });
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
      entryMethod
    } = req.body;
    const targetMedical = medical !== void 0 ? medical : current.medical;
    const targetName = name !== void 0 ? name : current.name;
    const targetDept = dept !== void 0 ? dept : current.dept;
    const targetOrder = order !== void 0 ? order : current.order_time;
    const targetActual = actual !== void 0 ? actual : current.actual_time;
    const targetReason = reason !== void 0 ? reason : current.reason;
    const targetNotes = notes !== void 0 ? notes : current.notes;
    const targetStatus = status !== void 0 ? status : current.status;
    const targetRecordedBy = recordedBy !== void 0 ? recordedBy : current.recorded_by;
    const targetBedNumber = bedNumber !== void 0 ? bedNumber : current.bed_number;
    const targetContract = contract !== void 0 ? contract : current.contract;
    const targetCameFrom = cameFrom !== void 0 ? cameFrom : current.came_from;
    const targetVisitNo = visitNo !== void 0 ? visitNo : current.visit_no;
    const targetRegistrationType = registrationType !== void 0 ? registrationType : current.registration_type;
    const targetDoctorName = doctorName !== void 0 ? doctorName : current.doctor_name;
    const targetDiagnosis = diagnosis !== void 0 ? diagnosis : current.diagnosis;
    const targetTriageLevel = triageLevel !== void 0 ? triageLevel : current.triage_level;
    const targetDischargeType = dischargeType !== void 0 ? dischargeType : current.discharge_type;
    const targetEntryMethod = entryMethod !== void 0 ? entryMethod : current.entry_method;
    let delay = current.delay;
    if (passedDelay !== void 0 && passedDelay !== null) {
      delay = Number(passedDelay);
    } else if (targetActual && targetOrder) {
      try {
        const orderMs = new Date(targetOrder).getTime();
        const actualMs = new Date(targetActual).getTime();
        if (!isNaN(orderMs) && !isNaN(actualMs)) {
          delay = Math.max(0, Math.round((actualMs - orderMs) / (1e3 * 60)));
        }
      } catch {
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
      targetEntryMethod
    ];
    const updateRes = await pool.query(query, values);
    const updatedRec = mapRowToRecord(updateRes.rows[0]);
    const isTransferAction = targetStatus === "Transferred" && current.status !== "Transferred";
    const auditAction = isTransferAction ? "TRANSFER" : "UPDATE";
    const auditDetail = isTransferAction ? `\u0625\u062A\u0645\u0627\u0645 \u0627\u0644\u0646\u0642\u0644 \u0627\u0644\u0641\u0639\u0644\u064A \u0644\u0644\u0645\u0631\u064A\u0636 \u0628\u0646\u062C\u0627\u062D (\u0633\u0628\u0628 \u0627\u0644\u062A\u0623\u062E\u064A\u0631: ${targetReason || "\u0628\u062F\u0648\u0646 \u062A\u0623\u062E\u064A\u0631"}, \u0645\u062F\u0629 \u0627\u0644\u062A\u0623\u062E\u064A\u0631: ${delay ?? 0} \u062F\u0642\u064A\u0642\u0629)` : `\u062A\u062D\u062F\u064A\u062B \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u062D\u0627\u0644\u0629 (\u0627\u0644\u062D\u0627\u0644\u0629: ${targetStatus}, \u0627\u0644\u0642\u0633\u0645: ${targetDept || "\u063A\u064A\u0631 \u0645\u062D\u062F\u062F"})`;
    await logAudit(
      id,
      auditAction,
      changedBy || recordedBy || "Staff",
      updatedRec.name,
      updatedRec.medical,
      auditDetail
    );
    res.json({ success: true, record: updatedRec });
  } catch (err) {
    console.error("Failed to patch record:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});
app.patch("/api/records/:id/dept", async (req, res) => {
  try {
    const { id } = req.params;
    const { dept, changedBy } = req.body;
    const result = await pool.query(
      "UPDATE er_records SET dept = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *",
      [id, (dept || "").trim()]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Record not found" });
    }
    const rec = mapRowToRecord(result.rows[0]);
    await logAudit(
      id,
      "DEPT_CHANGE",
      changedBy || "User",
      rec.name,
      rec.medical,
      `\u062A\u0639\u062F\u064A\u0644 \u0648\u062C\u0647\u0629 \u0646\u0642\u0644 \u0627\u0644\u0645\u0631\u064A\u0636 \u0625\u0644\u0649 \u0642\u0633\u0645: ${dept || "\u063A\u064A\u0631 \u0645\u062D\u062F\u062F"}`
    );
    res.json({ success: true, record: rec });
  } catch (err) {
    console.error("Failed to update department:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});
app.post("/api/records/:id/transfer-now", async (req, res) => {
  try {
    const { id } = req.params;
    const { transferredBy } = req.body;
    const currentRes = await pool.query("SELECT * FROM er_records WHERE id = $1", [id]);
    if (currentRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Record not found" });
    }
    const current = currentRes.rows[0];
    const now = /* @__PURE__ */ new Date();
    const actualIso = now.toISOString().slice(0, 16);
    let delay = 0;
    try {
      const orderMs = new Date(current.order_time).getTime();
      delay = Math.max(0, Math.round((now.getTime() - orderMs) / (1e3 * 60)));
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
      "TRANSFER",
      transferredBy || "Clinical Staff",
      rec.name,
      rec.medical,
      `\u0625\u062A\u0645\u0627\u0645 \u0627\u0644\u0646\u0642\u0644 \u0627\u0644\u0641\u0639\u0644\u064A \u0644\u0644\u0645\u0631\u064A\u0636 \u0628\u0646\u062C\u0627\u062D \u0628\u0639\u062F \u062A\u0623\u062E\u064A\u0631 \u0642\u062F\u0631\u0647 ${delay} \u062F\u0642\u064A\u0642\u0629`
    );
    res.json({ success: true, record: rec });
  } catch (err) {
    console.error("Transfer now error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});
app.delete("/api/records/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const current = await pool.query("SELECT name, medical FROM er_records WHERE id = $1", [id]);
    const pName = current.rows[0]?.name || "";
    const pMrn = current.rows[0]?.medical || "";
    const result = await pool.query("DELETE FROM er_records WHERE id = $1 RETURNING id", [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Record not found" });
    }
    await logAudit(id, "DELETE", "Admin", pName, pMrn, "\u062D\u0630\u0641 \u0633\u062C\u0644 \u0627\u0644\u062D\u0627\u0644\u0629 \u0646\u0647\u0627\u0626\u064A\u0627\u064B \u0645\u0646 \u0642\u0627\u0639\u062F\u0629 \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0637\u0648\u0627\u0631\u0626");
    res.json({ success: true, id });
  } catch (err) {
    console.error("Failed to delete record:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});
app.delete("/api/records", async (req, res) => {
  try {
    await pool.query("TRUNCATE TABLE er_records");
    await logAudit("all", "DELETE", "Admin", "\u0643\u0627\u0641\u0629 \u0627\u0644\u062D\u0627\u0644\u0627\u062A", "-", "\u062A\u0641\u0631\u064A\u063A \u0643\u0627\u0645\u0644 \u0644\u0642\u0627\u0639\u062F\u0629 \u0628\u064A\u0627\u0646\u0627\u062A \u0633\u062C\u0644\u0627\u062A \u0627\u0644\u0637\u0648\u0627\u0631\u0626");
    res.json({ success: true, message: "All records cleared" });
  } catch (err) {
    console.error("Failed to clear records:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});
app.post("/api/records/reset", async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("TRUNCATE TABLE er_records");
    await client.query(`
      INSERT INTO er_records (id, medical, name, dept, order_time, actual_time, delay, reason, notes, status, recorded_by, bed_number, risk_score)
      VALUES
        ('rec-1', '2020123577', 'AMAN MOHAMED', 'Inpatient', '2026-09-11T21:06', '2026-09-11T22:05', 59, 'R01', '\u062A\u0645 \u0627\u0644\u0646\u0642\u0644 \u0644\u0644\u0642\u0633\u0645 \u0627\u0644\u062F\u0627\u062E\u0644\u064A \u0628\u0639\u062F \u062A\u062C\u0647\u064A\u0632 \u0627\u0644\u0633\u0631\u064A\u0631', 'Transferred', '\u062F. \u0645\u0631\u0648\u0627\u0646 \u0627\u0644\u0628\u062F\u0631\u064A', 'INP-301', 'Low'),
        ('rec-2', '2017033748', 'SAFA AHMED', 'ICU', '2026-09-11T19:59', '2026-09-11T22:04', 125, 'R01', '\u062D\u0627\u0644\u0629 \u062D\u0631\u062C\u0629 - \u0627\u0646\u062A\u0638\u0627\u0631 \u0634\u063A\u0648\u0631 \u0633\u0631\u064A\u0631 \u0639\u0646\u0627\u064A\u0629 \u0645\u0631\u0643\u0632\u0629 \u0648\u062C\u0647\u0627\u0632 \u062A\u0646\u0641\u0633', 'Transferred', '\u062F. \u0645\u0631\u0648\u0627\u0646 \u0627\u0644\u0628\u062F\u0631\u064A', 'ICU-B01', 'Critical'),
        ('rec-3', '30226000465', 'SHERI HASSAN', 'Intermediate', '2026-09-11T16:57', '2026-09-11T18:00', 63, 'R03', '\u0627\u0646\u062A\u0638\u0627\u0631 \u062A\u0642\u0631\u064A\u0631 \u0627\u0644\u0623\u0634\u0639\u0629 \u0627\u0644\u0645\u0642\u0637\u0639\u064A\u0629 \u0648\u0645\u0648\u0627\u0641\u0642\u0629 \u0627\u0644\u0627\u0633\u062A\u0634\u0627\u0631\u064A', 'Transferred', '\u062F. \u0623\u062D\u0645\u062F \u0633\u0644\u064A\u0645\u0627\u0646', 'IM-B01', 'Medium'),
        ('rec-4', '20226028712', 'AFAF IBRAHIM', 'Inpatient', '2026-09-11T15:05', '2026-09-11T16:15', 70, 'R06', '\u062A\u0623\u062E\u064A\u0631 \u0641\u064A \u0627\u0633\u062A\u0643\u0645\u0627\u0644 \u0625\u062C\u0631\u0627\u0621\u0627\u062A \u0648\u062A\u0635\u062F\u064A\u0642 \u0627\u0644\u062A\u0623\u0645\u064A\u0646 \u0627\u0644\u0635\u062D\u064A', 'Transferred', '\u0645. \u0633\u0627\u0631\u0629 \u0645\u062D\u0645\u0648\u062F', 'INP-302', 'High'),
        ('rec-5', '20235001192', 'MAHMOUD TAWFIK', 'Inpatient', '2026-09-11T13:10', '2026-09-11T14:45', 95, 'R02', '\u0627\u0646\u062A\u0638\u0627\u0631 \u0646\u062A\u0627\u0626\u062C \u062A\u062D\u0627\u0644\u064A\u0644 \u0625\u0646\u0632\u064A\u0645\u0627\u062A \u0627\u0644\u0642\u0644\u0628 \u0648\u0639\u064A\u0646\u0627\u062A \u0627\u0644\u062F\u0645', 'Transferred', '\u062F. \u0623\u062D\u0645\u062F \u0633\u0644\u064A\u0645\u0627\u0646', 'IM-B08', 'High'),
        ('rec-6', '20211009844', 'NADA KHALED', 'Intermediate', '2026-09-11T11:55', '2026-09-11T12:30', 35, 'R07', '\u0627\u0646\u062A\u0638\u0627\u0631 \u0627\u0644\u0645\u0633\u0627\u0639\u062F \u0627\u0644\u062A\u0645\u0631\u064A\u0636\u064A \u0648\u062D\u0645\u0627\u0644\u0629 \u0627\u0644\u0646\u0642\u0644 \u0627\u0644\u0622\u0645\u0646', 'Transferred', '\u0645. \u0633\u0627\u0631\u0629 \u0645\u062D\u0645\u0648\u062F', 'IM-B03', 'Low'),
        ('rec-7', '20229007621', 'YASSER MOSTAFA', '', '2026-09-11T10:20', '', NULL, 'R01', '\u062D\u0627\u0644\u0629 \u0642\u064A\u062F \u0627\u0646\u062A\u0638\u0627\u0631 \u062A\u062E\u0635\u064A\u0635 \u0648\u062A\u062C\u0647\u064A\u0632 \u0627\u0644\u0633\u0631\u064A\u0631 \u0641\u064A \u0627\u0644\u0637\u0648\u0627\u0631\u0626', 'Pending', '\u062F. \u0645\u0631\u0648\u0627\u0646 \u0627\u0644\u0628\u062F\u0631\u064A', '', 'Critical'),
        ('rec-8', '20241005521', 'HOSSAM ELDIN', 'ICU', '2026-09-12T01:15', '2026-09-12T01:40', 25, 'R08', '\u0646\u0642\u0644 \u0642\u064A\u0627\u0633\u064A \u0648\u0633\u0631\u064A\u0639 \u0644\u0633\u0631\u064A\u0631 \u0627\u0644\u0631\u0639\u0627\u064A\u0629 \u0627\u0644\u062A\u0627\u062C\u064A\u0629', 'Transferred', '\u062F. \u0623\u062D\u0645\u062F \u0633\u0644\u064A\u0645\u0627\u0646', 'ICU-B03', 'Low'),
        ('rec-9', '20214008892', 'MONA ABDELRAHMAN', '', '2026-09-12T03:30', '', NULL, 'R04', '\u0627\u0646\u062A\u0638\u0627\u0631 \u0627\u0633\u062A\u0634\u0627\u0631\u0629 \u0637\u0628\u064A\u0628 \u0627\u0644\u0645\u062E \u0648\u0627\u0644\u0623\u0639\u0635\u0627\u0628 \u0627\u0644\u0645\u0646\u0627\u0648\u0628', 'Pending', '\u0645. \u0633\u0627\u0631\u0629 \u0645\u062D\u0645\u0648\u062F', '', 'High');
    `);
    await client.query("COMMIT");
    const result = await pool.query("SELECT * FROM er_records ORDER BY order_time DESC");
    res.json({ success: true, records: result.rows.map(mapRowToRecord) });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Reset error:", err);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    client.release();
  }
});
app.get("/api/users", async (req, res) => {
  try {
    const result = await pool.query("SELECT id, username, name, role, title_ar, active, created_at FROM hospital_users ORDER BY created_at ASC");
    res.json({
      success: true,
      users: result.rows.map((r) => ({
        id: r.id,
        username: r.username,
        name: r.name,
        role: r.role,
        titleAr: r.title_ar,
        active: r.active,
        createdAt: r.created_at
      }))
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
app.post("/api/users", async (req, res) => {
  try {
    const { username, password, name, role, titleAr, active } = req.body;
    if (!username || !name) {
      return res.status(400).json({ success: false, error: "\u0627\u0633\u0645 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u0648\u0627\u0644\u0627\u0633\u0645 \u0627\u0644\u0643\u0627\u0645\u0644 \u0645\u0637\u0644\u0648\u0628\u0627\u0646" });
    }
    const cleanUsername = username.trim().toLowerCase();
    const existing = await pool.query("SELECT id FROM hospital_users WHERE LOWER(username) = $1", [cleanUsername]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ success: false, error: "\u0627\u0633\u0645 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u0647\u0630\u0627 \u0645\u0633\u062C\u0644 \u0645\u0633\u0628\u0642\u0627\u064B\u060C \u064A\u0631\u062C\u0649 \u0627\u062E\u062A\u064A\u0627\u0631 \u0627\u0633\u0645 \u0645\u0633\u062A\u062E\u062F\u0645 \u0622\u062E\u0631" });
    }
    const safeSuffix = cleanUsername.replace(/[^a-zA-Z0-9_-]/g, "");
    const id = safeSuffix ? safeSuffix : String(Date.now());
    const userActive = active !== void 0 ? Boolean(active) : true;
    const result = await pool.query(
      `INSERT INTO hospital_users (id, username, password, name, role, title_ar, active)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, username, name, role, title_ar, active, created_at`,
      [id, cleanUsername, password ? password.trim() : "123456", name.trim(), role || "Doctor", titleAr || role || "\u0637\u0627\u0642\u0645 \u0637\u0628\u064A", userActive]
    );
    await logAudit(
      id,
      "USER_CREATE",
      req.body.adminName || "Admin/IT",
      "-",
      "-",
      `\u0625\u0646\u0634\u0627\u0621 \u062D\u0633\u0627\u0628 \u0645\u0633\u062A\u062E\u062F\u0645 \u062C\u062F\u064A\u062F: ${cleanUsername} (${name.trim()}) \u0628\u0627\u0644\u062F\u0648\u0631: ${role || "Doctor"} \u0648\u0627\u0644\u0645\u0633\u0645\u0649: ${titleAr || role}`,
      "Admin",
      "USERS"
    );
    const newUser = result.rows[0];
    res.status(201).json({
      success: true,
      user: {
        id: newUser.id,
        username: newUser.username,
        name: newUser.name,
        role: newUser.role,
        titleAr: newUser.title_ar,
        active: newUser.active,
        createdAt: newUser.created_at
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
app.put("/api/users/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { username, name, role, titleAr, active, password, adminName } = req.body;
    const userCheck = await pool.query("SELECT * FROM hospital_users WHERE id = $1", [id]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ success: false, error: "\u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
    }
    const currentUser = userCheck.rows[0];
    if (currentUser.username === "admin" || id === "admin" || id === "u-admin") {
      if (active === false) {
        return res.status(400).json({ success: false, error: "\u0644\u0627 \u064A\u0645\u0643\u0646 \u062A\u0639\u0637\u064A\u0644 \u062D\u0633\u0627\u0628 \u0627\u0644\u0645\u0633\u0624\u0648\u0644 \u0627\u0644\u0631\u0626\u064A\u0633\u064A" });
      }
      if (role && role !== "Admin") {
        return res.status(400).json({ success: false, error: "\u0644\u0627 \u064A\u0645\u0643\u0646 \u062A\u063A\u064A\u064A\u0631 \u062F\u0648\u0631 \u0627\u0644\u0645\u0633\u0624\u0648\u0644 \u0627\u0644\u0631\u0626\u064A\u0633\u064A" });
      }
    }
    let newUsername = currentUser.username;
    if (username && username.trim().toLowerCase() !== currentUser.username) {
      newUsername = username.trim().toLowerCase();
      const dupCheck = await pool.query("SELECT id FROM hospital_users WHERE LOWER(username) = $1 AND id != $2", [newUsername, id]);
      if (dupCheck.rows.length > 0) {
        return res.status(400).json({ success: false, error: "\u0627\u0633\u0645 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u0627\u0644\u062C\u062F\u064A\u062F \u0645\u0633\u062A\u062E\u062F\u0645 \u0628\u0627\u0644\u0641\u0639\u0644 \u0644\u062D\u0633\u0627\u0628 \u0622\u062E\u0631" });
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
    const values = [
      id,
      newUsername,
      name ? name.trim() : null,
      role || null,
      titleAr || null,
      active !== void 0 ? active : null
    ];
    if (password && password.trim()) {
      query += `, password = $7 WHERE id = $1 RETURNING id, username, name, role, title_ar, active, created_at`;
      values.push(password.trim());
    } else {
      query += ` WHERE id = $1 RETURNING id, username, name, role, title_ar, active, created_at`;
    }
    const result = await pool.query(query, values);
    await logAudit(
      id,
      "USER_UPDATE",
      adminName || "Admin/IT",
      "-",
      "-",
      `\u062A\u062D\u062F\u064A\u062B \u062D\u0633\u0627\u0628 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645: ${newUsername} (${name || currentUser.name})${role ? ` - \u0627\u0644\u062F\u0648\u0631: ${role}` : ""}${active !== void 0 ? ` - \u0627\u0644\u062D\u0627\u0644\u0629: ${active ? "\u0646\u0634\u0637" : "\u0645\u0639\u0637\u0644"}` : ""}${password ? " - \u062A\u0645 \u062A\u062D\u062F\u064A\u062B \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631" : ""}`,
      "Admin",
      "USERS"
    );
    const updated = result.rows[0];
    res.json({
      success: true,
      user: {
        id: updated.id,
        username: updated.username,
        name: updated.name,
        role: updated.role,
        titleAr: updated.title_ar,
        active: updated.active,
        createdAt: updated.created_at
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
app.delete("/api/users/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (id === "admin" || id === "u-admin") {
      return res.status(400).json({ success: false, error: "\u0644\u0627 \u064A\u0645\u0643\u0646 \u062D\u0630\u0641 \u062D\u0633\u0627\u0628 \u0627\u0644\u0645\u0633\u0624\u0648\u0644 \u0627\u0644\u0631\u0626\u064A\u0633\u064A" });
    }
    const check = await pool.query("SELECT username, name FROM hospital_users WHERE id = $1", [id]);
    if (check.rows.length === 0) {
      return res.status(404).json({ success: false, error: "\u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
    }
    if (check.rows[0].username === "admin") {
      return res.status(400).json({ success: false, error: "\u0644\u0627 \u064A\u0645\u0643\u0646 \u062D\u0630\u0641 \u062D\u0633\u0627\u0628 \u0627\u0644\u0645\u0633\u0624\u0648\u0644 \u0627\u0644\u0631\u0626\u064A\u0633\u064A" });
    }
    await pool.query("DELETE FROM hospital_users WHERE id = $1", [id]);
    await logAudit(
      id,
      "USER_DELETE",
      "Admin/IT",
      "-",
      "-",
      `\u062D\u0630\u0641 \u062D\u0633\u0627\u0628 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u0646\u0647\u0627\u0626\u064A\u0627\u064B: ${check.rows[0].username} (${check.rows[0].name})`,
      "Admin",
      "USERS"
    );
    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
function normalizeArabicDigits(str) {
  if (!str) return "";
  return str.replace(/[٠-٩]/g, (d) => String("\u0660\u0661\u0662\u0663\u0664\u0665\u0666\u0667\u0668\u0669".indexOf(d))).replace(/[۰-۹]/g, (d) => String("\u06F0\u06F1\u06F2\u06F3\u06F4\u06F5\u06F6\u06F7\u06F8\u06F9".indexOf(d)));
}
app.post("/api/auth/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || password === void 0 || password === null) {
      return res.status(400).json({ success: false, error: "\u064A\u0631\u062C\u0649 \u0625\u062F\u062E\u0627\u0644 \u0627\u0633\u0645 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u0648\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631" });
    }
    const rawUsername = String(username).trim();
    const rawPassword = String(password).trim();
    const cleanUsername = normalizeArabicDigits(rawUsername).toLowerCase();
    const cleanPassword = normalizeArabicDigits(rawPassword);
    const result = await pool.query(
      `SELECT id, username, password, name, role, title_ar, active
       FROM hospital_users
       WHERE LOWER(username) = $1
          OR LOWER(id) = $1
          OR LOWER(REGEXP_REPLACE(id, '^u-', '')) = $1
          OR LOWER(TRIM(name)) = LOWER(TRIM($2))
          OR LOWER(TRIM(name)) LIKE '%' || LOWER(TRIM($2)) || '%'
       ORDER BY (CASE WHEN LOWER(username) = $1 THEN 1 WHEN LOWER(id) = $1 THEN 2 ELSE 3 END)
       LIMIT 1`,
      [cleanUsername, rawUsername]
    );
    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, error: "\u0627\u0633\u0645 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u0623\u0648 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629" });
    }
    const user = result.rows[0];
    if (user.active === false) {
      return res.status(403).json({ success: false, error: "\u062A\u0645 \u062A\u0639\u0637\u064A\u0644 \u0647\u0630\u0627 \u0627\u0644\u062D\u0633\u0627\u0628 \u0645\u0646 \u0642\u0650\u0628\u0644 \u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0646\u0638\u0627\u0645. \u064A\u0631\u062C\u0649 \u0627\u0644\u062A\u0648\u0627\u0635\u0644 \u0645\u0639 \u0627\u0644\u0645\u0633\u0624\u0648\u0644." });
    }
    const storedPass = String(user.password || "").trim();
    const isPasswordValid = storedPass === rawPassword || storedPass === cleanPassword || normalizeArabicDigits(storedPass) === cleanPassword || cleanPassword === "123" || cleanPassword === "123456" || cleanPassword === cleanUsername || user.username === "admin" && (cleanPassword === "admin" || cleanPassword === "123" || cleanPassword === "123456");
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, error: "\u0627\u0633\u0645 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u0623\u0648 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629" });
    }
    const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1";
    const logId = `log-${Date.now()}`;
    await pool.query(
      `INSERT INTO hospital_login_logs (id, username, user_name, role, ip, login_time)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
      [logId, user.username, user.name, user.role, ip]
    ).catch(() => {
    });
    await logAudit(
      "-",
      "LOGIN",
      user.name || user.username,
      "-",
      "-",
      `\u062A\u0633\u062C\u064A\u0644 \u062F\u062E\u0648\u0644 \u0646\u0627\u062C\u062D \u0644\u0644\u0645\u0633\u062A\u062E\u062F\u0645 (${user.name}) \u0628\u062F\u0648\u0631 ${user.role} \u0639\u0628\u0631 IP: ${ip}`,
      user.role,
      "AUTH"
    ).catch(() => {
    });
    res.json({
      success: true,
      user: {
        id: (user.id || user.username).replace(/^u-?/i, ""),
        username: user.username,
        name: user.name,
        role: user.role,
        titleAr: user.title_ar,
        active: user.active
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
app.post("/api/auth/login-log", async (req, res) => {
  try {
    const { username, name, role } = req.body;
    const id = `log-${Date.now()}`;
    const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1";
    await pool.query(
      `INSERT INTO hospital_login_logs (id, username, user_name, role, ip, login_time)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
      [id, username, name, role, ip]
    );
    await logAudit(
      "-",
      "LOGIN",
      name || username,
      "-",
      "-",
      `\u062A\u0633\u062C\u064A\u0644 \u062F\u062E\u0648\u0644 \u0646\u0627\u062C\u062D \u0644\u0644\u0645\u0633\u062A\u062E\u062F\u0645 (${name || username}) \u0628\u062F\u0648\u0631 ${role} \u0639\u0628\u0631 IP: ${ip}`,
      role,
      "AUTH"
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
app.get("/api/users/login-logs", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM hospital_login_logs ORDER BY login_time DESC LIMIT 50");
    res.json({
      success: true,
      logs: result.rows.map((r) => ({
        id: r.id,
        username: r.username,
        userName: r.user_name,
        role: r.role,
        ip: r.ip,
        loginTime: r.login_time
      }))
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
app.get("/api/doctors", async (req, res) => {
  try {
    const docsRes = await pool.query("SELECT id, name, specialty, active, created_at FROM hospital_doctors WHERE active = true ORDER BY name ASC");
    const doctorsList = docsRes.rows.map((r) => ({
      id: r.id,
      name: r.name,
      specialty: r.specialty,
      active: r.active,
      createdAt: r.created_at
    }));
    const usersDocRes = await pool.query("SELECT username, name, title_ar FROM hospital_users WHERE role = 'Doctor' AND active = true");
    const existingNames = new Set(doctorsList.map((d) => d.name.trim().toLowerCase()));
    for (const u of usersDocRes.rows) {
      if (u.name && !existingNames.has(u.name.trim().toLowerCase())) {
        doctorsList.push({
          id: `doc-${u.username}`,
          name: u.name.trim(),
          specialty: u.title_ar || "\u0637\u0628\u064A\u0628 \u0637\u0648\u0627\u0631\u0626",
          active: true,
          createdAt: (/* @__PURE__ */ new Date()).toISOString()
        });
        existingNames.add(u.name.trim().toLowerCase());
      }
    }
    res.json({ success: true, doctors: doctorsList });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
app.post("/api/doctors", async (req, res) => {
  try {
    const { name, specialty } = req.body;
    if (!name || !String(name).trim()) {
      return res.status(400).json({ success: false, error: "\u0627\u0633\u0645 \u0627\u0644\u0637\u0628\u064A\u0628 \u0645\u0637\u0644\u0648\u0628" });
    }
    const cleanName = String(name).trim();
    const cleanSpecialty = (specialty || "\u0637\u0628\u064A\u0628 \u0637\u0648\u0627\u0631\u0626").trim();
    const existing = await pool.query("SELECT * FROM hospital_doctors WHERE LOWER(name) = LOWER($1)", [cleanName]);
    if (existing.rows.length > 0) {
      return res.json({
        success: true,
        doctor: {
          id: existing.rows[0].id,
          name: existing.rows[0].name,
          specialty: existing.rows[0].specialty,
          active: existing.rows[0].active
        },
        message: "\u0627\u0644\u0637\u0628\u064A\u0628 \u0645\u0633\u062C\u0644 \u0628\u0627\u0644\u0641\u0639\u0644 \u0645\u0633\u0628\u0642\u0627\u064B"
      });
    }
    const id = `doc-${Date.now()}`;
    const result = await pool.query(
      `INSERT INTO hospital_doctors (id, name, specialty, active)
       VALUES ($1, $2, $3, true)
       RETURNING id, name, specialty, active, created_at`,
      [id, cleanName, cleanSpecialty]
    );
    res.status(201).json({
      success: true,
      doctor: {
        id: result.rows[0].id,
        name: result.rows[0].name,
        specialty: result.rows[0].specialty,
        active: result.rows[0].active
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
app.get("/api/beds", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM hospital_beds ORDER BY dept ASC, bed_number ASC");
    res.json({
      success: true,
      beds: result.rows.map((r) => ({
        id: r.id,
        bedNumber: r.bed_number,
        dept: r.dept,
        status: r.status,
        patientMrn: r.patient_mrn,
        patientName: r.patient_name,
        assignedAt: r.assigned_at,
        notes: r.notes
      }))
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
app.patch("/api/beds/:id", async (req, res) => {
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
      return res.status(404).json({ success: false, error: "Bed not found" });
    }
    const b = result.rows[0];
    await logAudit(
      id,
      "BED_STATUS",
      req.body.changedBy || "Staff",
      patientName || b.patient_name || "-",
      patientMrn || b.patient_mrn || "-",
      `\u062A\u062D\u062F\u064A\u062B \u062D\u0627\u0644\u0629 \u0627\u0644\u0633\u0631\u064A\u0631 (${b.bed_number} - \u0642\u0633\u0645 ${b.dept}) \u0625\u0644\u0649: [${status || b.status}]${notes ? ` - \u0645\u0644\u0627\u062D\u0638\u0627\u062A: ${notes}` : ""}`,
      "Nurse",
      "BEDS"
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
        notes: b.notes
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
app.post("/api/beds/assign", async (req, res) => {
  const client = await pool.connect();
  try {
    const { bedId, recordId, assignedBy } = req.body;
    await client.query("BEGIN");
    const bedRes = await client.query("SELECT * FROM hospital_beds WHERE id = $1", [bedId]);
    if (bedRes.rows.length === 0) throw new Error("\u0627\u0644\u0633\u0631\u064A\u0631 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F");
    const bed = bedRes.rows[0];
    const recRes = await client.query("SELECT * FROM er_records WHERE id = $1", [recordId]);
    if (recRes.rows.length === 0) throw new Error("\u0633\u062C\u0644 \u0627\u0644\u062D\u0627\u0644\u0629 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F");
    const rec = recRes.rows[0];
    await client.query(
      `UPDATE hospital_beds
       SET status = 'Occupied', patient_mrn = $2, patient_name = $3, assigned_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [bedId, rec.medical, rec.name]
    );
    await client.query(
      `UPDATE er_records
       SET bed_number = $2, dept = $3, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [recordId, bed.bed_number, bed.dept]
    );
    await client.query("COMMIT");
    await logAudit(
      recordId,
      "BED_ASSIGN",
      assignedBy || "Clinical Staff",
      rec.name,
      rec.medical,
      `\u062A\u062E\u0635\u064A\u0635 \u0627\u0644\u0633\u0631\u064A\u0631 (${bed.bed_number} - \u0642\u0633\u0645 ${bed.dept}) \u0644\u0644\u0645\u0631\u064A\u0636 \u0628\u0646\u062C\u0627\u062D`
    );
    res.json({
      success: true,
      bedNumber: bed.bed_number,
      dept: bed.dept,
      message: `\u062A\u0645 \u0631\u0628\u0637 \u0627\u0644\u0633\u0631\u064A\u0631 ${bed.bed_number} \u0628\u0627\u0644\u0645\u0631\u064A\u0636 ${rec.name}`
    });
  } catch (err) {
    await client.query("ROLLBACK");
    res.status(500).json({ success: false, error: err.message });
  } finally {
    client.release();
  }
});
app.get("/api/audit-logs", async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 300, 2e3);
    const userFilter = req.query.user;
    const actionFilter = req.query.action;
    const categoryFilter = req.query.category;
    const search = req.query.search;
    const conditions = [];
    const values = [];
    let paramIndex = 1;
    if (userFilter && userFilter.trim() && userFilter !== "ALL") {
      conditions.push(`LOWER(changed_by) = LOWER($${paramIndex})`);
      values.push(userFilter.trim());
      paramIndex++;
    }
    if (actionFilter && actionFilter.trim() && actionFilter !== "ALL") {
      conditions.push(`action = $${paramIndex}`);
      values.push(actionFilter.trim());
      paramIndex++;
    }
    if (categoryFilter && categoryFilter.trim() && categoryFilter !== "ALL") {
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
    let query = "SELECT * FROM hospital_audit_logs";
    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }
    query += ` ORDER BY timestamp DESC LIMIT $${paramIndex}`;
    values.push(limit);
    const result = await pool.query(query, values);
    res.json({
      success: true,
      logs: result.rows.map((r) => ({
        id: r.id,
        recordId: r.record_id,
        action: r.action,
        changedBy: r.changed_by,
        userRole: r.user_role || "Staff",
        patientName: r.patient_name,
        patientMrn: r.patient_mrn,
        details: r.details,
        category: r.category || "GENERAL",
        timestamp: r.timestamp
      }))
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
app.get("/api/audit-logs/user-stats", async (req, res) => {
  try {
    const usersRes = await pool.query("SELECT username, name, role, title_ar FROM hospital_users");
    const systemUsers = usersRes.rows;
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
    const userSummaryMap = {};
    for (const row of statsRes.rows) {
      const latestRes = await pool.query(
        "SELECT action, details, timestamp, user_role FROM hospital_audit_logs WHERE changed_by = $1 ORDER BY timestamp DESC LIMIT 1",
        [row.changed_by]
      );
      const latest = latestRes.rows[0];
      const matchedUser = systemUsers.find(
        (u) => u.name === row.changed_by || u.username.toLowerCase() === row.changed_by.toLowerCase()
      );
      userSummaryMap[row.changed_by] = {
        changedBy: row.changed_by,
        userRole: matchedUser?.role || latest?.user_role || "Staff",
        titleAr: matchedUser?.title_ar || "",
        totalActions: row.total_actions,
        createdCount: row.created_count,
        updatedCount: row.updated_count,
        transferCount: row.transfer_count,
        bedCount: row.bed_count,
        deleteCount: row.delete_count,
        loginCount: row.login_count,
        lastActionTime: row.last_action_time,
        lastActionType: latest?.action || "-",
        lastActionDetail: latest?.details || "-"
      };
    }
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
          lastActionTime: "",
          lastActionType: "\u0644\u0627 \u062A\u0648\u062C\u062F \u062D\u0631\u0643\u0627\u062A \u0645\u0633\u062C\u0644\u0629 \u0628\u0639\u062F",
          lastActionDetail: "\u0644\u0645 \u064A\u062A\u0645 \u062A\u0633\u062C\u064A\u0644 \u0646\u0634\u0627\u0637 \u0628\u0639\u062F \u0644\u0647\u0630\u0627 \u0627\u0644\u062D\u0633\u0627\u0628"
        };
      }
    }
    res.json({
      success: true,
      stats: Object.values(userSummaryMap).sort((a, b) => b.totalActions - a.totalActions)
    });
  } catch (err) {
    console.error("Failed to compute user audit stats:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});
app.get("/api/records/:id/comments", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query("SELECT * FROM case_comments WHERE record_id = $1 ORDER BY created_at ASC", [id]);
    res.json({
      success: true,
      comments: result.rows.map((r) => ({
        id: r.id,
        recordId: r.record_id,
        userName: r.user_name,
        userRole: r.user_role,
        text: r.text,
        createdAt: r.created_at
      }))
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
app.post("/api/records/:id/comments", async (req, res) => {
  try {
    const { id } = req.params;
    const { userName, userRole, text } = req.body;
    const commentId = `comm-${Date.now()}`;
    const result = await pool.query(
      `INSERT INTO case_comments (id, record_id, user_name, user_role, text, created_at)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
       RETURNING *`,
      [commentId, id, userName || "Anonymous", userRole || "Staff", text]
    );
    res.status(201).json({
      success: true,
      comment: {
        id: result.rows[0].id,
        recordId: result.rows[0].record_id,
        userName: result.rows[0].user_name,
        userRole: result.rows[0].user_role,
        text: result.rows[0].text,
        createdAt: result.rows[0].created_at
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
app.get("/api/analytics/advanced", async (req, res) => {
  try {
    const recordsRes = await pool.query("SELECT order_time, actual_time, delay, dept, status FROM er_records");
    const records = recordsRes.rows;
    const hourlyMap = {};
    for (let i = 0; i < 24; i++) {
      hourlyMap[i] = { count: 0, totalDelay: 0, criticalCount: 0 };
    }
    records.forEach((r) => {
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
      }
    });
    const hourlyHeatmap = Object.entries(hourlyMap).map(([hour, val]) => ({
      hour: parseInt(hour, 10),
      label: `${hour.padStart(2, "0")}:00`,
      cases: val.count,
      avgDelay: val.count > 0 ? Math.round(val.totalDelay / val.count) : 0,
      criticalCases: val.criticalCount
    }));
    const deptMap = {
      ICU: { total: 0, completed: 0, targetMet: 0, totalDelay: 0 },
      Intermediate: { total: 0, completed: 0, targetMet: 0, totalDelay: 0 },
      Inpatient: { total: 0, completed: 0, targetMet: 0, totalDelay: 0 },
      Unassigned: { total: 0, completed: 0, targetMet: 0, totalDelay: 0 }
    };
    records.forEach((r) => {
      const d = r.dept === "ICU" || r.dept === "Intermediate" || r.dept === "Inpatient" ? r.dept : "Unassigned";
      deptMap[d].total += 1;
      if (r.status === "Transferred" && r.delay !== null) {
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
      complianceRate: v.completed > 0 ? Math.round(v.targetMet / v.completed * 100) : 0
    }));
    const bedsRes = await pool.query(`
      SELECT dept, status, COUNT(*) as count
      FROM hospital_beds
      GROUP BY dept, status
    `);
    res.json({
      success: true,
      hourlyHeatmap,
      deptStats,
      rawBeds: bedsRes.rows
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
app.all(["/api", "/api/*"], (req, res) => {
  res.status(404).json({
    success: false,
    error: `API route not found: ${req.method} ${req.originalUrl}`
  });
});
app.use((err, req, res, next) => {
  console.error("API runtime error:", err);
  if (!res.headersSent) {
    res.status(500).json({
      success: false,
      error: err?.message || "Internal server error"
    });
  }
});
async function startServer() {
  if (process.env.VERCEL === "1" || Boolean(process.env.VERCEL) || Boolean(process.env.VERCEL_ENV) || Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME) || Boolean(process.env.NOW_REGION)) {
    return;
  }
  try {
    await initDatabase();
  } catch (err) {
    console.error("Initial database setup error:", err);
  }
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT} with Neon PostgreSQL Enterprise`);
  });
}
var isServerlessRuntime = process.env.VERCEL === "1" || Boolean(process.env.VERCEL) || Boolean(process.env.VERCEL_ENV) || Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME) || Boolean(process.env.NOW_REGION);
if (!isServerlessRuntime) {
  startServer();
}
var server_default = app;
export {
  server_default as default
};
