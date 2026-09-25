import React, { useState, useEffect } from 'react';
import { ERRecord, AppLanguage } from '../types';
import { fetchAdvancedAnalytics, AdvancedAnalyticsData } from '../services/api';
import { DELAY_REASONS } from '../constants';
import { t } from '../utils/translations';
import {
  BarChart3,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Printer,
  Calendar,
  Layers,
  Award,
  Sparkles,
  PieChart,
  Activity,
} from 'lucide-react';

interface AdvancedReportsTabProps {
  records: ERRecord[];
  lang: AppLanguage;
}

export const AdvancedReportsTab: React.FC<AdvancedReportsTabProps> = ({ records, lang }) => {
  const [analytics, setAnalytics] = useState<AdvancedAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<'all' | 'today' | 'month'>('all');

  useEffect(() => {
    fetchAdvancedAnalytics()
      .then(data => setAnalytics(data))
      .catch(err => console.error('Failed to load advanced analytics:', err))
      .finally(() => setLoading(false));
  }, [records]);

  // Calculations from actual records
  const completedRecords = records.filter(r => r.status === 'Transferred' && r.delay !== null);
  const totalCases = records.length;
  const compliantCases = completedRecords.filter(r => (r.delay || 0) <= 60).length;
  const complianceRate = completedRecords.length > 0 ? Math.round((compliantCases / completedRecords.length) * 100) : 0;
  
  const totalDelaySum = completedRecords.reduce((acc, r) => acc + (r.delay || 0), 0);
  const averageDelay = completedRecords.length > 0 ? Math.round(totalDelaySum / completedRecords.length) : 0;
  const maxDelay = completedRecords.length > 0 ? Math.max(...completedRecords.map(r => r.delay || 0)) : 0;
  const minDelay = completedRecords.length > 0 ? Math.min(...completedRecords.map(r => r.delay || 0)) : 0;

  // Entry Method Statistics (Manual vs Imported)
  const manualCount = records.filter(r => r.entryMethod !== 'Imported').length;
  const importedCount = records.filter(r => r.entryMethod === 'Imported').length;

  // Triage Breakdown
  const triageStats: Record<string, number> = {};
  records.forEach(r => {
    const level = r.triageLevel || 'Category 3 (GREEN) - عاجل خلال 30 د (Seen within 30 mins)';
    triageStats[level] = (triageStats[level] || 0) + 1;
  });

  // Discharge Breakdown
  const dischargeStats: Record<string, number> = {};
  records.forEach(r => {
    if (r.dischargeType) {
      dischargeStats[r.dischargeType] = (dischargeStats[r.dischargeType] || 0) + 1;
    }
  });

  // Reason Frequency Pareto
  const reasonCounts: Record<string, number> = {};
  records.forEach(r => {
    if (r.reason) {
      reasonCounts[r.reason] = (reasonCounts[r.reason] || 0) + 1;
    }
  });

  const sortedReasons = Object.entries(reasonCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([code, count]) => {
      const found = DELAY_REASONS.find(dr => dr.code === code);
      return {
        code,
        name: found ? (lang === 'ar' ? found.textAr : found.text) : code,
        count,
        percentage: Math.round((count / (records.length || 1)) * 100),
      };
    });

  // Staff Performance Breakdown
  const staffMap: Record<string, { count: number; completed: number; totalDelay: number }> = {};
  records.forEach(r => {
    const staff = r.recordedBy || 'System';
    if (!staffMap[staff]) {
      staffMap[staff] = { count: 0, completed: 0, totalDelay: 0 };
    }
    staffMap[staff].count += 1;
    if (r.status === 'Transferred' && r.delay !== null && r.delay !== undefined) {
      staffMap[staff].completed += 1;
      staffMap[staff].totalDelay += (r.delay || 0);
    }
  });

  const staffStats = Object.entries(staffMap).map(([name, data]) => ({
    name,
    count: data.count,
    completed: data.completed,
    avgDelay: data.completed > 0 ? Math.round(data.totalDelay / data.completed) : 0,
  }));

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-emerald-600" />
            <span>{lang === 'ar' ? 'لوحة القيادة والتقارير المتقدمة (BI & KPI Analytics)' : 'Executive BI Dashboard & Clinical KPIs'}</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {lang === 'ar'
              ? 'مؤشرات أداء وقت الانتظار، خريطة الكثافة الحرارية بالساعة، ومقارنة الأقسام المعتمدة في Neon'
              : 'Waiting time KPI analytics, hourly heatmaps, department benchmarking, and clinical delay Pareto'}
          </p>
        </div>

        <div className="flex items-center gap-2 print:hidden">
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition shadow-xs"
          >
            <Printer className="w-4 h-4" />
            <span>{lang === 'ar' ? 'طباعة التقرير التنفيذي' : 'Print Executive Report'}</span>
          </button>
        </div>
      </div>

      {/* KPI Highlight Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <div className="flex justify-between items-center text-slate-500 text-xs mb-1">
            <span>{lang === 'ar' ? 'إجمالي الحالات المسجلة' : 'Total Registered Cases'}</span>
            <Layers className="w-4 h-4 text-slate-400" />
          </div>
          <h3 className="text-2xl font-black text-slate-900">{totalCases}</h3>
          <p className="text-[11px] text-slate-400 mt-1">
            {completedRecords.length} {lang === 'ar' ? 'حالة مكتملة التحويل' : 'completed transfers'}
          </p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-emerald-200 shadow-xs">
          <div className="flex justify-between items-center text-emerald-700 text-xs font-semibold mb-1">
            <span>{t('complianceRate', lang)}</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <h3 className="text-2xl font-black text-emerald-700">{complianceRate}%</h3>
          <p className="text-[11px] text-emerald-600 font-medium mt-1">
            {compliantCases} {lang === 'ar' ? 'حالة في أقل من ساعة' : 'cases within 60 min'}
          </p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-blue-200 shadow-xs">
          <div className="flex justify-between items-center text-blue-700 text-xs font-semibold mb-1">
            <span>{t('averageDelay', lang)}</span>
            <Clock className="w-4 h-4 text-blue-600" />
          </div>
          <h3 className="text-2xl font-black text-blue-800">{averageDelay} <span className="text-sm font-normal">{lang === 'ar' ? 'دقيقة' : 'min'}</span></h3>
          <p className="text-[11px] text-blue-600 font-medium mt-1">
            {lang === 'ar' ? `الأفضل: ${minDelay} د | الأقصى: ${maxDelay} د` : `Best: ${minDelay}m | Max: ${maxDelay}m`}
          </p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-rose-200 shadow-xs">
          <div className="flex justify-between items-center text-rose-700 text-xs font-semibold mb-1">
            <span>{lang === 'ar' ? 'تجاوزات المعيار (>60 د)' : 'Critical Breaches (>60m)'}</span>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <h3 className="text-2xl font-black text-rose-700">{completedRecords.length - compliantCases}</h3>
          <p className="text-[11px] text-rose-600 font-medium mt-1">
            {Math.round(((completedRecords.length - compliantCases) / (completedRecords.length || 1)) * 100)}% {lang === 'ar' ? 'من الحالات المكتملة' : 'of completed transfers'}
          </p>
        </div>
      </div>

      {/* Entry Method & Clinical Classification Breakdown Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Entry Method Stat Card */}
        <div className="bg-white rounded-2xl p-4 border border-purple-200 shadow-xs space-y-3">
          <div className="flex justify-between items-center text-purple-900 font-bold text-xs">
            <span>احصائية إدخال الحالات (حسب تاريخ الكتابة)</span>
            <Sparkles className="w-4 h-4 text-purple-600" />
          </div>
          <div className="grid grid-cols-2 gap-2 text-center pt-1">
            <div className="p-2.5 rounded-xl bg-purple-50 border border-purple-100">
              <span className="block text-[10px] text-purple-700 font-bold">إدخال يدوي</span>
              <span className="text-xl font-black text-purple-950 font-mono">{manualCount}</span>
              <span className="block text-[9px] text-purple-600 font-semibold">
                {totalCases > 0 ? Math.round((manualCount / totalCases) * 100) : 0}%
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-indigo-50 border border-indigo-100">
              <span className="block text-[10px] text-indigo-700 font-bold">سحب آلي / شيت</span>
              <span className="text-xl font-black text-indigo-950 font-mono">{importedCount}</span>
              <span className="block text-[9px] text-indigo-600 font-semibold">
                {totalCases > 0 ? Math.round((importedCount / totalCases) * 100) : 0}%
              </span>
            </div>
          </div>
        </div>

        {/* Triage Level Breakdown Card */}
        <div className="bg-white rounded-2xl p-4 border border-amber-200 shadow-xs space-y-2">
          <div className="flex justify-between items-center text-amber-900 font-bold text-xs">
            <span>مستويات الفرز الطبي 🚨 (Triage Breakdown)</span>
            <Activity className="w-4 h-4 text-amber-600" />
          </div>
          <div className="space-y-1.5 pt-1 text-xs">
            {Object.entries(triageStats).map(([lvl, cnt]) => (
              <div key={lvl} className="flex justify-between items-center py-1 border-b border-slate-100">
                <span className="text-slate-700 text-[11px] font-medium">{lvl}</span>
                <span className="font-mono font-bold text-slate-900 bg-amber-50 px-2 py-0.5 rounded text-[11px]">
                  {cnt} حالة
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Discharge Outcome Card */}
        <div className="bg-white rounded-2xl p-4 border border-emerald-200 shadow-xs space-y-2">
          <div className="flex justify-between items-center text-emerald-900 font-bold text-xs">
            <span>نتائج وأنواع الخروج (Discharge Outcomes)</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="space-y-1.5 pt-1 text-xs">
            {Object.keys(dischargeStats).length > 0 ? (
              Object.entries(dischargeStats).map(([dis, cnt]) => (
                <div key={dis} className="flex justify-between items-center py-1 border-b border-slate-100">
                  <span className="text-slate-700 text-[11px] font-medium">{dis}</span>
                  <span className="font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded text-[11px]">
                    {cnt} حالة
                  </span>
                </div>
              ))
            ) : (
              <div className="text-slate-400 text-[11px] py-2 text-center">لا توجد حالات خروج موثقة بعد</div>
            )}
          </div>
        </div>
      </div>
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-extrabold text-sm text-slate-800 flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-600" />
              <span>{lang === 'ar' ? 'خريطة الكثافة الحرارية للتأخير حسب ساعات اليوم (24-Hour Delay Heat Map)' : '24-Hour ER Delay & Congestion Heatmap'}</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {lang === 'ar' ? 'تحديد ساعات الذروة والضغط في الطوارئ لمطابقة الورديات والأطقم الطبية' : 'Identify emergency peak traffic and staffing bottleneck hours'}
            </p>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-emerald-100 border border-emerald-300"></span> 0-30 د</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-amber-200 border border-amber-400"></span> 31-60 د</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-rose-400"></span> &gt;60 د</span>
          </div>
        </div>

        {analytics && analytics.hourlyHeatmap ? (
          <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-12 gap-2 text-center">
            {analytics.hourlyHeatmap.map(h => {
              const hasCases = h.cases > 0;
              const isCrit = h.avgDelay > 60;
              const isWarn = h.avgDelay > 30 && h.avgDelay <= 60;

              return (
                <div
                  key={h.hour}
                  className={`p-2.5 rounded-xl border transition-all ${
                    !hasCases
                      ? 'bg-slate-50 border-slate-200 text-slate-400'
                      : isCrit
                      ? 'bg-rose-50 border-rose-300 text-rose-900 shadow-xs ring-1 ring-rose-200'
                      : isWarn
                      ? 'bg-amber-50 border-amber-300 text-amber-900'
                      : 'bg-emerald-50 border-emerald-300 text-emerald-900'
                  }`}
                >
                  <p className="font-mono text-[10px] font-bold">{h.label}</p>
                  <p className="text-base font-black my-0.5">{hasCases ? h.avgDelay : '-'}</p>
                  <p className="text-[10px] opacity-75">{hasCases ? `${h.cases} ${lang === 'ar' ? 'حالة' : 'pts'}` : lang === 'ar' ? 'هادئ' : 'idle'}</p>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-8 text-center text-xs text-slate-400">
            {lang === 'ar' ? 'جاري قراءة وتحليل بيانات الساعات من Neon...' : 'Loading heatmap...'}
          </div>
        )}
      </div>

      {/* Grid: Department Benchmarking & Top Delay Reasons */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Department Benchmarking */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
          <h3 className="font-extrabold text-sm text-slate-800 mb-3 flex items-center gap-2">
            <Award className="w-4 h-4 text-emerald-600" />
            <span>{lang === 'ar' ? 'مقارنة أداء الأقسام المستهدفة (Department Benchmarking)' : 'Department Performance Benchmarks'}</span>
          </h3>

          <div className="space-y-3">
            {analytics?.deptStats.map(ds => (
              <div key={ds.name} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-xs">{ds.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-slate-700">{ds.avgDelay} {lang === 'ar' ? 'دقيقة' : 'min'}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      ds.complianceRate >= 80 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {ds.complianceRate}% {lang === 'ar' ? 'التزام' : 'compliance'}
                    </span>
                  </div>
                </div>

                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${ds.complianceRate >= 80 ? 'bg-emerald-500' : 'bg-rose-500'}`}
                    style={{ width: `${ds.complianceRate}%` }}
                  />
                </div>

                <div className="flex justify-between text-[11px] text-slate-500">
                  <span>{lang === 'ar' ? 'الحالات المكتملة:' : 'Completed:'} <strong>{ds.completed}</strong></span>
                  <span>{lang === 'ar' ? 'إجمالي المحولين:' : 'Total:'} <strong>{ds.total}</strong></span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Delay Reasons (Pareto) */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
          <h3 className="font-extrabold text-sm text-slate-800 mb-3 flex items-center gap-2">
            <PieChart className="w-4 h-4 text-rose-600" />
            <span>{lang === 'ar' ? 'أبرز أسباب التأخير (Top Delay Causes Analysis)' : 'Top Delay Root Causes (Pareto)'}</span>
          </h3>

          <div className="space-y-2.5">
            {sortedReasons.map(r => (
              <div key={r.code} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-700 truncate max-w-[280px]">
                    <strong className="text-indigo-700 font-mono me-1.5">{r.code}:</strong>
                    {r.name}
                  </span>
                  <span className="font-mono font-bold text-slate-900 shrink-0">
                    {r.count} ({r.percentage}%)
                  </span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${r.percentage}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Staff Performance Matrix */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <h3 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
            <Award className="w-4 h-4 text-indigo-600" />
            <span>{lang === 'ar' ? 'تقرير كفاءة وتوثيق الأطباء والتمريض' : 'Clinical Staff Activity & Efficiency'}</span>
          </h3>
          <span className="text-xs text-slate-500 font-mono">
            {staffStats.length} {lang === 'ar' ? 'عضو طاقم مسجل' : 'clinical staff'}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-start">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase">
              <tr>
                <th className="py-3 px-4 text-start">{lang === 'ar' ? 'الطبيب / عضو التمريض' : 'Staff Member'}</th>
                <th className="py-3 px-4 text-center">{lang === 'ar' ? 'إجمالي الحالات الموثقة' : 'Recorded Cases'}</th>
                <th className="py-3 px-4 text-center">{lang === 'ar' ? 'الحالات المكتملة' : 'Completed Transfers'}</th>
                <th className="py-3 px-4 text-end">{lang === 'ar' ? 'متوسط سرعة الإنجاز' : 'Avg Turnaround'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {staffStats.map(s => (
                <tr key={s.name} className="hover:bg-slate-50 transition">
                  <td className="py-3 px-4 font-bold text-slate-900">{s.name}</td>
                  <td className="py-3 px-4 text-center font-mono font-semibold text-slate-700">{s.count}</td>
                  <td className="py-3 px-4 text-center font-mono font-semibold text-emerald-700">{s.completed}</td>
                  <td className="py-3 px-4 text-end font-mono font-bold text-slate-800">
                    {s.avgDelay > 0 ? `${s.avgDelay} ${lang === 'ar' ? 'دقيقة' : 'min'}` : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
