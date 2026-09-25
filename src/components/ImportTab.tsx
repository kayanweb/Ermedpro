import React, { useState, useEffect, useMemo } from 'react';
import { DepartmentType, ERRecord } from '../types';
import { REASONS, DEPARTMENTS, CONTRACT_TYPES, CAME_FROM_OPTIONS, SAMPLE_HIS_DATA, SAMPLE_SIMPLE_DATA } from '../constants';
import { parseFullDateTime, toLocalDatetimeInput, calcMinutesDiff, fmtDateTime } from '../utils/dateTime';
import { formatErrorMessage } from '../utils/errorUtils';
import { DoctorSelect } from './DoctorSelect';
import {
  UploadCloud,
  CheckCircle,
  FileText,
  Sparkles,
  AlertCircle,
  Edit3,
  Trash2,
  CheckSquare,
  Square,
  Plus,
  ArrowRight,
  Filter,
  Search,
  Clock,
  Building2,
  User,
  ShieldCheck,
  Check,
  X,
  RefreshCw,
  CreditCard,
  Ambulance,
  Stethoscope,
} from 'lucide-react';

interface ImportTabProps {
  onImportSuccess: (newRecords: ERRecord[]) => void;
  currentUserName: string;
}

export interface StagedCase {
  id: string;
  medical: string;
  name: string;
  dept: string;
  order: string; // YYYY-MM-DDTHH:mm
  actual?: string; // YYYY-MM-DDTHH:mm
  delay: number | null;
  reason: string;
  notes: string;
  status: 'Pending' | 'Transferred';
  bedNumber?: string;
  contract?: string;
  cameFrom?: string;
  visitNo?: string;
  doctorName?: string;
  diagnosis?: string;
  registrationType?: string;
  selected: boolean;
  isEdited?: boolean;
}

export const ImportTab: React.FC<ImportTabProps> = ({ onImportSuccess, currentUserName }) => {
  const [pasteText, setPasteText] = useState('');
  const [parsedRows, setParsedRows] = useState<string[][] | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [defaultDept, setDefaultDept] = useState<string>('Inpatient');
  const [defaultReason, setDefaultReason] = useState<string>('R01');
  const [defaultContract, setDefaultContract] = useState<string>('طوارئ المستشفى');

  // Mapping indices (-1 means unmapped)
  const [mapEntryDate, setMapEntryDate] = useState<number>(-1);
  const [mapEntryTime, setMapEntryTime] = useState<number>(-1);
  const [mapExitDate, setMapExitDate] = useState<number>(-1);
  const [mapExitTime, setMapExitTime] = useState<number>(-1);
  const [mapName, setMapName] = useState<number>(-1);
  const [mapMedical, setMapMedical] = useState<number>(-1);
  const [mapContract, setMapContract] = useState<number>(-1);
  const [mapCameFrom, setMapCameFrom] = useState<number>(-1);
  const [mapVisitNo, setMapVisitNo] = useState<number>(-1);
  const [mapDoctor, setMapDoctor] = useState<number>(-1);

  // Staged cases ready for editing before commit
  const [stagedCases, setStagedCases] = useState<StagedCase[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Transferred' | 'Pending' | 'critical'>('all');

  // Modal editing single case
  const [editingCase, setEditingCase] = useState<StagedCase | null>(null);

  // Modal for final confirmation before committing
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);

  // Bulk action state
  const [bulkDept, setBulkDept] = useState<string>('');
  const [bulkReason, setBulkReason] = useState<string>('');
  const [bulkContract, setBulkContract] = useState<string>('');

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  const detectDelimiter = (lines: string[]): string => {
    const delims = ['\t', '|', ';', ','];
    let best = '\t';
    let bestScore = 0;
    const testSample = lines.slice(0, Math.min(8, lines.length));

    for (const d of delims) {
      const counts = testSample.map(l => l.split(d).length);
      const avg = counts.reduce((a, b) => a + b, 0) / counts.length;
      if (avg > bestScore && avg > 1) {
        bestScore = avg;
        best = d;
      }
    }
    return best;
  };

  const isHeaderRow = (cells: string[]): boolean => {
    const txt = cells.join(' ').toLowerCase();
    const keywords = [
      'name',
      'date',
      'time',
      'medical',
      'patient',
      'entry',
      'exit',
      'mrn',
      'added',
      'closed',
      'status',
      'visit',
      'اسم',
      'تاريخ',
      'وقت',
      'رقم',
      'مريض',
      'دخول',
      'خروج',
      'طبي',
      'قسم',
    ];
    return keywords.some(k => txt.includes(k));
  };

  const autoDetectColumns = (colHeaders: string[]) => {
    const lower = colHeaders.map(x => String(x).toLowerCase());
    const used = new Set<number>();

    const detect = (keys: string[]): number => {
      for (let i = 0; i < lower.length; i++) {
        if (used.has(i)) continue;
        if (keys.some(k => lower[i].includes(k))) {
          used.add(i);
          return i;
        }
      }
      return -1;
    };

    const entryD = detect(['added date', 'added', 'entry', 'دخول', 'admission', 'order', 'check in']);
    const exitD = detect(['closed date', 'discharge date', 'exit date', 'خروج']);
    const exitT = detect(['closed time', 'discharge time', 'exit time', 'وقت الخروج']);
    const nameCol = detect(['name', 'patient', 'مريض', 'اسم']);
    const medCol = detect(['mrn', 'medical', 'file', 'رقم الطبى', 'رقم طبي', 'id', 'ملف']);
    const entryT = detect(['added time', 'entry time', 'وقت الدخول']);
    const contractCol = detect(['fin. type', 'fin type', 'contract', 'تعاقد', 'التعاقد', 'جهة التعاقد', 'جهة مالية', 'تأمين', 'financial', 'شركة']);
    const cameFromCol = detect(['came from', 'من أين', 'طريقة الحضور', 'جهة الحضور', 'جهة الوصول', 'arrival', 'origin', 'مصدر']);
    const visitCol = detect(['visit no', 'visit', 'زيارة', 'رقم الزيارة', 'encounter']);
    const docCol = detect(['doctor', 'physician', 'طبيب', 'الدكتور', 'المعالج']);

    setMapEntryDate(entryD);
    setMapEntryTime(entryT);
    setMapExitDate(exitD);
    setMapExitTime(exitT);
    setMapName(nameCol);
    setMapMedical(medCol);
    setMapContract(contractCol);
    setMapCameFrom(cameFromCol);
    setMapVisitNo(visitCol);
    setMapDoctor(docCol);

    return { entryD, entryT, exitD, exitT, nameCol, medCol, contractCol, cameFromCol, visitCol, docCol };
  };

  // Convert raw rows and mapping into editable staged cases
  const buildStagedCases = (
    rows: string[][],
    eDateIdx: number,
    eTimeIdx: number,
    xDateIdx: number,
    xTimeIdx: number,
    nameIdx: number,
    medIdx: number,
    dept: string,
    reason: string,
    contractIdx: number = mapContract,
    cameFromIdx: number = mapCameFrom,
    visitNoIdx: number = mapVisitNo,
    doctorIdx: number = mapDoctor,
    defContract: string = defaultContract
  ): StagedCase[] => {
    const cases: StagedCase[] = [];

    rows.forEach((row, idx) => {
      const eDateStr = eDateIdx >= 0 ? (row[eDateIdx] || '').trim() : '';
      const eTimeStr = eTimeIdx >= 0 ? (row[eTimeIdx] || '').trim() : '';
      const xDateStr = xDateIdx >= 0 ? (row[xDateIdx] || '').trim() : '';
      const xTimeStr = xTimeIdx >= 0 ? (row[xTimeIdx] || '').trim() : '';
      const name = nameIdx >= 0 ? (row[nameIdx] || '').trim() : `مريض ${idx + 1}`;
      const medical = medIdx >= 0 ? (row[medIdx] || '').trim() : `MRN-${idx + 1}`;
      const contract = contractIdx >= 0 ? (row[contractIdx] || '').trim() : '';
      const cameFrom = cameFromIdx >= 0 ? (row[cameFromIdx] || '').trim() : '';
      const visitNo = visitNoIdx >= 0 ? (row[visitNoIdx] || '').trim() : '';
      const doctorName = doctorIdx >= 0 ? (row[doctorIdx] || '').trim() : '';

      if (!name && !medical) return;

      const eDate = parseFullDateTime(eDateStr, eTimeStr) || new Date();
      const xDate = parseFullDateTime(xDateStr, xTimeStr);

      let delay: number | null = null;
      if (xDate) {
        delay = Math.max(0, Math.round((xDate.getTime() - eDate.getTime()) / 60000));
      }

      cases.push({
        id: `staged-${idx + 1}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        medical: medical || `MRN-${idx + 1}`,
        name: name || `مريض ${idx + 1}`,
        dept: dept || 'Inpatient',
        order: toLocalDatetimeInput(eDate),
        actual: xDate ? toLocalDatetimeInput(xDate) : undefined,
        delay,
        reason: reason || 'R01',
        notes: 'مستورد من نظام HIS المستشفى',
        status: xDate ? 'Transferred' : 'Pending',
        contract: contract || defContract || 'طوارئ المستشفى',
        cameFrom: cameFrom || 'من المنزل',
        visitNo: visitNo || undefined,
        doctorName: doctorName || currentUserName,
        selected: true,
        isEdited: false,
      });
    });

    return cases;
  };

  const handleParse = () => {
    const text = pasteText.trim();
    if (!text) {
      setFeedback({ type: 'error', message: 'يرجى لصق بيانات HIS أولاً في الصندوق أدناه' });
      return;
    }

    const lines = text.split(/\r?\n/).filter(l => l.trim());
    if (!lines.length) {
      setFeedback({ type: 'error', message: 'لم يتم العثور على أسطر صالحة' });
      return;
    }

    const delim = detectDelimiter(lines);
    const rawRows = lines.map(l => l.split(delim).map(c => c.trim().replace(/^"|"$/g, '')));
    const firstRow = rawRows[0];
    const hasHeaders = isHeaderRow(firstRow);

    const colHeaders = hasHeaders ? firstRow : firstRow.map((_, i) => `عمود ${i + 1}`);
    const dataRows = (hasHeaders ? rawRows.slice(1) : rawRows).filter(r => r.some(c => c));

    if (!dataRows.length) {
      setFeedback({ type: 'error', message: 'لا توجد صفوف بيانات صالحة بعد التحليل' });
      return;
    }

    setHeaders(colHeaders);
    setParsedRows(dataRows);
    const detected = autoDetectColumns(colHeaders);

    const initialStaged = buildStagedCases(
      dataRows,
      detected.entryD,
      detected.entryT,
      detected.exitD,
      detected.exitT,
      detected.nameCol,
      detected.medCol,
      defaultDept,
      defaultReason,
      detected.contractCol,
      detected.cameFromCol,
      detected.visitCol,
      detected.docCol,
      defaultContract
    );
    setStagedCases(initialStaged);

    setFeedback({
      type: 'success',
      message: `تم تحليل البيانات بنجاح: تم التعرف على ${initialStaged.length} حالة وقراءة جهات التعاقد وحقول المستشفى بنجاح للمراجعة والتعديل قبل اعتماد النقل.`,
    });
  };

  // Re-sync staged cases when column mapping changes, preserving manual edits if possible
  const handleMappingChange = (
    newEDate = mapEntryDate,
    newETime = mapEntryTime,
    newXDate = mapExitDate,
    newXTime = mapExitTime,
    newName = mapName,
    newMed = mapMedical,
    newContract = mapContract,
    newCameFrom = mapCameFrom,
    newVisitNo = mapVisitNo,
    newDoctor = mapDoctor,
    newDefContract = defaultContract
  ) => {
    if (!parsedRows) return;
    const updated = buildStagedCases(
      parsedRows,
      newEDate,
      newETime,
      newXDate,
      newXTime,
      newName,
      newMed,
      defaultDept,
      defaultReason,
      newContract,
      newCameFrom,
      newVisitNo,
      newDoctor,
      newDefContract
    );
    // Preserve custom edits on existing staged records if matched by index
    const merged = updated.map((rec, i) => {
      const existing = stagedCases[i];
      if (existing && existing.isEdited) {
        return { ...rec, ...existing };
      }
      return rec;
    });
    setStagedCases(merged);
  };

  const handleClear = () => {
    setPasteText('');
    setParsedRows(null);
    setHeaders([]);
    setStagedCases([]);
    setFeedback(null);
    setEditingCase(null);
  };

  // Staged cases row operations
  const handleUpdateStagedRow = (updated: StagedCase) => {
    // Recalculate delay
    let calculatedDelay = updated.delay;
    if (updated.order && updated.actual) {
      calculatedDelay = calcMinutesDiff(updated.order, updated.actual);
    } else if (!updated.actual) {
      calculatedDelay = null;
    }

    const finalCase: StagedCase = {
      ...updated,
      delay: calculatedDelay,
      status: updated.actual ? 'Transferred' : 'Pending',
      isEdited: true,
    };

    setStagedCases(prev => prev.map(c => (c.id === finalCase.id ? finalCase : c)));
    setEditingCase(null);
    setFeedback({
      type: 'info',
      message: `تم تعديل بيانات المريض (${finalCase.name}) بنجاح في جدول المراجعة قبل الاعتماد.`,
    });
  };

  const handleDeleteStagedRow = (id: string) => {
    setStagedCases(prev => prev.filter(c => c.id !== id));
  };

  const handleToggleSelectRow = (id: string) => {
    setStagedCases(prev => prev.map(c => (c.id === id ? { ...c, selected: !c.selected } : c)));
  };

  const handleToggleSelectAll = () => {
    const allSelected = stagedCases.every(c => c.selected);
    setStagedCases(prev => prev.map(c => ({ ...c, selected: !allSelected })));
  };

  // Quick inline changes
  const handleInlineDeptChange = (id: string, newDept: string) => {
    setStagedCases(prev =>
      prev.map(c => (c.id === id ? { ...c, dept: newDept, isEdited: true } : c))
    );
  };

  const handleInlineReasonChange = (id: string, newReason: string) => {
    setStagedCases(prev =>
      prev.map(c => (c.id === id ? { ...c, reason: newReason, isEdited: true } : c))
    );
  };

  const handleInlineContractChange = (id: string, newContract: string) => {
    setStagedCases(prev =>
      prev.map(c => (c.id === id ? { ...c, contract: newContract, isEdited: true } : c))
    );
  };

  // Bulk Apply
  const handleApplyBulkDept = () => {
    if (!bulkDept) return;
    setStagedCases(prev =>
      prev.map(c => (c.selected ? { ...c, dept: bulkDept, isEdited: true } : c))
    );
    setFeedback({
      type: 'success',
      message: `تم تطبيق قسم (${bulkDept}) على جميع الحالات المحددة بنجاح.`,
    });
  };

  const handleApplyBulkReason = () => {
    if (!bulkReason) return;
    setStagedCases(prev =>
      prev.map(c => (c.selected ? { ...c, reason: bulkReason, isEdited: true } : c))
    );
    setFeedback({
      type: 'success',
      message: `تم تطبيق سبب التأخير المحدد على الحالات المختارة بنجاح.`,
    });
  };

  const handleApplyBulkContract = () => {
    if (!bulkContract) return;
    setStagedCases(prev =>
      prev.map(c => (c.selected ? { ...c, contract: bulkContract, isEdited: true } : c))
    );
    setFeedback({
      type: 'success',
      message: `تم تطبيق جهة التعاقد (${bulkContract}) على الحالات المحددة بنجاح.`,
    });
  };

  const handleDeleteSelected = () => {
    const remaining = stagedCases.filter(c => !c.selected);
    const removedCount = stagedCases.length - remaining.length;
    setStagedCases(remaining);
    setFeedback({
      type: 'info',
      message: `تم استبعاد ${removedCount} حالة من جدول الاستيراد.`,
    });
  };

  // Add a manual row to staged table
  const handleAddManualStagedCase = () => {
    const now = new Date();
    const newCase: StagedCase = {
      id: `staged-manual-${Date.now()}`,
      medical: `MRN-${Math.floor(100000 + Math.random() * 900000)}`,
      name: 'مريض جديد',
      dept: defaultDept || 'Inpatient',
      order: toLocalDatetimeInput(now),
      actual: undefined,
      delay: null,
      reason: defaultReason || 'R01',
      notes: 'إضافة يدوية أثناء المراجعة',
      status: 'Pending',
      contract: defaultContract || 'طوارئ المستشفى',
      cameFrom: 'من المنزل',
      doctorName: currentUserName,
      selected: true,
      isEdited: true,
    };
    setStagedCases(prev => [newCase, ...prev]);
    setEditingCase(newCase);
  };

  // Final Commit to Neon Cloud DB
  const handleFinalCommit = () => {
    const selectedCases = stagedCases.filter(c => c.selected);
    if (!selectedCases.length) {
      setFeedback({ type: 'error', message: 'يرجى تحديد حالة واحدة على الأقل للاعتماد' });
      return;
    }

    const recordsToImport: ERRecord[] = selectedCases.map((c, idx) => ({
      id: `his-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
      medical: c.medical.trim(),
      name: c.name.trim(),
      dept: c.dept.trim() || defaultDept,
      order: c.order,
      actual: c.actual || undefined,
      delay: c.delay,
      reason: c.reason,
      notes: c.notes,
      status: c.status,
      bedNumber: c.bedNumber || undefined,
      contract: c.contract || defaultContract || 'طوارئ المستشفى',
      cameFrom: c.cameFrom || 'من المنزل',
      visitNo: c.visitNo || undefined,
      registrationType: c.registrationType || 'Emergency',
      doctorName: c.doctorName || currentUserName,
      diagnosis: c.diagnosis || undefined,
      entryMethod: 'Import',
      recordedBy: currentUserName,
      recordedAt: new Date().toISOString(),
    }));

    setShowConfirmModal(false);
    onImportSuccess(recordsToImport);
  };

  // Filtered view of staged cases
  const filteredStagedCases = useMemo(() => {
    return stagedCases.filter(c => {
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const match =
          c.name.toLowerCase().includes(q) ||
          c.medical.toLowerCase().includes(q) ||
          c.dept.toLowerCase().includes(q);
        if (!match) return false;
      }
      if (statusFilter === 'Transferred' && c.status !== 'Transferred') return false;
      if (statusFilter === 'Pending' && c.status !== 'Pending') return false;
      if (statusFilter === 'critical' && ((c.delay || 0) <= 60 || c.status !== 'Transferred')) return false;
      return true;
    });
  }, [stagedCases, searchTerm, statusFilter]);

  const totalCount = stagedCases.length;
  const selectedCount = stagedCases.filter(c => c.selected).length;
  const editedCount = stagedCases.filter(c => c.isEdited).length;
  const transferredCount = stagedCases.filter(c => c.status === 'Transferred').length;
  const pendingCount = stagedCases.filter(c => c.status === 'Pending').length;
  const criticalCount = stagedCases.filter(c => (c.delay || 0) > 60).length;

  return (
    <div className="space-y-6">
      {/* Import Guidance Card */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2.5 rounded-xl bg-blue-100 text-blue-700">
            <UploadCloud className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">استيراد حالات من نظام المستشفى (HIS)</h2>
            <p className="text-xs text-slate-500">
              انسخ جدول الحالات من نظام HIS بالمستشفى والصقه هنا لمراجعته وتعديل أي بيانات قبل اعتماد الحفظ النهائي في شيت ER
            </p>
          </div>
        </div>

        <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-4 text-xs text-slate-700 space-y-2">
          <div className="font-bold text-blue-900 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-blue-600" />
            <span>خطوات الاستيراد مع التعديل قبل الاعتماد:</span>
          </div>
          <ol className="list-decimal list-inside space-y-1 text-slate-600 pr-1">
            <li>الصق صفوف جدول HIS أو ملف Excel في الصندوق أدناه واضغط <b>تحليل البيانات</b>.</li>
            <li>سيقوم النظام تلقائياً بتوليد <b>جدول المعاينة والتعديل المباشر</b>.</li>
            <li>
              <b>يمكنك تعديل أي مريض، تغيير القسم، تعديل وقت الطلب أو النقل، أو استبعاد صفوف</b> بكل مرونة قبل الحفظ.
            </li>
            <li>اضغط <b>اعتماد الحفظ ونقل الحالات للشيت</b> لحفظ البيانات المعدلة في قاعدة البيانات الرسمية.</li>
          </ol>
        </div>

        {/* Feedback alert */}
        {feedback && (
          <div
            className={`mt-4 p-3.5 rounded-xl text-xs flex items-center justify-between gap-2 border ${
              feedback.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : feedback.type === 'error'
                ? 'bg-rose-50 border-rose-200 text-rose-800'
                : 'bg-blue-50 border-blue-200 text-blue-800'
            }`}
          >
            <div className="flex items-center gap-2">
              {feedback.type === 'success' ? (
                <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              )}
              <span>{feedback.message}</span>
            </div>
            <button
              onClick={() => setFeedback(null)}
              className="text-slate-400 hover:text-slate-600"
            >
              ✕
            </button>
          </div>
        )}

        {/* Paste Box */}
        <div className="mt-4">
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            صندوق لصق بيانات HIS (Paste HIS Data):
          </label>
          <textarea
            id="his-paste-textarea"
            value={pasteText}
            onChange={e => setPasteText(e.target.value)}
            placeholder="انسخ صفوف التقرير من نظام HIS أو Excel والصقها هنا..."
            rows={6}
            className="w-full p-3.5 font-mono text-xs bg-slate-50 border-2 border-dashed border-blue-300 rounded-xl focus:bg-white focus:border-blue-600 outline-hidden transition text-slate-800"
          />
        </div>

        {/* Action Buttons */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            id="parse-his-btn"
            onClick={handleParse}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-500/20 transition flex items-center gap-2 cursor-pointer"
          >
            <span>🔍 تحليل البيانات وتحضيرها للمراجعة والتعديل</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setPasteText(SAMPLE_HIS_DATA);
              setFeedback({ type: 'info', message: 'تم تحميل نموذج HIS المعتمد. اضغط الآن "تحليل البيانات".' });
            }}
            className="px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-semibold text-xs rounded-xl transition cursor-pointer"
          >
            📋 نموذج HIS المستشفى
          </button>

          <button
            type="button"
            onClick={() => {
              setPasteText(SAMPLE_SIMPLE_DATA);
              setFeedback({ type: 'info', message: 'تم تحميل النموذج المبسط. اضغط الآن "تحليل البيانات".' });
            }}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 font-semibold text-xs rounded-xl transition cursor-pointer"
          >
            📋 نموذج مبسط
          </button>

          <button
            type="button"
            onClick={handleClear}
            className="px-4 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 text-xs rounded-xl transition cursor-pointer mr-auto"
          >
            🧹 تفريغ
          </button>
        </div>
      </div>

      {/* Mapping and Staging Section */}
      {stagedCases.length > 0 && (
        <div className="space-y-6">
          {/* 1. Column Mapping Accordion / Controls */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <span>ربط الأعمدة الافتراضية (Column Mapping)</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 font-normal">
                    تم التعرف على {headers.length} أعمدة
                  </span>
                </h3>
                <p className="text-xs text-slate-500">
                  يمكنك مراجعة ربط الأعمدة أو الانتقال مباشرة للتعديل الفردي والجماعي للحالات أدناه
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              {/* Entry Datetime Mapping */}
              <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-200 space-y-2.5">
                <div className="font-bold text-blue-900">🟢 وقت طلب النقل / الدخول</div>
                <div>
                  <label className="block text-slate-600 mb-1 font-semibold">عمود التاريخ *</label>
                  <select
                    value={mapEntryDate}
                    onChange={e => {
                      const val = parseInt(e.target.value, 10);
                      setMapEntryDate(val);
                      handleMappingChange(val, mapEntryTime, mapExitDate, mapExitTime, mapName, mapMedical, mapContract, mapCameFrom, mapVisitNo, mapDoctor);
                    }}
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg outline-hidden"
                  >
                    <option value={-1}>-- اختر العمود --</option>
                    {headers.map((h, i) => (
                      <option key={i} value={i}>
                        {h} (عمود {i + 1})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 mb-1 font-semibold">عمود الوقت (إذا كان منفصلاً)</label>
                  <select
                    value={mapEntryTime}
                    onChange={e => {
                      const val = parseInt(e.target.value, 10);
                      setMapEntryTime(val);
                      handleMappingChange(mapEntryDate, val, mapExitDate, mapExitTime, mapName, mapMedical, mapContract, mapCameFrom, mapVisitNo, mapDoctor);
                    }}
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg outline-hidden"
                  >
                    <option value={-1}>-- مدمج في عمود التاريخ --</option>
                    {headers.map((h, i) => (
                      <option key={i} value={i}>
                        {h} (عمود {i + 1})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Exit Datetime Mapping */}
              <div className="p-3.5 rounded-xl bg-rose-50/60 border border-rose-200 space-y-2.5">
                <div className="font-bold text-rose-900">🔴 وقت النقل الفعلي / الخروج</div>
                <div>
                  <label className="block text-slate-600 mb-1 font-semibold">عمود التاريخ *</label>
                  <select
                    value={mapExitDate}
                    onChange={e => {
                      const val = parseInt(e.target.value, 10);
                      setMapExitDate(val);
                      handleMappingChange(mapEntryDate, mapEntryTime, val, mapExitTime, mapName, mapMedical, mapContract, mapCameFrom, mapVisitNo, mapDoctor);
                    }}
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg outline-hidden"
                  >
                    <option value={-1}>-- اختر العمود --</option>
                    {headers.map((h, i) => (
                      <option key={i} value={i}>
                        {h} (عمود {i + 1})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 mb-1 font-semibold">عمود الوقت (إذا كان منفصلاً)</label>
                  <select
                    value={mapExitTime}
                    onChange={e => {
                      const val = parseInt(e.target.value, 10);
                      setMapExitTime(val);
                      handleMappingChange(mapEntryDate, mapEntryTime, mapExitDate, val, mapName, mapMedical, mapContract, mapCameFrom, mapVisitNo, mapDoctor);
                    }}
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg outline-hidden"
                  >
                    <option value={-1}>-- مدمج في عمود التاريخ --</option>
                    {headers.map((h, i) => (
                      <option key={i} value={i}>
                        {h} (عمود {i + 1})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Patient Data & Defaults */}
              <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200 space-y-2.5">
                <div className="font-bold text-emerald-900">👤 أعمدة المريض والقيم الافتراضية</div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-600 mb-1 font-semibold">اسم المريض *</label>
                    <select
                      value={mapName}
                      onChange={e => {
                        const val = parseInt(e.target.value, 10);
                        setMapName(val);
                        handleMappingChange(mapEntryDate, mapEntryTime, mapExitDate, mapExitTime, val, mapMedical, mapContract, mapCameFrom, mapVisitNo, mapDoctor);
                      }}
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg outline-hidden"
                    >
                      <option value={-1}>-- اختر --</option>
                      {headers.map((h, i) => (
                        <option key={i} value={i}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-1 font-semibold">الرقم الطبي (MRN) *</label>
                    <select
                      value={mapMedical}
                      onChange={e => {
                        const val = parseInt(e.target.value, 10);
                        setMapMedical(val);
                        handleMappingChange(mapEntryDate, mapEntryTime, mapExitDate, mapExitTime, mapName, val, mapContract, mapCameFrom, mapVisitNo, mapDoctor);
                      }}
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg outline-hidden"
                    >
                      <option value={-1}>-- اختر --</option>
                      {headers.map((h, i) => (
                        <option key={i} value={i}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-600 mb-1 font-semibold">القسم الافتراضي</label>
                    <select
                      value={defaultDept}
                      onChange={e => setDefaultDept(e.target.value)}
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg outline-hidden font-semibold"
                    >
                      <option value="Inpatient">Inpatient (داخلي)</option>
                      <option value="ICU">ICU (عناية مركزة)</option>
                      <option value="Intermediate">Intermediate (متوسطة)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-1 font-semibold">سبب التأخير الافتراضي</label>
                    <select
                      value={defaultReason}
                      onChange={e => setDefaultReason(e.target.value)}
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg outline-hidden font-semibold"
                    >
                      {REASONS.map(r => (
                        <option key={r.code} value={r.code}>
                          {r.code} - {r.textAr}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Hospital Contract & Admin Data Mapping */}
              <div className="p-3.5 rounded-xl bg-purple-50/60 border border-purple-200 space-y-2.5">
                <div className="font-bold text-purple-900 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-purple-700" />
                  <span>التعاقد وحقول المستشفى الإدارية</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-600 mb-1 font-semibold">عمود التعاقد (Fin. Type)</label>
                    <select
                      value={mapContract}
                      onChange={e => {
                        const val = parseInt(e.target.value, 10);
                        setMapContract(val);
                        handleMappingChange(mapEntryDate, mapEntryTime, mapExitDate, mapExitTime, mapName, mapMedical, val, mapCameFrom, mapVisitNo, mapDoctor);
                      }}
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg outline-hidden"
                    >
                      <option value={-1}>-- افتراضي --</option>
                      {headers.map((h, i) => (
                        <option key={i} value={i}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-1 font-semibold">عمود طريقة الحضور</label>
                    <select
                      value={mapCameFrom}
                      onChange={e => {
                        const val = parseInt(e.target.value, 10);
                        setMapCameFrom(val);
                        handleMappingChange(mapEntryDate, mapEntryTime, mapExitDate, mapExitTime, mapName, mapMedical, mapContract, val, mapVisitNo, mapDoctor);
                      }}
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg outline-hidden"
                    >
                      <option value={-1}>-- غير محدد --</option>
                      {headers.map((h, i) => (
                        <option key={i} value={i}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-600 mb-1 font-semibold">عمود رقم الزيارة</label>
                    <select
                      value={mapVisitNo}
                      onChange={e => {
                        const val = parseInt(e.target.value, 10);
                        setMapVisitNo(val);
                        handleMappingChange(mapEntryDate, mapEntryTime, mapExitDate, mapExitTime, mapName, mapMedical, mapContract, mapCameFrom, val, mapDoctor);
                      }}
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg outline-hidden"
                    >
                      <option value={-1}>-- غير محدد --</option>
                      {headers.map((h, i) => (
                        <option key={i} value={i}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-slate-600 font-semibold">التعاقد الافتراضي</label>
                      <button
                        type="button"
                        onClick={() => {
                          const isPreset = CONTRACT_TYPES.some(c => c.nameAr === defaultContract);
                          if (isPreset) {
                            setDefaultContract('');
                          } else {
                            setDefaultContract('طوارئ المستشفى');
                          }
                        }}
                        className="text-[10px] text-purple-600 hover:text-purple-800 font-bold cursor-pointer"
                      >
                        ✏️ كتابة يدوية / قائمة
                      </button>
                    </div>
                    <select
                      value={CONTRACT_TYPES.some(c => c.nameAr === defaultContract) ? defaultContract : 'other'}
                      onChange={e => {
                        if (e.target.value === 'other') {
                          setDefaultContract('');
                        } else {
                          setDefaultContract(e.target.value);
                          handleMappingChange(mapEntryDate, mapEntryTime, mapExitDate, mapExitTime, mapName, mapMedical, mapContract, mapCameFrom, mapVisitNo, mapDoctor, e.target.value);
                        }
                      }}
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg outline-hidden font-semibold"
                    >
                      {CONTRACT_TYPES.map(c => (
                        <option key={c.id} value={c.id === 'other' ? 'other' : c.nameAr}>
                          {c.nameAr}
                        </option>
                      ))}
                    </select>
                    {!CONTRACT_TYPES.some(c => c.nameAr === defaultContract) && (
                      <input
                        type="text"
                        value={defaultContract}
                        onChange={e => {
                          setDefaultContract(e.target.value);
                          handleMappingChange(mapEntryDate, mapEntryTime, mapExitDate, mapExitTime, mapName, mapMedical, mapContract, mapCameFrom, mapVisitNo, mapDoctor, e.target.value);
                        }}
                        placeholder="اكتب التعاقد الافتراضي يدوياً..."
                        className="w-full mt-1.5 p-2 bg-purple-50/40 border border-purple-300 rounded-lg text-xs font-semibold text-slate-900 outline-none"
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Staged Cases Management & Editing Table */}
          <div className="bg-white rounded-2xl p-6 border-2 border-emerald-500/40 shadow-md space-y-4">
            {/* Header & Metrics Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
                    <Edit3 className="w-5 h-5" />
                  </span>
                  <h3 className="text-base font-bold text-slate-900">
                    مراجعة وتعديل الحالات قبل اعتماد النقل للشيت
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  قم بتعديل أي حالة (الاسم، الرقم الطبي، القسم، وقت الطلب، وقت النقل الفعلي، أو سبب التأخير) قبل حفظها رسمياً
                </p>
              </div>

              {/* Status Badges */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full font-bold">
                  إجمالي: {totalCount}
                </span>
                <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full font-bold">
                  منقولة: {transferredCount}
                </span>
                <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full font-bold">
                  انتظار: {pendingCount}
                </span>
                {criticalCount > 0 && (
                  <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full font-bold animate-pulse">
                    تأخير حرج: {criticalCount}
                  </span>
                )}
                {editedCount > 0 && (
                  <span className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full font-bold">
                    معدلة يدوياً: {editedCount}
                  </span>
                )}
              </div>
            </div>

            {/* Bulk Toolbar & Controls */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleToggleSelectAll}
                  className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg text-slate-700 font-semibold flex items-center gap-1.5"
                >
                  {stagedCases.every(c => c.selected) ? (
                    <CheckSquare className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <Square className="w-4 h-4 text-slate-400" />
                  )}
                  <span>تحديد الكل ({selectedCount})</span>
                </button>

                {/* Bulk Dept */}
                <div className="flex items-center gap-1">
                  <select
                    value={bulkDept}
                    onChange={e => setBulkDept(e.target.value)}
                    className="p-1.5 bg-white border border-slate-300 rounded-lg outline-hidden"
                  >
                    <option value="">-- تعيين قسم للمحدد --</option>
                    <option value="Inpatient">الأقسام الداخلية (Inpatient)</option>
                    <option value="ICU">العناية المركزة (ICU)</option>
                    <option value="Intermediate">الرعاية المتوسطة (Intermediate)</option>
                  </select>
                  <button
                    type="button"
                    onClick={handleApplyBulkDept}
                    disabled={!bulkDept || selectedCount === 0}
                    className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-lg font-bold"
                  >
                    تطبيق
                  </button>
                </div>

                {/* Bulk Reason */}
                <div className="flex items-center gap-1">
                  <select
                    value={bulkReason}
                    onChange={e => setBulkReason(e.target.value)}
                    className="p-1.5 bg-white border border-slate-300 rounded-lg outline-hidden max-w-[160px] truncate"
                  >
                    <option value="">-- سبب التأخير للمحدد --</option>
                    {REASONS.map(r => (
                      <option key={r.code} value={r.code}>
                        {r.code} - {r.textAr}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleApplyBulkReason}
                    disabled={!bulkReason || selectedCount === 0}
                    className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-lg font-bold cursor-pointer"
                  >
                    تطبيق
                  </button>
                </div>

                {/* Bulk Contract */}
                <div className="flex items-center gap-1">
                  <select
                    value={bulkContract}
                    onChange={e => setBulkContract(e.target.value)}
                    className="p-1.5 bg-white border border-slate-300 rounded-lg outline-hidden max-w-[160px] truncate"
                  >
                    <option value="">-- تعيين تعاقد للمحدد --</option>
                    {CONTRACT_TYPES.map(c => (
                      <option key={c.id} value={c.nameAr}>
                        {c.nameAr}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleApplyBulkContract}
                    disabled={!bulkContract || selectedCount === 0}
                    className="px-2.5 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white rounded-lg font-bold cursor-pointer"
                  >
                    تطبيق
                  </button>
                </div>

                {selectedCount > 0 && (
                  <button
                    type="button"
                    onClick={handleDeleteSelected}
                    className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 rounded-lg font-bold flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>استبعاد المحدد ({selectedCount})</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleAddManualStagedCase}
                  className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 font-bold rounded-lg flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة حالة يدوياً</span>
                </button>
              </div>
            </div>

            {/* Search and Filters */}
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="relative flex-1 min-w-[200px] max-w-xs">
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="بحث باسم المريض أو الرقم الطبي أو القسم..."
                  className="w-full pr-9 pl-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-emerald-500 outline-hidden"
                />
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setStatusFilter('all')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition ${
                    statusFilter === 'all'
                      ? 'bg-slate-800 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  الكل ({stagedCases.length})
                </button>
                <button
                  onClick={() => setStatusFilter('Transferred')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition ${
                    statusFilter === 'Transferred'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  المنقولة ({transferredCount})
                </button>
                <button
                  onClick={() => setStatusFilter('Pending')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition ${
                    statusFilter === 'Pending'
                      ? 'bg-amber-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  الانتظار ({pendingCount})
                </button>
                <button
                  onClick={() => setStatusFilter('critical')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition ${
                    statusFilter === 'critical'
                      ? 'bg-red-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  حرجة &gt; 60 د ({criticalCount})
                </button>
              </div>
            </div>

            {/* Editable Cases Table */}
            <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-xs">
              <table className="w-full text-xs text-right border-collapse min-w-[850px]">
                <thead className="bg-slate-800 text-white">
                  <tr>
                    <th className="py-2.5 px-3 w-8 text-center">
                      <input
                        type="checkbox"
                        checked={stagedCases.length > 0 && stagedCases.every(c => c.selected)}
                        onChange={handleToggleSelectAll}
                        className="rounded-sm"
                      />
                    </th>
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">اسم المريض</th>
                    <th className="py-2.5 px-3">الرقم الطبي (MRN)</th>
                    <th className="py-2.5 px-3">التعاقد (Contract)</th>
                    <th className="py-2.5 px-3">وقت الطلب / الدخول</th>
                    <th className="py-2.5 px-3">وقت النقل / الخروج</th>
                    <th className="py-2.5 px-3 text-center">التأخير المحسوب</th>
                    <th className="py-2.5 px-3">القسم المستهدف</th>
                    <th className="py-2.5 px-3">سبب التأخير</th>
                    <th className="py-2.5 px-3 text-center w-28">إجراءات التعديل</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {filteredStagedCases.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="py-8 text-center text-slate-400">
                        لا توجد حالات تطابق معايير البحث الحالية
                      </td>
                    </tr>
                  ) : (
                    filteredStagedCases.map((c, idx) => {
                      const isDelayed = (c.delay || 0) > 60;
                      return (
                        <tr
                          key={c.id}
                          className={`hover:bg-slate-50 transition ${
                            c.selected ? 'bg-emerald-50/30' : ''
                          } ${c.isEdited ? 'border-r-4 border-r-indigo-500' : ''}`}
                        >
                          <td className="py-2 px-3 text-center">
                            <input
                              type="checkbox"
                              checked={c.selected}
                              onChange={() => handleToggleSelectRow(c.id)}
                              className="rounded-sm cursor-pointer"
                            />
                          </td>
                          <td className="py-2 px-3 text-slate-400 font-mono">{idx + 1}</td>
                          <td className="py-2 px-3 font-semibold text-slate-900">
                            <div className="flex items-center gap-1.5">
                              <span>{c.name}</span>
                              {c.isEdited && (
                                <span className="text-[10px] px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded-sm font-bold">
                                  معدل
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-2 px-3 font-mono font-bold text-emerald-800">{c.medical}</td>
                          <td className="py-2 px-3">
                            <select
                              value={c.contract || defaultContract}
                              onChange={e => handleInlineContractChange(c.id, e.target.value)}
                              className="w-full max-w-[130px] p-1 bg-white border border-slate-300 rounded-md text-slate-800 text-[11px] font-semibold outline-hidden focus:border-purple-500 truncate"
                            >
                              {CONTRACT_TYPES.map(cnt => (
                                <option key={cnt.id} value={cnt.nameAr}>
                                  {cnt.nameAr}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="py-2 px-3 font-mono text-slate-700">
                            {c.order ? c.order.replace('T', ' ') : '-'}
                          </td>
                          <td className="py-2 px-3 font-mono text-slate-700">
                            {c.actual ? (
                              c.actual.replace('T', ' ')
                            ) : (
                              <span className="text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded-sm">
                                قيد الانتظار
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-center">
                            {c.delay !== null && c.delay !== undefined ? (
                              <span
                                className={`px-2.5 py-0.5 rounded-full font-bold font-mono text-[11px] ${
                                  c.delay > 60
                                    ? 'bg-red-100 text-red-800 border border-red-200'
                                    : c.delay > 30
                                    ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                    : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                }`}
                              >
                                {c.delay} دقيقة
                              </span>
                            ) : (
                              <span className="text-slate-400 font-mono">-</span>
                            )}
                          </td>
                          {/* Inline Dept Select */}
                          <td className="py-2 px-3">
                            <select
                              value={c.dept}
                              onChange={e => handleInlineDeptChange(c.id, e.target.value)}
                              className="w-full p-1 bg-white border border-slate-300 rounded-md font-semibold text-slate-800 text-[11px] outline-hidden focus:border-emerald-500"
                            >
                              <option value="Inpatient">Inpatient (داخلي)</option>
                              <option value="ICU">ICU (عناية مركزة)</option>
                              <option value="Intermediate">Intermediate (متوسطة)</option>
                            </select>
                          </td>
                          {/* Inline Reason Select */}
                          <td className="py-2 px-3">
                            <select
                              value={c.reason}
                              onChange={e => handleInlineReasonChange(c.id, e.target.value)}
                              className="w-full max-w-[150px] p-1 bg-white border border-slate-300 rounded-md text-slate-700 text-[11px] outline-hidden focus:border-emerald-500 truncate"
                            >
                              {REASONS.map(r => (
                                <option key={r.code} value={r.code}>
                                  {r.code} - {r.textAr}
                                </option>
                              ))}
                            </select>
                          </td>
                          {/* Actions */}
                          <td className="py-2 px-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => setEditingCase(c)}
                                title="تعديل كافة بيانات الحالة"
                                className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition cursor-pointer"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteStagedRow(c.id)}
                                title="استبعاد من الاستيراد"
                                className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Final Commit Bar */}
            <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4">
              <div className="text-xs text-slate-600">
                <p className="font-bold text-slate-800">
                  تم تحديد <span className="text-emerald-700">{selectedCount}</span> من إجمالي{' '}
                  <span className="text-slate-900">{stagedCases.length}</span> حالة جاهزة للاعتماد.
                </p>
                <p className="text-slate-500 text-[11px]">
                  جميع التعديلات التي أجريتها محفوظة في المعاينة وستُنقل مباشرة إلى قاعدة بيانات Neon وقسم ER.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  id="review-commit-btn"
                  onClick={() => setShowConfirmModal(true)}
                  disabled={selectedCount === 0}
                  className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-600/20 transition flex items-center gap-2 cursor-pointer"
                >
                  <CheckCircle className="w-5 h-5" />
                  <span>اعتماد الحفظ ونقل الحالات للشيت ({selectedCount} حالة)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Comprehensive Edit Single Case Modal */}
      {editingCase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full max-h-[92vh] flex flex-col border border-slate-200 overflow-hidden text-right my-auto">
            <div className="shrink-0 bg-slate-800 text-white p-4 px-6 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-base">تعديل بيانات الحالة قبل اعتماد الحفظ</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingCase(null)}
                className="text-white/80 hover:text-white p-1 rounded-lg text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={e => {
                e.preventDefault();
                handleUpdateStagedRow(editingCase);
              }}
              className="flex-1 flex flex-col min-h-0 overflow-hidden"
            >
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">اسم المريض *</label>
                    <input
                      type="text"
                      required
                      value={editingCase.name}
                      onChange={e => setEditingCase({ ...editingCase, name: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:border-emerald-500 outline-hidden font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">الرقم الطبي (MRN) *</label>
                    <input
                      type="text"
                      required
                      value={editingCase.medical}
                      onChange={e => setEditingCase({ ...editingCase, medical: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:border-emerald-500 outline-hidden font-mono font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">وقت طلب النقل (Order Time) *</label>
                    <input
                      type="datetime-local"
                      required
                      value={editingCase.order}
                      onChange={e => {
                        const newOrder = e.target.value;
                        const delay = editingCase.actual ? calcMinutesDiff(newOrder, editingCase.actual) : null;
                        setEditingCase({ ...editingCase, order: newOrder, delay });
                      }}
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:border-emerald-500 outline-hidden font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">
                      وقت النقل الفعلي (Actual Exit)
                    </label>
                    <input
                      type="datetime-local"
                      value={editingCase.actual || ''}
                      onChange={e => {
                        const newActual = e.target.value;
                        const delay = newActual ? calcMinutesDiff(editingCase.order, newActual) : null;
                        setEditingCase({
                          ...editingCase,
                          actual: newActual || undefined,
                          delay,
                          status: newActual ? 'Transferred' : 'Pending',
                        });
                      }}
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:border-emerald-500 outline-hidden font-mono"
                    />
                    <div className="mt-1 flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          setEditingCase({
                            ...editingCase,
                            actual: undefined,
                            delay: null,
                            status: 'Pending',
                          })
                        }
                        className="text-[11px] text-amber-700 hover:underline cursor-pointer"
                      >
                        تعيين كحالة قيد الانتظار (بدون وقت خروج)
                      </button>
                    </div>
                  </div>
                </div>

                {/* Calculated Delay Box */}
                <div className="p-3 rounded-xl bg-slate-100 border border-slate-200 flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold text-slate-700">التأخير المحسوب للحالة:</span>
                  <div>
                    {editingCase.delay !== null && editingCase.delay !== undefined ? (
                      <span
                        className={`px-3 py-1 rounded-full font-bold font-mono text-xs ${
                          editingCase.delay > 60
                            ? 'bg-red-100 text-red-800'
                            : editingCase.delay > 30
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {editingCase.delay} دقيقة {editingCase.delay > 60 ? '(تأخير حرج)' : '(نقل قياسي)'}
                      </span>
                    ) : (
                      <span className="text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded-sm">
                        قيد الانتظار في طوارئ المستشفى
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">القسم المستهدف *</label>
                    <select
                      value={editingCase.dept}
                      onChange={e => setEditingCase({ ...editingCase, dept: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:border-emerald-500 outline-hidden font-semibold"
                    >
                      <option value="Inpatient">الأقسام الداخلية (Inpatient)</option>
                      <option value="ICU">العناية المركزة (ICU)</option>
                      <option value="Intermediate">الرعاية المتوسطة (Intermediate)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">رقم السرير المخصص (اختياري)</label>
                    <input
                      type="text"
                      value={editingCase.bedNumber || ''}
                      onChange={e => setEditingCase({ ...editingCase, bedNumber: e.target.value })}
                      placeholder="مثال: ICU-B02"
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:border-emerald-500 outline-hidden font-mono"
                    />
                  </div>
                </div>

                {/* Hospital Administrative Fields: Contract, Came From, Visit No, Doctor */}
                <div className="p-3 bg-purple-50/50 rounded-xl border border-purple-200/80 space-y-3">
                  <div className="font-bold text-purple-900 text-xs flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-purple-700" />
                    <span>بيانات التعاقد وحقول المستشفى الإدارية</span>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-slate-700 font-bold">جهة التعاقد (الجهة المالية) *</label>
                        <button
                          type="button"
                          onClick={() => {
                            const isPreset = CONTRACT_TYPES.some(c => c.nameAr === editingCase.contract);
                            if (isPreset) {
                              setEditingCase({ ...editingCase, contract: '' });
                            } else {
                              setEditingCase({ ...editingCase, contract: 'طوارئ المستشفى' });
                            }
                          }}
                          className="text-xs text-purple-600 hover:text-purple-800 font-bold cursor-pointer"
                        >
                          ✏️ كتابة يدوية / قائمة
                        </button>
                      </div>
                      <select
                        value={CONTRACT_TYPES.some(c => c.nameAr === editingCase.contract) ? editingCase.contract : 'other'}
                        onChange={e => {
                          if (e.target.value === 'other') {
                            setEditingCase({ ...editingCase, contract: '' });
                          } else {
                            setEditingCase({ ...editingCase, contract: e.target.value });
                          }
                        }}
                        className="w-full p-2.5 bg-white border border-slate-300 rounded-lg focus:border-purple-500 outline-hidden font-semibold"
                      >
                        {CONTRACT_TYPES.map(c => (
                          <option key={c.id} value={c.id === 'other' ? 'other' : c.nameAr}>
                            {c.nameAr}
                          </option>
                        ))}
                      </select>
                      {!CONTRACT_TYPES.some(c => c.nameAr === editingCase.contract) && (
                        <input
                          type="text"
                          value={editingCase.contract || ''}
                          onChange={e => setEditingCase({ ...editingCase, contract: e.target.value })}
                          placeholder="اكتب اسم جهة التعاقد يدوياً..."
                          className="w-full mt-1.5 p-2 bg-purple-50/40 border border-purple-300 rounded-lg font-semibold text-slate-900 outline-none"
                        />
                      )}
                    </div>
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">من أين (طريقة الحضور)</label>
                      <select
                        value={editingCase.cameFrom || 'من المنزل'}
                        onChange={e => setEditingCase({ ...editingCase, cameFrom: e.target.value })}
                        className="w-full p-2.5 bg-white border border-slate-300 rounded-lg focus:border-purple-500 outline-hidden font-semibold"
                      >
                        {CAME_FROM_OPTIONS.map((c, i) => (
                          <option key={i} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">رقم الزيارة (Visit No)</label>
                      <input
                        type="text"
                        value={editingCase.visitNo || ''}
                        onChange={e => setEditingCase({ ...editingCase, visitNo: e.target.value })}
                        placeholder="مثال: V-2025-0891"
                        className="w-full p-2.5 bg-white border border-slate-300 rounded-lg focus:border-purple-500 outline-hidden font-mono"
                      />
                    </div>
                    <div>
                      <DoctorSelect
                        showLabel
                        label="اسم الطبيب المعالج"
                        value={editingCase.doctorName || ''}
                        onChange={docName => setEditingCase({ ...editingCase, doctorName: docName })}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">التشخيص الطبي الأولي</label>
                    <input
                      type="text"
                      value={editingCase.diagnosis || ''}
                      onChange={e => setEditingCase({ ...editingCase, diagnosis: e.target.value })}
                      placeholder="التشخيص المبدئي للحالة..."
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-lg focus:border-purple-500 outline-hidden"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">سبب التأخير</label>
                  <select
                    value={editingCase.reason}
                    onChange={e => setEditingCase({ ...editingCase, reason: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:border-emerald-500 outline-hidden font-semibold"
                  >
                    {REASONS.map(r => (
                      <option key={r.code} value={r.code}>
                        {r.code} - {r.textAr}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">الملاحظات</label>
                  <textarea
                    rows={2}
                    value={editingCase.notes}
                    onChange={e => setEditingCase({ ...editingCase, notes: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:border-emerald-500 outline-hidden"
                  />
                </div>
              </div>

              {/* Pinned Sticky Bottom Actions - Always visible on every screen */}
              <div className="shrink-0 p-3 sm:p-4 bg-slate-50 border-t border-slate-200 flex items-center gap-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Check className="w-4 h-4" />
                  <span>تأكيد وحفظ التعديلات في جدول المعاينة</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEditingCase(null)}
                  className="py-2.5 px-4 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl transition cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Final Review & Confirmation Dialog Before Committing */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[92vh] flex flex-col border border-slate-200 overflow-hidden text-right my-auto">
            <div className="shrink-0 bg-emerald-700 text-white p-4 px-6 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-200" />
                <h3 className="font-bold text-base">تأكيد اعتماد ونقل الحالات إلى شيت ER</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs">
              <p className="text-slate-700 leading-relaxed">
                أنت على وشك اعتماد وتوثيق الحالات المحددة في شيت الطوارئ الرسمي وقاعدة بيانات Neon السحابية.
              </p>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                  <span className="text-slate-600">إجمالي الحالات المعتمدة:</span>
                  <span className="font-bold text-slate-900 font-mono text-sm">{selectedCount} حالة</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                  <span className="text-slate-600">حالات تم نقلها بالفعل:</span>
                  <span className="font-bold text-emerald-700 font-mono">
                    {stagedCases.filter(c => c.selected && c.status === 'Transferred').length}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                  <span className="text-slate-600">حالات قيد الانتظار:</span>
                  <span className="font-bold text-amber-700 font-mono">
                    {stagedCases.filter(c => c.selected && c.status === 'Pending').length}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-600">حالات تم تعديلها يدوياً:</span>
                  <span className="font-bold text-indigo-700 font-mono">
                    {stagedCases.filter(c => c.selected && c.isEdited).length}
                  </span>
                </div>
              </div>
            </div>

            <div className="shrink-0 p-3 sm:p-4 bg-slate-50 border-t border-slate-200 flex items-center gap-2">
              <button
                type="button"
                onClick={handleFinalCommit}
                className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 cursor-pointer"
              >
                <CheckCircle className="w-5 h-5" />
                <span>تأكيد الاعتماد والنقل المباشر للشيت</span>
              </button>
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="py-3 px-4 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl transition cursor-pointer"
              >
                متابعة التعديل
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

