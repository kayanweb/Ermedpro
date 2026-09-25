import React, { useState, useEffect } from 'react';
import { DepartmentType, ERRecord } from '../types';
import { REASONS, DEPARTMENTS, CONTRACT_TYPES, CAME_FROM_OPTIONS, TRIAGE_LEVELS, DISCHARGE_TYPES } from '../constants';
import { calcMinutesDiff, toLocalDatetimeInput } from '../utils/dateTime';
import { DoctorSelect } from './DoctorSelect';
import {
  PlusCircle,
  CheckCircle2,
  User,
  Clock,
  Building2,
  AlertCircle,
  Edit3,
  ShieldCheck,
  CreditCard,
  Ambulance,
  FileText,
  Stethoscope,
  Activity,
} from 'lucide-react';

interface ManualAddTabProps {
  onSaveRecord: (record: ERRecord) => void;
  existingRecords: ERRecord[];
  currentUserName: string;
}

export const ManualAddTab: React.FC<ManualAddTabProps> = ({ onSaveRecord, existingRecords, currentUserName }) => {
  const [medical, setMedical] = useState('');
  const [name, setName] = useState('');
  const [dept, setDept] = useState<string>('Inpatient');
  const [orderTime, setOrderTime] = useState('');
  const [actualTime, setActualTime] = useState('');
  const [reason, setReason] = useState('R01');
  const [notes, setNotes] = useState('');
  const [contract, setContract] = useState('طوارئ المستشفى');
  const [isCustomContract, setIsCustomContract] = useState(false);
  const [customContractText, setCustomContractText] = useState('');
  const [cameFrom, setCameFrom] = useState('من المنزل');
  const [visitNo, setVisitNo] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [triageLevel, setTriageLevel] = useState('Level 3 - المستوى العادي');
  const [dischargeType, setDischargeType] = useState('');
  const [patientHint, setPatientHint] = useState<{ isExisting: boolean; text: string } | null>(null);
  const [error, setError] = useState('');
  const [pendingConfirmRecord, setPendingConfirmRecord] = useState<ERRecord | null>(null);

  // Default order time to current local time on mount
  useEffect(() => {
    setOrderTime(toLocalDatetimeInput(new Date()));
  }, []);

  // Auto-check patient on MRN change or blur
  const handleMedicalBlur = () => {
    const trimmed = medical.trim();
    if (!trimmed) {
      setPatientHint(null);
      return;
    }
    const found = existingRecords.find(r => r.medical.toLowerCase() === trimmed.toLowerCase());
    if (found) {
      if (!name) setName(found.name);
      if (found.contract && !contract) setContract(found.contract);
      if (found.cameFrom && !cameFrom) setCameFrom(found.cameFrom);
      if (found.visitNo && !visitNo) setVisitNo(found.visitNo);
      if (found.doctorName && !doctorName) setDoctorName(found.doctorName);
      setPatientHint({ isExisting: true, text: `✓ مريض مسجل سابقاً (${found.name})` });
    } else {
      setPatientHint({ isExisting: false, text: '🆕 مريض جديد لأول مرة' });
    }
  };

  // Calculate live delay duration
  const delayMinutes = calcMinutesDiff(orderTime, actualTime);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!medical.trim()) {
      setError('يرجى إدخال الرقم الطبي للمريض (MRN)');
      return;
    }
    if (!name.trim()) {
      setError('يرجى إدخال اسم المريض');
      return;
    }
    if (!orderTime) {
      setError('يرجى تحديد وقت طلب النقل (Transfer Order Time)');
      return;
    }
    if (delayMinutes !== null && delayMinutes < 0) {
      setError('خطأ زمني: وقت النقل الفعلي لا يمكن أن يكون قبل وقت طلب النقل');
      return;
    }

    const finalContract = (isCustomContract || contract === 'تعاقد آخر (كتابة يدوية)...' || contract === 'custom')
      ? (customContractText.trim() || 'طوارئ المستشفى')
      : (contract.trim() || 'طوارئ المستشفى');

    const newRecord: ERRecord = {
      id: `manual-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      medical: medical.trim(),
      name: name.trim(),
      dept,
      order: orderTime,
      actual: actualTime || undefined,
      delay: delayMinutes,
      reason,
      notes: notes.trim(),
      status: actualTime ? 'Transferred' : 'Pending',
      contract: finalContract,
      cameFrom: cameFrom.trim() || 'من المنزل',
      visitNo: visitNo.trim() || undefined,
      doctorName: doctorName.trim() || currentUserName,
      diagnosis: diagnosis.trim() || undefined,
      triageLevel,
      dischargeType: dischargeType.trim() || undefined,
      entryMethod: 'Manual',
      recordedBy: currentUserName,
      recordedAt: new Date().toISOString(),
    };

    // Open review & confirm modal before final commit to sheet
    setPendingConfirmRecord(newRecord);
  };

  const handleConfirmSave = () => {
    if (!pendingConfirmRecord) return;
    onSaveRecord(pendingConfirmRecord);
    setPendingConfirmRecord(null);

    // Reset form
    setMedical('');
    setName('');
    setNotes('');
    setActualTime('');
    setVisitNo('');
    setDiagnosis('');
    setPatientHint(null);
    setIsCustomContract(false);
    setCustomContractText('');
    setContract('طوارئ المستشفى');
    setOrderTime(toLocalDatetimeInput(new Date()));
  };

  const setOrderQuick = (minutesAgo: number) => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - minutesAgo);
    setOrderTime(toLocalDatetimeInput(d));
  };

  const setActualNow = () => {
    setActualTime(toLocalDatetimeInput(new Date()));
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-6">
          <div className="p-2.5 rounded-xl bg-blue-100 text-blue-700">
            <PlusCircle className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">تسجيل حالة انتظار ونقل جديدة</h2>
            <p className="text-xs text-slate-500">إدخال مباشر لحالات طوارئ ER وحساب مدة التأخير تلقائياً</p>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Patient Identification */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                <span>الرقم الطبي للمريض (MRN) *</span>
                {patientHint && (
                  <span
                    className={`text-[11px] font-semibold ${
                      patientHint.isExisting ? 'text-emerald-600' : 'text-blue-600'
                    }`}
                  >
                    {patientHint.text}
                  </span>
                )}
              </label>
              <input
                type="text"
                value={medical}
                onChange={e => setMedical(e.target.value)}
                onBlur={handleMedicalBlur}
                placeholder="مثال: 2020123577 أو M001"
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-mono outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">اسم المريض ثلاثي / كامل *</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="مثال: سارة أحمد محمود"
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm outline-none font-semibold text-slate-800"
              />
            </div>
          </div>

          {/* Hospital Contract & Administrative Data (التعاقد والحضور) */}
          <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-100 space-y-3">
            <div className="flex items-center gap-2 text-blue-900 font-bold text-xs">
              <CreditCard className="w-4 h-4 text-blue-600" />
              <span>بيانات التعاقد المالي وجهة الحضور (Contract & Visit Details)</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Contract Field */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-bold text-slate-700">
                    التعاقد / التحمل المالي (Contract / Fin. Type) *
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsCustomContract(!isCustomContract)}
                    className="text-[10px] text-blue-600 hover:text-blue-800 font-bold cursor-pointer"
                  >
                    {isCustomContract ? '📋 اختيار من القائمة' : '✏️ كتابة يدوية'}
                  </button>
                </div>
                <div className="space-y-1.5">
                  {isCustomContract ? (
                    <input
                      type="text"
                      value={customContractText}
                      onChange={e => setCustomContractText(e.target.value)}
                      placeholder="اكتب اسم جهة التعاقد يدوياً (مثال: مريض بهية، شركة بترول، إلخ)..."
                      className="w-full px-3 py-2 rounded-lg border border-blue-400 bg-blue-50/30 text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <select
                      value={contract}
                      onChange={e => {
                        if (e.target.value === 'تعاقد آخر (كتابة يدوية)...' || e.target.value === 'custom') {
                          setIsCustomContract(true);
                        } else {
                          setContract(e.target.value);
                        }
                      }}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 bg-white text-xs font-semibold text-slate-800 outline-none"
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

              {/* Came From */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <Ambulance className="w-3 h-3 text-slate-500" />
                  <span>طريقة الحضور / جهة الوصول (Came From)</span>
                </label>
                <select
                  value={cameFrom}
                  onChange={e => setCameFrom(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 bg-white text-xs font-semibold text-slate-800 outline-none"
                >
                  {CAME_FROM_OPTIONS.map(opt => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              {/* Visit Number */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <FileText className="w-3 h-3 text-slate-500" />
                  <span>رقم الزيارة / الدخول (Visit No)</span>
                </label>
                <input
                  type="text"
                  value={visitNo}
                  onChange={e => setVisitNo(e.target.value)}
                  placeholder="مثال: 418266"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 bg-white text-xs font-mono outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              <div>
                <DoctorSelect
                  showLabel
                  label="الطبيب المعالج / فاحص الطوارئ (Doctor)"
                  value={doctorName}
                  onChange={setDoctorName}
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  التشخيص المبدئي / سبب الإدخال (Diagnosis)
                </label>
                <input
                  type="text"
                  value={diagnosis}
                  onChange={e => setDiagnosis(e.target.value)}
                  placeholder="مثال: Chest Pain / Dyspnea / Appendicitis"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 bg-white text-xs outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 border-t border-blue-100">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <Activity className="w-3 h-3 text-amber-600" />
                  <span>مستوى الفرز (Triage Level) 🚨</span>
                </label>
                <select
                  value={triageLevel}
                  onChange={e => setTriageLevel(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 bg-white text-xs font-semibold text-slate-800 outline-none"
                >
                  {TRIAGE_LEVELS.map((t, i) => (
                    <option key={i} value={t.nameAr}>
                      {t.nameAr}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  نوع الخروج / نتيجة الحالة (Discharge Type)
                </label>
                <select
                  value={dischargeType}
                  onChange={e => setDischargeType(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 bg-white text-xs font-semibold text-slate-800 outline-none"
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
          </div>

          {/* Department & Reason */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">القسم المستقبل المحول إليه *</label>
              <div className="grid grid-cols-3 gap-2">
                {DEPARTMENTS.map(d => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setDept(d.id)}
                    className={`py-2.5 px-2 rounded-xl border text-xs font-bold transition flex flex-col items-center justify-center gap-1 cursor-pointer ${
                      dept === d.id
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <span>{d.id}</span>
                    <span className="text-[10px] font-normal opacity-90">{d.nameAr.split(' ')[0]}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">سبب التأخير المتوقع / الفعلي</label>
              <select
                value={reason}
                onChange={e => setReason(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs font-semibold outline-none bg-white"
              >
                {REASONS.map(r => (
                  <option key={r.code} value={r.code}>
                    {r.code} - {r.textAr} ({r.text})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Time Tracking & Live Calculation */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700">وقت طلب النقل (Transfer Order Time) *</label>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setOrderQuick(0)}
                      className="text-[10px] px-2 py-0.5 rounded bg-white border border-slate-300 hover:bg-slate-100 text-slate-600"
                    >
                      الآن
                    </button>
                    <button
                      type="button"
                      onClick={() => setOrderQuick(30)}
                      className="text-[10px] px-2 py-0.5 rounded bg-white border border-slate-300 hover:bg-slate-100 text-slate-600"
                    >
                      قبل 30د
                    </button>
                    <button
                      type="button"
                      onClick={() => setOrderQuick(60)}
                      className="text-[10px] px-2 py-0.5 rounded bg-white border border-slate-300 hover:bg-slate-100 text-slate-600"
                    >
                      قبل ساعة
                    </button>
                  </div>
                </div>
                <input
                  type="datetime-local"
                  value={orderTime}
                  onChange={e => setOrderTime(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-mono bg-white outline-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700">وقت النقل الفعلي (Actual Transfer Time)</label>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={setActualNow}
                      className="text-[10px] px-2 py-0.5 rounded bg-blue-50 border border-blue-200 hover:bg-blue-100 text-blue-700 font-bold"
                    >
                      تم النقل الآن
                    </button>
                    {actualTime && (
                      <button
                        type="button"
                        onClick={() => setActualTime('')}
                        className="text-[10px] px-2 py-0.5 rounded bg-slate-100 border border-slate-300 hover:bg-slate-200 text-slate-600"
                      >
                        مسح
                      </button>
                    )}
                  </div>
                </div>
                <input
                  type="datetime-local"
                  value={actualTime}
                  onChange={e => setActualTime(e.target.value)}
                  placeholder="اتركه فارغاً إذا كان لا يزال قيد الانتظار"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-mono bg-white outline-none"
                />
              </div>
            </div>

            {/* Delay Calculation Display */}
            <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200">
              <span className="text-xs text-slate-600">مدة التأخير المحسوبة تلقائياً:</span>
              <div>
                {delayMinutes !== null ? (
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold font-mono ${
                      delayMinutes > 60
                        ? 'bg-rose-100 text-rose-800 border border-rose-200'
                        : delayMinutes > 30
                        ? 'bg-amber-100 text-amber-800 border border-amber-200'
                        : delayMinutes >= 0
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>{delayMinutes} دقيقة</span>
                    <span className="text-[10px] font-normal">
                      {delayMinutes > 60
                        ? '(تأخير حرج)'
                        : delayMinutes > 30
                        ? '(تأخير متوسط)'
                        : delayMinutes >= 0
                        ? '(ضمن الهدف القياسي)'
                        : '(خطأ زمني)'}
                    </span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                    <span>قيد الانتظار حالياً (في انتظار تأكيد النقل)</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">ملاحظات سريرية أو إدارية</label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="مثال: جاهز للنقل، في انتظار تجهيز جهاز المراقبة..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 text-xs outline-none"
            />
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="submit"
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-500/20 transition flex items-center gap-2 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>مراجعة واعتماد الحفظ في سجل ER</span>
            </button>
          </div>
        </form>
      </div>

      {/* Review & Confirm Modal before committing to sheet */}
      {pendingConfirmRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[92vh] flex flex-col border border-slate-200 overflow-hidden text-right my-auto">
            <div className="shrink-0 bg-slate-800 text-white p-4 px-6 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-base">مراجعة البيانات قبل اعتماد الحفظ في الشيت</h3>
              </div>
              <button
                type="button"
                onClick={() => setPendingConfirmRecord(null)}
                className="text-white/80 hover:text-white p-1 rounded-lg text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs">
              <p className="text-slate-600">
                يرجى مراجعة تفاصيل الحالة أدناه للتأكد منها، أو الضغط على <b>تعديل</b> للرجوع وتصحيح أي حقل قبل الحفظ النهائي في شيت ER.
              </p>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2.5">
                <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                  <span className="text-slate-500">اسم المريض:</span>
                  <span className="font-bold text-slate-900 text-sm">{pendingConfirmRecord.name}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                  <span className="text-slate-500">الرقم الطبي (MRN):</span>
                  <span className="font-bold font-mono text-emerald-800">{pendingConfirmRecord.medical}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                  <span className="text-slate-500">القسم المستهدف:</span>
                  <span className="font-bold text-slate-800">{pendingConfirmRecord.dept}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                  <span className="text-slate-500">التعاقد / التحمل المالي:</span>
                  <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-sm">
                    {pendingConfirmRecord.contract || 'طوارئ المستشفى'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                  <span className="text-slate-500">طريقة الحضور / الوصول:</span>
                  <span className="font-semibold text-slate-700">{pendingConfirmRecord.cameFrom || 'من المنزل'}</span>
                </div>
                {pendingConfirmRecord.visitNo && (
                  <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                    <span className="text-slate-500">رقم الزيارة (Visit No):</span>
                    <span className="font-mono text-slate-700">{pendingConfirmRecord.visitNo}</span>
                  </div>
                )}
                {pendingConfirmRecord.doctorName && (
                  <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                    <span className="text-slate-500">الطبيب المعالج:</span>
                    <span className="text-slate-700">{pendingConfirmRecord.doctorName}</span>
                  </div>
                )}
                <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                  <span className="text-slate-500">وقت طلب النقل:</span>
                  <span className="font-mono text-slate-800">{pendingConfirmRecord.order.replace('T', ' ')}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                  <span className="text-slate-500">وقت النقل الفعلي:</span>
                  <span className="font-mono text-slate-800">
                    {pendingConfirmRecord.actual ? (
                      pendingConfirmRecord.actual.replace('T', ' ')
                    ) : (
                      <span className="text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded-sm">
                        قيد الانتظار في ER
                      </span>
                    )}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                  <span className="text-slate-500">التأخير المحسوب:</span>
                  <span>
                    {pendingConfirmRecord.delay !== null && pendingConfirmRecord.delay !== undefined ? (
                      <span
                        className={`px-2 py-0.5 rounded-full font-bold font-mono text-[11px] ${
                          pendingConfirmRecord.delay > 60
                            ? 'bg-rose-100 text-rose-800'
                            : pendingConfirmRecord.delay > 30
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {pendingConfirmRecord.delay} دقيقة
                      </span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                  <span className="text-slate-500">سبب التأخير:</span>
                  <span className="text-slate-800 font-semibold">
                    {REASONS.find(r => r.code === pendingConfirmRecord.reason)?.textAr || pendingConfirmRecord.reason}
                  </span>
                </div>
                {pendingConfirmRecord.notes && (
                  <div className="pt-1">
                    <span className="text-slate-500 block mb-0.5">الملاحظات:</span>
                    <span className="text-slate-700 bg-white p-2 rounded-lg border border-slate-200 block">
                      {pendingConfirmRecord.notes}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Pinned Sticky Bottom Actions - Always visible on every screen */}
            <div className="shrink-0 p-3 sm:p-4 bg-slate-50 border-t border-slate-200 flex items-center gap-2">
              <button
                type="button"
                onClick={handleConfirmSave}
                className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>اعتماد الحفظ ونقل للشيت</span>
              </button>
              <button
                type="button"
                onClick={() => setPendingConfirmRecord(null)}
                className="py-3 px-4 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>تعديل</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
