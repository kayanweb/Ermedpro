import React, { useState, useMemo, useEffect } from 'react';
import { ERRecord, UserRole } from '../types';
import { REASONS, DEPARTMENTS, TRIAGE_LEVELS, CONTRACT_TYPES, DISCHARGE_TYPES } from '../constants';
import { fmtDate, fmtDateTime } from '../utils/dateTime';
import { exportToExcel, exportToCSV, printOfficialReport } from '../utils/export';
import { RecordEditModal } from './RecordEditModal';
import {
  Search,
  Filter,
  FileSpreadsheet,
  Printer,
  FileDown,
  Trash2,
  Edit2,
  XCircle,
  AlertCircle,
  CheckCircle2,
  QrCode,
  Bed,
  Settings2,
  Eye,
  EyeOff,
  Clock,
  Activity,
  Layers,
  Plus,
  RotateCcw,
  Sparkles,
  MousePointerClick,
} from 'lucide-react';

interface OfficialReportTabProps {
  records: ERRecord[];
  userRole: UserRole;
  onUpdateRecord: (record: ERRecord) => void;
  onDeleteRecord: (id: string) => void;
  onAddRecord?: (record: Omit<ERRecord, 'id'>) => void;
  initialDeptFilter?: string;
  onOpenQR?: (record: ERRecord) => void;
}

const DEFAULT_COLUMNS = {
  showIndex: true,
  showDate: true,
  showName: true,
  showMrn: true,
  showContract: true,
  showTriage: true,
  showDischarge: true,
  showEntryMethod: true,
  showOrderTime: true,
  showActualTime: true,
  showDelay: true,
  showCauses: true,
  showDestination: true,
  showBed: true,
  showActions: true,
};

export const OfficialReportTab: React.FC<OfficialReportTabProps> = ({
  records,
  userRole,
  onUpdateRecord,
  onDeleteRecord,
  onAddRecord,
  initialDeptFilter = '',
  onOpenQR,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [deptFilter, setDeptFilter] = useState(initialDeptFilter);
  const [dateFilter, setDateFilter] = useState('');
  const [delayFilter, setDelayFilter] = useState('');
  const [editingRecord, setEditingRecord] = useState<ERRecord | null>(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showAddRowModal, setShowAddRowModal] = useState(false);

  // Status Change Confirmation / Quick Toggle States
  const [useStatusConfirmation, setUseStatusConfirmation] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('er_use_status_confirm_v1');
      return saved ? saved === 'true' : true;
    } catch {
      return true;
    }
  });
  const [statusPopupRecord, setStatusPopupRecord] = useState<ERRecord | null>(null);
  const [popupSelectedStatus, setPopupSelectedStatus] = useState<'Pending' | 'Transferred' | 'Cancelled'>('Pending');
  const [popupActualTime, setPopupActualTime] = useState('');
  const [popupCancelReason, setPopupCancelReason] = useState('');
  const [popupNotes, setPopupNotes] = useState('');

  // Quick Add Row State
  const [newPatientName, setNewPatientName] = useState('');
  const [newMedicalNo, setNewMedicalNo] = useState('');
  const [newDept, setNewDept] = useState('طوارئ الجراحة');
  const [newContract, setNewContract] = useState('طوارئ المستشفى');
  const [isCustomNewContract, setIsCustomNewContract] = useState(false);
  const [customNewContract, setCustomNewContract] = useState('');
  const [newTriage, setNewTriage] = useState('Level 3 - المستوى العادي');
  const [newBedNumber, setNewBedNumber] = useState('');

  // Contract Direct Manual Edit Modal State
  const [editingContractRecord, setEditingContractRecord] = useState<ERRecord | null>(null);
  const [customContractInput, setCustomContractInput] = useState('');

  // Column Visibility state persisted in localStorage
  const [cols, setCols] = useState(() => {
    try {
      const saved = localStorage.getItem('er_report_columns_v2');
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return DEFAULT_COLUMNS;
  });

  // Row Filter rules config persisted in localStorage
  const [rowRules, setRowRules] = useState(() => {
    try {
      const saved = localStorage.getItem('er_row_filters_v1');
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return {
      hideCompleted: false,
      hideCancelled: false,
      minDelayMinutes: 0,
      onlyManualEntries: false,
    };
  });

  // Hidden individual row IDs persisted in localStorage
  const [hiddenRowIds, setHiddenRowIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('er_hidden_rows_v1');
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem('er_report_columns_v2', JSON.stringify(cols));
    } catch {
      // ignore
    }
  }, [cols]);

  const toggleColumn = (key: keyof typeof DEFAULT_COLUMNS) => {
    setCols((prev: any) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleHideRow = (id: string) => {
    let next: string[];
    if (hiddenRowIds.includes(id)) {
      next = hiddenRowIds.filter(hid => hid !== id);
    } else {
      next = [...hiddenRowIds, id];
    }
    setHiddenRowIds(next);
    try {
      localStorage.setItem('er_hidden_rows_v1', JSON.stringify(next));
    } catch {}
  };

  const handleUnhideAll = () => {
    setHiddenRowIds([]);
    try {
      localStorage.setItem('er_hidden_rows_v1', JSON.stringify([]));
    } catch {}
  };

  // Interactive Multi-Click Cycle Handlers
  const handleCycleTriage = (record: ERRecord) => {
    const levels = [
      'Level 1 - إنعاش عاجل (Resuscitation)',
      'Level 2 - طوارئ حادة (Emergent)',
      'Level 3 - المستوى العادي (Urgent)',
      'Level 4 - أقل عجلة (Less Urgent)',
      'Level 5 - غير عاجل (Non-Urgent)',
    ];
    const currIdx = levels.findIndex(l => record.triageLevel && record.triageLevel.includes(l.substring(0, 7)));
    const nextIdx = currIdx === -1 ? 0 : (currIdx + 1) % levels.length;
    onUpdateRecord({
      ...record,
      triageLevel: levels[nextIdx],
    });
  };

  const handleCycleContract = (record: ERRecord) => {
    const contracts = [
      'طوارئ المستشفى',
      'مريض بهية (Baheya patient)',
      'نقدي (Cash)',
      'تأمين صحي',
      'شركة التجاريون / شركات',
      'تأمين شامل',
      'علاج على نفقة الدولة',
      'تعاقد نقابة',
    ];
    const currIdx = contracts.findIndex(c => record.contract === c);
    const nextIdx = currIdx === -1 ? 0 : (currIdx + 1) % contracts.length;
    onUpdateRecord({
      ...record,
      contract: contracts[nextIdx],
    });
  };

  const handleCycleStatus = (record: ERRecord) => {
    if (useStatusConfirmation) {
      setStatusPopupRecord(record);
      setPopupSelectedStatus(record.status || 'Pending');
      
      const d = record.actual ? new Date(record.actual) : new Date();
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      setPopupActualTime(`${year}-${month}-${day}T${hours}:${minutes}`);
      
      setPopupNotes(record.notes || '');
      setPopupCancelReason(record.reason || 'R01');
    } else {
      const nowIso = new Date().toISOString();
      if (!record.actual || record.status === 'Pending') {
        const orderMs = new Date(record.order).getTime();
        const delayMins = Math.max(0, Math.floor((new Date(nowIso).getTime() - orderMs) / 60000));
        onUpdateRecord({
          ...record,
          status: 'Transferred',
          actual: nowIso,
          delay: delayMins,
        });
      } else if (record.status === 'Transferred') {
        onUpdateRecord({
          ...record,
          status: 'Cancelled',
          actual: undefined,
          delay: undefined,
          notes: (record.notes ? record.notes.replace(/\s*\[ملغي\]/g, '') : '') + ' [ملغي]',
        });
      } else {
        onUpdateRecord({
          ...record,
          status: 'Pending',
          actual: undefined,
          delay: undefined,
          notes: record.notes ? record.notes.replace(/\s*\[ملغي\]/g, '') : '',
        });
      }
    }
  };

  const handleSaveStatusPopup = () => {
    if (!statusPopupRecord) return;
    
    let updatedRecord = { ...statusPopupRecord };
    updatedRecord.status = popupSelectedStatus;
    
    if (popupSelectedStatus === 'Pending') {
      updatedRecord.actual = undefined;
      updatedRecord.delay = undefined;
      if (updatedRecord.notes) {
        updatedRecord.notes = updatedRecord.notes.replace(/\s*\[ملغي[^\]]*\]/g, '').trim();
      }
    } else if (popupSelectedStatus === 'Transferred') {
      const localDate = new Date(popupActualTime);
      const isoStr = localDate.toISOString();
      updatedRecord.actual = isoStr;
      
      const orderMs = new Date(statusPopupRecord.order).getTime();
      const delayMins = Math.max(0, Math.floor((localDate.getTime() - orderMs) / 60000));
      updatedRecord.delay = delayMins;
      
      if (updatedRecord.notes) {
        updatedRecord.notes = updatedRecord.notes.replace(/\s*\[ملغي[^\]]*\]/g, '').trim();
      }
    } else if (popupSelectedStatus === 'Cancelled') {
      updatedRecord.actual = undefined;
      updatedRecord.delay = undefined;
      updatedRecord.reason = popupCancelReason;
      
      const cleanNotes = updatedRecord.notes ? updatedRecord.notes.replace(/\s*\[ملغي[^\]]*\]/g, '').trim() : '';
      const cancelReasonText = REASONS.find(r => r.code === popupCancelReason)?.textAr || popupCancelReason;
      updatedRecord.notes = `${cleanNotes} [ملغي: ${cancelReasonText}]`.trim();
    }
    
    onUpdateRecord(updatedRecord);
    setStatusPopupRecord(null);
  };

  const handleCycleDischarge = (record: ERRecord) => {
    const discharges = [
      'تحسن وخروج للمنزل',
      'خروج على المسؤولية (DAMA) / هروب',
      'تحويل داخلي للقسم / الرعاية',
      'تحويل للعيادات الخارجية',
      'تحويل لمستشفى آخر',
      'وفاة',
      '',
    ];
    const currIdx = discharges.findIndex(d => record.dischargeType === d);
    const nextIdx = (currIdx + 1) % discharges.length;
    onUpdateRecord({
      ...record,
      dischargeType: discharges[nextIdx] || undefined,
    });
  };

  const handleCreateQuickRow = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPatientName.trim() || !newMedicalNo.trim()) return;
    const finalContract = (isCustomNewContract || newContract === 'تعاقد آخر (كتابة يدوية)...')
      ? (customNewContract.trim() || 'طوارئ المستشفى')
      : newContract;
    if (onAddRecord) {
      onAddRecord({
        name: newPatientName.trim(),
        medical: newMedicalNo.trim(),
        dept: newDept,
        contract: finalContract,
        triageLevel: newTriage,
        bedNumber: newBedNumber.trim() || undefined,
        order: new Date().toISOString(),
        entryMethod: 'Manual',
        recordedBy: 'التقرير الرسمي',
        status: 'Pending',
      });
      setNewPatientName('');
      setNewMedicalNo('');
      setNewBedNumber('');
      setCustomNewContract('');
      setIsCustomNewContract(false);
      setShowAddRowModal(false);
    }
  };

  // Helper to format delay in minutes and hours
  const formatDelayDisplay = (minutes?: number | null) => {
    if (minutes === null || minutes === undefined) return '-';
    if (minutes < 60) return `${minutes} دقيقة`;
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${minutes} د (${hrs}س ${mins}د)`;
  };

  // Filter records
  const filteredRecords = useMemo(() => {
    let result = [...records].sort((a, b) => new Date(b.order).getTime() - new Date(a.order).getTime());

    // Filter out individually hidden rows
    if (hiddenRowIds.length > 0) {
      result = result.filter(r => !hiddenRowIds.includes(r.id));
    }

    // Apply row filter rules
    if (rowRules.hideCompleted) {
      result = result.filter(r => r.status !== 'Transferred');
    }
    if (rowRules.hideCancelled) {
      result = result.filter(r => r.status !== 'Cancelled');
    }
    if (rowRules.minDelayMinutes > 0) {
      result = result.filter(r => r.delay !== null && r.delay !== undefined && r.delay >= rowRules.minDelayMinutes);
    }
    if (rowRules.onlyManualEntries) {
      result = result.filter(r => r.entryMethod !== 'Imported');
    }

    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      result = result.filter(
        r =>
          (r.name && r.name.toLowerCase().includes(q)) ||
          (r.medical && r.medical.toLowerCase().includes(q)) ||
          (r.notes && r.notes.toLowerCase().includes(q)) ||
          (r.triageLevel && r.triageLevel.toLowerCase().includes(q)) ||
          (r.dischargeType && r.dischargeType.toLowerCase().includes(q)) ||
          (r.contract && r.contract.toLowerCase().includes(q))
      );
    }

    if (deptFilter === '__unassigned__') {
      result = result.filter(r => !r.dept || (r.dept !== 'ICU' && r.dept !== 'Intermediate' && r.dept !== 'Inpatient'));
    } else if (deptFilter) {
      result = result.filter(r => r.dept === deptFilter);
    }

    if (dateFilter) {
      result = result.filter(r => r.order && r.order.slice(0, 10) === dateFilter);
    }

    if (delayFilter) {
      if (delayFilter === 'critical') {
        result = result.filter(r => r.delay !== null && r.delay !== undefined && r.delay > 60);
      } else if (delayFilter === 'warning') {
        result = result.filter(r => r.delay !== null && r.delay !== undefined && r.delay > 30 && r.delay <= 60);
      } else if (delayFilter === 'normal') {
        result = result.filter(r => r.delay !== null && r.delay !== undefined && r.delay <= 30);
      } else if (delayFilter === 'pending') {
        result = result.filter(r => r.status === 'Pending' || r.delay === null || r.delay === undefined);
      }
    }

    return result;
  }, [records, searchTerm, deptFilter, dateFilter, delayFilter, hiddenRowIds, rowRules]);

  // Metric counts based on currently filtered records
  const totalAdmission = filteredRecords.length;
  const icuCount = filteredRecords.filter(r => r.dept === 'ICU').length;
  const interCount = filteredRecords.filter(r => r.dept === 'Intermediate').length;
  const inpCount = filteredRecords.filter(r => r.dept === 'Inpatient').length;
  const unassignedCount = filteredRecords.filter(
    r => !r.dept || (r.dept !== 'ICU' && r.dept !== 'Intermediate' && r.dept !== 'Inpatient')
  ).length;

  const handleClearFilters = () => {
    setSearchTerm('');
    setDeptFilter('');
    setDateFilter('');
    setDelayFilter('');
  };

  const handleInlineDeptChange = (record: ERRecord, newDept: string) => {
    const updated = {
      ...record,
      dept: newDept.trim(),
    };
    onUpdateRecord(updated);
  };

  const handleInlineBedChange = (record: ERRecord, newBed: string) => {
    const updated = {
      ...record,
      bedNumber: newBed.trim(),
    };
    onUpdateRecord(updated);
  };

  const handleInlineReasonChange = (record: ERRecord, newReason: string) => {
    const updated = {
      ...record,
      reason: newReason,
    };
    onUpdateRecord(updated);
  };

  const getDelayBadgeClass = (delay?: number | null) => {
    if (delay === null || delay === undefined) {
      return 'bg-slate-100 text-slate-500 font-normal';
    }
    if (delay > 60) {
      return 'bg-red-100 text-red-800 font-bold border border-red-200';
    }
    if (delay > 30) {
      return 'bg-amber-100 text-amber-800 font-bold border border-amber-200';
    }
    return 'bg-emerald-100 text-emerald-800 font-bold border border-emerald-200';
  };

  return (
    <div className="space-y-4">
      {/* Control & Filter Toolbar */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-3 no-print">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-blue-100 text-blue-700">
              <FileSpreadsheet className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-base font-bold text-slate-800">النموذج الرسمي المعتمد لأوقات انتظار الطوارئ</h2>
              <p className="text-xs text-slate-500">مطابق تماماً لنموذج Excel الرسمي لتقارير إدارات الطوارئ والمستشفيات</p>
            </div>
          </div>

          {/* Quick Export Actions & Column Customizer */}
          <div className="flex flex-wrap items-center gap-2">
            {onAddRecord && (
              <button
                onClick={() => setShowAddRowModal(true)}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                title="إضافة صف وحالة جديدة مباشرة للتقرير"
              >
                <Plus className="w-4 h-4" />
                <span>+ إضافة صف جديد</span>
              </button>
            )}

            <button
              onClick={() => {
                const nextVal = !useStatusConfirmation;
                setUseStatusConfirmation(nextVal);
                try {
                  localStorage.setItem('er_use_status_confirm_v1', String(nextVal));
                } catch {}
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border shadow-2xs cursor-pointer ${
                useStatusConfirmation
                  ? 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-500 border-slate-200'
              }`}
              title="تفعيل/تعطيل النوافذ التأكيدية والخيارات المنبثقة عند النقر على وقت النقل"
            >
              <Clock className="w-4 h-4" />
              <span>نوافذ التأكيد: {useStatusConfirmation ? 'نشطة ✅' : 'تبديل فوري ⚡'}</span>
            </button>

            <button
              onClick={() => setShowSettingsModal(true)}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border border-slate-300 shadow-2xs cursor-pointer"
              title="التحكم في إظهار وإخفاء الأعمدة"
            >
              <Settings2 className="w-4 h-4 text-slate-600" />
              <span>إعدادات الأعمدة</span>
            </button>

            <button
              id="export-excel-btn"
              onClick={() => exportToExcel(filteredRecords)}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
              title="تصدير بنفس القالب الرسمي لـ Excel"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>تصدير Excel</span>
            </button>

            <button
              id="print-pdf-btn"
              onClick={() =>
                printOfficialReport(filteredRecords, {
                  columns: cols,
                  reportTitle: 'النموذج الرسمي المعتمد لأوقات انتظار الطوارئ',
                  hospitalName: 'مستشفى الطوارئ والحالات الحرجة',
                })
              }
              className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
              title="طباعة تقرير معتمد أو حفظ كـ PDF"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة / PDF</span>
            </button>

            <button
              id="export-csv-btn"
              onClick={() => exportToCSV(filteredRecords)}
              className="px-3.5 py-2 bg-slate-700 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <FileDown className="w-4 h-4" />
              <span>CSV</span>
            </button>
          </div>
        </div>

        {/* Filter inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2.5 pt-2 border-t border-slate-100 text-xs">
          {/* Search Box */}
          <div className="relative md:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
            <input
              id="search-er-input"
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="🔍 بحث بالاسم، الرقم الطبي، أو التعاقد..."
              className="w-full pr-9 pl-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:border-blue-500 outline-none text-slate-800"
            />
          </div>

          {/* Department Filter */}
          <div>
            <select
              id="filter-dept-select"
              value={deptFilter}
              onChange={e => setDeptFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none font-semibold text-slate-700"
            >
              <option value="">كل الأقسام</option>
              <option value="ICU">ICU</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Inpatient">Inpatient</option>
              <option value="__unassigned__">⚠️ غير محدد (Unassigned)</option>
            </select>
          </div>

          {/* Delay Status Filter */}
          <div>
            <select
              value={delayFilter}
              onChange={e => setDelayFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none text-slate-700"
            >
              <option value="">جميع فترات التأخير</option>
              <option value="critical">تأخير حرج (&gt;60 دقيقة)</option>
              <option value="warning">تأخير متوسط (31-60 دقيقة)</option>
              <option value="normal">ضمن الهدف (≤30 دقيقة)</option>
              <option value="pending">قيد الانتظار حالياً</option>
            </select>
          </div>

          {/* Date Filter & Clear */}
          <div className="flex gap-2">
            <input
              type="date"
              value={dateFilter}
              onChange={e => setDateFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-xl outline-none text-slate-700 text-xs"
            />
            {(searchTerm || deptFilter || dateFilter || delayFilter) && (
              <button
                onClick={handleClearFilters}
                className="p-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 shrink-0 transition"
                title="مسح جميع الفلاتر"
              >
                <XCircle className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Hidden Rows / Active Rules Notification */}
      {hiddenRowIds.length > 0 && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs flex items-center justify-between text-rose-900 shadow-2xs no-print">
          <div className="flex items-center gap-2">
            <EyeOff className="w-4 h-4 text-rose-600" />
            <span>
              تم إخفاء <b>{hiddenRowIds.length}</b> صف/حالة مخصصة من الجدول الرسمي.
            </span>
          </div>
          <button
            onClick={handleUnhideAll}
            className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg transition text-[11px] cursor-pointer"
          >
            إظهار كافة الصفوف المخفية
          </button>
        </div>
      )}

      {/* Notice Banner */}
      <div className="bg-amber-50 border-r-4 border-amber-500 p-3 rounded-xl text-xs text-amber-900 font-medium flex flex-wrap items-center justify-between gap-2 no-print">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            <b>التعديل السريع بالضغط المتكرر (Multi-Click Cycling):</b> اضغط مباشرة على شارة الفرز 🚨 أو التعاقد 💰 أو وقت النقل ⏳ أو نوع الخروج للتبديل الفوري والتعديل المباشر.
          </span>
        </div>
      </div>

      {/* ======================================================== */}
      {/* THE OFFICIAL EXCEL-LIKE FORM CANVAS */}
      {/* ======================================================== */}
      <div className="bg-white rounded-2xl border-2 border-slate-800 shadow-md overflow-hidden print-container">
        {/* Title Bar - Exact match to hospital Excel header */}
        <div className="bg-[#b4c7e7] text-slate-950 py-2.5 px-4 text-center font-bold text-base sm:text-lg border-b-2 border-slate-800 tracking-wide">
          ER for Waiting Time
        </div>

        {/* Summary Metric Strip - Exact match to hospital Excel summary with 5 boxes */}
        <div className="grid grid-cols-2 sm:grid-cols-5 text-center text-xs sm:text-sm font-bold border-b border-slate-800 divide-x divide-x-reverse divide-slate-800 bg-white">
          <div className="p-2.5 bg-white text-[#dc3545] font-black">
            Total: <span id="tTotal" className="font-mono text-base">{totalAdmission}</span>
          </div>
          <div className="p-2.5 bg-slate-50 text-[#0d6efd] font-black">
            ICU: <span id="tIcu" className="font-mono text-base">{icuCount}</span>
          </div>
          <div className="p-2.5 bg-slate-50 text-[#198754] font-black">
            Intermediate: <span id="tInt" className="font-mono text-base">{interCount}</span>
          </div>
          <div className="p-2.5 bg-slate-50 text-[#6f42c1] font-black">
            Inpatient: <span id="tInp" className="font-mono text-base">{inpCount}</span>
          </div>
          <div className="p-2.5 bg-rose-50 text-[#dc3545] font-black col-span-2 sm:col-span-1">
            Unassigned: <span id="tUn" className="font-mono text-base">{unassignedCount}</span>
          </div>
        </div>

        {/* The Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-center border-collapse">
            <thead>
              <tr className="bg-[#1f3864] text-white font-bold border-b border-slate-800 whitespace-nowrap">
                {cols.showIndex && <th className="py-2.5 px-2 border-r border-slate-700">#</th>}
                {cols.showDate && <th className="py-2.5 px-3 border-r border-slate-700">Date</th>}
                {cols.showName && <th className="py-2.5 px-4 border-r border-slate-700 text-right">Patient Name</th>}
                {cols.showMrn && <th className="py-2.5 px-3 border-r border-slate-700">Medical No.</th>}
                {cols.showTriage && <th className="py-2.5 px-3 border-r border-slate-700 text-amber-300">Case 🚨 Triage</th>}
                {cols.showContract && <th className="py-2.5 px-3 border-r border-slate-700 text-purple-200">Contract 💰</th>}
                {cols.showOrderTime && <th className="py-2.5 px-3 border-r border-slate-700">Transfer Order Time</th>}
                {cols.showActualTime && <th className="py-2.5 px-3 border-r border-slate-700">Actual Transfer Time</th>}
                {cols.showDelay && <th className="py-2.5 px-3 border-r border-slate-700 text-amber-200">Delay /Minutes (Hours)</th>}
                {cols.showCauses && <th className="py-2.5 px-4 border-r border-slate-700 text-right">Causes of Delay</th>}
                {cols.showDestination && (
                  <th
                    className="py-2.5 px-3 border-r border-slate-700 text-slate-950 font-bold"
                    style={{ background: '#f7971e' }}
                  >
                    Destination ➜ القسم
                  </th>
                )}
                {cols.showBed && <th className="py-2.5 px-3 border-r border-slate-700 text-blue-200">Bed # السرير</th>}
                {cols.showDischarge && <th className="py-2.5 px-3 border-r border-slate-700 text-emerald-200">Discharge / نوع الخروج</th>}
                {cols.showEntryMethod && <th className="py-2.5 px-2 border-r border-slate-700">طريقة الإدخال</th>}
                {cols.showActions && <th className="py-2.5 px-3 no-print">الإجراءات</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300 bg-white text-slate-800">
              {filteredRecords.length > 0 ? (
                filteredRecords.map((record, index) => {
                  const reasonObj = REASONS.find(r => r.code === record.reason);

                  return (
                    <tr key={record.id} className="hover:bg-blue-50/40 transition">
                      {/* Index */}
                      {cols.showIndex && (
                        <td className="py-2 px-2 border-r border-slate-300 font-mono text-slate-400 text-[10px]">
                          {index + 1}
                        </td>
                      )}

                      {/* Date */}
                      {cols.showDate && (
                        <td className="py-2 px-3 border-r border-slate-300 font-mono whitespace-nowrap text-slate-600">
                          {fmtDate(record.order)}
                        </td>
                      )}

                      {/* Patient Name */}
                      {cols.showName && (
                        <td className="py-2 px-4 border-r border-slate-300 font-bold text-right text-slate-900">
                          <div>{record.name}</div>
                          {record.cameFrom && (
                            <div className="text-[10px] text-slate-400 font-normal">
                              {record.cameFrom} {record.visitNo ? `• زيارة: ${record.visitNo}` : ''}
                            </div>
                          )}
                        </td>
                      )}

                      {/* Medical No */}
                      {cols.showMrn && (
                        <td className="py-2 px-3 border-r border-slate-300 font-mono font-semibold text-slate-700">
                          {record.medical}
                        </td>
                      )}

                      {/* Triage Level - Multi-click cycling */}
                      {cols.showTriage && (
                        <td className="py-2 px-3 border-r border-slate-300 text-center">
                          <button
                            type="button"
                            onClick={() => handleCycleTriage(record)}
                            title="انقر لتغيير مستوى الفرز سريعاً"
                            className={`cursor-pointer inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold shadow-2xs transition active:scale-95 hover:ring-2 hover:ring-blue-400 ${
                              record.triageLevel?.includes('Level 1')
                                ? 'bg-red-100 text-red-900 border border-red-300 hover:bg-red-200'
                                : record.triageLevel?.includes('Level 2')
                                ? 'bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200'
                                : record.triageLevel?.includes('Level 4')
                                ? 'bg-sky-100 text-sky-900 border border-sky-300 hover:bg-sky-200'
                                : record.triageLevel?.includes('Level 5')
                                ? 'bg-slate-100 text-slate-800 border border-slate-300 hover:bg-slate-200'
                                : 'bg-emerald-50 text-emerald-900 border border-emerald-300 hover:bg-emerald-100'
                            }`}
                          >
                            <span>{record.triageLevel || 'Level 3 - عادي'}</span>
                            <MousePointerClick className="w-2.5 h-2.5 opacity-60" />
                          </button>
                        </td>
                      )}

                      {/* Contract - Multi-click cycling + Manual text edit */}
                      {cols.showContract && (
                        <td className="py-2 px-3 border-r border-slate-300 text-center">
                          <div className="inline-flex items-center gap-1 justify-center">
                            <button
                              type="button"
                              onClick={() => handleCycleContract(record)}
                              title="انقر لتغيير جهة التعاقد سريعاً بين الخيارات"
                              className={`cursor-pointer inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold shadow-2xs transition active:scale-95 hover:ring-2 ${
                                (record.contract && (record.contract.includes('بهية') || record.contract.toLowerCase().includes('baheya')))
                                  ? 'bg-pink-100 text-pink-900 border border-pink-300 hover:bg-pink-200 hover:ring-pink-400'
                                  : 'bg-purple-50 text-purple-900 border border-purple-200 hover:bg-purple-100 hover:ring-purple-300'
                              }`}
                            >
                              <span>{record.contract || 'طوارئ المستشفى'}</span>
                              <MousePointerClick className="w-2.5 h-2.5 opacity-60" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingContractRecord(record);
                                setCustomContractInput(record.contract || '');
                              }}
                              title="كتابة أو تعديل جهة التعاقد يدوياً"
                              className="p-1 rounded-md text-slate-400 hover:text-purple-700 hover:bg-purple-100 transition cursor-pointer"
                            >
                              <Edit2 className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        </td>
                      )}

                      {/* Transfer Order Time */}
                      {cols.showOrderTime && (
                        <td className="py-2 px-3 border-r border-slate-300 font-mono whitespace-nowrap text-slate-700">
                          {fmtDateTime(record.order)}
                        </td>
                      )}

                      {/* Actual Transfer Time - Multi-click status toggle */}
                      {cols.showActualTime && (
                        <td className="py-2 px-3 border-r border-slate-300 font-mono whitespace-nowrap text-slate-700">
                          <button
                            type="button"
                            onClick={() => handleCycleStatus(record)}
                            title="انقر لتبديل الحالة (قيد الانتظار ⇄ تم النقل ⇄ ملغي)"
                            className={`cursor-pointer inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold transition active:scale-95 ${
                              record.status === 'Cancelled'
                                ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                : record.actual
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                                : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
                            }`}
                          >
                            {record.status === 'Cancelled' ? (
                              <span>ملغي ✕</span>
                            ) : record.actual ? (
                              <span>{fmtDateTime(record.actual)}</span>
                            ) : (
                              <span>قيد الانتظار ⏳</span>
                            )}
                            <MousePointerClick className="w-2.5 h-2.5 opacity-60" />
                          </button>
                        </td>
                      )}

                      {/* Delay Duration (In minutes and hours) */}
                      {cols.showDelay && (
                        <td className={`py-2 px-3 border-r border-slate-300 font-mono text-center`}>
                          {record.delay !== null && record.delay !== undefined ? (
                            <span
                              className={`inline-block px-2 py-0.5 rounded-md ${getDelayBadgeClass(
                                record.delay
                              )}`}
                              title={`${record.delay} دقيقة`}
                            >
                              {formatDelayDisplay(record.delay)}
                            </span>
                          ) : (
                            <span className="text-slate-400 font-mono">-</span>
                          )}
                        </td>
                      )}

                      {/* Causes of Delay */}
                      {cols.showCauses && (
                        <td className="py-2 px-2 border-r border-slate-300">
                          <input
                            type="text"
                            list="causesListOfficial"
                            value={record.reason ?? ''}
                            onChange={e => handleInlineReasonChange(record, e.target.value)}
                            placeholder="-"
                            title="سبب التأخير (Causes of Delay) - ينسخ كما هو أو يترك فارغاً"
                            className="w-full min-w-[125px] px-2 py-1 text-center text-xs rounded-lg border border-slate-300 font-semibold transition outline-none bg-slate-50 focus:bg-white focus:border-indigo-500 text-slate-800"
                          />
                        </td>
                      )}

                      {/* Destination Inline Input */}
                      {cols.showDestination && (
                        <td className="py-2 px-2 border-r border-slate-300">
                          <input
                            type="text"
                            list="deptList"
                            value={record.dept || ''}
                            onChange={e => handleInlineDeptChange(record, e.target.value)}
                            placeholder="اكتب أو اختر..."
                            className={`w-full min-w-[110px] px-2 py-1 text-center text-xs rounded-lg border-2 font-semibold transition outline-none ${
                              record.dept
                                ? 'bg-emerald-100 border-emerald-500 text-emerald-900 font-bold'
                                : 'bg-amber-100 border-amber-400 text-amber-900'
                            }`}
                          />
                        </td>
                      )}

                      {/* Bed # */}
                      {cols.showBed && (
                        <td className="py-2 px-2 border-r border-slate-300">
                          <input
                            type="text"
                            value={record.bedNumber || ''}
                            onChange={e => handleInlineBedChange(record, e.target.value)}
                            placeholder="رقم السرير..."
                            className="w-16 px-1.5 py-1 text-center text-xs rounded border border-slate-300 font-mono bg-slate-50 focus:bg-white outline-none"
                          />
                        </td>
                      )}

                      {/* Discharge Type - Multi-click cycling */}
                      {cols.showDischarge && (
                        <td className="py-2 px-3 border-r border-slate-300 text-center">
                          <button
                            type="button"
                            onClick={() => handleCycleDischarge(record)}
                            title="انقر لتبديل نوع الخروج (تحسن، هروب، تحويل داخلي، عيادات...)"
                            className="cursor-pointer inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 text-[10px] font-semibold transition active:scale-95"
                          >
                            <span>{record.dischargeType || 'تحديد الخروج ➜'}</span>
                            <MousePointerClick className="w-2.5 h-2.5 opacity-60" />
                          </button>
                        </td>
                      )}

                      {/* Entry Method */}
                      {cols.showEntryMethod && (
                        <td className="py-2 px-2 border-r border-slate-300 text-center text-[10px]">
                          <span
                            className={`px-1.5 py-0.5 rounded font-semibold ${
                              record.entryMethod === 'Imported'
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {record.entryMethod === 'Imported' ? 'سحب آلي' : 'يدوي'}
                          </span>
                        </td>
                      )}

                      {/* Actions */}
                      {cols.showActions && (
                        <td className="py-2 px-3 no-print whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => toggleHideRow(record.id)}
                              className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition cursor-pointer"
                              title="إخفاء هذا الصف مؤقتاً من التقرير"
                            >
                              <EyeOff className="w-3.5 h-3.5" />
                            </button>

                            {onOpenQR && (
                              <button
                                onClick={() => onOpenQR(record)}
                                className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition cursor-pointer"
                                title="توليد بطاقة وتصريح QR"
                              >
                                <QrCode className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {userRole !== 'Viewer' && (
                              <button
                                onClick={() => setEditingRecord(record)}
                                className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition cursor-pointer"
                                title="تعديل تفصيلي للحالة"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {userRole === 'Admin' && (
                              <button
                                onClick={() => {
                                  if (confirm(`هل أنت متأكد من حذف سجل المريض ${record.name}؟`)) {
                                    onDeleteRecord(record.id);
                                  }
                                }}
                                className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition cursor-pointer"
                                title="حذف السجل (صلاحية المدير فقط)"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={15} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <AlertCircle className="w-8 h-8 text-slate-300" />
                      <span className="font-semibold">لا توجد سجلات مطابقة للبحث أو الفلاتر المحددة</span>
                      <button
                        onClick={handleClearFilters}
                        className="text-xs text-blue-600 font-bold hover:underline cursor-pointer"
                      >
                        إعادة ضبط الفلاتر وعرض الكل
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Dept Datalist */}
        <datalist id="deptList">
          <option value="ICU" />
          <option value="Intermediate" />
          <option value="Inpatient" />
        </datalist>

        {/* Causes of Delay Datalist */}
        <datalist id="causesListOfficial">
          <option value="NONE" />
          <option value="UN AVAILABLE BEDS" />
          <option value="LABS RESULTS" />
          <option value="PREPARING BED" />
          <option value="CONTRACT AGREEMENT" />
          <option value="SAVING LIFE" />
          <option value="DOPPLER RESULT" />
          {REASONS.map(r => (
            <option key={r.code} value={r.textAr} />
          ))}
        </datalist>

        {/* Footer Note */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 text-[11px] text-slate-500 flex flex-wrap items-center justify-between gap-2">
          <div>
            دليل الألوان: <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 mr-1 align-middle" />{' '}
            أقل من 30 دقيقة (هدف قياسي) ·{' '}
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-500 mr-1 align-middle" /> 31-60 دقيقة
            (تأخير متوسط) · <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500 mr-1 align-middle" />{' '}
            أكثر من 60 دقيقة (تأخير حرج)
          </div>
          <div className="font-mono">سجل معتمد - عدد الحالات المعروضة: {filteredRecords.length}</div>
        </div>
      </div>

      {/* Quick Add Row Modal */}
      {showAddRowModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[92vh] flex flex-col border border-slate-200 overflow-hidden text-right my-auto">
            <div className="shrink-0 bg-indigo-900 text-white p-4 px-6 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-indigo-300" />
                <h3 className="font-bold text-base">إضافة صف وحالة جديدة للتقرير مباشرة</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddRowModal(false)}
                className="text-slate-300 hover:text-white text-lg font-bold p-1 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateQuickRow} className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">اسم المريض *</label>
                <input
                  type="text"
                  required
                  value={newPatientName}
                  onChange={e => setNewPatientName(e.target.value)}
                  placeholder="الاسم الرباعي للمريض..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">الرقم الطبي (MRN) *</label>
                  <input
                    type="text"
                    required
                    value={newMedicalNo}
                    onChange={e => setNewMedicalNo(e.target.value)}
                    placeholder="مثال: MRN-88492"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">رقم السرير</label>
                  <input
                    type="text"
                    value={newBedNumber}
                    onChange={e => setNewBedNumber(e.target.value)}
                    placeholder="مثال: Bed-04"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">القسم المستهدف</label>
                  <input
                    type="text"
                    list="deptList"
                    value={newDept}
                    onChange={e => setNewDept(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">جهة التعاقد</label>
                    <button
                      type="button"
                      onClick={() => setIsCustomNewContract(!isCustomNewContract)}
                      className="text-[10px] text-purple-600 hover:text-purple-800 font-bold cursor-pointer"
                    >
                      {isCustomNewContract ? '📋 اختيار من القائمة' : '✏️ كتابة يدوية'}
                    </button>
                  </div>
                  {isCustomNewContract ? (
                    <input
                      type="text"
                      value={customNewContract}
                      onChange={e => setCustomNewContract(e.target.value)}
                      placeholder="اكتب اسم جهة التعاقد يدوياً..."
                      className="w-full px-3 py-2 border border-purple-300 bg-purple-50/40 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 outline-none font-semibold text-slate-800"
                    />
                  ) : (
                    <select
                      value={newContract}
                      onChange={e => {
                        if (e.target.value === 'تعاقد آخر (كتابة يدوية)...') {
                          setIsCustomNewContract(true);
                        } else {
                          setNewContract(e.target.value);
                        }
                      }}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                      {CONTRACT_TYPES.map(c => (
                        <option key={c.id} value={c.nameAr}>
                          {c.nameAr}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">مستوى الفرز 🚨</label>
                <select
                  value={newTriage}
                  onChange={e => setNewTriage(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  {TRIAGE_LEVELS.map(t => (
                    <option key={t.id} value={t.nameAr}>
                      {t.nameAr}
                    </option>
                  ))}
                </select>
              </div>

              </div>

              {/* Pinned Sticky Bottom Actions - Always visible on every screen */}
              <div className="shrink-0 p-3 sm:p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddRowModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-600 text-xs font-bold rounded-xl hover:bg-slate-100 transition cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
                >
                  إضافة الصف وحفظ السجل
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingRecord && (
        <RecordEditModal
          record={editingRecord}
          onClose={() => setEditingRecord(null)}
          onSave={updated => {
            onUpdateRecord(updated);
            setEditingRecord(null);
          }}
        />
      )}

      {/* Status Change Confirmation & Options Modal */}
      {statusPopupRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[92vh] flex flex-col border border-slate-200 overflow-hidden text-right my-auto">
            {/* Header */}
            <div className="shrink-0 bg-slate-900 text-white p-4 px-6 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-base">تبديل الحالة وتفاصيل وقت النقل</h3>
              </div>
              <button
                type="button"
                onClick={() => setStatusPopupRecord(null)}
                className="text-slate-400 hover:text-white text-lg font-bold p-1 rounded-lg transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              {/* Patient Info Card */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <div className="text-[10px] text-slate-400 font-bold">اسم المريض ورقمه الطبي:</div>
                <div className="text-sm font-black text-slate-900">{statusPopupRecord.name}</div>
                <div className="text-xs font-mono font-bold text-slate-600">{statusPopupRecord.medical}</div>
              </div>

              {/* Status Tab Choice (Pending, Transferred, Cancelled) */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">تحديد الحالة الجديدة:</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPopupSelectedStatus('Pending')}
                    className={`py-2 px-1 rounded-xl text-xs font-bold border transition flex flex-col items-center justify-center gap-1 cursor-pointer ${
                      popupSelectedStatus === 'Pending'
                        ? 'bg-amber-50 border-amber-400 text-amber-900 shadow-2xs'
                        : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-lg">⏳</span>
                    <span>قيد الانتظار</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPopupSelectedStatus('Transferred')}
                    className={`py-2 px-1 rounded-xl text-xs font-bold border transition flex flex-col items-center justify-center gap-1 cursor-pointer ${
                      popupSelectedStatus === 'Transferred'
                        ? 'bg-emerald-50 border-emerald-400 text-emerald-900 shadow-2xs'
                        : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-lg">✅</span>
                    <span>تم النقل الفعلي</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPopupSelectedStatus('Cancelled')}
                    className={`py-2 px-1 rounded-xl text-xs font-bold border transition flex flex-col items-center justify-center gap-1 cursor-pointer ${
                      popupSelectedStatus === 'Cancelled'
                        ? 'bg-rose-50 border-rose-400 text-rose-900 shadow-2xs'
                        : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-lg">🚫</span>
                    <span>ملغي</span>
                  </button>
                </div>
              </div>

              {/* Subfields depends on selection */}
              {popupSelectedStatus === 'Transferred' && (
                <div className="space-y-1.5 p-3.5 bg-emerald-50/50 border border-emerald-100 rounded-xl animate-fadeIn">
                  <label className="block text-xs font-bold text-emerald-950">تعديل وقت النقل الفعلي (تلقائي بالوقت الحالي):</label>
                  <input
                    type="datetime-local"
                    value={popupActualTime}
                    onChange={e => setPopupActualTime(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg outline-none font-mono text-xs focus:ring-2 focus:ring-emerald-500"
                  />
                  <p className="text-[10px] text-emerald-700 leading-relaxed mt-1">
                    * سيقوم النظام تلقائياً بحساب وحفظ مدة التأخير بالدقائق والساعات بناءً على الفرق بين هذا الوقت ووقت الطلب المعتمد.
                  </p>
                </div>
              )}

              {popupSelectedStatus === 'Cancelled' && (
                <div className="space-y-3 p-3.5 bg-rose-50/50 border border-rose-100 rounded-xl animate-fadeIn">
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-rose-950">سبب إلغاء أمر النقل:</label>
                    <select
                      value={popupCancelReason}
                      onChange={e => setPopupCancelReason(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg outline-none text-xs"
                    >
                      {REASONS.map(r => (
                        <option key={r.code} value={r.code}>
                          {r.code} - {r.textAr}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {popupSelectedStatus === 'Pending' && (
                <div className="p-3 bg-amber-50/50 border border-amber-100 rounded-xl text-xs text-amber-900 leading-relaxed">
                  ⚠️ عند تفعيل "قيد الانتظار"، سيقوم النظام بمسح وقت النقل الفعلي المسجل وإعادة حساب المؤشرات وتصفير مدة التأخير لهذه الحالة.
                </div>
              )}

              {/* Options popup toggle persistence */}
              <label className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 cursor-pointer transition text-xs text-slate-700 font-bold">
                <input
                  type="checkbox"
                  checked={useStatusConfirmation}
                  onChange={e => {
                    const nextVal = e.target.checked;
                    setUseStatusConfirmation(nextVal);
                    try {
                      localStorage.setItem('er_use_status_confirm_v1', String(nextVal));
                    } catch {}
                  }}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <span>تفعيل هذا المنبثق مستقبلاً (إلغاء التحديد يفعل التبديل الفوري بنقرة واحدة)</span>
              </label>

            </div>

            {/* Pinned Sticky Bottom Actions */}
            <div className="shrink-0 p-3 sm:p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setStatusPopupRecord(null)}
                className="px-4 py-2 border border-slate-300 text-slate-600 text-xs font-bold rounded-xl hover:bg-slate-100 transition cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleSaveStatusPopup}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
              >
                حفظ وتطبيق التغييرات
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Contract Quick Selection / Manual Write Modal */}
      {editingContractRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[92vh] flex flex-col border border-slate-200 overflow-hidden text-right my-auto">
            <div className="shrink-0 bg-purple-900 text-white p-4 px-6 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-purple-800 text-purple-200 text-base">💰</span>
                <div>
                  <h3 className="font-bold text-base">تحديد أو كتابة جهة التعاقد يدوياً</h3>
                  <p className="text-[11px] text-purple-200">تعديل جهة التحمل المالي للمريض</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingContractRecord(null)}
                className="text-purple-300 hover:text-white text-lg font-bold p-1 rounded-lg transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              {/* Patient Info */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-0.5">
                <div className="text-[10px] text-slate-400 font-bold">المريض:</div>
                <div className="text-sm font-black text-slate-900">{editingContractRecord.name}</div>
                <div className="text-xs font-mono font-bold text-slate-600">{editingContractRecord.medical}</div>
              </div>

              {/* Quick Preset Buttons */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">اختيار سريع من التعاقدات الشائعة:</label>
                <div className="flex flex-wrap gap-1.5">
                  {CONTRACT_TYPES.filter(c => c.id !== 'other').map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setCustomContractInput(c.nameAr)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer ${
                        customContractInput === c.nameAr
                          ? 'bg-purple-600 text-white border-purple-700 shadow-xs'
                          : c.id === 'baheya'
                          ? 'bg-pink-100 text-pink-900 border-pink-300 hover:bg-pink-200'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-purple-50 hover:text-purple-900'
                      }`}
                    >
                      {c.nameAr}
                    </button>
                  ))}
                </div>
              </div>

              {/* Manual Text Input */}
              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                <label className="block text-xs font-bold text-slate-800">
                  كتابة جهة التعاقد يدوياً (لأي جهة أخرى):
                </label>
                <input
                  type="text"
                  value={customContractInput}
                  onChange={e => setCustomContractInput(e.target.value)}
                  placeholder="اكتب اسم جهة التعاقد يدوياً (مثال: مريض بهية، شركة كذا، بنك مصر...)"
                  className="w-full px-3 py-2 border border-purple-300 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 outline-none font-semibold text-slate-900 bg-purple-50/20"
                />
                <p className="text-[10px] text-slate-500">
                  * يمكنك كتابة أي اسم تعاقد يدوي حر وسيتم حفظه واعتماده في التقرير والإحصاءات فوراً.
                </p>
              </div>

            </div>

            {/* Pinned Sticky Bottom Action Buttons */}
            <div className="shrink-0 p-3 sm:p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingContractRecord(null)}
                className="px-4 py-2 border border-slate-300 text-slate-600 text-xs font-bold rounded-xl hover:bg-slate-100 transition cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={() => {
                  const finalVal = customContractInput.trim() || 'طوارئ المستشفى';
                  onUpdateRecord({
                    ...editingContractRecord,
                    contract: finalVal,
                  });
                  setEditingContractRecord(null);
                }}
                className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
              >
                حفظ جهة التعاقد
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Column Visibility Configuration Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[92vh] flex flex-col border border-slate-200 overflow-hidden text-right my-auto">
            <div className="shrink-0 bg-slate-900 text-white p-4 px-6 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings2 className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-base">إعدادات تخصيص أعمدة الجدول الرسمية</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="text-slate-400 hover:text-white text-lg font-bold p-1 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                حدد الأعمدة التي ترغب في إظهارها أو إخفائها من جدول التقرير الرسمي. يتم حفظ تفضيلاتك تلقائياً في هذا المتصفح.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <label className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 hover:bg-slate-100 cursor-pointer border border-slate-200">
                  <input
                    type="checkbox"
                    checked={cols.showIndex}
                    onChange={() => toggleColumn('showIndex')}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span># التسلسل</span>
                </label>

                <label className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 hover:bg-slate-100 cursor-pointer border border-slate-200">
                  <input
                    type="checkbox"
                    checked={cols.showDate}
                    onChange={() => toggleColumn('showDate')}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>التاريخ (Date)</span>
                </label>

                <label className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 hover:bg-slate-100 cursor-pointer border border-slate-200">
                  <input
                    type="checkbox"
                    checked={cols.showName}
                    onChange={() => toggleColumn('showName')}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>اسم المريض (Patient Name)</span>
                </label>

                <label className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 hover:bg-slate-100 cursor-pointer border border-slate-200">
                  <input
                    type="checkbox"
                    checked={cols.showMrn}
                    onChange={() => toggleColumn('showMrn')}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>الرقم الطبي (Medical No)</span>
                </label>

                <label className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 hover:bg-slate-100 cursor-pointer border border-slate-200">
                  <input
                    type="checkbox"
                    checked={cols.showTriage}
                    onChange={() => toggleColumn('showTriage')}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="font-bold text-amber-700">مستوى الفرز 🚨 (Triage)</span>
                </label>

                <label className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 hover:bg-slate-100 cursor-pointer border border-slate-200">
                  <input
                    type="checkbox"
                    checked={cols.showContract}
                    onChange={() => toggleColumn('showContract')}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="font-bold text-purple-700">جهة التعاقد 💰 (Contract)</span>
                </label>

                <label className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 hover:bg-slate-100 cursor-pointer border border-slate-200">
                  <input
                    type="checkbox"
                    checked={cols.showOrderTime}
                    onChange={() => toggleColumn('showOrderTime')}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>وقت الطلب (Order Time)</span>
                </label>

                <label className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 hover:bg-slate-100 cursor-pointer border border-slate-200">
                  <input
                    type="checkbox"
                    checked={cols.showActualTime}
                    onChange={() => toggleColumn('showActualTime')}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>وقت النقل الفعلي (Actual)</span>
                </label>

                <label className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 hover:bg-slate-100 cursor-pointer border border-slate-200">
                  <input
                    type="checkbox"
                    checked={cols.showDelay}
                    onChange={() => toggleColumn('showDelay')}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="font-bold text-red-700">التأخير بالدقائق والساعات (Delay)</span>
                </label>

                <label className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 hover:bg-slate-100 cursor-pointer border border-slate-200">
                  <input
                    type="checkbox"
                    checked={cols.showCauses}
                    onChange={() => toggleColumn('showCauses')}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>أسباب التأخير (Causes)</span>
                </label>

                <label className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 hover:bg-slate-100 cursor-pointer border border-slate-200">
                  <input
                    type="checkbox"
                    checked={cols.showDestination}
                    onChange={() => toggleColumn('showDestination')}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="font-bold text-orange-700">القسم المستهدف (Destination)</span>
                </label>

                <label className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 hover:bg-slate-100 cursor-pointer border border-slate-200">
                  <input
                    type="checkbox"
                    checked={cols.showBed}
                    onChange={() => toggleColumn('showBed')}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>رقم السرير (Bed #)</span>
                </label>

                <label className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 hover:bg-slate-100 cursor-pointer border border-slate-200">
                  <input
                    type="checkbox"
                    checked={cols.showDischarge}
                    onChange={() => toggleColumn('showDischarge')}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>نوع الخروج (Discharge)</span>
                </label>

                <label className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 hover:bg-slate-100 cursor-pointer border border-slate-200">
                  <input
                    type="checkbox"
                    checked={cols.showEntryMethod}
                    onChange={() => toggleColumn('showEntryMethod')}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>طريقة الإدخال (يدوي / سحب)</span>
                </label>

                <label className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 hover:bg-slate-100 cursor-pointer border border-slate-200">
                  <input
                    type="checkbox"
                    checked={cols.showActions}
                    onChange={() => toggleColumn('showActions')}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>عمود الإجراءات (Actions)</span>
                </label>
              </div>
            </div>

            {/* Pinned Sticky Bottom Actions */}
            <div className="shrink-0 p-3 sm:p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setCols(DEFAULT_COLUMNS)}
                className="text-xs text-blue-600 font-bold hover:underline cursor-pointer"
              >
                إعادة ضبط للأوضاع الافتراضية
              </button>
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
              >
                حفظ وإغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
