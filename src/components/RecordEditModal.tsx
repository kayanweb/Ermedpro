import React, { useState } from 'react';
import { DepartmentType, ERRecord } from '../types';
import { REASONS, DEPARTMENTS, CONTRACT_TYPES, CAME_FROM_OPTIONS, TRIAGE_LEVELS, DISCHARGE_TYPES } from '../constants';
import { calcMinutesDiff, toLocalDatetimeInput } from '../utils/dateTime';
import { DoctorSelect } from './DoctorSelect';
import { X, Save, Clock, CheckCircle, CreditCard, Ambulance, Stethoscope, Activity } from 'lucide-react';

interface RecordEditModalProps {
  record: ERRecord;
  onClose: () => void;
  onSave: (updatedRecord: ERRecord) => void;
}

export const RecordEditModal: React.FC<RecordEditModalProps> = ({ record, onClose, onSave }) => {
  const [name, setName] = useState(record.name);
  const [medical, setMedical] = useState(record.medical);
  const [dept, setDept] = useState<string>(record.dept || '');
  const [bedNumber, setBedNumber] = useState<string>(record.bedNumber || '');
  const [contract, setContract] = useState<string>(record.contract || 'طوارئ المستشفى');
  const [isCustomContract, setIsCustomContract] = useState<boolean>(() => {
    return !CONTRACT_TYPES.some(c => c.nameAr === record.contract) && !!record.contract && record.contract !== 'طوارئ المستشفى';
  });
  const [cameFrom, setCameFrom] = useState<string>(record.cameFrom || 'من المنزل');
  const [visitNo, setVisitNo] = useState<string>(record.visitNo || '');
  const [doctorName, setDoctorName] = useState<string>(record.doctorName || '');
  const [diagnosis, setDiagnosis] = useState<string>(record.diagnosis || '');
  const [triageLevel, setTriageLevel] = useState<string>(record.triageLevel || 'Level 3 - المستوى العادي');
  const [dischargeType, setDischargeType] = useState<string>(record.dischargeType || '');
  const [entryMethod, setEntryMethod] = useState<'Manual' | 'Imported'>(record.entryMethod === 'Imported' ? 'Imported' : 'Manual');
  const [orderTime, setOrderTime] = useState(record.order);
  const [actualTime, setActualTime] = useState(record.actual || '');
  const [reason, setReason] = useState(record.reason || 'R01');
  const [notes, setNotes] = useState(record.notes || '');

  const delayMinutes = calcMinutesDiff(orderTime, actualTime);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const updated: ERRecord = {
      ...record,
      name: name.trim(),
      medical: medical.trim(),
      dept,
      bedNumber: bedNumber.trim() || undefined,
      contract: contract.trim() || 'طوارئ المستشفى',
      cameFrom: cameFrom.trim() || 'من المنزل',
      visitNo: visitNo.trim() || undefined,
      doctorName: doctorName.trim() || undefined,
      diagnosis: diagnosis.trim() || undefined,
      triageLevel,
      dischargeType: dischargeType.trim() || undefined,
      entryMethod,
      order: orderTime,
      actual: actualTime || undefined,
      delay: delayMinutes,
      reason,
      notes: notes.trim(),
      status: actualTime ? 'Transferred' : 'Pending',
    };

    onSave(updated);
  };

  const handleMarkNow = () => {
    setActualTime(toLocalDatetimeInput(new Date()));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 overflow-hidden text-right my-auto">
        {/* Pinned Header */}
        <div className="shrink-0 flex items-center justify-between p-4 px-6 border-b border-slate-100 bg-white">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-blue-100 text-blue-700">✏️</span>
            <div>
              <h3 className="font-bold text-slate-800 text-base">تعديل بيانات الحالة</h3>
              <p className="text-xs text-slate-500 font-mono">MRN: {record.medical}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
          {/* Scrollable Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">اسم المريض *</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-lg border border-slate-300 font-semibold outline-none"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">الرقم الطبي (MRN) *</label>
              <input
                type="text"
                value={medical}
                onChange={e => setMedical(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono outline-none"
              />
            </div>
          </div>

          {/* Hospital & Contract Section */}
          <div className="p-3 rounded-xl bg-purple-50/60 border border-purple-200 space-y-3">
            <div className="font-bold text-purple-900 flex items-center gap-1.5">
              <CreditCard className="w-4 h-4 text-purple-700" />
              <span>التعاقد والبيانات الإدارية</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-bold text-slate-700">جهة التعاقد *</label>
                  <button
                    type="button"
                    onClick={() => setIsCustomContract(!isCustomContract)}
                    className="text-xs text-purple-600 hover:text-purple-800 font-bold cursor-pointer"
                  >
                    {isCustomContract ? '📋 اختيار من القائمة' : '✏️ كتابة يدوية'}
                  </button>
                </div>
                {isCustomContract ? (
                  <input
                    type="text"
                    value={contract}
                    onChange={e => setContract(e.target.value)}
                    placeholder="اكتب اسم جهة التعاقد يدوياً..."
                    className="w-full px-3 py-2 rounded-lg border border-purple-300 bg-purple-50/30 font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-purple-500"
                  />
                ) : (
                  <select
                    value={contract}
                    onChange={e => {
                      if (e.target.value === 'تعاقد آخر (كتابة يدوية)...') {
                        setIsCustomContract(true);
                      } else {
                        setContract(e.target.value);
                      }
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-semibold bg-white outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    {CONTRACT_TYPES.map(c => (
                      <option key={c.id} value={c.nameAr}>
                        {c.nameAr}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">طريقة الحضور (من أين)</label>
                <select
                  value={cameFrom}
                  onChange={e => setCameFrom(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-semibold bg-white outline-none"
                >
                  {CAME_FROM_OPTIONS.map((c, i) => (
                    <option key={i} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">رقم الزيارة (Visit No)</label>
                <input
                  type="text"
                  value={visitNo}
                  onChange={e => setVisitNo(e.target.value)}
                  placeholder="مثال: V-2025-001"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono bg-white outline-none"
                />
              </div>
              <div>
                <DoctorSelect
                  showLabel
                  label="اسم الطبيب المعالج"
                  value={doctorName}
                  onChange={setDoctorName}
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">التشخيص الطبي الأولي</label>
              <input
                type="text"
                value={diagnosis}
                onChange={e => setDiagnosis(e.target.value)}
                placeholder="التشخيص المبدئي..."
                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white outline-none"
              />
            </div>
          </div>

          {/* Triage & Discharge Section */}
          <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-200 space-y-3">
            <div className="font-bold text-amber-900 flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-amber-700" />
              <span>مستوى الفرز ونوع الخروج وطريقة الإدخال</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">مستوى الفرز (Triage Level) 🚨</label>
                <select
                  value={triageLevel}
                  onChange={e => setTriageLevel(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-semibold bg-white outline-none"
                >
                  {TRIAGE_LEVELS.map((t, i) => (
                    <option key={i} value={t.nameAr}>
                      {t.nameAr}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">نوع الخروج (Discharge Type)</label>
                <select
                  value={dischargeType}
                  onChange={e => setDischargeType(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-semibold bg-white outline-none"
                >
                  <option value="">-- اختياري / قيد العلاج --</option>
                  {DISCHARGE_TYPES.map((dt, i) => (
                    <option key={i} value={dt.nameAr}>
                      {dt.nameAr}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">طريقة الإدخال (Entry Method)</label>
                <select
                  value={entryMethod}
                  onChange={e => setEntryMethod(e.target.value as 'Manual' | 'Imported')}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-semibold bg-white outline-none"
                >
                  <option value="Manual">✍️ إدخال يدوي (Manual Entry)</option>
                  <option value="Imported">📥 سحب آلي / ملف (Imported)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">القسم المستقبل</label>
              <select
                value={dept}
                onChange={e => setDept(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 font-semibold bg-white outline-none"
              >
                <option value="">-- غير محدد (Unassigned) --</option>
                {DEPARTMENTS.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.id} - {d.nameAr}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">رقم السرير المخصص</label>
              <input
                type="text"
                value={bedNumber}
                onChange={e => setBedNumber(e.target.value)}
                placeholder="مثال: Bed 102"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
            <div>
              <label className="block font-bold text-slate-700 mb-1">وقت طلب النقل</label>
              <input
                type="datetime-local"
                value={orderTime}
                onChange={e => setOrderTime(e.target.value)}
                required
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 font-mono bg-white outline-none"
              />
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="font-bold text-slate-700">وقت النقل الفعلي</label>
                <button
                  type="button"
                  onClick={handleMarkNow}
                  className="text-[10px] text-blue-600 font-bold hover:underline"
                >
                  الآن
                </button>
              </div>
              <input
                type="datetime-local"
                value={actualTime}
                onChange={e => setActualTime(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 font-mono bg-white outline-none"
              />
            </div>

            <div className="col-span-full pt-1 flex items-center justify-between">
              <span className="text-slate-600">التأخير المحسوب:</span>
              {delayMinutes !== null ? (
                <span
                  className={`px-2.5 py-0.5 rounded-full font-bold font-mono ${
                    delayMinutes > 60
                      ? 'bg-rose-100 text-rose-800'
                      : delayMinutes > 30
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {delayMinutes} دقيقة
                </span>
              ) : (
                <span className="text-slate-400">قيد الانتظار</span>
              )}
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">سبب التأخير</label>
            <select
              value={reason}
              onChange={e => setReason(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 font-semibold bg-white outline-none"
            >
              {REASONS.map(r => (
                <option key={r.code} value={r.code}>
                  {r.code} - {r.text}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">ملاحظات</label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 outline-none"
            />
          </div>
          </div>

          {/* Pinned Sticky Bottom Actions - Always visible on every screen */}
          <div className="shrink-0 p-3 sm:p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 transition cursor-pointer font-semibold text-xs"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs text-xs"
            >
              <Save className="w-4 h-4" />
              <span>حفظ التعديلات</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
