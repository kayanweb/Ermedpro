import React, { useEffect, useState } from 'react';
import { AuditLogItem, AppLanguage } from '../types';
import { fetchAuditLogsFromDb } from '../services/api';
import { ShieldCheck, History, X, Search, Filter, RefreshCw, Clock } from 'lucide-react';

interface AuditLogModalProps {
  onClose: () => void;
  lang: AppLanguage;
  filterRecordId?: string;
}

export const AuditLogModal: React.FC<AuditLogModalProps> = ({ onClose, lang, filterRecordId }) => {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');

  const loadLogs = async () => {
    setLoading(true);
    try {
      const data = await fetchAuditLogsFromDb(150);
      setLogs(data);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const filteredLogs = logs.filter(l => {
    if (filterRecordId && l.recordId !== filterRecordId) return false;
    if (actionFilter !== 'ALL' && l.action !== actionFilter) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchName = l.patientName?.toLowerCase().includes(term);
      const matchMrn = l.patientMrn?.toLowerCase().includes(term);
      const matchUser = l.changedBy?.toLowerCase().includes(term);
      const matchDetails = l.details?.toLowerCase().includes(term);
      return matchName || matchMrn || matchUser || matchDetails;
    }
    return true;
  });

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'CREATE':
        return <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-xs font-semibold">تسجيل جديد</span>;
      case 'TRANSFER':
        return <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs font-semibold">نقل فعلي</span>;
      case 'BED_ASSIGN':
        return <span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded text-xs font-semibold">تخصيص سرير</span>;
      case 'DEPT_CHANGE':
        return <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded text-xs font-semibold">تعديل وجهة</span>;
      case 'DELETE':
        return <span className="bg-red-100 text-red-800 px-2 py-0.5 rounded text-xs font-semibold">حذف سجل</span>;
      default:
        return <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded text-xs font-semibold">تعديل بيانات</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col border border-slate-200 overflow-hidden my-auto">
        {/* Header */}
        <div className="shrink-0 bg-slate-900 text-white p-4 px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base">
                {lang === 'ar' ? 'سجل التدقيق الطبي والتاريخي (Audit Log)' : 'Clinical & Operational Audit Trail'}
              </h3>
              <p className="text-xs text-slate-400">
                {lang === 'ar' ? 'سجل موثوق في Neon PostgreSQL لمتابعة كافة التحركات والتعديلات الطبية' : 'Immutable Neon PostgreSQL log for clinical compliance'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="shrink-0 p-3 sm:p-4 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-[240px]">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute start-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={lang === 'ar' ? 'بحث بالاسم، MRN، الموظف، أو تفاصيل الإجراء...' : 'Search by name, MRN, user, or details...'}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full ps-9 pe-3 py-1.5 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-white border border-slate-300 px-2.5 py-1.5 rounded-lg">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={actionFilter}
                onChange={e => setActionFilter(e.target.value)}
                className="bg-transparent border-none outline-hidden text-xs font-medium cursor-pointer"
              >
                <option value="ALL">{lang === 'ar' ? 'جميع العمليات' : 'All Actions'}</option>
                <option value="CREATE">{lang === 'ar' ? 'تسجيل جديد' : 'Created'}</option>
                <option value="TRANSFER">{lang === 'ar' ? 'نقل فعلي' : 'Transferred'}</option>
                <option value="BED_ASSIGN">{lang === 'ar' ? 'تخصيص سرير' : 'Bed Assigned'}</option>
                <option value="DEPT_CHANGE">{lang === 'ar' ? 'تعديل قسم' : 'Dept Changed'}</option>
                <option value="UPDATE">{lang === 'ar' ? 'تعديل بيانات' : 'Updated'}</option>
                <option value="DELETE">{lang === 'ar' ? 'حذف' : 'Deleted'}</option>
              </select>
            </div>

            <button
              onClick={loadLogs}
              disabled={loading}
              className="p-1.5 text-slate-600 hover:text-slate-900 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition"
              title="تحديث"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Logs Table */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="py-16 text-center text-slate-500">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
              <p className="text-sm">{lang === 'ar' ? 'جاري جلب سجل التدقيق من Neon...' : 'Loading audit logs...'}</p>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="py-16 text-center text-slate-500">
              <ShieldCheck className="w-8 h-8 mx-auto mb-2 text-slate-400" />
              <p className="text-sm font-medium">{lang === 'ar' ? 'لا توجد حركات تدقيق مطابقة' : 'No matching audit records'}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredLogs.map(log => (
                <div
                  key={log.id}
                  className="bg-white border border-slate-200 rounded-xl p-3.5 hover:border-indigo-300 hover:shadow-xs transition flex items-start justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {getActionBadge(log.action)}
                      {log.patientName && (
                        <span className="font-bold text-slate-900 text-sm">{log.patientName}</span>
                      )}
                      {log.patientMrn && (
                        <span className="font-mono text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                          {log.patientMrn}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-700 leading-relaxed">{log.details}</p>
                    <div className="flex items-center gap-3 text-[11px] text-slate-400 pt-1">
                      <span>{lang === 'ar' ? 'بواسطة:' : 'By:'} <strong className="text-slate-600">{log.changedBy}</strong></span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-slate-400 shrink-0">
                    <Clock className="w-3.5 h-3.5" />
                    <span className="font-mono">
                      {new Date(log.timestamp).toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 p-3 sm:p-4 px-4 sm:px-6 bg-slate-50 border-t border-slate-200 flex justify-between items-center text-xs text-slate-500">
          <span>{lang === 'ar' ? `عدد السجلات المعروضة: ${filteredLogs.length}` : `Showing ${filteredLogs.length} audit entries`}</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg font-bold transition cursor-pointer"
          >
            {lang === 'ar' ? 'إغلاق' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
