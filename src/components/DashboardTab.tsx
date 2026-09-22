import React, { useMemo } from 'react';
import { ERRecord } from '../types';
import { REASONS, DEPARTMENTS } from '../constants';
import { Users, Clock, AlertOctagon, Hourglass, CheckCircle2, TrendingUp, AlertTriangle } from 'lucide-react';
import { fmtDateTime } from '../utils/dateTime';

interface DashboardTabProps {
  records: ERRecord[];
  onNavigateToReport: (filterDept?: string) => void;
}

export const DashboardTab: React.FC<DashboardTabProps> = ({ records, onNavigateToReport }) => {
  const stats = useMemo(() => {
    const total = records.length;
    const completed = records.filter(r => r.delay !== null && r.delay !== undefined);
    const avgDelay = completed.length
      ? Math.round(completed.reduce((acc, r) => acc + (r.delay || 0), 0) / completed.length)
      : 0;

    const critical = records.filter(r => r.delay !== null && r.delay !== undefined && r.delay > 60);
    const warning = records.filter(r => r.delay !== null && r.delay !== undefined && r.delay > 30 && r.delay <= 60);
    const targetMet = records.filter(r => r.delay !== null && r.delay !== undefined && r.delay <= 30);
    const pending = records.filter(r => r.status === 'Pending' || r.actual === undefined || !r.actual);

    const icu = records.filter(r => r.dept === 'ICU');
    const inter = records.filter(r => r.dept === 'Intermediate');
    const inp = records.filter(r => r.dept === 'Inpatient');
    const unassigned = records.filter(
      r => !r.dept || (r.dept !== 'ICU' && r.dept !== 'Intermediate' && r.dept !== 'Inpatient')
    );

    const targetRate = completed.length ? Math.round((targetMet.length / completed.length) * 100) : 0;

    // Reason frequency
    const reasonCounts: Record<string, number> = {};
    records.forEach(r => {
      if (r.reason) {
        reasonCounts[r.reason] = (reasonCounts[r.reason] || 0) + 1;
      }
    });

    const reasonList = Object.entries(reasonCounts)
      .map(([code, count]) => {
        const item = REASONS.find(x => x.code === code);
        return {
          code,
          count,
          nameEn: item?.text || code,
          nameAr: item?.textAr || '',
          percent: Math.round((count / (total || 1)) * 100),
        };
      })
      .sort((a, b) => b.count - a.count);

    // Group delays by date
    const dateGroups: Record<string, { totalDelay: number; count: number }> = {};
    records.forEach(r => {
      if (r.order && r.delay !== null && r.delay !== undefined) {
        const d = r.order.slice(0, 10);
        if (!dateGroups[d]) dateGroups[d] = { totalDelay: 0, count: 0 };
        dateGroups[d].totalDelay += r.delay;
        dateGroups[d].count += 1;
      }
    });

    const dailyTrends = Object.entries(dateGroups)
      .map(([date, data]) => ({
        date,
        avg: Math.round(data.totalDelay / data.count),
        count: data.count,
      }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-7);

    return {
      total,
      avgDelay,
      criticalCount: critical.length,
      warningCount: warning.length,
      targetMetCount: targetMet.length,
      pendingCount: pending.length,
      targetRate,
      icuCount: icu.length,
      interCount: inter.length,
      inpCount: inp.length,
      unassignedCount: unassigned.length,
      reasonList,
      dailyTrends,
      criticalCases: critical.slice(0, 5),
    };
  }, [records]);

  return (
    <div className="space-y-6">
      {/* KPI Top Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-700 to-indigo-800 rounded-2xl p-5 text-white shadow-md relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-blue-200 text-xs font-semibold">إجمالي الحالات المسجلة</span>
            <span className="p-2 rounded-xl bg-white/10 text-white">
              <Users className="w-5 h-5" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black">{stats.total}</span>
            <span className="text-xs text-blue-200">حالة ER</span>
          </div>
          <div className="mt-2 text-xs text-blue-200 flex items-center gap-1">
            <span>نسبة تحقيق الهدف القياسي:</span>
            <span className="font-bold text-emerald-300">{stats.targetRate}%</span>
          </div>
        </div>

        <div className="bg-gradient-to-br from-emerald-600 to-teal-800 rounded-2xl p-5 text-white shadow-md relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-emerald-200 text-xs font-semibold">متوسط وقت التأخير</span>
            <span className="p-2 rounded-xl bg-white/10 text-white">
              <Clock className="w-5 h-5" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black">{stats.avgDelay}</span>
            <span className="text-xs text-emerald-200">دقيقة</span>
          </div>
          <div className="mt-2 text-xs text-emerald-100 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
            <span>الهدف السريري المعتمد: ≤ 30 دقيقة</span>
          </div>
        </div>

        <div className="bg-gradient-to-br from-rose-600 to-red-800 rounded-2xl p-5 text-white shadow-md relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-rose-200 text-xs font-semibold">تأخير حرج (&gt;60 دقيقة)</span>
            <span className="p-2 rounded-xl bg-white/10 text-white">
              <AlertOctagon className="w-5 h-5" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black">{stats.criticalCount}</span>
            <span className="text-xs text-rose-200">حالة حرجة</span>
          </div>
          <div className="mt-2 text-xs text-rose-200">
            تتطلب مراجعة جذرية لأسباب تأخير النقل
          </div>
        </div>

        <div className="bg-gradient-to-br from-amber-600 to-orange-700 rounded-2xl p-5 text-white shadow-md relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-amber-200 text-xs font-semibold">قيد الانتظار حالياً</span>
            <span className="p-2 rounded-xl bg-white/10 text-white">
              <Hourglass className="w-5 h-5" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black">{stats.pendingCount}</span>
            <span className="text-xs text-amber-200">في طوارئ ER</span>
          </div>
          <div className="mt-2 text-xs text-amber-200">
            في انتظار تأكيد النقل الفعلي للأقسام
          </div>
        </div>
      </div>

      {/* Department Breakdown Section */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
        <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
          <span>توزيع حالات التحويل حسب القسم المستقبل</span>
          <span className="text-xs text-slate-500 font-normal">(اضغط للفلترة السريعة)</span>
        </h3>

        <div className={`grid grid-cols-1 ${stats.unassignedCount > 0 ? 'sm:grid-cols-2 lg:grid-cols-4' : 'sm:grid-cols-3'} gap-3`}>
          <button
            onClick={() => onNavigateToReport('ICU')}
            className="p-4 rounded-xl border border-blue-200 bg-blue-50/60 hover:bg-blue-100/80 transition text-right cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-blue-900">العناية المركزة (ICU)</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-200 text-blue-800 font-bold">
                {stats.total ? Math.round((stats.icuCount / stats.total) * 100) : 0}%
              </span>
            </div>
            <div className="text-2xl font-black text-blue-700 mt-2">{stats.icuCount}</div>
            <div className="text-[11px] text-blue-600 mt-1">حالات تتطلب أسرّة حرجة</div>
          </button>

          <button
            onClick={() => onNavigateToReport('Intermediate')}
            className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/60 hover:bg-emerald-100/80 transition text-right cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-900">الرعاية المتوسطة (Intermediate)</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-800 font-bold">
                {stats.total ? Math.round((stats.interCount / stats.total) * 100) : 0}%
              </span>
            </div>
            <div className="text-2xl font-black text-emerald-700 mt-2">{stats.interCount}</div>
            <div className="text-[11px] text-emerald-600 mt-1">حالات الملاحظة والمراقبة</div>
          </button>

          <button
            onClick={() => onNavigateToReport('Inpatient')}
            className="p-4 rounded-xl border border-purple-200 bg-purple-50/60 hover:bg-purple-100/80 transition text-right cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-purple-900">الأقسام الداخلية (Inpatient)</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-200 text-purple-800 font-bold">
                {stats.total ? Math.round((stats.inpCount / stats.total) * 100) : 0}%
              </span>
            </div>
            <div className="text-2xl font-black text-purple-700 mt-2">{stats.inpCount}</div>
            <div className="text-[11px] text-purple-600 mt-1">أقسام التنويم العادية</div>
          </button>

          {stats.unassignedCount > 0 && (
            <button
              onClick={() => onNavigateToReport('__unassigned__')}
              className="p-4 rounded-xl border border-amber-300 bg-amber-50/80 hover:bg-amber-100 transition text-right cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-amber-900">غير محدد (Unassigned)</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 font-bold">
                  {stats.total ? Math.round((stats.unassignedCount / stats.total) * 100) : 0}%
                </span>
              </div>
              <div className="text-2xl font-black text-amber-700 mt-2">{stats.unassignedCount}</div>
              <div className="text-[11px] text-amber-700 mt-1">اضغط لتحديد وجهة القسم ⚠️</div>
            </button>
          )}
        </div>
      </div>

      {/* Two Column Visual Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trend Visualization */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                <span>اتجاه متوسط وقت الانتظار اليومي</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">متوسط الدقائق المستغرقة من طلب النقل حتى التحويل الفعلي</p>
            </div>
            <span className="text-xs bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md font-mono">
              آخر 7 أيام
            </span>
          </div>

          {stats.dailyTrends.length > 0 ? (
            <div className="space-y-3">
              {stats.dailyTrends.map((t, idx) => {
                const max = Math.max(...stats.dailyTrends.map(x => x.avg), 60);
                const pct = Math.min(100, Math.round((t.avg / max) * 100));
                const isHigh = t.avg > 60;
                const isMedium = t.avg > 30;

                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-700">{t.date}</span>
                      <span className={isHigh ? 'text-red-600 font-bold' : isMedium ? 'text-amber-600' : 'text-emerald-600'}>
                        {t.avg} دقيقة ({t.count} حالة)
                      </span>
                    </div>
                    <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden flex">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isHigh ? 'bg-red-500' : isMedium ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-12 text-center text-slate-400 text-xs">لا توجد بيانات كافية لعرض الاتجاه اليومي</div>
          )}
        </div>

        {/* Reasons Breakdown */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-800 text-sm">أكثر أسباب التأخير تكراراً (Root Causes)</h3>
              <p className="text-xs text-slate-500 mt-0.5">تصنيف أسباب التأخير وتأثيرها على سير العمل</p>
            </div>
          </div>

          <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
            {stats.reasonList.length > 0 ? (
              stats.reasonList.map((r, idx) => (
                <div key={idx} className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/70 hover:bg-slate-100 transition">
                  <div className="flex items-center justify-between text-xs">
                    <div className="font-semibold text-slate-800 flex items-center gap-2">
                      <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-mono font-bold">
                        {r.code}
                      </span>
                      <span>{r.nameAr || r.nameEn}</span>
                    </div>
                    <div className="text-slate-600 font-mono text-xs font-bold">
                      {r.count} ({r.percent}%)
                    </div>
                  </div>
                  <div className="mt-1.5 w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-600 rounded-full" style={{ width: `${r.percent}%` }} />
                  </div>
                </div>
              ))
            ) : (
              <div className="py-12 text-center text-slate-400 text-xs">لم يتم تسجيل أسباب تأخير حتى الآن</div>
            )}
          </div>
        </div>
      </div>

      {/* Critical Cases Requiring Attention */}
      {stats.criticalCases.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-red-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <span>تنبيه: أعلى الحالات تأخيراً المسجلة (&gt;60 دقيقة)</span>
            </h3>
            <button
              onClick={() => onNavigateToReport()}
              className="text-xs text-red-700 hover:text-red-900 font-semibold underline cursor-pointer"
            >
              عرض الجميع في النموذج
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right border-collapse">
              <thead>
                <tr className="border-b border-red-200 text-red-950 font-bold">
                  <th className="py-2 px-3">المريض</th>
                  <th className="py-2 px-3">الرقم الطبي</th>
                  <th className="py-2 px-3">القسم</th>
                  <th className="py-2 px-3">وقت طلب النقل</th>
                  <th className="py-2 px-3 text-center">مدة التأخير</th>
                  <th className="py-2 px-3">السبب الرئيسي</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-red-100 text-slate-800">
                {stats.criticalCases.map(c => {
                  const rObj = REASONS.find(x => x.code === c.reason);
                  return (
                    <tr key={c.id} className="hover:bg-red-100/50">
                      <td className="py-2 px-3 font-semibold">{c.name}</td>
                      <td className="py-2 px-3 font-mono">{c.medical}</td>
                      <td className="py-2 px-3">{c.dept}</td>
                      <td className="py-2 px-3">{fmtDateTime(c.order)}</td>
                      <td className="py-2 px-3 text-center">
                        <span className="px-2 py-0.5 rounded-full bg-red-600 text-white font-bold font-mono">
                          {c.delay} دقيقة
                        </span>
                      </td>
                      <td className="py-2 px-3 text-slate-600">{rObj?.textAr || rObj?.text || '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
