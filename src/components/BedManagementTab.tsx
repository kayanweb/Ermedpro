import React, { useState } from 'react';
import { HospitalBed, DepartmentType, BedStatus, ERRecord, AppLanguage } from '../types';
import { t } from '../utils/translations';
import {
  Bed,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Sparkles,
  UserCheck,
  Search,
  Filter,
  ShieldAlert,
  PlusCircle,
} from 'lucide-react';

interface BedManagementTabProps {
  beds: HospitalBed[];
  records: ERRecord[];
  lang: AppLanguage;
  currentUser: any;
  onUpdateBedStatus: (bedId: string, status: BedStatus, notes?: string) => Promise<void>;
  onAssignBed: (bedId: string, recordId: string) => Promise<void>;
  onRefresh: () => void;
}

export const BedManagementTab: React.FC<BedManagementTabProps> = ({
  beds,
  records,
  lang,
  currentUser,
  onUpdateBedStatus,
  onAssignBed,
  onRefresh,
}) => {
  const [selectedDept, setSelectedDept] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [assignModalBed, setAssignModalBed] = useState<HospitalBed | null>(null);
  const [selectedRecordId, setSelectedRecordId] = useState<string>('');
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  // Available pending patients waiting for transfer
  const pendingPatients = records.filter(r => r.status === 'Pending');

  const filteredBeds = beds.filter(b => {
    if (selectedDept !== 'ALL' && b.dept !== selectedDept) return false;
    if (statusFilter !== 'ALL' && b.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        b.bedNumber.toLowerCase().includes(q) ||
        b.patientName?.toLowerCase().includes(q) ||
        b.patientMrn?.toLowerCase().includes(q) ||
        b.dept.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Calculate statistics per department
  const getDeptStats = (dept: DepartmentType) => {
    const deptBeds = beds.filter(b => b.dept === dept);
    const total = deptBeds.length;
    const occupied = deptBeds.filter(b => b.status === 'Occupied').length;
    const available = deptBeds.filter(b => b.status === 'Available').length;
    const cleaning = deptBeds.filter(b => b.status === 'Cleaning').length;
    const reserved = deptBeds.filter(b => b.status === 'Reserved').length;
    const rate = total > 0 ? Math.round((occupied / total) * 100) : 0;
    return { total, occupied, available, cleaning, reserved, rate };
  };

  const icuStats = getDeptStats('ICU');
  const intermediateStats = getDeptStats('Intermediate');
  const inpatientStats = getDeptStats('Inpatient');

  const handleStatusChange = async (bedId: string, newStatus: BedStatus) => {
    setLoadingAction(bedId);
    try {
      await onUpdateBedStatus(bedId, newStatus);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleConfirmAssignment = async () => {
    if (!assignModalBed || !selectedRecordId) return;
    setLoadingAction(assignModalBed.id);
    try {
      await onAssignBed(assignModalBed.id, selectedRecordId);
      setAssignModalBed(null);
      setSelectedRecordId('');
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Department Capacity Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* ICU Card */}
        <div className={`bg-white rounded-2xl border p-5 shadow-xs transition ${
          icuStats.rate >= 80 ? 'border-rose-300 ring-2 ring-rose-100' : 'border-slate-200'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <span className="font-extrabold text-sm text-slate-800 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
              {lang === 'ar' ? 'العناية المركزة (ICU)' : 'Intensive Care Unit (ICU)'}
            </span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
              icuStats.rate >= 80 ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-700'
            }`}>
              {icuStats.rate}% {lang === 'ar' ? 'إشغال' : 'Occupied'}
            </span>
          </div>

          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mb-3">
            <div
              className={`h-full transition-all duration-500 ${
                icuStats.rate >= 80 ? 'bg-rose-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${icuStats.rate}%` }}
            />
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="bg-emerald-50 rounded-lg p-1.5 border border-emerald-100">
              <span className="text-slate-500 block text-[10px]">{lang === 'ar' ? 'متاح' : 'Available'}</span>
              <strong className="text-emerald-700 font-bold text-sm">{icuStats.available}</strong>
            </div>
            <div className="bg-rose-50 rounded-lg p-1.5 border border-rose-100">
              <span className="text-slate-500 block text-[10px]">{lang === 'ar' ? 'مشغول' : 'Occupied'}</span>
              <strong className="text-rose-700 font-bold text-sm">{icuStats.occupied}</strong>
            </div>
            <div className="bg-slate-50 rounded-lg p-1.5 border border-slate-200">
              <span className="text-slate-500 block text-[10px]">{lang === 'ar' ? 'إجمالي' : 'Total'}</span>
              <strong className="text-slate-700 font-bold text-sm">{icuStats.total}</strong>
            </div>
          </div>
        </div>

        {/* Intermediate Card */}
        <div className={`bg-white rounded-2xl border p-5 shadow-xs transition ${
          intermediateStats.rate >= 80 ? 'border-amber-300 ring-2 ring-amber-100' : 'border-slate-200'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <span className="font-extrabold text-sm text-slate-800 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
              {lang === 'ar' ? 'الرعاية المتوسطة (Intermediate)' : 'Intermediate Care Unit'}
            </span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
              intermediateStats.rate >= 80 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
            }`}>
              {intermediateStats.rate}% {lang === 'ar' ? 'إشغال' : 'Occupied'}
            </span>
          </div>

          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mb-3">
            <div
              className={`h-full transition-all duration-500 ${
                intermediateStats.rate >= 80 ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${intermediateStats.rate}%` }}
            />
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="bg-emerald-50 rounded-lg p-1.5 border border-emerald-100">
              <span className="text-slate-500 block text-[10px]">{lang === 'ar' ? 'متاح' : 'Available'}</span>
              <strong className="text-emerald-700 font-bold text-sm">{intermediateStats.available}</strong>
            </div>
            <div className="bg-amber-50 rounded-lg p-1.5 border border-amber-100">
              <span className="text-slate-500 block text-[10px]">{lang === 'ar' ? 'مشغول' : 'Occupied'}</span>
              <strong className="text-amber-700 font-bold text-sm">{intermediateStats.occupied}</strong>
            </div>
            <div className="bg-slate-50 rounded-lg p-1.5 border border-slate-200">
              <span className="text-slate-500 block text-[10px]">{lang === 'ar' ? 'إجمالي' : 'Total'}</span>
              <strong className="text-slate-700 font-bold text-sm">{intermediateStats.total}</strong>
            </div>
          </div>
        </div>

        {/* Inpatient Card */}
        <div className={`bg-white rounded-2xl border p-5 shadow-xs transition ${
          inpatientStats.rate >= 80 ? 'border-blue-300 ring-2 ring-blue-100' : 'border-slate-200'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <span className="font-extrabold text-sm text-slate-800 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
              {lang === 'ar' ? 'القسم الداخلي والأجنحة (Inpatient)' : 'Inpatient Wards'}
            </span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
              inpatientStats.rate >= 80 ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-700'
            }`}>
              {inpatientStats.rate}% {lang === 'ar' ? 'إشغال' : 'Occupied'}
            </span>
          </div>

          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mb-3">
            <div
              className={`h-full transition-all duration-500 ${
                inpatientStats.rate >= 80 ? 'bg-blue-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${inpatientStats.rate}%` }}
            />
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="bg-emerald-50 rounded-lg p-1.5 border border-emerald-100">
              <span className="text-slate-500 block text-[10px]">{lang === 'ar' ? 'متاح' : 'Available'}</span>
              <strong className="text-emerald-700 font-bold text-sm">{inpatientStats.available}</strong>
            </div>
            <div className="bg-blue-50 rounded-lg p-1.5 border border-blue-100">
              <span className="text-slate-500 block text-[10px]">{lang === 'ar' ? 'مشغول' : 'Occupied'}</span>
              <strong className="text-blue-700 font-bold text-sm">{inpatientStats.occupied}</strong>
            </div>
            <div className="bg-slate-50 rounded-lg p-1.5 border border-slate-200">
              <span className="text-slate-500 block text-[10px]">{lang === 'ar' ? 'إجمالي' : 'Total'}</span>
              <strong className="text-slate-700 font-bold text-sm">{inpatientStats.total}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Action Bar */}
      <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[260px]">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute start-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={lang === 'ar' ? 'بحث برقم السرير، اسم المريض، أو MRN...' : 'Search bed, patient name, or MRN...'}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full ps-9 pe-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
          </div>
        </div>

        {/* Dept filter buttons */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg text-xs font-medium">
          <button
            onClick={() => setSelectedDept('ALL')}
            className={`px-3 py-1 rounded-md transition ${
              selectedDept === 'ALL' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {t('filterAll', lang)} ({beds.length})
          </button>
          <button
            onClick={() => setSelectedDept('ICU')}
            className={`px-3 py-1 rounded-md transition ${
              selectedDept === 'ICU' ? 'bg-rose-600 text-white shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            ICU
          </button>
          <button
            onClick={() => setSelectedDept('Intermediate')}
            className={`px-3 py-1 rounded-md transition ${
              selectedDept === 'Intermediate' ? 'bg-amber-600 text-white shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Intermediate
          </button>
          <button
            onClick={() => setSelectedDept('Inpatient')}
            className={`px-3 py-1 rounded-md transition ${
              selectedDept === 'Inpatient' ? 'bg-blue-600 text-white shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Inpatient
          </button>
        </div>

        {/* Status filter dropdown */}
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 font-medium"
        >
          <option value="ALL">{lang === 'ar' ? 'كافة حالات الأسرّة' : 'All Bed Statuses'}</option>
          <option value="Available">{lang === 'ar' ? 'متاح فقط' : 'Available Only'}</option>
          <option value="Occupied">{lang === 'ar' ? 'مشغول فقط' : 'Occupied Only'}</option>
          <option value="Cleaning">{lang === 'ar' ? 'قيد التعقيم والتجهيز' : 'Cleaning Only'}</option>
          <option value="Reserved">{lang === 'ar' ? 'محجوز' : 'Reserved Only'}</option>
        </select>
      </div>

      {/* Bed Matrix Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredBeds.map(bed => {
          const isAvailable = bed.status === 'Available';
          const isOccupied = bed.status === 'Occupied';
          const isCleaning = bed.status === 'Cleaning';
          const isReserved = bed.status === 'Reserved';

          return (
            <div
              key={bed.id}
              className={`bg-white rounded-2xl border-2 p-4 shadow-xs flex flex-col justify-between transition-all ${
                isAvailable
                  ? 'border-emerald-300 hover:border-emerald-500 hover:shadow-emerald-50'
                  : isOccupied
                  ? 'border-rose-300 bg-rose-50/20'
                  : isCleaning
                  ? 'border-slate-300 bg-slate-50'
                  : 'border-amber-300 bg-amber-50/20'
              }`}
            >
              <div>
                {/* Header Bed Number + Status Tag */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <Bed className={`w-4 h-4 ${
                      isAvailable ? 'text-emerald-600' : isOccupied ? 'text-rose-600' : 'text-slate-500'
                    }`} />
                    <span className="font-mono font-black text-slate-900 text-sm">{bed.bedNumber}</span>
                  </div>

                  <span
                    className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                      isAvailable
                        ? 'bg-emerald-100 text-emerald-800'
                        : isOccupied
                        ? 'bg-rose-100 text-rose-800'
                        : isCleaning
                        ? 'bg-slate-200 text-slate-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {bed.status === 'Available'
                      ? t('available', lang)
                      : bed.status === 'Occupied'
                      ? t('occupied', lang)
                      : bed.status === 'Cleaning'
                      ? t('cleaning', lang)
                      : t('reserved', lang)}
                  </span>
                </div>

                {/* Dept Tag */}
                <div className="mb-3">
                  <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                    {bed.dept}
                  </span>
                </div>

                {/* Patient details if occupied */}
                {isOccupied && bed.patientName ? (
                  <div className="bg-white border border-rose-100 rounded-xl p-2.5 text-xs mb-3 space-y-1">
                    <p className="font-bold text-slate-900 truncate">{bed.patientName}</p>
                    <p className="font-mono text-emerald-700 text-[11px]">MRN: {bed.patientMrn}</p>
                    {bed.notes && <p className="text-[10px] text-slate-500 line-clamp-1">{bed.notes}</p>}
                  </div>
                ) : (
                  <div className="py-3 text-center text-xs text-slate-400">
                    {isAvailable ? (
                      <span className="text-emerald-600 font-semibold">{lang === 'ar' ? 'جاهز للاستقبال' : 'Ready for admission'}</span>
                    ) : isCleaning ? (
                      <span className="text-slate-500">{lang === 'ar' ? 'جاري التعقيم الطبي...' : 'Sanitizing in progress...'}</span>
                    ) : (
                      <span className="text-amber-600">{lang === 'ar' ? 'محجوز لحالة مؤكدة' : 'Reserved for transfer'}</span>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5">
                {isAvailable ? (
                  <button
                    onClick={() => setAssignModalBed(bed)}
                    className="flex-1 py-1.5 px-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>{lang === 'ar' ? 'تخصيص لمريض' : 'Assign Patient'}</span>
                  </button>
                ) : isOccupied ? (
                  <button
                    onClick={() => handleStatusChange(bed.id, 'Cleaning')}
                    disabled={loadingAction === bed.id}
                    className="flex-1 py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition"
                  >
                    {lang === 'ar' ? 'إخلاء وتعقيم' : 'Discharge & Clean'}
                  </button>
                ) : isCleaning ? (
                  <button
                    onClick={() => handleStatusChange(bed.id, 'Available')}
                    disabled={loadingAction === bed.id}
                    className="flex-1 py-1.5 px-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition"
                  >
                    {lang === 'ar' ? 'تأكيد الجاهزية (متاح)' : 'Mark Ready'}
                  </button>
                ) : (
                  <button
                    onClick={() => handleStatusChange(bed.id, 'Available')}
                    disabled={loadingAction === bed.id}
                    className="flex-1 py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition"
                  >
                    {lang === 'ar' ? 'إلغاء الحجز' : 'Release Bed'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bed Assignment Modal */}
      {assignModalBed && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden">
            <div className="bg-slate-900 text-white p-4 px-6 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg">
                  <Bed className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base">
                    {lang === 'ar' ? `تخصيص السرير (${assignModalBed.bedNumber})` : `Assign Bed (${assignModalBed.bedNumber})`}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {lang === 'ar' ? `قسم: ${assignModalBed.dept}` : `Department: ${assignModalBed.dept}`}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setAssignModalBed(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-600">
                {lang === 'ar'
                  ? 'اختر مريضاً من حالات الطوارئ قيد الانتظار لربطه بهذا السرير وتحديث وجهته تلقائياً في Neon:'
                  : 'Select an emergency waiting patient to link to this bed:'}
              </p>

              {pendingPatients.length === 0 ? (
                <div className="bg-slate-50 rounded-xl p-4 text-center text-xs text-slate-500">
                  {lang === 'ar' ? 'لا توجد حالات طوارئ قيد الانتظار حالياً' : 'No waiting emergency patients available'}
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {pendingPatients.map(p => (
                    <label
                      key={p.id}
                      className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition ${
                        selectedRecordId === p.id
                          ? 'border-emerald-500 bg-emerald-50/50'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="selectedPatient"
                          checked={selectedRecordId === p.id}
                          onChange={() => setSelectedRecordId(p.id)}
                          className="w-4 h-4 text-emerald-600 focus:ring-emerald-500"
                        />
                        <div>
                          <p className="font-bold text-slate-900 text-xs">{p.name}</p>
                          <p className="font-mono text-emerald-700 text-[11px]">MRN: {p.medical}</p>
                        </div>
                      </div>
                      <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                        {p.dept || (lang === 'ar' ? 'طوارئ' : 'ER')}
                      </span>
                    </label>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                <button
                  onClick={handleConfirmAssignment}
                  disabled={!selectedRecordId || loadingAction === assignModalBed.id}
                  className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{loadingAction === assignModalBed.id ? (lang === 'ar' ? 'جاري الحفظ في Neon...' : 'Saving to Neon...') : (lang === 'ar' ? 'تأكيد التخصيص' : 'Confirm Assignment')}</span>
                </button>
                <button
                  onClick={() => setAssignModalBed(null)}
                  className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-xl transition"
                >
                  {t('cancel', lang)}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
