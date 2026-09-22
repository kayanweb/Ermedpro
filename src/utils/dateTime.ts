export function parseTimeOnly(str?: string | null): { hh: number; mi: number; ss: number } | null {
  if (!str) return null;
  const s = String(str).trim();

  // 12-hour AM/PM or ص/م
  const m12 = s.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM|am|pm|ص|م)$/i);
  if (m12) {
    let hh = parseInt(m12[1], 10);
    const mi = parseInt(m12[2], 10);
    const ss = m12[3] ? parseInt(m12[3], 10) : 0;
    const ap = m12[4].toUpperCase();

    if ((ap === 'PM' || ap === 'م') && hh < 12) hh += 12;
    if ((ap === 'AM' || ap === 'ص') && hh === 12) hh = 0;
    return { hh, mi, ss };
  }

  // 24-hour HH:MM[:SS]
  const m24 = s.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (m24) {
    return {
      hh: parseInt(m24[1], 10),
      mi: parseInt(m24[2], 10),
      ss: m24[3] ? parseInt(m24[3], 10) : 0,
    };
  }

  return null;
}

export function parseDateOnly(str?: string | null): { y: number; mo: number; d: number } | null {
  if (!str) return null;
  const s = String(str).trim();

  // YYYY-MM-DD or YYYY/MM/DD
  const mIso = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (mIso) {
    return {
      y: parseInt(mIso[1], 10),
      mo: parseInt(mIso[2], 10),
      d: parseInt(mIso[3], 10),
    };
  }

  // DD/MM/YYYY or MM/DD/YYYY
  const mSlash = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/);
  if (mSlash) {
    const a = parseInt(mSlash[1], 10);
    const b = parseInt(mSlash[2], 10);
    const yStr = mSlash[3];
    const y = yStr.length === 2 ? 2000 + parseInt(yStr, 10) : parseInt(yStr, 10);

    let d: number;
    let mo: number;

    // Smart detection: in Egypt/Arab healthcare HIS, standard is DD/MM/YYYY
    if (a > 12 && b <= 12) {
      d = a;
      mo = b;
    } else if (b > 12 && a <= 12) {
      d = b;
      mo = a;
    } else {
      // Default to DD/MM/YYYY
      d = a;
      mo = b;
    }

    return { y, mo, d };
  }

  return null;
}

export function parseFullDateTime(dateStr?: string | null, timeStr?: string | null): Date | null {
  if (!dateStr) return null;

  const d = parseDateOnly(dateStr);
  if (!d) return null;

  let hh = 0;
  let mi = 0;
  let ss = 0;

  if (timeStr && timeStr.trim()) {
    const t = parseTimeOnly(timeStr);
    if (t) {
      hh = t.hh;
      mi = t.mi;
      ss = t.ss;
    }
  } else {
    // Check if time is embedded inside dateStr (e.g. 11/09/2026 10:05:07 PM)
    const combined = String(dateStr).trim();
    const tm = combined.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM|am|pm|ص|م)?/i);
    if (tm) {
      let h = parseInt(tm[1], 10);
      const mn = parseInt(tm[2], 10);
      const sec = tm[3] ? parseInt(tm[3], 10) : 0;
      const ap = tm[4] ? tm[4].toUpperCase() : '';

      if ((ap === 'PM' || ap === 'م') && h < 12) h += 12;
      if ((ap === 'AM' || ap === 'ص') && h === 12) h = 0;
      hh = h;
      mi = mn;
      ss = sec;
    }
  }

  const dt = new Date(d.y, d.mo - 1, d.d, hh, mi, ss);
  if (isNaN(dt.getTime())) return null;
  return dt;
}

export function toLocalDatetimeInput(d?: Date | null): string {
  if (!d || isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fmtDate(val?: string | null): string {
  if (!val) return '-';
  const d = new Date(val);
  if (isNaN(d.getTime())) {
    // If not standard ISO, try parsing
    const parsed = parseFullDateTime(val);
    if (!parsed) return val;
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(parsed.getDate())}/${pad(parsed.getMonth() + 1)}/${parsed.getFullYear()}`;
  }
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

export function fmtDateTime(val?: string | null): string {
  if (!val) return '-';
  const d = new Date(val);
  if (isNaN(d.getTime())) {
    const parsed = parseFullDateTime(val);
    if (!parsed) return val;
    const pad = (n: number) => String(n).padStart(2, '0');
    const h = parsed.getHours();
    const ap = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${pad(parsed.getDate())}/${pad(parsed.getMonth() + 1)}/${parsed.getFullYear()} ${pad(h12)}:${pad(parsed.getMinutes())} ${ap}`;
  }
  const pad = (n: number) => String(n).padStart(2, '0');
  const h = d.getHours();
  const ap = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(h12)}:${pad(d.getMinutes())} ${ap}`;
}

export function calcMinutesDiff(startStr?: string | null, endStr?: string | null): number | null {
  if (!startStr || !endStr) return null;
  const start = new Date(startStr);
  const end = new Date(endStr);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;
  return Math.round((end.getTime() - start.getTime()) / 60000);
}
