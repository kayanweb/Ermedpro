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

export function printOfficialReport(records: ERRecord[]): void {
  const total = records.length;
  const icu = records.filter(r => r.dept === 'ICU').length;
  const inter = records.filter(r => r.dept === 'Intermediate').length;
  const inp = records.filter(r => r.dept === 'Inpatient').length;
  const un = records.filter(r => !r.dept || (r.dept !== 'ICU' && r.dept !== 'Intermediate' && r.dept !== 'Inpatient')).length;

  const rowsHTML = records
    .map((r, i) => {
      const reasonObj = REASONS.find(x => x.code === r.reason);
      const reasonText = reasonObj ? reasonObj.text : (r.reason || '-');
      const colors = getDelayColorHex(r.delay);

      return `<tr>
        <td style="padding:6px; border:1px solid #334155; text-align:center;">${i + 1}</td>
        <td style="padding:6px; border:1px solid #334155; text-align:center;">${fmtDate(r.order)}</td>
        <td style="padding:6px; border:1px solid #334155; text-align:right; font-weight:bold;">${r.name}</td>
        <td style="padding:6px; border:1px solid #334155; text-align:center; font-family:monospace;">${r.medical}</td>
        <td style="padding:6px; border:1px solid #334155; text-align:center; font-weight:bold; color:#581c87;">${r.contract || 'طوارئ المستشفى'}</td>
        <td style="padding:6px; border:1px solid #334155; text-align:center;">${fmtDateTime(r.order)}</td>
        <td style="padding:6px; border:1px solid #334155; text-align:center;">${r.actual ? fmtDateTime(r.actual) : '-'}</td>
        <td style="padding:6px; border:1px solid #334155; text-align:center; background:${colors.bg}; color:${colors.text}; font-weight:bold;">${r.delay ?? '-'}</td>
        <td style="padding:6px; border:1px solid #334155; text-align:right;">${reasonText}</td>
        <td style="padding:6px; border:1px solid #334155; text-align:center; font-weight:bold;">${r.dept || 'غير محدد'}</td>
      </tr>`;
    })
    .join('');

  const html = `<!DOCTYPE html>
  <html lang="ar" dir="rtl">
  <head>
    <meta charset="UTF-8">
    <title>ER for Waiting Time</title>
    <style>
      @page { size: landscape; margin: 10mm; }
      body { font-family: Arial, Tahoma, sans-serif; color: #000; padding: 10px; margin: 0; }
      .header-box { text-align: center; background: #b4c7e7; color: #000; padding: 10px; font-size: 16pt; font-weight: bold; border: 1px solid #333; }
      .summary-box { display: flex; border: 1px solid #333; border-top: none; font-size: 11pt; font-weight: bold; }
      .summary-box > div { padding: 7px; flex: 1; text-align: center; border-left: 1px solid #333; background: #f8f9fa; }
      .summary-box > div:first-child { background: #fff; color: #dc3545; }
      .summary-box .icu { color: #0d6efd; }
      .summary-box .inter { color: #198754; }
      .summary-box .inp { color: #6f42c1; }
      .summary-box .un { color: #dc3545; }
      table { width: 100%; border-collapse: collapse; margin-top: 0; font-size: 10pt; }
      th { background: #1f3864; color: #fff; border: 1px solid #333; padding: 8px 4px; text-align: center; font-weight: bold; }
      td { border: 1px solid #333; }
      .footer { margin-top: 15px; display: flex; justify-content: space-between; font-size: 11px; color: #555; }
    </style>
  </head>
  <body>
    <div class="header-box">ER for Waiting Time</div>
    <div class="summary-box">
      <div>Total Patients Admission: ${total}</div>
      <div class="icu">ICU: ${icu}</div>
      <div class="inter">Intermediate: ${inter}</div>
      <div class="inp">Inpatient: ${inp}</div>
      <div class="un">Unassigned: ${un}</div>
    </div>
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Date</th>
          <th>Patient Name</th>
          <th>Medical No.</th>
          <th>Contract (التعاقد)</th>
          <th>Transfer Order Time</th>
          <th>Actual Transfer Time</th>
          <th>Delay /Minutes</th>
          <th>Causes of Delay</th>
          <th>Destination</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHTML}
      </tbody>
    </table>
    <div class="footer">
      <div>تاريخ وتوقيت الطباعة: ${new Date().toLocaleString('ar-EG')}</div>
      <div>نظام ER Waiting Time Management</div>
      <div>اعتماد مسؤول الطوارئ: ........................</div>
    </div>
  </body>
  </html>`;

  const win = window.open('', '_blank');
  if (win) {
    win.document.write(html);
    win.document.close();
    setTimeout(() => {
      win.focus();
      win.print();
    }, 400);
  }
}
