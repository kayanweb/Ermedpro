import React, { useState, useEffect } from 'react';
import { ERRecord, AppLanguage, HospitalBed } from '../types';
import { t } from '../utils/translations';
import { soundService } from '../services/sound';
import {
  Clock,
  AlertTriangle,
  CheckCircle2,
  Volume2,
  VolumeX,
  Share2,
  QrCode,
  Bed,
  Search,
  ArrowRightLeft,
  Sparkles,
  Zap,
} from 'lucide-react';

interface LiveTrackingTabProps {
  records: ERRecord[];
  beds: HospitalBed[];
  lang: AppLanguage;
  currentUser: any;
  onTransferNow: (recordId: string) => Promise<void>;
  onOpenQR: (record: ERRecord) => void;
  onOpenBedAssign: (record: ERRecord) => void;
  onRefresh: () => void;
}

export const LiveTrackingTab: React.FC<LiveTrackingTabProps> = ({
  records,
  beds,
  lang,
  onTransferNow,
  onOpenQR,
  onOpenBedAssign,
}) => {
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [soundEnabled, setSoundEnabled] = useState(soundService.isEnabled());
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  // Live timer tick every second for stopwatch precision
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Filter only pending records
  const pendingRecords = records.filter(r => r.status === 'Pending');

  // Compute elapsed minutes from order time
  const getElapsedMinutes = (orderTime: string): number => {
    try {
      const orderMs = new Date(orderTime).getTime();
      return Math.max(0, Math.floor((currentTime - orderMs) / (1000 * 60)));
    } catch {
      return 0;
    }
  };

  // Format elapsed time as HH:MM:SS stopwatch
  const formatStopwatch = (orderTime: string): string => {
    try {
      const orderMs = new Date(orderTime).getTime();
      const diffSec = Math.max(0, Math.floor((currentTime - orderMs) / 1000));
      const hours = Math.floor(diffSec / 3600);
      const minutes = Math.floor((diffSec % 3600) / 60);
      const seconds = diffSec % 60;
      return `${hours > 0 ? `${hours.toString().padStart(2, '0')}:` : ''}${minutes
        .toString()
        .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } catch {
      return '--:--';
    }
  };

  // Check critical alarms periodically
  useEffect(() => {
    if (!soundEnabled) return;
    const criticalCount = pendingRecords.filter(r => getElapsedMinutes(r.order) > 60).length;
    if (criticalCount > 0) {
      soundService.playCriticalAlarm();
    }
  }, [Math.floor(currentTime / 60000), soundEnabled]);

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    soundService.setEnabled(next);
    if (next) soundService.playChime();
  };

  const filteredPending = pendingRecords.filter(r => {
    if (deptFilter !== 'ALL' && r.dept !== deptFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return r.name.toLowerCase().includes(q) || r.medical.toLowerCase().includes(q);
    }
    return true;
  });

  // Generate WhatsApp emergency dispatch message
  const handleSendWhatsApp = (rec: ERRecord, minutes: number) => {
    const text = encodeURIComponent(
      `🚨 *تنبيه طوارئ عاجل - تأخير تحويل مريض*\n` +
      `━━━━━━━━━━━━━━━━━\n` +
      `👤 *اسم المريض:* ${rec.name}\n` +
      `🏥 *الرقم الطبي (MRN):* ${rec.medical}\n` +
      `📍 *القسم المطلوب:* ${rec.dept || 'غير محدد'}\n` +
      `⏱️ *مدة الانتظار الحالية:* ${minutes} دقيقة\n` +
      `📝 *السبب:* ${rec.notes || rec.reason || 'انتظار تجهيز السرير'}\n` +
      `يرجى التنسيق الفوري لاستقبال الحالة.`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const handleTransfer = async (id: string) => {
    setActionInProgress(id);
    try {
      await onTransferNow(id);
      soundService.playChime();
    } finally {
      setActionInProgress(null);
    }
  };

  const criticalPending = pendingRecords.filter(r => getElapsedMinutes(r.order) > 60).length;
  const warningPending = pendingRecords.filter(r => {
    const m = getElapsedMinutes(r.order);
    return m > 30 && m <= 60;
  }).length;
  const normalPending = pendingRecords.filter(r => getElapsedMinutes(r.order) <= 30).length;

  return (
    <div className="space-y-6">
      {/* Top Banner & Audio Control */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white rounded-2xl p-5 shadow-lg border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-rose-400"></span>
              {lang === 'ar' ? 'مراقبة حية لحظية' : 'Live Real-Time Stream'}
            </span>
            <span className="text-xs text-slate-400 font-mono">
              Neon Cloud Sync: {new Date(currentTime).toLocaleTimeString()}
            </span>
          </div>
          <h2 className="text-xl font-extrabold text-white">
            {lang === 'ar' ? 'شاشة تتبع الحالات المنتظرة بالطوارئ' : 'Emergency Waiting Room Active Monitor'}
          </h2>
          <p className="text-xs text-slate-300 mt-0.5">
            {lang === 'ar'
              ? 'مؤقتات زمنية تصاعدية لكل مريض مع تنبيهات صوتية ولونية آلية للمعيار الذهبي (60 دقيقة)'
              : 'Counting timers per patient with visual and audio alerts for clinical transfer threshold (60m)'}
          </p>
        </div>

        {/* Audio Toggle & Quick Metrics */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={toggleSound}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition shadow-xs ${
              soundEnabled
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
            }`}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            <span>{soundEnabled ? (lang === 'ar' ? 'التنبيه الصوتي: مفعل' : 'Alarm Sound: On') : (lang === 'ar' ? 'التنبيه الصوتي: مكتوم' : 'Alarm Sound: Muted')}</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">{lang === 'ar' ? 'إجمالي المنتظرين' : 'Total Waiting'}</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">{pendingRecords.length}</h3>
          </div>
          <div className="p-3 bg-slate-100 text-slate-700 rounded-xl">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-rose-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-rose-600 font-bold">{lang === 'ar' ? 'حالات حرجة (>60 د)' : 'Critical (>60m)'}</p>
            <h3 className="text-2xl font-black text-rose-700 mt-1">{criticalPending}</h3>
          </div>
          <div className="p-3 bg-rose-50 text-rose-600 rounded-xl animate-bounce">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-amber-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-amber-600">{lang === 'ar' ? 'تحذير متوسط (30-60 د)' : 'Warning (30-60m)'}</p>
            <h3 className="text-2xl font-black text-amber-700 mt-1">{warningPending}</h3>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-emerald-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-emerald-600">{lang === 'ar' ? 'ضمن المعيار (≤30 د)' : 'On Track (≤30m)'}</p>
            <h3 className="text-2xl font-black text-emerald-700 mt-1">{normalPending}</h3>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[260px]">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute start-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={t('searchPlaceholder', lang)}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full ps-9 pe-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
          </div>
        </div>

        {/* Dept Selector */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg text-xs font-medium">
          <button
            onClick={() => setDeptFilter('ALL')}
            className={`px-3 py-1 rounded-md transition ${
              deptFilter === 'ALL' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {t('filterAll', lang)} ({pendingRecords.length})
          </button>
          <button
            onClick={() => setDeptFilter('ICU')}
            className={`px-3 py-1 rounded-md transition ${
              deptFilter === 'ICU' ? 'bg-rose-600 text-white shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            ICU
          </button>
          <button
            onClick={() => setDeptFilter('Intermediate')}
            className={`px-3 py-1 rounded-md transition ${
              deptFilter === 'Intermediate' ? 'bg-amber-600 text-white shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Intermediate
          </button>
          <button
            onClick={() => setDeptFilter('Inpatient')}
            className={`px-3 py-1 rounded-md transition ${
              deptFilter === 'Inpatient' ? 'bg-blue-600 text-white shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Inpatient
          </button>
        </div>
      </div>

      {/* Patient Cards List */}
      {filteredPending.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-xs">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">
            {lang === 'ar' ? 'لا توجد حالات معلقة قيد الانتظار حالياً' : 'No Pending Patients Waiting'}
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            {lang === 'ar'
              ? 'كافة المرضى تم نقلهم بنجاح أو لم يتم تسجيل طلبات جديدة'
              : 'All ER patients have been successfully transferred or no active orders.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPending.map(rec => {
            const minutes = getElapsedMinutes(rec.order);
            const isCritical = minutes > 60;
            const isWarning = minutes > 30 && minutes <= 60;
            const stopwatch = formatStopwatch(rec.order);

            // Available beds for this patient's dept
            const availableBedsForDept = beds.filter(
              b => b.dept === rec.dept && b.status === 'Available'
            ).length;

            return (
              <div
                key={rec.id}
                className={`bg-white rounded-2xl border-2 transition-all p-5 shadow-xs flex flex-col justify-between relative overflow-hidden ${
                  isCritical
                    ? 'border-rose-500 shadow-rose-100 ring-2 ring-rose-500/20'
                    : isWarning
                    ? 'border-amber-400'
                    : 'border-emerald-300'
                }`}
              >
                {/* Header status strip */}
                <div
                  className={`absolute top-0 inset-x-0 h-1.5 ${
                    isCritical ? 'bg-rose-500 animate-pulse' : isWarning ? 'bg-amber-400' : 'bg-emerald-400'
                  }`}
                />

                <div>
                  {/* Top row: Dept tag + Elapsed Timer */}
                  <div className="flex items-center justify-between mb-3">
                    <span
                      className={`text-xs font-black px-2.5 py-1 rounded-lg ${
                        rec.dept === 'ICU'
                          ? 'bg-rose-100 text-rose-800'
                          : rec.dept === 'Intermediate'
                          ? 'bg-amber-100 text-amber-800'
                          : rec.dept === 'Inpatient'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {rec.dept || (lang === 'ar' ? 'غير محدد الوجهة' : 'Unassigned')}
                    </span>

                    {/* Stopwatch Pill */}
                    <div
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-full font-mono text-xs font-extrabold ${
                        isCritical
                          ? 'bg-rose-600 text-white animate-pulse shadow-xs'
                          : isWarning
                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                          : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5" />
                      <span>{stopwatch}</span>
                    </div>
                  </div>

                  {/* Patient Name and MRN */}
                  <div className="mb-3">
                    <h3 className="text-base font-black text-slate-900 leading-snug">{rec.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="font-mono text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                        MRN: {rec.medical}
                      </span>
                      {rec.bedNumber && (
                        <span className="font-mono text-xs font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded flex items-center gap-1">
                          <Bed className="w-3 h-3" />
                          {rec.bedNumber}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Order Time and Reason Note */}
                  <div className="bg-slate-50 rounded-xl p-3 text-xs space-y-1.5 text-slate-600 border border-slate-100 mb-4">
                    <div className="flex justify-between">
                      <span className="text-slate-400">{t('orderTime', lang)}:</span>
                      <span className="font-mono font-medium text-slate-700">
                        {rec.order ? rec.order.replace('T', ' ') : '-'}
                      </span>
                    </div>
                    {rec.reason && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">{lang === 'ar' ? 'كود السبب:' : 'Reason Code:'}</span>
                        <span className="font-bold text-indigo-700">{rec.reason}</span>
                      </div>
                    )}
                    {rec.notes && (
                      <p className="text-slate-700 text-[11px] pt-1 border-t border-slate-200/60 line-clamp-2">
                        {rec.notes}
                      </p>
                    )}

                    {/* Department Bed Availability Indicator */}
                    {rec.dept && (
                      <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 text-[11px]">
                        <span className="text-slate-500">{lang === 'ar' ? 'الأسرّة المتاحة بالقسم:' : 'Available Dept Beds:'}</span>
                        <span className={`font-bold ${availableBedsForDept > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {availableBedsForDept > 0
                            ? `${availableBedsForDept} ${lang === 'ar' ? 'سرير متاح' : 'beds free'}`
                            : lang === 'ar' ? 'ممتلئ بالكامل ⚠️' : 'Fully Occupied ⚠️'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Action Buttons */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  {/* Primary: Transfer Now */}
                  <button
                    onClick={() => handleTransfer(rec.id)}
                    disabled={actionInProgress === rec.id}
                    className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{actionInProgress === rec.id ? (lang === 'ar' ? 'جاري توثيق النقل في Neon...' : 'Recording Transfer...') : t('transferNow', lang)}</span>
                  </button>

                  {/* Secondary Quick Action Row */}
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      onClick={() => onOpenBedAssign(rec)}
                      className="py-1.5 px-2 bg-slate-100 hover:bg-purple-100 hover:text-purple-800 text-slate-700 text-xs font-semibold rounded-lg transition flex items-center justify-center gap-1"
                      title={lang === 'ar' ? 'تخصيص سرير' : 'Assign Bed'}
                    >
                      <Bed className="w-3.5 h-3.5" />
                      <span className="truncate">{lang === 'ar' ? 'سرير' : 'Bed'}</span>
                    </button>

                    <button
                      onClick={() => onOpenQR(rec)}
                      className="py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition flex items-center justify-center gap-1"
                      title={lang === 'ar' ? 'رمز QR وبطاقة المريض' : 'QR Code Pass'}
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>QR</span>
                    </button>

                    <button
                      onClick={() => handleSendWhatsApp(rec, minutes)}
                      className="py-1.5 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-lg transition flex items-center justify-center gap-1"
                      title={lang === 'ar' ? 'إرسال تنبيه واتساب فوري' : 'Send WhatsApp Alert'}
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span className="truncate">{lang === 'ar' ? 'واتساب' : 'WA'}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
