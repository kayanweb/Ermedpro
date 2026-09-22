import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { AppLanguage, UserRole, AuditLogItem, UserAuditStat, ERRecord } from '../types';
import { fetchAuditLogsFromDb, fetchUserAuditStatsFromDb } from '../services/api';
import {
  ShieldCheck,
  History,
  Activity,
  UserCheck,
  Search,
  Filter,
  RefreshCw,
  Clock,
  Trash2,
  Edit3,
  PlusCircle,
  ArrowRightLeft,
  Bed,
  Download,
  Printer,
  Eye,
  Users,
  Lock,
  Calendar,
  AlertOctagon,
  Sparkles,
  X,
  ChevronLeft,
  ChevronRight,
  Database,
  ExternalLink,
} from 'lucide-react';

interface QualityAuditTabProps {
  lang: AppLanguage;
  currentUser: {
    username: string;
    name: string;
    role: UserRole;
    titleAr?: string;
  };
  records?: ERRecord[];
}

export const QualityAuditTab: React.FC<QualityAuditTabProps> = ({
  lang,
  currentUser,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'usersSummary' | 'detailedTrail' | 'criticalSecurity'>('usersSummary');
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [userStats, setUserStats] = useState<UserAuditStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());

  // Filters
  const [selectedUser, setSelectedUser] = useState<string>('ALL');
  const [selectedAction, setSelectedAction] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [timeRange, setTimeRange] = useState<'all' | 'today' | '24h' | '7d' | '30d'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Pagination for logs table
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 25;

  // Selected Log for Modal
  const [inspectedLog, setInspectedLog] = useState<AuditLogItem | null>(null);

  // Load Data
  const loadData = useCallback(async (isSilent = false) => {
    if (!isSilent) setRefreshing(true);
    try {
      const [fetchedLogs, fetchedStats] = await Promise.all([
        fetchAuditLogsFromDb(600),
        fetchUserAuditStatsFromDb(),
      ]);
      setLogs(fetchedLogs);
      setUserStats(fetchedStats);
      setLastSyncTime(new Date());
    } catch (err) {
      console.error('Failed to load quality audit data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Auto Refresh Interval
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      loadData(true);
    }, 15000);
    return () => clearInterval(interval);
  }, [autoRefresh, loadData]);

  // Distinct Users List from Logs and Stats
  const availableUsers = useMemo(() => {
    const set = new Set<string>();
    userStats.forEach(u => u.changedBy && set.add(u.changedBy));
    logs.forEach(l => l.changedBy && set.add(l.changedBy));
    return Array.from(set).sort();
  }, [userStats, logs]);

  // Filtered Logs
  const filteredLogs = useMemo(() => {
    return logs.filter(l => {
      // User filter
      if (selectedUser !== 'ALL') {
        if (l.changedBy?.toLowerCase() !== selectedUser.toLowerCase()) return false;
      }

      // Action filter
      if (selectedAction !== 'ALL') {
        if (l.action !== selectedAction) return false;
      }

      // Category filter
      if (selectedCategory !== 'ALL') {
        if (l.category !== selectedCategory) return false;
      }

      // Critical Security tab filter
      if (activeSubTab === 'criticalSecurity') {
        const isCritical =
          l.action === 'DELETE' ||
          l.action === 'USER_DELETE' ||
          l.action === 'USER_CREATE' ||
          l.action === 'USER_UPDATE' ||
          l.action === 'LOGIN' ||
          l.category === 'USERS' ||
          l.category === 'AUTH';
        if (!isCritical) return false;
      }

      // Time Range Filter
      if (timeRange !== 'all') {
        const logTime = new Date(l.timestamp).getTime();
        const now = Date.now();
        if (timeRange === 'today') {
          const todayStart = new Date();
          todayStart.setHours(0, 0, 0, 0);
          if (logTime < todayStart.getTime()) return false;
        } else if (timeRange === '24h') {
          if (now - logTime > 24 * 60 * 60 * 1000) return false;
        } else if (timeRange === '7d') {
          if (now - logTime > 7 * 24 * 60 * 60 * 1000) return false;
        } else if (timeRange === '30d') {
          if (now - logTime > 30 * 24 * 60 * 60 * 1000) return false;
        }
      }

      // Text Search
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchName = l.patientName?.toLowerCase().includes(term);
        const matchMrn = l.patientMrn?.toLowerCase().includes(term);
        const matchUser = l.changedBy?.toLowerCase().includes(term);
        const matchDetails = l.details?.toLowerCase().includes(term);
        const matchAction = l.action?.toLowerCase().includes(term);
        if (!matchName && !matchMrn && !matchUser && !matchDetails && !matchAction) return false;
      }

      return true;
    });
  }, [logs, selectedUser, selectedAction, selectedCategory, activeSubTab, timeRange, searchTerm]);

  // Pagination slice
  const totalPages = Math.ceil(filteredLogs.length / pageSize) || 1;
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredLogs.slice(start, start + pageSize);
  }, [filteredLogs, currentPage, pageSize]);

  // Quick Action Type Badges
  const renderActionBadge = (action: string) => {
    switch (action) {
      case 'CREATE':
      case 'ADD_RECORD':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <PlusCircle className="w-3.5 h-3.5" />
            {lang === 'ar' ? 'إضافة حالة جديدة' : 'Add Case'}
          </span>
        );
      case 'UPDATE':
      case 'UPDATE_RECORD':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
            <Edit3 className="w-3.5 h-3.5" />
            {lang === 'ar' ? 'تعديل بيانات' : 'Edit Case'}
          </span>
        );
      case 'TRANSFER':
      case 'TRANSFER_PATIENT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
            <ArrowRightLeft className="w-3.5 h-3.5" />
            {lang === 'ar' ? 'نقل فعلي للقسم' : 'Patient Transfer'}
          </span>
        );
      case 'BED_ASSIGN':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">
            <Bed className="w-3.5 h-3.5" />
            {lang === 'ar' ? 'تخصيص سرير' : 'Bed Assign'}
          </span>
        );
      case 'BED_STATUS':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-teal-100 text-teal-800 border border-teal-200">
            <Bed className="w-3.5 h-3.5" />
            {lang === 'ar' ? 'تحديث سرير' : 'Bed Status'}
          </span>
        );
      case 'DELETE':
      case 'USER_DELETE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200 animate-pulse">
            <Trash2 className="w-3.5 h-3.5" />
            {lang === 'ar' ? 'حذف سجل' : 'Delete'}
          </span>
        );
      case 'USER_CREATE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-violet-100 text-violet-800 border border-violet-200">
            <UserCheck className="w-3.5 h-3.5" />
            {lang === 'ar' ? 'إنشاء حساب' : 'User Created'}
          </span>
        );
      case 'USER_UPDATE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
            <Lock className="w-3.5 h-3.5" />
            {lang === 'ar' ? 'تعديل حساب' : 'User Modified'}
          </span>
        );
      case 'LOGIN':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-cyan-100 text-cyan-800 border border-cyan-200">
            <Clock className="w-3.5 h-3.5" />
            {lang === 'ar' ? 'تسجيل دخول' : 'User Login'}
          </span>
        );
      case 'BULK_IMPORT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-sky-100 text-sky-800 border border-sky-200">
            <Database className="w-3.5 h-3.5" />
            {lang === 'ar' ? 'استيراد HIS' : 'HIS Import'}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-800 border border-slate-200">
            <Activity className="w-3.5 h-3.5" />
            {action}
          </span>
        );
    }
  };

  // User Role Badge
  const renderRoleBadge = (role?: string) => {
    switch (role) {
      case 'Admin':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">Admin</span>;
      case 'Doctor':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">Doctor</span>;
      case 'Nurse':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">Nurse</span>;
      case 'Viewer':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-200">Viewer</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-700">Staff</span>;
    }
  };

  // Format timestamp nicely
  const formatDateTime = (iso: string): { date: string; time: string } => {
    if (!iso) return { date: '-', time: '-' };
    try {
      const d = new Date(iso);
      return {
        date: d.toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        }),
        time: d.toLocaleTimeString(lang === 'ar' ? 'ar-EG' : 'en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }),
      };
    } catch {
      return { date: iso, time: '' };
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    const headers = ['ID', 'Date', 'Time', 'User', 'Role', 'Action', 'Category', 'Patient Name', 'Patient MRN', 'Details'];
    const rows = filteredLogs.map(l => {
      const dt = formatDateTime(l.timestamp);
      return [
        l.id,
        dt.date,
        dt.time,
        `"${(l.changedBy || '').replace(/"/g, '""')}"`,
        l.userRole || '',
        l.action,
        l.category || '',
        `"${(l.patientName || '').replace(/"/g, '""')}"`,
        `"${(l.patientMrn || '').replace(/"/g, '""')}"`,
        `"${(l.details || '').replace(/"/g, '""')}"`,
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Hospital_Quality_Audit_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print Report
  const handlePrint = () => {
    window.print();
  };

  // Quick jump from user card to detailed trail filtered by that user
  const handleInspectUserActions = (userName: string) => {
    setSelectedUser(userName);
    setSelectedAction('ALL');
    setSelectedCategory('ALL');
    setTimeRange('all');
    setCurrentPage(1);
    setActiveSubTab('detailedTrail');
  };

  // Total Counts for KPI Cards
  const totalOperations = logs.length;
  const totalCreated = logs.filter(l => l.action === 'CREATE' || l.action === 'ADD_RECORD').length;
  const totalUpdated = logs.filter(l => l.action === 'UPDATE' || l.action === 'UPDATE_RECORD' || l.action === 'DEPT_CHANGE').length;
  const totalTransferred = logs.filter(l => l.action === 'TRANSFER' || l.action === 'TRANSFER_PATIENT').length;
  const totalBedActions = logs.filter(l => l.action === 'BED_ASSIGN' || l.action === 'BED_STATUS').length;
  const totalCritical = logs.filter(l => l.action === 'DELETE' || l.action === 'USER_DELETE' || l.action === 'USER_CREATE').length;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. Header Banner & Live Connection */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 sm:p-7 shadow-xl border border-indigo-900/40 relative overflow-hidden">
        <div className="absolute top-0 end-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-600/30 text-indigo-400 rounded-xl border border-indigo-500/30 shadow-inner">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                    {lang === 'ar' ? 'رقابة الجودة وتدقيق حركات المستخدمين' : 'Quality Assurance & User Audit Control'}
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                    Admin / IT Only
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-300">
                  {lang === 'ar'
                    ? 'سجل حي وموثوق لكل مستخدم: ما أضافه، ما عدّله، ما نقله، والعمليات السريرية المنفذة بدقة'
                    : 'Accountability ledger tracking every action, case addition, edit, transfer, and clinical operation per user'}
                </p>
              </div>
            </div>
          </div>

          {/* Controls & Actions */}
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
            {/* Auto refresh switch */}
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition border cursor-pointer ${
                autoRefresh
                  ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-300 shadow-sm'
                  : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Activity className={`w-3.5 h-3.5 ${autoRefresh ? 'animate-pulse text-emerald-400' : ''}`} />
              <span>{lang === 'ar' ? (autoRefresh ? 'تحديث تلقائي: نشط' : 'تحديث تلقائي: متوقف') : (autoRefresh ? 'Auto Sync: ON' : 'Auto Sync: OFF')}</span>
            </button>

            {/* Refresh button */}
            <button
              onClick={() => loadData(false)}
              disabled={refreshing}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 transition cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-indigo-400' : ''}`} />
              <span>{lang === 'ar' ? 'تحديث الآن' : 'Refresh'}</span>
            </button>

            {/* Export CSV */}
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30 transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{lang === 'ar' ? 'تصدير Excel / CSV' : 'Export CSV'}</span>
            </button>

            {/* Print Button */}
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 transition cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{lang === 'ar' ? 'طباعة تقرير' : 'Print'}</span>
            </button>
          </div>
        </div>

        {/* Live Status Footnote */}
        <div className="mt-5 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-slate-300 font-medium">
              {lang === 'ar' ? 'قاعدة بيانات التدقيق السحابية (Neon PostgreSQL) متصلة ولحظية' : 'Live Neon PostgreSQL Audit Database Connected'}
            </span>
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <span>
              {lang === 'ar' ? 'آخر مزامنة:' : 'Last Sync:'} {lastSyncTime.toLocaleTimeString(lang === 'ar' ? 'ar-EG' : 'en-US')}
            </span>
            <span>
              {lang === 'ar' ? `المستخدم الحالي: ${currentUser.name} (${currentUser.role})` : `Auditor: ${currentUser.name}`}
            </span>
          </div>
        </div>
      </div>

      {/* 2. KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* Total Operations */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span>{lang === 'ar' ? 'إجمالي الحركات' : 'Total Logs'}</span>
            <div className="p-1.5 rounded-lg bg-slate-100 text-slate-600">
              <History className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-slate-900">{totalOperations}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">{lang === 'ar' ? 'حركة موثقة رسمياً' : 'Total audit records'}</div>
          </div>
        </div>

        {/* Added Cases */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-emerald-700 text-xs font-bold">
            <span>{lang === 'ar' ? 'إضافة حالات' : 'Added Cases'}</span>
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <PlusCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-emerald-700">{totalCreated}</div>
            <div className="text-[11px] text-emerald-600 mt-0.5">{lang === 'ar' ? 'حالات جديدة مسجلة' : 'New cases created'}</div>
          </div>
        </div>

        {/* Updated Cases */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-blue-700 text-xs font-bold">
            <span>{lang === 'ar' ? 'تعديل بيانات' : 'Modifications'}</span>
            <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
              <Edit3 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-blue-700">{totalUpdated}</div>
            <div className="text-[11px] text-blue-600 mt-0.5">{lang === 'ar' ? 'تحديث وتعديل بالسجلات' : 'Cases updated'}</div>
          </div>
        </div>

        {/* Transferred Cases */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-indigo-700 text-xs font-bold">
            <span>{lang === 'ar' ? 'النقل الفعلي' : 'Transfers'}</span>
            <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
              <ArrowRightLeft className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-indigo-700">{totalTransferred}</div>
            <div className="text-[11px] text-indigo-600 mt-0.5">{lang === 'ar' ? 'نقل مكتمل للأقسام' : 'Transfers executed'}</div>
          </div>
        </div>

        {/* Bed Actions */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-purple-700 text-xs font-bold">
            <span>{lang === 'ar' ? 'الأسرّة والسريري' : 'Bed & Clinical'}</span>
            <div className="p-1.5 rounded-lg bg-purple-50 text-purple-600">
              <Bed className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-purple-700">{totalBedActions}</div>
            <div className="text-[11px] text-purple-600 mt-0.5">{lang === 'ar' ? 'تخصيص وتحديث أسرّة' : 'Bed assignments'}</div>
          </div>
        </div>

        {/* Critical & Deletions */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-rose-700 text-xs font-bold">
            <span>{lang === 'ar' ? 'حذف وأمان' : 'Critical/Security'}</span>
            <div className="p-1.5 rounded-lg bg-rose-50 text-rose-600">
              <AlertOctagon className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-rose-700">{totalCritical}</div>
            <div className="text-[11px] text-rose-600 mt-0.5">{lang === 'ar' ? 'عمليات حساسة وحذف' : 'Deletions & user ops'}</div>
          </div>
        </div>
      </div>

      {/* 3. Sub-Tab Navigation */}
      <div className="bg-white p-1.5 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap gap-1.5">
        <button
          onClick={() => setActiveSubTab('usersSummary')}
          className={`flex-1 min-w-[200px] flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
            activeSubTab === 'usersSummary'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
              : 'text-slate-600 hover:text-indigo-600 hover:bg-slate-50'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>{lang === 'ar' ? 'تحليل ما قام به كل مستخدم (Staff Accountability)' : 'Staff Actions Summary'}</span>
          <span className={`px-2 py-0.5 rounded-full text-xs ${activeSubTab === 'usersSummary' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'}`}>
            {userStats.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('detailedTrail')}
          className={`flex-1 min-w-[200px] flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
            activeSubTab === 'detailedTrail'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
              : 'text-slate-600 hover:text-indigo-600 hover:bg-slate-50'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>{lang === 'ar' ? 'سجل الحركات التفصيلي الحي (Live Audit Trail)' : 'Live Detailed Logs'}</span>
          <span className={`px-2 py-0.5 rounded-full text-xs ${activeSubTab === 'detailedTrail' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'}`}>
            {filteredLogs.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('criticalSecurity')}
          className={`flex-1 min-w-[200px] flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
            activeSubTab === 'criticalSecurity'
              ? 'bg-rose-600 text-white shadow-md shadow-rose-600/25'
              : 'text-slate-600 hover:text-rose-600 hover:bg-slate-50'
          }`}
        >
          <Lock className="w-4 h-4" />
          <span>{lang === 'ar' ? 'العمليات الحساسة والأمنية وحذف السجلات' : 'Security & Critical Actions'}</span>
          <span className={`px-2 py-0.5 rounded-full text-xs ${activeSubTab === 'criticalSecurity' ? 'bg-white/20 text-white' : 'bg-rose-100 text-rose-800'}`}>
            {totalCritical}
          </span>
        </button>
      </div>

      {/* 4. SUB-TAB 1: USERS ACTIONS BREAKDOWN (ماذا فعل كل مستخدم بالتفصيل) */}
      {activeSubTab === 'usersSummary' && (
        <div className="space-y-4">
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-600 text-white rounded-lg">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-indigo-950">
                  {lang === 'ar' ? 'مصفوفة مساءلة ورقابة الجودة لأداء طاقم المستشفى' : 'Hospital Staff Quality Accountability Matrix'}
                </h4>
                <p className="text-xs text-indigo-700">
                  {lang === 'ar'
                    ? 'تعرض هذه اللوحة بدقة ماذا أضاف كل طبيب أو ممرض، وماذا عدّل، وماذا نقل، مع إمكانية استعراض حركاته بنقرة واحدة'
                    : 'Shows exactly what cases each doctor/nurse added, modified, or transferred, with instant one-click audit drilldown'}
                </p>
              </div>
            </div>
            <div className="text-xs font-bold text-indigo-900 bg-white px-3 py-1.5 rounded-lg border border-indigo-200 shadow-2xs">
              {lang === 'ar' ? `إجمالي الكوادر الموثقة: ${userStats.length} مستخدم` : `Staff Count: ${userStats.length}`}
            </div>
          </div>

          {loading ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
              <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-700">{lang === 'ar' ? 'جاري جلب إحصائيات الجودة للمستخدمين من Neon PostgreSQL...' : 'Loading staff quality stats...'}</p>
            </div>
          ) : userStats.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 text-slate-500">
              <History className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="font-bold">{lang === 'ar' ? 'لا توجد حركات مسجلة للمستخدمين حتى الآن' : 'No user actions logged yet'}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {userStats.map((stat, idx) => {
                const dt = formatDateTime(stat.lastActionTime);
                const isCurrent = stat.changedBy === currentUser.name || stat.changedBy === currentUser.username;
                return (
                  <div
                    key={stat.changedBy || idx}
                    className={`bg-white rounded-2xl border p-5 shadow-xs transition hover:shadow-md flex flex-col justify-between relative overflow-hidden ${
                      isCurrent ? 'border-indigo-400 ring-2 ring-indigo-200/50' : 'border-slate-200'
                    }`}
                  >
                    {isCurrent && (
                      <span className="absolute top-3 end-3 px-2 py-0.5 rounded text-[10px] font-black bg-indigo-600 text-white shadow-2xs">
                        {lang === 'ar' ? 'حسابك الحالي' : 'You'}
                      </span>
                    )}

                    <div>
                      {/* User Header */}
                      <div className="flex items-start gap-3">
                        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-50 to-slate-100 border border-indigo-100 flex items-center justify-center text-indigo-700 font-black text-base shrink-0">
                          {stat.changedBy.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4 className="font-bold text-slate-900 text-sm truncate" title={stat.changedBy}>
                              {stat.changedBy}
                            </h4>
                            {renderRoleBadge(stat.userRole)}
                          </div>
                          <p className="text-xs text-slate-500 truncate mt-0.5">
                            {stat.titleAr || (stat.userRole === 'Admin' ? 'مدير نظام الطوارئ' : 'طاقم الرعاية الطبية')}
                          </p>
                        </div>
                      </div>

                      {/* Operations Counter Breakdown */}
                      <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-3 gap-2 text-center">
                        <div className="bg-emerald-50/70 border border-emerald-100 rounded-xl p-2">
                          <span className="text-[10px] font-bold text-emerald-800 block">
                            {lang === 'ar' ? 'ماذا أضاف؟' : 'Added'}
                          </span>
                          <span className="text-base font-black text-emerald-700">
                            {stat.createdCount}
                          </span>
                          <span className="text-[9px] text-emerald-600 block">{lang === 'ar' ? 'حالة جديدة' : 'cases'}</span>
                        </div>

                        <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-2">
                          <span className="text-[10px] font-bold text-blue-800 block">
                            {lang === 'ar' ? 'ماذا عدّل؟' : 'Edited'}
                          </span>
                          <span className="text-base font-black text-blue-700">
                            {stat.updatedCount}
                          </span>
                          <span className="text-[9px] text-blue-600 block">{lang === 'ar' ? 'تعديل بيانات' : 'edits'}</span>
                        </div>

                        <div className="bg-indigo-50/70 border border-indigo-100 rounded-xl p-2">
                          <span className="text-[10px] font-bold text-indigo-800 block">
                            {lang === 'ar' ? 'ماذا نقل؟' : 'Transferred'}
                          </span>
                          <span className="text-base font-black text-indigo-700">
                            {stat.transferCount}
                          </span>
                          <span className="text-[9px] text-indigo-600 block">{lang === 'ar' ? 'نقل فعلي' : 'transfers'}</span>
                        </div>
                      </div>

                      {/* Clinical & Security indicators */}
                      <div className="mt-2.5 flex items-center justify-between text-xs px-2 py-1.5 bg-slate-50 rounded-lg text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <Bed className="w-3.5 h-3.5 text-purple-600" />
                          <span>{lang === 'ar' ? 'حركات أسرّة:' : 'Beds:'} <strong className="text-slate-800">{stat.bedCount}</strong></span>
                        </div>
                        {stat.deleteCount > 0 ? (
                          <div className="flex items-center gap-1.5 text-rose-700 font-bold bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                            <Trash2 className="w-3 h-3 text-rose-600" />
                            <span>{lang === 'ar' ? `حذف: ${stat.deleteCount}` : `Deleted: ${stat.deleteCount}`}</span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400">{lang === 'ar' ? 'لا توجد حذفيات' : 'No deletions'}</span>
                        )}
                      </div>

                      {/* Last Action details */}
                      <div className="mt-3 text-xs bg-slate-50/80 rounded-xl p-3 border border-slate-100">
                        <div className="flex items-center justify-between text-slate-500 mb-1">
                          <span className="font-semibold flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {lang === 'ar' ? 'آخر حركة مسجلة:' : 'Last Activity:'}
                          </span>
                          <span className="text-[11px] font-mono">{dt.date} {dt.time}</span>
                        </div>
                        <p className="text-slate-700 line-clamp-2 text-[11px] font-medium leading-relaxed" title={stat.lastActionDetail}>
                          {stat.lastActionDetail || (lang === 'ar' ? 'لم تسجل تفاصيل بعد' : 'No activity details yet')}
                        </p>
                      </div>
                    </div>

                    {/* Drilldown Button */}
                    <div className="mt-4 pt-3 border-t border-slate-100">
                      <button
                        onClick={() => handleInspectUserActions(stat.changedBy)}
                        className="w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-indigo-600 text-white text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>{lang === 'ar' ? `استعراض كافة حركات (${stat.changedBy})` : `View ${stat.changedBy}'s logs`}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 5. SUB-TAB 2 & 3: DETAILED LIVE AUDIT LOGS & CRITICAL SECURITY */}
      {(activeSubTab === 'detailedTrail' || activeSubTab === 'criticalSecurity') && (
        <div className="space-y-4">
          {/* Filters Toolbar */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-slate-700 font-bold text-sm">
                <Filter className="w-4 h-4 text-indigo-600" />
                <span>{lang === 'ar' ? 'أدوات الفلترة والبحث المتقدم في السجلات:' : 'Advanced Audit Log Filters:'}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span>{lang === 'ar' ? `عدد السجلات المطابقة: ${filteredLogs.length}` : `Matches: ${filteredLogs.length}`}</span>
                {(selectedUser !== 'ALL' || selectedAction !== 'ALL' || selectedCategory !== 'ALL' || timeRange !== 'all' || searchTerm) && (
                  <button
                    onClick={() => {
                      setSelectedUser('ALL');
                      setSelectedAction('ALL');
                      setSelectedCategory('ALL');
                      setTimeRange('all');
                      setSearchTerm('');
                      setCurrentPage(1);
                    }}
                    className="text-indigo-600 hover:underline font-bold cursor-pointer"
                  >
                    {lang === 'ar' ? 'إعادة ضبط الفلاتر' : 'Reset filters'}
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {/* Search input */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute start-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder={lang === 'ar' ? 'بحث بالاسم، MRN، تفاصيل الإجراء...' : 'Search by name, MRN, details...'}
                  value={searchTerm}
                  onChange={e => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full ps-9 pe-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                />
              </div>

              {/* User filter */}
              <div>
                <select
                  value={selectedUser}
                  onChange={e => {
                    setSelectedUser(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full py-2 px-3 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition font-medium"
                >
                  <option value="ALL">{lang === 'ar' ? 'جميع المستخدمين والكوادر' : 'All Users'}</option>
                  {availableUsers.map(u => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>

              {/* Action filter */}
              <div>
                <select
                  value={selectedAction}
                  onChange={e => {
                    setSelectedAction(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full py-2 px-3 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition font-medium"
                >
                  <option value="ALL">{lang === 'ar' ? 'جميع أنواع الإجراءات' : 'All Actions'}</option>
                  <option value="CREATE">{lang === 'ar' ? 'إضافة حالة جديدة (CREATE)' : 'Add Case (CREATE)'}</option>
                  <option value="UPDATE">{lang === 'ar' ? 'تعديل بيانات (UPDATE)' : 'Edit Case (UPDATE)'}</option>
                  <option value="TRANSFER">{lang === 'ar' ? 'نقل فعلي للقسم (TRANSFER)' : 'Transfer (TRANSFER)'}</option>
                  <option value="BED_ASSIGN">{lang === 'ar' ? 'تخصيص سرير (BED_ASSIGN)' : 'Bed Assign'}</option>
                  <option value="BED_STATUS">{lang === 'ar' ? 'تحديث حالة السرير (BED_STATUS)' : 'Bed Status'}</option>
                  <option value="DELETE">{lang === 'ar' ? 'حذف سجل حالة (DELETE)' : 'Delete Record'}</option>
                  <option value="USER_CREATE">{lang === 'ar' ? 'إنشاء حساب مستخدم' : 'User Created'}</option>
                  <option value="USER_UPDATE">{lang === 'ar' ? 'تعديل حساب مستخدم' : 'User Updated'}</option>
                  <option value="USER_DELETE">{lang === 'ar' ? 'حذف حساب مستخدم' : 'User Deleted'}</option>
                  <option value="LOGIN">{lang === 'ar' ? 'تسجيل دخول (LOGIN)' : 'Login'}</option>
                  <option value="BULK_IMPORT">{lang === 'ar' ? 'استيراد دفعات HIS' : 'Bulk Import'}</option>
                </select>
              </div>

              {/* Category filter */}
              <div>
                <select
                  value={selectedCategory}
                  onChange={e => {
                    setSelectedCategory(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full py-2 px-3 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition font-medium"
                >
                  <option value="ALL">{lang === 'ar' ? 'كافة التصنيفات' : 'All Categories'}</option>
                  <option value="RECORDS">{lang === 'ar' ? 'سجلات الحالات (Records)' : 'Cases Records'}</option>
                  <option value="TRANSFERS">{lang === 'ar' ? 'التحويلات الطبية (Transfers)' : 'Clinical Transfers'}</option>
                  <option value="BEDS">{lang === 'ar' ? 'الأسرّة والأقسام (Beds)' : 'Beds & Units'}</option>
                  <option value="USERS">{lang === 'ar' ? 'إدارة الحسابات (Users)' : 'User Management'}</option>
                  <option value="AUTH">{lang === 'ar' ? 'المصادقة والدخول (Auth)' : 'Auth & Security'}</option>
                </select>
              </div>

              {/* Time Range */}
              <div>
                <select
                  value={timeRange}
                  onChange={e => {
                    setTimeRange(e.target.value as any);
                    setCurrentPage(1);
                  }}
                  className="w-full py-2 px-3 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition font-medium"
                >
                  <option value="all">{lang === 'ar' ? 'كافة الفترات الزمنية' : 'All Time'}</option>
                  <option value="today">{lang === 'ar' ? 'حركات اليوم فقط' : 'Today Only'}</option>
                  <option value="24h">{lang === 'ar' ? 'آخر 24 ساعة' : 'Last 24 Hours'}</option>
                  <option value="7d">{lang === 'ar' ? 'آخر 7 أيام' : 'Last 7 Days'}</option>
                  <option value="30d">{lang === 'ar' ? 'آخر 30 يوماً' : 'Last 30 Days'}</option>
                </select>
              </div>
            </div>
          </div>

          {/* Logs Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            {loading ? (
              <div className="p-12 text-center">
                <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-3" />
                <p className="text-sm font-bold text-slate-700">{lang === 'ar' ? 'جاري جلب سجلات التدقيق المباشرة...' : 'Loading audit trail records...'}</p>
              </div>
            ) : paginatedLogs.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                <History className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="font-bold text-slate-700">{lang === 'ar' ? 'لا توجد حركات تدقيق مطابقة للفلاتر المحددة' : 'No audit records matching filters'}</p>
                <p className="text-xs text-slate-400 mt-1">{lang === 'ar' ? 'جرّب توسيع نطاق البحث أو إعادة ضبط الفلاتر' : 'Try expanding search criteria'}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-start text-xs sm:text-sm">
                  <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-3.5 px-4 text-start">{lang === 'ar' ? 'التوقيت الدقيق' : 'Timestamp'}</th>
                      <th className="py-3.5 px-4 text-start">{lang === 'ar' ? 'المستخدم المسؤول' : 'Staff / User'}</th>
                      <th className="py-3.5 px-4 text-start">{lang === 'ar' ? 'نوع الحركة' : 'Action'}</th>
                      <th className="py-3.5 px-4 text-start">{lang === 'ar' ? 'المريض / الملف' : 'Patient / MRN'}</th>
                      <th className="py-3.5 px-4 text-start">{lang === 'ar' ? 'تفاصيل الإجراء وما تم تنفيذه' : 'Action Details'}</th>
                      <th className="py-3.5 px-4 text-center">{lang === 'ar' ? 'معاينة' : 'Inspect'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedLogs.map((log) => {
                      const dt = formatDateTime(log.timestamp);
                      const isCriticalAction = log.action === 'DELETE' || log.action === 'USER_DELETE';
                      return (
                        <tr
                          key={log.id}
                          className={`hover:bg-slate-50/80 transition ${
                            isCriticalAction ? 'bg-rose-50/30' : ''
                          }`}
                        >
                          {/* Timestamp */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="font-semibold text-slate-800">{dt.date}</div>
                            <div className="text-[11px] text-slate-400 font-mono">{dt.time}</div>
                          </td>

                          {/* Staff / User */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900">{log.changedBy}</span>
                              {renderRoleBadge(log.userRole)}
                            </div>
                          </td>

                          {/* Action Badge */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            {renderActionBadge(log.action)}
                          </td>

                          {/* Patient / MRN */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            {log.patientName && log.patientName !== '-' ? (
                              <div>
                                <span className="font-bold text-slate-800 block">{log.patientName}</span>
                                {log.patientMrn && log.patientMrn !== '-' && (
                                  <span className="text-[11px] font-mono text-slate-500">MRN: {log.patientMrn}</span>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400 text-xs">-</span>
                            )}
                          </td>

                          {/* Details */}
                          <td className="py-3 px-4 max-w-md">
                            <p className="text-xs text-slate-700 leading-relaxed line-clamp-2" title={log.details}>
                              {log.details || '-'}
                            </p>
                          </td>

                          {/* Inspect Modal Button */}
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            <button
                              onClick={() => setInspectedLog(log)}
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 transition cursor-pointer"
                              title={lang === 'ar' ? 'عرض التفاصيل الكاملة' : 'View full details'}
                            >
                              <ExternalLink className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-600">
                <div>
                  {lang === 'ar'
                    ? `عرض صفحة ${currentPage} من أصل ${totalPages} (إجمالي ${filteredLogs.length} سجل)`
                    : `Page ${currentPage} of ${totalPages} (${filteredLogs.length} records)`}
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4 rtl:rotate-0 rotate-180" />
                  </button>

                  <div className="px-3 py-1 font-bold text-slate-800">
                    {currentPage} / {totalPages}
                  </div>

                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4 rtl:rotate-0 rotate-180" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 6. INSPECT LOG DETAILS MODAL */}
      {inspectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full border border-slate-200 overflow-hidden">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-4 px-6 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base">
                    {lang === 'ar' ? 'تفاصيل وثيقة التدقيق الطبي والجودة' : 'Audit Entry Details'}
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">
                    ID: {inspectedLog.id}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setInspectedLog(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 text-xs sm:text-sm">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                <div>
                  <span className="text-slate-500 font-semibold block">{lang === 'ar' ? 'المستخدم المنفذ:' : 'Audited User:'}</span>
                  <div className="font-bold text-slate-900 mt-0.5 flex items-center gap-1.5">
                    {inspectedLog.changedBy}
                    {renderRoleBadge(inspectedLog.userRole)}
                  </div>
                </div>

                <div>
                  <span className="text-slate-500 font-semibold block">{lang === 'ar' ? 'نوع الحركة:' : 'Action Type:'}</span>
                  <div className="mt-0.5">{renderActionBadge(inspectedLog.action)}</div>
                </div>

                <div>
                  <span className="text-slate-500 font-semibold block">{lang === 'ar' ? 'التوقيت الدقيق:' : 'Exact Timestamp:'}</span>
                  <div className="font-mono text-slate-800 mt-0.5">
                    {new Date(inspectedLog.timestamp).toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')}
                  </div>
                </div>

                <div>
                  <span className="text-slate-500 font-semibold block">{lang === 'ar' ? 'تصنيف السجل:' : 'Category:'}</span>
                  <span className="px-2 py-0.5 rounded text-xs font-bold bg-slate-200 text-slate-800 mt-0.5 inline-block">
                    {inspectedLog.category || 'GENERAL'}
                  </span>
                </div>
              </div>

              {/* Patient info if present */}
              {(inspectedLog.patientName || inspectedLog.patientMrn) && (
                <div className="bg-indigo-50/50 p-3.5 rounded-xl border border-indigo-100">
                  <span className="text-indigo-900 font-bold block mb-1">
                    {lang === 'ar' ? 'بيانات المريض المرتبط بالحركة:' : 'Associated Patient:'}
                  </span>
                  <div className="flex items-center justify-between text-slate-800">
                    <span className="font-bold">{inspectedLog.patientName || '-'}</span>
                    <span className="font-mono text-slate-600">MRN: {inspectedLog.patientMrn || '-'}</span>
                  </div>
                </div>
              )}

              {/* Detailed Description */}
              <div>
                <span className="text-slate-500 font-semibold block mb-1">
                  {lang === 'ar' ? 'النص التفصيلي للعملية وما تم تنفيذه:' : 'Full Action Description:'}
                </span>
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-slate-800 leading-relaxed font-mono text-xs whitespace-pre-wrap">
                  {inspectedLog.details || '-'}
                </div>
              </div>

              {inspectedLog.recordId && inspectedLog.recordId !== '-' && (
                <div className="text-[11px] text-slate-400 font-mono">
                  Record ID: {inspectedLog.recordId}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end">
              <button
                onClick={() => setInspectedLog(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs cursor-pointer transition"
              >
                {lang === 'ar' ? 'إغلاق' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
