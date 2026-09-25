import React, { useState, useEffect, useCallback, useRef } from 'react';
import { User, ERRecord, HospitalBed, BedStatus, AppLanguage } from './types';
import { USERS } from './constants';
import { LoginScreen } from './components/LoginScreen';
import { Header } from './components/Header';
import { TabsNav, TabType } from './components/TabsNav';
import { DashboardTab } from './components/DashboardTab';
import { ImportTab } from './components/ImportTab';
import { ManualAddTab } from './components/ManualAddTab';
import { OfficialReportTab } from './components/OfficialReportTab';
import { ExportTab } from './components/ExportTab';
import { LiveTrackingTab } from './components/LiveTrackingTab';
import { BedManagementTab } from './components/BedManagementTab';
import { UserManagementTab } from './components/UserManagementTab';
import { QualityAuditTab } from './components/QualityAuditTab';
import { AdvancedReportsTab } from './components/AdvancedReportsTab';
import { SystemSettingsTab } from './components/SystemSettingsTab';
import { RecordEditModal } from './components/RecordEditModal';
import { QRCodeModal } from './components/QRCodeModal';
import { AuditLogModal } from './components/AuditLogModal';
import { ToastContainer, ToastMessage } from './components/Toast';
import { soundService } from './services/sound';
import { DELAY_REASONS } from './constants';
import { t } from './utils/translations';
import { formatErrorMessage } from './utils/errorUtils';
import {
  fetchRecordsFromDb,
  createRecordInDb,
  bulkImportRecordsToDb,
  updateRecordInDb,
  deleteRecordFromDb,
  clearAllRecordsFromDb,
  resetDemoRecordsInDb,
  checkDbHealth,
  fetchBedsFromDb,
  updateBedStatusInDb,
  assignBedInDb,
  completeTransferInDb,
} from './services/api';

export default function App() {
  const [lang, setLang] = useState<AppLanguage>('ar');

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = sessionStorage.getItem('er_user');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    // Default to admin for instant access
    return USERS[0];
  });

  // Records and Beds state - sourced directly from Neon Cloud PostgreSQL
  const [records, setRecords] = useState<ERRecord[]>([]);
  const [beds, setBeds] = useState<HospitalBed[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [dbConnected, setDbConnected] = useState<boolean>(true);
  const [dbLatency, setDbLatency] = useState<number | undefined>(undefined);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Active navigation tab
  const [activeTab, setActiveTab] = useState<TabType>('live');
  const [deptFilterFromDash, setDeptFilterFromDash] = useState<string>('');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Modals state
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [selectedQrRecord, setSelectedQrRecord] = useState<ERRecord | null>(null);
  const [editingRecord, setEditingRecord] = useState<ERRecord | null>(null);

  // Quick Transfer Complete Modal
  const [quickTransferRecord, setQuickTransferRecord] = useState<ERRecord | null>(null);
  const [quickTransferReason, setQuickTransferReason] = useState<string>('');
  const [quickTransferNotes, setQuickTransferNotes] = useState<string>('');
  const [isSubmittingTransfer, setIsSubmittingTransfer] = useState<boolean>(false);

  // Prevent background sync from overwriting active user edits
  const isEditingRef = useRef<boolean>(false);

  // Update HTML document direction and title based on lang
  useEffect(() => {
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, [lang]);

  const addToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts(prev => [...prev, { id, text, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3800);
  };

  const handleDismissToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const toggleLanguage = () => {
    setLang(prev => (prev === 'ar' ? 'en' : 'ar'));
  };

  // Live fetch records and beds from Neon PostgreSQL
  const loadDataFromNeon = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsSyncing(true);
    try {
      const start = Date.now();
      const [liveRecords, liveBeds] = await Promise.all([
        fetchRecordsFromDb(),
        fetchBedsFromDb().catch(() => []),
      ]);
      setDbLatency(Date.now() - start);
      setDbConnected(true);
      setRecords(liveRecords);
      setBeds(liveBeds);
    } catch (err: any) {
      console.error('Neon DB fetch error:', err);
      setDbConnected(false);
      if (!isSilent) {
        const errorMsg = formatErrorMessage(err, 'تعذر الوصول إلى الخادم');
        addToast(
          lang === 'ar'
            ? `تعذر الاتصال بقاعدة بيانات Neon السحابية: ${errorMsg}`
            : `Failed to connect to Neon Cloud DB: ${errorMsg}`,
          'error'
        );
      }
    } finally {
      setIsLoading(false);
      if (!isSilent) setIsSyncing(false);
    }
  }, [lang]);

  // Initial load
  useEffect(() => {
    loadDataFromNeon(false);
  }, [loadDataFromNeon]);

  // Periodic real-time background sync (every 5 seconds) for multi-user hospital sync
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isEditingRef.current) {
        loadDataFromNeon(true);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [loadDataFromNeon]);

  // Periodic DB latency / health check
  useEffect(() => {
    const healthInterval = setInterval(async () => {
      try {
        const health = await checkDbHealth();
        setDbConnected(health.connected);
        if (health.latencyMs !== undefined) setDbLatency(health.latencyMs);
      } catch {
        setDbConnected(false);
      }
    }, 15000);

    return () => clearInterval(healthInterval);
  }, []);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    sessionStorage.setItem('er_user', JSON.stringify(user));
    soundService.playChime();
    addToast(
      lang === 'ar'
        ? `مرحباً ${user.name} - تم تسجيل الدخول بصلاحية ${user.role}`
        : `Welcome ${user.name} - Logged in as ${user.role}`,
      'success'
    );
  };

  const handleLogout = () => {
    sessionStorage.removeItem('er_user');
    setCurrentUser(null);
    addToast(lang === 'ar' ? 'تم تسجيل الخروج بنجاح' : 'Logged out successfully', 'info');
  };

  // ========================================================
  // NEON CLOUD DATABASE CRUD & BED HANDLERS
  // ========================================================

  const handleSaveManualRecord = async (newRec: ERRecord | Omit<ERRecord, 'id'>) => {
    setIsSyncing(true);
    try {
      const recordWithId: ERRecord = {
        ...newRec,
        id: (newRec as ERRecord).id || `rec-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      };
      const saved = await createRecordInDb(recordWithId);
      setRecords(prev => [saved, ...prev.filter(r => r.id !== saved.id)]);
      soundService.playChime();
      addToast(
        lang === 'ar'
          ? `تم حفظ سجل المريض (${saved.name}) في قاعدة بيانات Neon بنجاح`
          : `Saved patient record (${saved.name}) to Neon DB successfully`,
        'success'
      );
      setActiveTab('live');
    } catch (err: any) {
      console.error('Save error:', err);
      soundService.playWarning();
      addToast(
        lang === 'ar'
          ? `فشل حفظ السجل في Neon: ${err.message}`
          : `Failed to save in Neon: ${err.message}`,
        'error'
      );
    } finally {
      setIsSyncing(false);
    }
  };

  const handleImportSuccess = async (newRecords: ERRecord[]) => {
    setIsSyncing(true);
    try {
      addToast(
        lang === 'ar'
          ? `جاري رفع وحفظ ${newRecords.length} حالة في قاعدة بيانات Neon السحابية...`
          : `Uploading ${newRecords.length} cases to Neon Cloud DB...`,
        'info'
      );
      const count = await bulkImportRecordsToDb(newRecords);
      await loadDataFromNeon(false);
      soundService.playChime();
      addToast(
        lang === 'ar'
          ? `تم حفظ وتحديث ${count} حالة بنجاح في قاعدة بيانات Neon الحية`
          : `Successfully synchronized ${count} cases in Neon DB`,
        'success'
      );
      setActiveTab('live');
    } catch (err: any) {
      console.error('Import error:', err);
      soundService.playWarning();
      addToast(`فشل الاستيراد في Neon: ${formatErrorMessage(err)}`, 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleUpdateRecord = async (updated: ERRecord) => {
    const previous = [...records];
    setRecords(prev => prev.map(r => (r.id === updated.id ? updated : r)));

    try {
      await updateRecordInDb(updated);
      addToast(
        lang === 'ar'
          ? `تم تحديث بيانات الحالة (${updated.name}) في Neon`
          : `Updated record (${updated.name}) in Neon`,
        'success'
      );
    } catch (err: any) {
      console.error('Update error:', err);
      setRecords(previous);
      addToast(`فشل التحديث في Neon: ${formatErrorMessage(err)}`, 'error');
    }
  };

  const handleDeleteRecord = async (id: string) => {
    const previous = [...records];
    setRecords(prev => prev.filter(r => r.id !== id));

    try {
      await deleteRecordFromDb(id);
      addToast(lang === 'ar' ? 'تم حذف السجل من قاعدة بيانات Neon' : 'Deleted record from Neon', 'info');
    } catch (err: any) {
      console.error('Delete error:', err);
      setRecords(previous);
      addToast(`فشل الحذف: ${formatErrorMessage(err)}`, 'error');
    }
  };

  const handleClearAll = async () => {
    const previous = [...records];
    setRecords([]);

    try {
      await clearAllRecordsFromDb();
      addToast(lang === 'ar' ? 'تم تفريغ كافة سجلات الحالات من Neon' : 'Cleared all records from Neon', 'error');
    } catch (err: any) {
      console.error('Clear error:', err);
      setRecords(previous);
      addToast(`فشل تفريغ السجلات: ${formatErrorMessage(err)}`, 'error');
    }
  };

  const handleResetToDemo = async () => {
    setIsSyncing(true);
    try {
      const resetRecords = await resetDemoRecordsInDb();
      setRecords(resetRecords);
      soundService.playChime();
      addToast(
        lang === 'ar'
          ? 'تم استعادة السجلات النموذجية في قاعدة بيانات Neon بنجاح'
          : 'Reset to sample cases in Neon successfully',
        'success'
      );
    } catch (err: any) {
      console.error('Reset error:', err);
      addToast(`فشل استعادة العينات: ${formatErrorMessage(err)}`, 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRestoreBackup = async (restoredRecords: ERRecord[]) => {
    setIsSyncing(true);
    try {
      await bulkImportRecordsToDb(restoredRecords);
      await loadDataFromNeon(false);
      soundService.playChime();
      addToast(
        lang === 'ar'
          ? `تم استعادة ${restoredRecords.length} سجل إلى قاعدة بيانات Neon بنجاح`
          : `Restored ${restoredRecords.length} records to Neon`,
        'success'
      );
      setActiveTab('report');
    } catch (err: any) {
      console.error('Restore error:', err);
      addToast(`فشل استعادة النسخة الاحتياطية: ${formatErrorMessage(err)}`, 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  // Bed Actions
  const handleUpdateBedStatus = async (bedId: string, status: BedStatus, notes?: string) => {
    try {
      await updateBedStatusInDb(bedId, status, notes);
      await loadDataFromNeon(true);
      soundService.playChime();
      addToast(lang === 'ar' ? 'تم تحديث حالة السرير في Neon' : 'Updated bed status in Neon', 'success');
    } catch (err: any) {
      console.error('Bed update error:', err);
      addToast(`فشل تحديث السرير: ${formatErrorMessage(err)}`, 'error');
    }
  };

  const handleAssignBed = async (bedId: string, recordId: string) => {
    try {
      await assignBedInDb(bedId, recordId);
      await loadDataFromNeon(true);
      soundService.playChime();
      addToast(
        lang === 'ar'
          ? 'تم تخصيص السرير للمريض وتحديث بيانات الوجهة في Neon'
          : 'Assigned bed and updated record in Neon',
        'success'
      );
    } catch (err: any) {
      console.error('Assign bed error:', err);
      addToast(`فشل تخصيص السرير: ${formatErrorMessage(err)}`, 'error');
    }
  };

  // Trigger Complete Transfer Modal from LiveTracking
  const handleInitiateTransfer = async (recordId: string) => {
    const rec = records.find(r => r.id === recordId);
    if (!rec) return;
    setQuickTransferRecord(rec);
    setQuickTransferReason(rec.reason || '');
    setQuickTransferNotes(rec.notes || '');
  };

  const handleConfirmQuickTransfer = async () => {
    if (!quickTransferRecord) return;
    setIsSubmittingTransfer(true);
    try {
      const actualTime = new Date().toISOString().slice(0, 16);
      await completeTransferInDb(
        quickTransferRecord.id,
        actualTime,
        quickTransferReason || undefined,
        quickTransferNotes || undefined,
        currentUser?.name
      );
      await loadDataFromNeon(true);
      soundService.playChime();
      addToast(
        lang === 'ar'
          ? `تم إتمام النقل الفعلي للمريض (${quickTransferRecord.name}) وتوثيقه في Neon`
          : `Completed patient transfer (${quickTransferRecord.name}) in Neon`,
        'success'
      );
      setQuickTransferRecord(null);
    } catch (err: any) {
      console.error('Complete transfer error:', err);
      addToast(`فشل إتمام النقل: ${formatErrorMessage(err)}`, 'error');
    } finally {
      setIsSubmittingTransfer(false);
    }
  };

  const handleNavigateToReportWithDept = (dept?: string) => {
    setDeptFilterFromDash(dept || '');
    setActiveTab('report');
  };

  if (!currentUser) {
    return (
      <>
        <LoginScreen onLogin={handleLogin} />
        <ToastContainer toasts={toasts} onDismiss={handleDismissToast} />
      </>
    );
  }

  const pendingCount = records.filter(r => r.status === 'Pending').length;
  const criticalCount = records.filter(r => {
    if (r.status === 'Pending') {
      const elapsed = Math.floor((Date.now() - new Date(r.order).getTime()) / 60000);
      return elapsed > 60;
    }
    return (r.delay || 0) > 60;
  }).length;
  const availableBedsCount = beds.filter(b => b.status === 'Available').length;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans selection:bg-emerald-600 selection:text-white pb-12">
      {/* Header Bar */}
      <div className="no-print">
        <Header
          currentUser={currentUser}
          onLogout={handleLogout}
          records={records}
          dbConnected={dbConnected}
          dbLatency={dbLatency}
          isSyncing={isSyncing}
          onRefresh={() => loadDataFromNeon(false)}
          onOpenAuditLog={() => setShowAuditModal(true)}
          lang={lang}
          onToggleLang={toggleLanguage}
        />
      </div>

      {/* Mobile & Tablet Horizontal Navigation Tabs Bar (< lg screens) */}
      <div className="lg:hidden no-print">
        <TabsNav
          variant="horizontal"
          activeTab={activeTab}
          onTabChange={tab => {
            setActiveTab(tab);
            if (tab !== 'report') setDeptFilterFromDash('');
          }}
          userRole={currentUser.role}
          pendingCount={pendingCount}
          criticalCount={criticalCount}
          availableBedsCount={availableBedsCount}
          lang={lang}
        />
      </div>

      {/* Main Workspace Layout (Desktop Sidebar on the right in RTL, and Main Content) */}
      <div className="w-full max-w-[1720px] mx-auto px-3 sm:px-6 pt-4 sm:pt-6 flex-1 flex flex-col lg:flex-row gap-5 items-start">
        {/* Desktop Sidebar Navigation (Visible on computer and large screens >= lg) */}
        <aside className="hidden lg:block shrink-0 no-print">
          <TabsNav
            variant="sidebar"
            activeTab={activeTab}
            onTabChange={tab => {
              setActiveTab(tab);
              if (tab !== 'report') setDeptFilterFromDash('');
            }}
            userRole={currentUser.role}
            pendingCount={pendingCount}
            criticalCount={criticalCount}
            availableBedsCount={availableBedsCount}
            lang={lang}
          />
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 min-w-0 w-full">
        {isLoading ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
            <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <h3 className="text-base font-bold text-slate-800">
              {lang === 'ar'
                ? 'جاري الاتصال وتحميل بيانات المستشفى من Neon PostgreSQL السحابية...'
                : 'Connecting and fetching clinical records from Neon Cloud DB...'}
            </h3>
            <p className="text-xs text-slate-500 mt-1 font-mono">Real-Time Cloud Connection Pool</p>
          </div>
        ) : (
          <>
            {/* 1. Live Tracking & Stopwatch Monitor */}
            {activeTab === 'live' && (
              <LiveTrackingTab
                records={records}
                beds={beds}
                lang={lang}
                currentUser={currentUser}
                onTransferNow={handleInitiateTransfer}
                onOpenQR={rec => setSelectedQrRecord(rec)}
                onOpenBedAssign={() => setActiveTab('beds')}
                onRefresh={() => loadDataFromNeon(false)}
              />
            )}

            {/* 2. Official ER Report */}
            {activeTab === 'report' && (
              <OfficialReportTab
                records={records}
                userRole={currentUser.role}
                onUpdateRecord={handleUpdateRecord}
                onDeleteRecord={handleDeleteRecord}
                onAddRecord={handleSaveManualRecord}
                initialDeptFilter={deptFilterFromDash}
                onOpenQR={rec => setSelectedQrRecord(rec)}
              />
            )}

            {/* 3. Bed Management */}
            {activeTab === 'beds' && (
              <BedManagementTab
                beds={beds}
                records={records}
                lang={lang}
                currentUser={currentUser}
                onUpdateBedStatus={handleUpdateBedStatus}
                onAssignBed={handleAssignBed}
                onRefresh={() => loadDataFromNeon(false)}
              />
            )}

            {/* 4. Dashboard Visual KPIs */}
            {activeTab === 'dash' && (
              <DashboardTab
                records={records}
                onNavigateToReport={handleNavigateToReportWithDept}
              />
            )}

            {/* 5. Advanced BI Reports & Heatmap */}
            {activeTab === 'analytics' && (
              <AdvancedReportsTab records={records} lang={lang} />
            )}

            {/* Quality Assurance & User Audit Control (Strictly Admin / IT) */}
            {activeTab === 'qualityAudit' && currentUser.role === 'Admin' && (
              <QualityAuditTab
                lang={lang}
                currentUser={currentUser}
                records={records}
              />
            )}

            {/* 6. User Management */}
            {activeTab === 'users' && (currentUser.role === 'Admin' || currentUser.role === 'Doctor') && (
              <UserManagementTab lang={lang} currentUser={currentUser} />
            )}

            {/* 7. System Settings & Rows Manager */}
            {activeTab === 'settings' && (
              <SystemSettingsTab
                records={records}
                onUpdateRecord={handleUpdateRecord}
                onAddRecord={handleSaveManualRecord}
                onDeleteRecord={handleDeleteRecord}
                onOpenEditModal={rec => setEditingRecord(rec)}
                lang={lang}
                currentUser={currentUser}
              />
            )}

            {/* 8. Manual Add */}
            {activeTab === 'add' && currentUser.role !== 'Viewer' && (
              <ManualAddTab
                onSaveRecord={handleSaveManualRecord}
                existingRecords={records}
                currentUserName={currentUser.name}
              />
            )}

            {/* 9. HIS Import */}
            {activeTab === 'import' && currentUser.role !== 'Viewer' && (
              <ImportTab
                onImportSuccess={handleImportSuccess}
                currentUserName={currentUser.name}
              />
            )}

            {/* 10. Export & Backups */}
            {activeTab === 'export' && (
              <ExportTab
                records={records}
                userRole={currentUser.role}
                onClearAll={handleClearAll}
                onResetToDemo={handleResetToDemo}
                onRestoreBackup={handleRestoreBackup}
              />
            )}
          </>
        )}
        </main>
      </div>

      {/* Quick Transfer Completion Dialog */}
      {quickTransferRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[92vh] flex flex-col border border-slate-200 overflow-hidden my-auto">
            <div className="shrink-0 bg-emerald-700 text-white p-4 px-6 flex items-center justify-between">
              <h3 className="font-bold text-base">
                {lang === 'ar' ? 'تأكيد إتمام النقل الفعلي للمريض' : 'Confirm Patient Transfer Completion'}
              </h3>
              <button
                onClick={() => setQuickTransferRecord(null)}
                className="text-white/80 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                <p className="font-bold text-slate-900 text-sm">{quickTransferRecord.name}</p>
                <p className="font-mono text-emerald-700">MRN: {quickTransferRecord.medical}</p>
                <p className="text-slate-500">
                  {lang === 'ar' ? 'وقت طلب النقل:' : 'Order Time:'} {quickTransferRecord.order.replace('T', ' ')}
                </p>
                <p className="text-slate-500">
                  {lang === 'ar' ? 'القسم المستهدف:' : 'Target Dept:'} {quickTransferRecord.dept || (lang === 'ar' ? 'غير محدد' : 'Unassigned')}
                </p>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  {lang === 'ar' ? 'سبب التأخير (في حال وجود تأخير عن المعيار القياسي)' : 'Delay Reason (if delayed)'}
                </label>
                <select
                  value={quickTransferReason}
                  onChange={e => setQuickTransferReason(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-hidden font-medium"
                >
                  <option value="">{lang === 'ar' ? '-- بدون تأخير / تم بالموعد --' : '-- No Delay / On Time --'}</option>
                  {DELAY_REASONS.map(r => (
                    <option key={r.code} value={r.code}>
                      {r.code} - {lang === 'ar' ? r.textAr : r.text}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  {lang === 'ar' ? 'ملاحظات سريرية أو إدارية' : 'Clinical / Administrative Notes'}
                </label>
                <textarea
                  rows={2}
                  value={quickTransferNotes}
                  onChange={e => setQuickTransferNotes(e.target.value)}
                  placeholder={lang === 'ar' ? 'اكتب أي تفاصيل إضافية...' : 'Additional notes...'}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-hidden"
                />
              </div>
            </div>

            {/* Pinned Sticky Bottom Actions - Always visible on every screen */}
            <div className="shrink-0 p-3 sm:p-4 bg-slate-50 border-t border-slate-200 flex items-center gap-2">
              <button
                type="button"
                onClick={handleConfirmQuickTransfer}
                disabled={isSubmittingTransfer}
                className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition cursor-pointer shadow-xs text-xs"
              >
                {isSubmittingTransfer
                  ? (lang === 'ar' ? 'جاري التوثيق في Neon...' : 'Saving to Neon...')
                  : (lang === 'ar' ? 'تأكيد وحفظ النقل الفعلي' : 'Confirm & Save')}
              </button>
              <button
                type="button"
                onClick={() => setQuickTransferRecord(null)}
                className="py-2.5 px-4 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl transition cursor-pointer text-xs"
              >
                {t('cancel', lang)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Code Pass Modal */}
      {selectedQrRecord && (
        <QRCodeModal
          record={selectedQrRecord}
          onClose={() => setSelectedQrRecord(null)}
          lang={lang}
        />
      )}

      {/* Clinical Audit Trail Modal */}
      {showAuditModal && (
        <AuditLogModal
          onClose={() => setShowAuditModal(false)}
          lang={lang}
        />
      )}

      {/* Record Edit Modal */}
      {editingRecord && (
        <RecordEditModal
          record={editingRecord}
          onClose={() => setEditingRecord(null)}
          onSave={async (updated) => {
            await handleUpdateRecord(updated);
            setEditingRecord(null);
          }}
        />
      )}

      {/* Floating Notifications */}
      <ToastContainer toasts={toasts} onDismiss={handleDismissToast} />
    </div>
  );
}
