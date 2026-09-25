import { StagedCase } from '../components/ImportTab';

export interface ParsedPasteResult {
  detectedFormat: 'HIS_DIRECT' | 'EXCEL_LOGBOOK' | 'GENERIC_TABLE';
  detectedFormatTitleAr: string;
  cases: StagedCase[];
  headers?: string[];
  rawRows?: string[][];
  warnings: string[];
}

/**
 * Normalizes Eastern Arabic digits (٠-٩) to standard ASCII digits (0-9)
 */
export function normalizeArabicDigits(str?: string | null): string {
  if (!str) return '';
  return String(str)
    .replace(/[٠-٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/[۰-۹]/g, d => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));
}

/**
 * Flexible time parser supporting:
 * - "12.30 PM", "12:30 PM", "1:45:38 AM", "13.00PM", "13:00", "8 PM", "1.30 AM (14/9)"
 */
export function parseFlexibleTime(str?: string | null): { hh: number; mi: number; ss: number } | null {
  if (!str) return null;
  let s = normalizeArabicDigits(String(str).trim());
  if (!s || /^(direct|admtion|none|null|-)$/i.test(s)) return null;

  // Remove parenthesized notes like (14/9) or (18/9)
  s = s.replace(/\s*\([^)]*\)/g, '').trim();
  // Normalize dot between digits to colon: "12.30" -> "12:30"
  s = s.replace(/(\d{1,2})\.(\d{2})/g, '$1:$2');
  // Handle space before am/pm: "13.00PM" -> "13:00 PM"
  s = s.replace(/(\d{1,2}(?::\d{2})?)\s*(am|pm|ص|م)/i, '$1 $2');

  // 12-hour format: "1:45:38 AM", "12:30 PM", "8 PM"
  const m12 = s.match(/^(\d{1,2})(?::(\d{2}))?(?::(\d{2}))?\s*(AM|PM|am|pm|ص|م)$/i);
  if (m12) {
    let hh = parseInt(m12[1], 10);
    const mi = m12[2] ? parseInt(m12[2], 10) : 0;
    const ss = m12[3] ? parseInt(m12[3], 10) : 0;
    const ap = m12[4].toUpperCase();

    if ((ap === 'PM' || ap === 'م') && hh < 12) hh += 12;
    if ((ap === 'AM' || ap === 'ص') && hh === 12) hh = 0;
    return { hh, mi, ss };
  }

  // 24-hour format: "13:00", "13:00:00", "22:15"
  const m24 = s.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (m24) {
    return {
      hh: parseInt(m24[1], 10),
      mi: parseInt(m24[2], 10),
      ss: m24[3] ? parseInt(m24[3], 10) : 0,
    };
  }

  // Pure single or double digit hour e.g. "8" or "20"
  const mHour = s.match(/^(\d{1,2})$/);
  if (mHour) {
    return { hh: parseInt(mHour[1], 10), mi: 0, ss: 0 };
  }

  return null;
}

/**
 * Flexible date parser supporting DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD
 */
export function parseFlexibleDate(str?: string | null): { y: number; mo: number; d: number } | null {
  if (!str) return null;
  const s = normalizeArabicDigits(String(str).trim());
  if (!s) return null;

  // YYYY-MM-DD or YYYY/MM/DD
  const mIso = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (mIso) {
    return {
      y: parseInt(mIso[1], 10),
      mo: parseInt(mIso[2], 10),
      d: parseInt(mIso[3], 10),
    };
  }

  // D/M/YYYY or M/D/YYYY
  const mSlash = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/);
  if (mSlash) {
    const a = parseInt(mSlash[1], 10);
    const b = parseInt(mSlash[2], 10);
    const yStr = mSlash[3];
    const y = yStr.length === 2 ? 2000 + parseInt(yStr, 10) : parseInt(yStr, 10);

    let d: number;
    let mo: number;

    // In Egypt & Arab health records:
    // If a > 12 -> a is day, b is month
    if (a > 12 && b <= 12) {
      d = a;
      mo = b;
    } else if (b > 12 && a <= 12) {
      // Like "9/24/2026": a=9 (Sept), b=24 (Day)
      d = b;
      mo = a;
    } else {
      // In the Excel sheet example (e.g. 9/1/2026 to 9/24/2026), 9 is the month (September)
      if (a === 9 && b <= 31) {
        d = b;
        mo = a;
      } else {
        d = a;
        mo = b;
      }
    }

    return { y, mo, d };
  }

  return null;
}

/**
 * Combines date and time into local datetime string YYYY-MM-DDTHH:mm
 */
export function buildIsoDateTimeString(
  baseDateStr?: string | null,
  timeWithOptionalDateStr?: string | null
): string | null {
  if (!baseDateStr && !timeWithOptionalDateStr) return null;

  const rawTime = normalizeArabicDigits(String(timeWithOptionalDateStr || '').trim());
  const rawDate = normalizeArabicDigits(String(baseDateStr || '').trim());

  // 1. Check if the string itself contains a full date and time:
  // e.g. "12/09/2026 11:40:05 PM" or "2026-09-12 23:40"
  const mFull = rawTime.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})\s+(.*)$/);
  if (mFull) {
    const dObj = parseFlexibleDate(`${mFull[1]}/${mFull[2]}/${mFull[3]}`);
    const tObj = parseFlexibleTime(mFull[4]);
    if (dObj && tObj) {
      const pad = (n: number) => String(n).padStart(2, '0');
      return `${dObj.y}-${pad(dObj.mo)}-${pad(dObj.d)}T${pad(tObj.hh)}:${pad(tObj.mi)}`;
    }
  }

  // 2. Check for date override in parentheses, e.g. "1.30 AM (14/9)"
  let dayOverride: number | null = null;
  let monthOverride: number | null = null;
  const mParen = rawTime.match(/\((\d{1,2})[-/.](\d{1,2})\)/);
  if (mParen) {
    dayOverride = parseInt(mParen[1], 10);
    monthOverride = parseInt(mParen[2], 10);
  }

  const dObj = parseFlexibleDate(rawDate);
  const tObj = parseFlexibleTime(rawTime);

  if (dObj && tObj) {
    const pad = (n: number) => String(n).padStart(2, '0');
    const y = dObj.y;
    const mo = monthOverride || dObj.mo;
    const d = dayOverride || dObj.d;
    return `${y}-${pad(mo)}-${pad(d)}T${pad(tObj.hh)}:${pad(tObj.mi)}`;
  }

  if (dObj && !tObj) {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${dObj.y}-${pad(dObj.mo)}-${pad(dObj.d)}T00:00`;
  }

  return null;
}

/**
 * Extracts delay minutes and destination department from strings like:
 * "30 MIN TO INP", "30 MIN TO ICU", "5 HRS TO ICU", "2.30 HRS TO INTER", "direct admtion to icu"
 */
export function parseDelayAndDept(str?: string | null): { delay: number | null; dept: string } {
  if (!str) return { delay: null, dept: 'Inpatient' };
  const s = String(str).trim();
  const upper = s.toUpperCase();

  let dept = 'Inpatient';
  if (upper.includes('ICU')) {
    dept = 'ICU';
  } else if (upper.includes('INTER')) {
    dept = 'Intermediate';
  } else if (upper.includes('INP') || upper.includes('داخلي') || upper.includes('قسم')) {
    dept = 'Inpatient';
  }

  let delay: number | null = null;

  // Hours: "X.Y HRS" or "X HRS" or "X ساعة"
  const mHrs = upper.match(/(\d+(?:\.\d+)?)\s*(?:HRS|HR|ساعة|ساعات)/i);
  if (mHrs) {
    const val = parseFloat(mHrs[1]);
    const intPart = Math.floor(val);
    const fracPart = Math.round((val - intPart) * 100);
    // In hospital logbooks, "2.30 HRS" means 2 hours and 30 minutes = 150 mins
    if (fracPart === 30 || fracPart === 15 || fracPart === 45) {
      delay = intPart * 60 + fracPart;
    } else {
      delay = Math.round(val * 60);
    }
  } else {
    // Minutes: "X MIN" or "X دقيقة"
    const mMin = upper.match(/(\d+)\s*(?:MIN|MINUTES|دقيقة|د)/i);
    if (mMin) {
      delay = parseInt(mMin[1], 10);
    } else if (upper.includes('DIRECT') || upper.includes('فوري')) {
      delay = 0;
    }
  }

  return { delay, dept };
}

/**
 * Maps English logbook delay reasons to system delay codes
 */
export function mapDelayReasonCode(str?: string | null): { code: string; labelAr: string } {
  if (!str) return { code: 'R01', labelAr: 'في انتظار توفر سرير بالأقسام' };
  const s = String(str).trim().toUpperCase();

  if (s === 'NONE' || s === 'NO DELAY' || s === 'لا يوجد' || s === 'لايوجد') {
    return { code: 'R01', labelAr: 'لا يوجد تأخير - انتقال سريع' };
  }
  if (s.includes('UN AVAILABLE BEDS') || (s.includes('BED') && s.includes('UNAVAILABLE')) || s.includes('سرير')) {
    return { code: 'R01', labelAr: 'في انتظار توفر سرير بالأقسام' };
  }
  if (s.includes('LABS') || s.includes('LAB') || s.includes('تحاليل') || s.includes('مختبر')) {
    return { code: 'R02', labelAr: 'في انتظار نتائج الفحوصات المعملية' };
  }
  if (s.includes('DOPPLER') || s.includes('X-RAY') || s.includes('RADIOLOGY') || s.includes('أشعة') || s.includes('اشعة')) {
    return { code: 'R03', labelAr: 'في انتظار نتائج الأشعة / التقرير' };
  }
  if (s.includes('CONSULT') || s.includes('استشارة')) {
    return { code: 'R04', labelAr: 'في انتظار استشارة الأخصائي / الاستشاري' };
  }
  if (s.includes('ADMIN') || s.includes('إداري')) {
    return { code: 'R05', labelAr: 'في انتظار الموافقات الإدارية / المالية' };
  }
  if (s.includes('CONTRACT') || s.includes('AGREEMENT') || s.includes('INSURANCE') || s.includes('تأمين') || s.includes('تعاقد')) {
    return { code: 'R06', labelAr: 'في انتظار موافقة شركة التأمين / جهة التعاقد' };
  }
  if (s.includes('PORTER') || s.includes('نقل')) {
    return { code: 'R07', labelAr: 'في انتظار عمال النقل الداخلي' };
  }
  if (s.includes('PREPARING BED') || s.includes('PREPARE') || s.includes('تجهيز')) {
    return { code: 'R08', labelAr: 'تجهيز السرير / المعدات' };
  }
  if (s.includes('SAVING LIFE') || s.includes('LIFE') || s.includes('إنقاذ') || s.includes('انقاذ')) {
    return { code: 'R10', labelAr: 'أسباب سريرية طارئة / إنقاذ حياة' };
  }

  return { code: 'R01', labelAr: str.trim() };
}

/**
 * Intelligent master parser for Hospital HIS & Excel data
 */
export function parseHospitalPaste(
  rawText: string,
  defaultDept: string = 'Inpatient',
  defaultReason: string = 'R01',
  defaultContract: string = 'طوارئ المستشفى',
  currentUserName: string = 'Staff'
): ParsedPasteResult {
  const warnings: string[] = [];
  const lines = rawText
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l.length > 0);

  if (lines.length === 0) {
    return {
      detectedFormat: 'GENERIC_TABLE',
      detectedFormatTitleAr: 'نص فارغ',
      cases: [],
      warnings: ['لم يتم العثور على أسطر صالحة في النص الملصق.'],
    };
  }

  // Detect delimiter per line or overall
  const sample = lines.slice(0, Math.min(10, lines.length));
  const hasTabs = sample.some(l => l.includes('\t'));
  const delim = hasTabs ? '\t' : ',';

  const rows = lines.map(l => l.split(delim).map(c => c.trim().replace(/^"|"$/g, '')));

  // Check if Format 2: Excel ER Logbook (has "MIN TO INP", "HRS TO ICU", "UN AVAILABLE BEDS", etc.)
  const excelMatches = rows.filter(r =>
    r.some(cell => /(?:MIN|HRS|HR)\s+(?:TO\s+)?(?:INP|ICU|INTER)/i.test(cell) || /direct\s+admtion/i.test(cell))
  ).length;

  const isExcelLogbook = excelMatches >= Math.max(1, Math.floor(rows.length * 0.2));

  // Check if Format 1: HIS Direct Copy (has MRN like 10126278921 and "من المنزل" or "مرضى بهية" or "Closed")
  const hisDirectMatches = rows.filter(r =>
    r.some(cell => /^\d{8,12}$/.test(cell)) &&
    r.some(cell => cell.includes('المنزل') || cell.includes('بهية') || cell.includes('نقدى') || /Normal/i.test(cell) || /Closed/i.test(cell))
  ).length;

  const isHisDirect = !isExcelLogbook && hisDirectMatches >= Math.max(1, Math.floor(rows.length * 0.2));

  // -------------------------------------------------------------
  // BRANCH 1: Excel ER Logbook Format (Mode B)
  // -------------------------------------------------------------
  if (isExcelLogbook) {
    const cases: StagedCase[] = [];

    rows.forEach((row, idx) => {
      // Skip empty or header rows
      if (row.length < 3 || row[0].includes('تاريخ') || row[1]?.includes('اسم')) return;

      const dateStr = row[0];
      const name = row[1] || `مريض ${idx + 1}`;
      const rawMrn = row[2] || `MRN-${idx + 1}`;
      const cleanMrn = rawMrn.replace(/^p\s*/i, '').trim();

      const orderTimeStr = row[3] || '';
      const actualTimeStr = row[4] || '';
      const delayDeptStr = row[5] || '';
      const reasonStr = row[6] || '';

      const { delay: parsedDelay, dept: parsedDept } = parseDelayAndDept(delayDeptStr);
      const reasonObj = mapDelayReasonCode(reasonStr);

      const orderIso = buildIsoDateTimeString(dateStr, orderTimeStr) || new Date().toISOString().substring(0, 16);
      const actualIso = buildIsoDateTimeString(dateStr, actualTimeStr);

      let finalDelay = parsedDelay;
      if (finalDelay === null && actualIso && orderIso) {
        const diff = Math.round((new Date(actualIso).getTime() - new Date(orderIso).getTime()) / 60000);
        finalDelay = Math.max(0, diff);
      }

      cases.push({
        id: `staged-xl-${idx + 1}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        medical: cleanMrn || `MRN-${idx + 1}`,
        name: name,
        dept: parsedDept || defaultDept,
        order: orderIso,
        actual: actualIso || undefined,
        delay: finalDelay,
        reason: reasonObj.code || defaultReason,
        notes: reasonObj.labelAr ? `سبب التأخير: ${reasonObj.labelAr}` : 'مستورد من شيت إكسيل الطوارئ',
        status: actualIso ? 'Transferred' : 'Pending',
        contract: 'مرضى بهية',
        cameFrom: 'من المنزل',
        doctorName: currentUserName,
        selected: true,
        isEdited: false,
      });
    });

    return {
      detectedFormat: 'EXCEL_LOGBOOK',
      detectedFormatTitleAr: 'سجل إكسيل طوارئ المستشفى (Excel ER Logbook)',
      cases,
      rawRows: rows,
      warnings,
    };
  }

  // -------------------------------------------------------------
  // BRANCH 2: HIS Direct Table Copy Format (Mode A)
  // -------------------------------------------------------------
  if (isHisDirect || hasTabs) {
    const cases: StagedCase[] = [];

    rows.forEach((row, idx) => {
      // Find MRN column in row: 8-12 digits
      let mrnIdx = -1;
      for (let i = 0; i < Math.min(row.length, 5); i++) {
        if (/^\d{8,12}$/.test(row[i])) {
          mrnIdx = i;
          break;
        }
      }

      if (mrnIdx === -1) {
        // Check if there is an MRN anywhere
        mrnIdx = row.findIndex(c => /^\d{8,12}$/.test(c));
      }

      if (mrnIdx >= 0) {
        const mrn = row[mrnIdx];
        const name = row[mrnIdx + 1] || `مريض ${idx + 1}`;
        const cameFrom = row[mrnIdx + 2] || 'من المنزل';
        const contract = row[mrnIdx + 3] || defaultContract;
        const visitNo = row[mrnIdx + 4] || undefined;

        // In HIS copy:
        // row[mrnIdx + 5] is Exit Date (e.g. 13/09/2026)
        // row[mrnIdx + 6] is Exit Time (e.g. 1:45:38 AM)
        // row[mrnIdx + 7] is Order DateTime (e.g. 12/09/2026 11:40:05 PM)
        const exitDateStr = row[mrnIdx + 5] || '';
        const exitTimeStr = row[mrnIdx + 6] || '';
        const orderDateTimeStr = row[mrnIdx + 7] || '';

        const orderIso =
          buildIsoDateTimeString('', orderDateTimeStr) ||
          buildIsoDateTimeString(exitDateStr, orderDateTimeStr) ||
          new Date().toISOString().substring(0, 16);

        const actualIso = buildIsoDateTimeString(exitDateStr, exitTimeStr);

        let delay: number | null = null;
        if (actualIso && orderIso) {
          const diff = Math.round((new Date(actualIso).getTime() - new Date(orderIso).getTime()) / 60000);
          delay = Math.max(0, diff);
        }

        cases.push({
          id: `staged-his-${idx + 1}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          medical: mrn,
          name: name,
          dept: defaultDept || 'Inpatient',
          order: orderIso,
          actual: actualIso || undefined,
          delay: delay,
          reason: defaultReason || 'R01',
          notes: 'مستورد مباشرة من نظام HIS المستشفى',
          status: actualIso ? 'Transferred' : 'Pending',
          contract: contract || defaultContract,
          cameFrom: cameFrom || 'من المنزل',
          visitNo: visitNo,
          doctorName: currentUserName,
          selected: true,
          isEdited: false,
        });
      }
    });

    if (cases.length > 0) {
      return {
        detectedFormat: 'HIS_DIRECT',
        detectedFormatTitleAr: 'نسخ مباشر من نظام HIS المستشفى (HIS Direct Table)',
        cases,
        rawRows: rows,
        warnings,
      };
    }
  }

  // -------------------------------------------------------------
  // BRANCH 3: Generic / Fallback Mode
  // -------------------------------------------------------------
  return {
    detectedFormat: 'GENERIC_TABLE',
    detectedFormatTitleAr: 'جدول بيانات عام / مخصص',
    cases: [],
    rawRows: rows,
    warnings: ['يرجى تحديد الأعمدة يدوياً في حال لم يتم التعرف التلقائي على الحقول.'],
  };
}
