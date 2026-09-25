import { ERRecord } from '../types';
import { REASONS } from '../constants';
import { fmtDate, fmtDateTime } from './dateTime';

export function getDelayColorHex(delay?: number | null): { bg: string; text: string; label: string } {
  if (delay === null || delay === undefined) {
    return { bg: '#f1f5f9', text: '#64748b', label: 'قيد الانتظار' };
  }
  if (delay > 60) {
    return { bg: '#fee2e2', text: '#991b1b', label: 'تأخير حرج (>60د)' };
  }
  if (delay > 30) {
    return { bg: '#fef3c7', text: '#92400e', label: 'تأخير متوسط (31-60د)' };
  }
  return { bg: '#dcfce7', text: '#166534', label: 'ضمن الهدف (≤30د)' };
}

export function buildOfficialExcelHTML(records: ERRecord[]): string {
  const total = records.length;
  const icu = records.filter(r => r.dept === 'ICU').length;
  const inter = records.filter(r => r.dept === 'Intermediate').length;
  const inp = records.filter(r => r.dept === 'Inpatient').length;
  const un = records.filter(r => !r.dept || (r.dept !== 'ICU' && r.dept !== 'Intermediate' && r.dept !== 'Inpatient')).length;

  const rowsHTML = records
    .map(r => {
      const reasonObj = REASONS.find(x => x.code === r.reason);
      const reasonText = reasonObj ? `${reasonObj.text}` : (r.reason || '-');
      const colors = getDelayColorHex(r.delay);

      return `<tr>
        <td style="padding:7px; border:1px solid #333; text-align:center;">${fmtDate(r.order)}</td>
        <td style="padding:7px; border:1px solid #333; text-align:right; font-weight:600;">${r.name}</td>
        <td style="padding:7px; border:1px solid #333; text-align:center; font-family:monospace;">${r.medical}</td>
        <td style="padding:7px; border:1px solid #333; text-align:center; font-weight:bold; color:#581c87;">${r.contract || 'طوارئ المستشفى'}</td>
        <td style="padding:7px; border:1px solid #333; text-align:center;">${r.cameFrom || 'من المنزل'} ${r.visitNo ? `(${r.visitNo})` : ''}</td>
        <td style="padding:7px; border:1px solid #333; text-align:center;">${fmtDateTime(r.order)}</td>
        <td style="padding:7px; border:1px solid #333; text-align:center;">${r.actual ? fmtDateTime(r.actual) : '-'}</td>
        <td style="padding:7px; border:1px solid #333; text-align:center; background:${colors.bg}; color:${colors.text}; font-weight:bold;">${r.delay ?? '-'}</td>
        <td style="padding:7px; border:1px solid #333; text-align:right;">${reasonText}</td>
        <td style="padding:7px; border:1px solid #333; text-align:center; font-weight:bold;">${r.dept || 'غير محدد'}</td>
      </tr>`;
    })
    .join('');

  return `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
  <head>
    <meta charset="UTF-8">
    <style>
      table { border-collapse: collapse; width: 100%; font-family: Arial, Tahoma, sans-serif; font-size: 11pt; }
      td, th { border: 1px solid #333; padding: 6px; text-align: center; }
      .title { background: #b4c7e7; font-size: 14pt; font-weight: bold; text-align: center; }
      .sum { font-weight: bold; }
      .red { color: #dc3545; background: #fff; font-weight: bold; }
      .blue { color: #0d6efd; font-weight: bold; }
      .green { color: #198754; font-weight: bold; }
      .purple { color: #6f42c1; font-weight: bold; }
      .head { background: #1f3864; color: #fff; font-weight: bold; }
    </style>
  </head>
  <body>
    <table>
      <tr>
        <td colspan="10" class="title">ER for Waiting Time - Hospital Report</td>
      </tr>
      <tr class="sum">
        <td colspan="2" class="red">Total Patients Admission: ${total}</td>
        <td colspan="2" class="blue">ICU: ${icu}</td>
        <td colspan="2" class="green">Intermediate: ${inter}</td>
        <td colspan="2" class="purple">Inpatient: ${inp}</td>
        <td colspan="2" class="red">Unassigned: ${un}</td>
      </tr>
      <tr class="head">
        <th>Date</th>
        <th>Patient Name</th>
        <th>Medical No.</th>
        <th>Contract (التعاقد)</th>
        <th>Came From / Visit</th>
        <th>Transfer Order Time</th>
        <th>Actual Transfer Time</th>
        <th>Delay Duration /Minutes</th>
        <th>Causes of Delay</th>
        <th>Destination</th>
      </tr>
      ${rowsHTML}
    </table>
  </body>
  </html>`;
}

export function exportToExcel(records: ERRecord[], filenamePrefix = 'ER_Waiting_Time'): void {
  const html = buildOfficialExcelHTML(records);
  const blob = new Blob(['\uFEFF' + html], { type: 'application/vnd.ms-excel;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const dateStr = new Date().toISOString().slice(0, 10);
  link.download = `${filenamePrefix}_${dateStr}.xls`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportToCSV(records: ERRecord[], filenamePrefix = 'ER_Waiting_Time'): void {
  const headers = [
    'Date',
    'Patient Name',
    'Medical No.',
    'Contract',
    'Came From',
    'Visit No.',
    'Doctor Name',
    'Diagnosis',
    'Transfer Order Time',
    'Actual Transfer Time',
    'Delay Duration /Minutes',
    'Causes of Delay',
    'Destination',
  ];

  const rows = records.map(r => {
    const reason = REASONS.find(x => x.code === r.reason);
    return [
      fmtDate(r.order),
      r.name || '',
      r.medical || '',
      r.contract || 'طوارئ المستشفى',
      r.cameFrom || 'من المنزل',
      r.visitNo || '',
      r.doctorName || '',
      r.diagnosis || '',
      fmtDateTime(r.order),
      r.actual ? fmtDateTime(r.actual) : '-',
      r.delay !== null && r.delay !== undefined ? String(r.delay) : '-',
      reason ? reason.text : (r.reason || '-'),
      r.dept || 'غير محدد',
    ];
  });

  const csvContent =
    '\uFEFF' +
    [headers.map(h => `"${h}"`).join(','), ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))].join(
      '\n'
    );

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const dateStr = new Date().toISOString().slice(0, 10);
  link.download = `${filenamePrefix}_${dateStr}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export interface PrintReportOptions {
  hospitalName?: string;
  reportTitle?: string;
  columns?: {
    showIndex?: boolean;
    showDate?: boolean;
    showName?: boolean;
    showMrn?: boolean;
    showTriage?: boolean;
    showContract?: boolean;
    showOrderTime?: boolean;
    showActualTime?: boolean;
    showDelay?: boolean;
    showCauses?: boolean;
    showDestination?: boolean;
    showBed?: boolean;
    showDischarge?: boolean;
    showEntryMethod?: boolean;
  };
}

export function printOfficialReport(records: ERRecord[], options?: PrintReportOptions): void {
  const total = records.length;
  const icu = records.filter(r => r.dept === 'ICU').length;
  const inter = records.filter(r => r.dept === 'Intermediate').length;
  const inp = records.filter(r => r.dept === 'Inpatient').length;
  const un = records.filter(r => !r.dept || (r.dept !== 'ICU' && r.dept !== 'Intermediate' && r.dept !== 'Inpatient')).length;

  const cols = {
    showIndex: options?.columns?.showIndex ?? true,
    showDate: options?.columns?.showDate ?? true,
    showName: options?.columns?.showName ?? true,
    showMrn: options?.columns?.showMrn ?? true,
    showTriage: options?.columns?.showTriage ?? true,
    showContract: options?.columns?.showContract ?? true,
    showOrderTime: options?.columns?.showOrderTime ?? true,
    showActualTime: options?.columns?.showActualTime ?? true,
    showDelay: options?.columns?.showDelay ?? true,
    showCauses: options?.columns?.showCauses ?? true,
    showDestination: options?.columns?.showDestination ?? true,
    showBed: options?.columns?.showBed ?? true,
    showDischarge: options?.columns?.showDischarge ?? true,
    showEntryMethod: options?.columns?.showEntryMethod ?? false,
  };

  const rowsHTML = records
    .map((r, i) => {
      const reasonObj = REASONS.find(x => x.code === r.reason);
      const reasonText = reasonObj ? `${reasonObj.text} (${reasonObj.textAr})` : (r.reason || '-');
      const colors = getDelayColorHex(r.delay);

      const delayFormatted = r.delay !== null && r.delay !== undefined
        ? `${r.delay} دقيقة (${(r.delay / 60).toFixed(1)} س)`
        : '-';

      const statusBadge = r.status === 'Cancelled'
        ? '<span style="color:#b91c1c; font-weight:bold;">ملغي ✕</span>'
        : r.actual
        ? fmtDateTime(r.actual)
        : '<span style="color:#b45309; font-weight:bold;">قيد الانتظار ⏳</span>';

      return `<tr style="page-break-inside: avoid;">
        ${cols.showIndex ? `<td style="padding:4px 2px; border:1px solid #cbd5e1; text-align:center; font-family:monospace; color:#64748b; font-size:7.5pt;">${i + 1}</td>` : ''}
        ${cols.showDate ? `<td style="padding:4px 2px; border:1px solid #cbd5e1; text-align:center; font-family:monospace; white-space:nowrap; font-size:7.5pt;">${fmtDate(r.order)}</td>` : ''}
        ${cols.showName ? `<td style="padding:4px 4px; border:1px solid #cbd5e1; text-align:right; font-weight:bold; color:#0f172a; font-size:8pt;">
          ${r.name}
          ${r.cameFrom ? `<div style="font-size:7pt; font-weight:normal; color:#64748b; margin-top:1px;">${r.cameFrom} ${r.visitNo ? `• زيارة: ${r.visitNo}` : ''}</div>` : ''}
        </td>` : ''}
        ${cols.showMrn ? `<td style="padding:4px 2px; border:1px solid #cbd5e1; text-align:center; font-family:monospace; font-weight:600; color:#1e293b; font-size:7.5pt;">${r.medical}</td>` : ''}
        ${cols.showTriage ? `<td style="padding:4px 2px; border:1px solid #cbd5e1; text-align:center; font-weight:bold; font-size:7.5pt;">
          <span style="display:inline-block; padding:1px 4px; border-radius:3px; font-size:7pt; background:${
            (r.triageLevel?.includes('Level 1') || r.triageLevel?.includes('Category 1')) ? '#fee2e2; color:#991b1b; border:1px solid #fca5a5;' :
            (r.triageLevel?.includes('Level 2') || r.triageLevel?.includes('Category 2')) ? '#ffedd5; color:#9a3412; border:1px solid #fdba74;' :
            (r.triageLevel?.includes('Level 4') || r.triageLevel?.includes('Category 4')) ? '#e0f2fe; color:#075985; border:1px solid #7dd3fc;' :
            (r.triageLevel?.includes('Level 5') || r.triageLevel?.includes('Category 5')) ? '#f1f5f9; color:#334155; border:1px solid #cbd5e1;' :
            '#dcfce7; color:#166534; border:1px solid #86efac;'
          }">${r.triageLevel || 'Category 3 (GREEN)'}</span>
        </td>` : ''}
        ${cols.showContract ? `<td style="padding:4px 2px; border:1px solid #cbd5e1; text-align:center; font-weight:bold; color:#581c87; font-size:7.5pt;">${r.contract || 'طوارئ المستشفى'}</td>` : ''}
        ${cols.showOrderTime ? `<td style="padding:4px 2px; border:1px solid #cbd5e1; text-align:center; font-family:monospace; font-size:7.5pt; white-space:nowrap;">${fmtDateTime(r.order)}</td>` : ''}
        ${cols.showActualTime ? `<td style="padding:4px 2px; border:1px solid #cbd5e1; text-align:center; font-family:monospace; font-size:7.5pt; white-space:nowrap;">${statusBadge}</td>` : ''}
        ${cols.showDelay ? `<td style="padding:4px 2px; border:1px solid #cbd5e1; text-align:center; background:${colors.bg}; color:${colors.text}; font-weight:bold; font-size:7.5pt; font-family:monospace;">${delayFormatted}</td>` : ''}
        ${cols.showCauses ? `<td style="padding:4px 3px; border:1px solid #cbd5e1; text-align:right; font-size:7pt; color:#334155;">${reasonText}</td>` : ''}
        ${cols.showDestination ? `<td style="padding:4px 2px; border:1px solid #cbd5e1; text-align:center; font-weight:bold; font-size:7.5pt; background:#f8fafc; color:#0f172a;">${r.dept || '<span style="color:#b91c1c;">غير محدد</span>'}</td>` : ''}
        ${cols.showBed ? `<td style="padding:4px 2px; border:1px solid #cbd5e1; text-align:center; font-family:monospace; font-weight:600; font-size:7.5pt;">${r.bedNumber || '-'}</td>` : ''}
        ${cols.showDischarge ? `<td style="padding:4px 2px; border:1px solid #cbd5e1; text-align:center; font-size:7pt; color:#1e293b;">${r.dischargeType || '-'}</td>` : ''}
        ${cols.showEntryMethod ? `<td style="padding:4px 2px; border:1px solid #cbd5e1; text-align:center; font-size:7pt; color:#64748b;">${r.entryMethod === 'Imported' ? 'سحب آلي' : 'يدوي'}</td>` : ''}
      </tr>`;
    })
    .join('');

  const reportTitle = options?.reportTitle || 'النموذج الرسمي المعتمد لأوقات انتظار الطوارئ (ER for Waiting Time)';
  const hospitalName = options?.hospitalName || 'مستشفى الطوارئ والحالات الحرجة';

  const html = `<!DOCTYPE html>
  <html lang="ar" dir="rtl">
  <head>
    <meta charset="UTF-8">
    <title>ER for Waiting Time - Official Report</title>
    <style>
      @page {
        size: A4 landscape;
        margin: 5mm 6mm 6mm 6mm;
      }
      * {
        box-sizing: border-box;
      }
      html, body {
        width: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
        background: #ffffff !important;
        color: #0f172a;
        font-family: 'Cairo', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Tahoma, Arial, sans-serif;
        font-size: 8pt;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .report-container {
        width: 100%;
        max-width: 100%;
        margin: 0;
        padding: 0;
      }
      .hospital-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 2px solid #0f172a;
        padding-bottom: 5px;
        margin-bottom: 5px;
      }
      .hospital-info h1 {
        margin: 0;
        font-size: 13pt;
        font-weight: 800;
        color: #0f172a;
      }
      .hospital-info p {
        margin: 1px 0 0 0;
        font-size: 8pt;
        color: #64748b;
      }
      .report-stamp {
        text-align: left;
        font-size: 8pt;
        color: #475569;
        font-family: monospace;
      }
      .header-box {
        text-align: center;
        background: #b4c7e7 !important;
        color: #0f172a !important;
        padding: 6px 10px;
        font-size: 11pt;
        font-weight: 800;
        border: 2px solid #1e293b;
        letter-spacing: 0.5px;
      }
      .summary-box {
        display: flex;
        border: 2px solid #1e293b;
        border-top: none;
        font-size: 8.5pt;
        font-weight: 800;
        background: #ffffff;
      }
      .summary-box > div {
        padding: 5px;
        flex: 1;
        text-align: center;
        border-left: 1px solid #1e293b;
        background: #f8fafc;
      }
      .summary-box > div:last-child {
        border-left: none;
      }
      .summary-box > div:first-child {
        background: #ffffff;
        color: #dc2626;
      }
      .summary-box .icu { color: #0284c7; }
      .summary-box .inter { color: #16a34a; }
      .summary-box .inp { color: #7c3aed; }
      .summary-box .un { color: #dc2626; }
      .summary-box .metric-num {
        font-family: monospace;
        font-size: 9.5pt;
        margin-right: 4px;
      }
      table {
        width: 100% !important;
        table-layout: fixed !important;
        border-collapse: collapse;
        margin-top: -1px;
        font-size: 7.5pt;
        border: 2px solid #1e293b;
      }
      thead {
        display: table-header-group;
      }
      tr {
        page-break-inside: avoid;
      }
      th {
        background: #1f3864 !important;
        color: #ffffff !important;
        border: 1px solid #475569;
        padding: 5px 2px;
        text-align: center;
        font-weight: bold;
        font-size: 7.5pt;
        overflow: hidden;
        text-overflow: ellipsis;
        word-break: break-word;
      }
      th.dest-th {
        background: #d97706 !important;
        color: #ffffff !important;
      }
      td {
        border: 1px solid #cbd5e1;
        padding: 4px 2px;
        overflow: hidden;
        text-overflow: ellipsis;
        word-break: break-word;
      }
      tbody tr:nth-child(even) {
        background-color: #f8fafc;
      }
      .legend-strip {
        margin-top: 5px;
        padding: 4px 8px;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        font-size: 7.5pt;
        color: #475569;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .legend-dots {
        display: flex;
        gap: 10px;
      }
      .dot {
        display: inline-block;
        width: 7px;
        height: 7px;
        border-radius: 50%;
        margin-left: 3px;
        vertical-align: middle;
      }
      .dot-green { background: #10b981; }
      .dot-amber { background: #f59e0b; }
      .dot-red { background: #ef4444; }
      .footer-signatures {
        margin-top: 12px;
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
        padding: 6px 10px;
        border-top: 1px dashed #cbd5e1;
        font-size: 8pt;
        color: #1e293b;
      }
      .sig-block {
        text-align: center;
        min-width: 140px;
      }
      .sig-line {
        margin-top: 25px;
        border-top: 1px solid #0f172a;
        padding-top: 3px;
        font-weight: bold;
      }
      @media print {
        @page {
          size: A4 landscape;
          margin: 5mm 6mm 6mm 6mm;
        }
        body { padding: 0 !important; margin: 0 !important; }
        .no-print { display: none !important; }
      }
    </style>
  </head>
  <body>
    <div class="report-container">
      <div class="hospital-header">
        <div class="hospital-info">
          <h1>${hospitalName} - إدارة الطوارئ والحالات الحرجة</h1>
          <p>${reportTitle}</p>
        </div>
        <div class="report-stamp">
          <div>تاريخ الطباعة: <b>${new Date().toLocaleDateString('ar-EG')}</b></div>
          <div>التوقيت: <b>${new Date().toLocaleTimeString('ar-EG')}</b></div>
          <div>عدد الحالات: <b>${total}</b></div>
        </div>
      </div>

      <div class="header-box">ER for Waiting Time - سجل أوقات انتظار الطوارئ</div>
      <div class="summary-box">
        <div>Total Patients Admission: <span class="metric-num">${total}</span></div>
        <div class="icu">ICU: <span class="metric-num">${icu}</span></div>
        <div class="inter">Intermediate: <span class="metric-num">${inter}</span></div>
        <div class="inp">Inpatient: <span class="metric-num">${inp}</span></div>
        <div class="un">Unassigned: <span class="metric-num">${un}</span></div>
      </div>

      <table>
        <thead>
          <tr>
            ${cols.showIndex ? '<th style="width:2.5%;">#</th>' : ''}
            ${cols.showDate ? '<th style="width:6.5%;">Date</th>' : ''}
            ${cols.showName ? '<th style="width:13.5%; text-align:right;">Patient Name</th>' : ''}
            ${cols.showMrn ? '<th style="width:7.5%;">Medical No.</th>' : ''}
            ${cols.showTriage ? '<th style="width:6.5%;">Triage 🚨</th>' : ''}
            ${cols.showContract ? '<th style="width:7.5%;">Contract 💰</th>' : ''}
            ${cols.showOrderTime ? '<th style="width:9.5%;">Transfer Order</th>' : ''}
            ${cols.showActualTime ? '<th style="width:9.5%;">Actual Transfer</th>' : ''}
            ${cols.showDelay ? '<th style="width:8.5%;">Delay</th>' : ''}
            ${cols.showCauses ? '<th style="width:12.5%; text-align:right;">Causes of Delay</th>' : ''}
            ${cols.showDestination ? '<th class="dest-th" style="width:8%;">Destination ➜</th>' : ''}
            ${cols.showBed ? '<th style="width:4%;">Bed #</th>' : ''}
            ${cols.showDischarge ? '<th style="width:8%;">Discharge</th>' : ''}
            ${cols.showEntryMethod ? '<th style="width:5.5%;">Entry</th>' : ''}
          </tr>
        </thead>
        <tbody>
          ${rowsHTML}
        </tbody>
      </table>

      <div class="legend-strip">
        <div class="legend-dots">
          <span><span class="dot dot-green"></span>أقل من 30 دقيقة (ضمن المستهدف)</span>
          <span><span class="dot dot-amber"></span>31-60 دقيقة (تأخير متوسط)</span>
          <span><span class="dot dot-red"></span>أكثر من 60 دقيقة (تأخير حرج)</span>
        </div>
        <div>نظام ER Waiting Time Management - تقرير معتمد رسمي</div>
      </div>

      <div class="footer-signatures">
        <div class="sig-block">
          <div>مسؤول تسجيل الطوارئ</div>
          <div class="sig-line">التوقيع / الختم</div>
        </div>
        <div class="sig-block">
          <div>مشرف التمريض المناوب</div>
          <div class="sig-line">التوقيع / الختم</div>
        </div>
        <div class="sig-block">
          <div>استشاري / مدير قسم الطوارئ</div>
          <div class="sig-line">الاعتماد النهائي</div>
        </div>
      </div>
    </div>
  </body>
  </html>`;

  // Use invisible iframe to print without popup blockers in iframes
  const printFrame = document.createElement('iframe');
  printFrame.style.position = 'fixed';
  printFrame.style.right = '0';
  printFrame.style.bottom = '0';
  printFrame.style.width = '0';
  printFrame.style.height = '0';
  printFrame.style.border = '0';
  document.body.appendChild(printFrame);

  const doc = printFrame.contentWindow?.document;
  if (doc) {
    doc.open();
    doc.write(html);
    doc.close();
    setTimeout(() => {
      try {
        printFrame.contentWindow?.focus();
        printFrame.contentWindow?.print();
      } catch (err) {
        console.error('Print error:', err);
      } finally {
        setTimeout(() => {
          if (document.body.contains(printFrame)) {
            document.body.removeChild(printFrame);
          }
        }, 1500);
      }
    }, 450);
  }
}
