import React, { useState, useMemo, useEffect } from 'react';
import { ERRecord, User, AppLanguage, ScreensVisibilityConfig } from '../types';
import { TRIAGE_LEVELS, DISCHARGE_TYPES, DEPARTMENTS, CONTRACT_TYPES, REASONS } from '../constants';
import { getScreensVisibility, saveScreensVisibility, SCREENS_CHANGE_EVENT } from '../utils/screensConfig';
import { UserManagementTab } from './UserManagementTab';
import {
  Settings,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  CheckCircle2,
  RotateCcw,
  Filter,
  Rows,
  Layers,
  Search,
  Edit2,
  MousePointerClick,
  Sparkles,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Users,
  Radio,
  Bed,
} from 'lucide-react';

interface SystemSettingsTabProps {
  records: ERRecord[];
  onUpdateRecord?: (record: ERRecord) => void;
  onAddRecord?: (record: Omit<ERRecord, 'id'>) => void;
  onDeleteRecord?: (id: string) => void;
  onOpenEditModal?: (record: ERRecord) => void;
  lang?: AppLanguage;
  currentUser?: User | null;
}

export const SystemSettingsTab: React.FC<SystemSettingsTabProps> = ({
  records,
  onUpdateRecord,
  onAddRecord,
  onDeleteRecord,
  onOpenEditModal,
  lang = 'ar',
  currentUser = null,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'screensManager' | 'columns' | 'rowFilters' | 'rowsManager' | 'quickAddRows' | 'cyclesInfo' | 'usersManager'>('screensManager');

  // Screens visibility config (persisted in localStorage and synchronized with event)
  const [screensConfig, setScreensConfig] = useState<ScreensVisibilityConfig>(getScreensVisibility);

  useEffect(() => {
    const handleConfigChange = (e: any) => {
      if (e.detail) {
        setScreensConfig(e.detail);
      } else {
        setScreensConfig(getScreensVisibility());
      }
    };
    window.addEventListener(SCREENS_CHANGE_EVENT, handleConfigChange);
    return () => {
      window.removeEventListener(SCREENS_CHANGE_EVENT, handleConfigChange);
    };
  }, []);

  const toggleScreen = (screenKey: keyof ScreensVisibilityConfig) => {
    const updated = {
      ...screensConfig,
      [screenKey]: !screensConfig[screenKey],
    };
    setScreensConfig(updated);
    saveScreensVisibility(updated);
    setSuccessMsg('تم حفظ وتحديث إعدادات إظهار الشاشات بنجاح!');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  // Columns visibility config persisted in localStorage
  const [cols, setCols] = useState(() => {
    try {
      const saved = localStorage.getItem('er_report_columns_v2');
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return {
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
      quickCyclesEnabled: true,
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

  // State for Quick Add Row
  const [newPatientName, setNewPatientName] = useState('');
  const [newMedicalNo, setNewMedicalNo] = useState('');
  const [newDept, setNewDept] = useState('طوارئ الجراحة');
  const [newContract, setNewContract] = useState('طوارئ المستشفى');
  const [isCustomNewContract, setIsCustomNewContract] = useState(false);
  const [customNewContract, setCustomNewContract] = useState('');
  const [newTriage, setNewTriage] = useState('Level 3 - المستوى العادي');
  const [newDischarge, setNewDischarge] = useState('');
  const [newBedNumber, setNewBedNumber] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [searchRowQuery, setSearchRowQuery] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const saveCols = (newCols: typeof cols) => {
    setCols(newCols);
    try {
      localStorage.setItem('er_report_columns_v2', JSON.stringify(newCols));
    } catch {}
  };

  const saveRowRules = (newRules: typeof rowRules) => {
    setRowRules(newRules);
    try {
      localStorage.setItem('er_row_filters_v1', JSON.stringify(newRules));
    } catch {}
  };

  const saveHiddenRowIds = (newIds: string[]) => {
    setHiddenRowIds(newIds);
    try {
      localStorage.setItem('er_hidden_rows_v1', JSON.stringify(newIds));
    } catch {}
  };

  const toggleHideRow = (id: string) => {
    if (hiddenRowIds.includes(id)) {
      saveHiddenRowIds(hiddenRowIds.filter(hid => hid !== id));
    } else {
      saveHiddenRowIds([...hiddenRowIds, id]);
    }
  };

  const handleUnhideAllRows = () => {
    saveHiddenRowIds([]);
    setSuccessMsg('تم إظهار جميع الصفوف المخفية بنجاح!');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleAddQuickRow = (e: React.FormEvent) => {
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
        dischargeType: newDischarge.trim() || undefined,
        bedNumber: newBedNumber.trim() || undefined,
        notes: newNotes.trim() || undefined,
        order: new Date().toISOString(),
        entryMethod: 'Manual',
        recordedBy: 'مدير النظام',
        status: 'Pending',
      });
      setNewPatientName('');
      setNewMedicalNo('');
      setNewBedNumber('');
      setNewNotes('');
      setCustomNewContract('');
      setIsCustomNewContract(false);
      setSuccessMsg('تمت إضافة الصف/الحالة بنجاح للجدول وقاعدة البيانات!');
      setTimeout(() => setSuccessMsg(''), 3500);
    }
  };

  // Filtered rows for rows manager
  const filteredManagerRows = useMemo(() => {
    if (!searchRowQuery.trim()) return records;
    const q = searchRowQuery.toLowerCase();
    return records.filter(
      r =>
        (r.name && r.name.toLowerCase().includes(q)) ||
        (r.medical && r.medical.toLowerCase().includes(q)) ||
        (r.dept && r.dept.toLowerCase().includes(q)) ||
        (r.contract && r.contract.toLowerCase().includes(q))
    );
  }, [records, searchRowQuery]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 shadow-lg border border-slate-800">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-600/30 rounded-xl border border-indigo-400/30 backdrop-blur-md">
              <Settings className="w-7 h-7 text-indigo-300" />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight">لوحة إعدادات النظام وتخصيص الجداول والصفوف</h2>
              <p className="text-xs text-indigo-200 mt-1">
                إدارة كاملة لإظهار وإخفاء الأعمدة والصفوف، التعديل بالضغط المتكرر، وإضافة صفوف وحالات جديدة.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 bg-slate-800/80 p-1.5 rounded-xl border border-slate-700 text-xs">
            <button
              onClick={() => setActiveSubTab('screensManager')}
              className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeSubTab === 'screensManager' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-300 hover:text-white'
              }`}
            >
              <EyeOff className="w-3.5 h-3.5" />
              <span>إخفاء / إظهار الشاشات</span>
              {(!screensConfig.showLiveTracking || !screensConfig.showBedManagement) && (
                <span className="bg-amber-400 text-slate-900 font-bold px-1.5 py-0.2 rounded-full text-[10px]">
                  مخفية
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveSubTab('columns')}
              className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeSubTab === 'columns' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-300 hover:text-white'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>إعدادات الأعمدة</span>
            </button>

            <button
              onClick={() => setActiveSubTab('rowFilters')}
              className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeSubTab === 'rowFilters' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-300 hover:text-white'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>قواعد إظهار/إخفاء الصفوف</span>
            </button>

            <button
              onClick={() => setActiveSubTab('rowsManager')}
              className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeSubTab === 'rowsManager' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-300 hover:text-white'
              }`}
            >
              <Rows className="w-3.5 h-3.5" />
              <span>إدارة الصفوف ({records.length})</span>
              {hiddenRowIds.length > 0 && (
                <span className="bg-rose-500 text-white px-1.5 py-0.2 rounded-full text-[10px]">
                  {hiddenRowIds.length} مخفي
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveSubTab('quickAddRows')}
              className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeSubTab === 'quickAddRows' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-300 hover:text-white'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>إضافة صف جديد</span>
            </button>

            <button
              onClick={() => setActiveSubTab('usersManager')}
              className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeSubTab === 'usersManager' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-300 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>الحسابات والمستخدمين</span>
            </button>

            <button
              onClick={() => setActiveSubTab('cyclesInfo')}
              className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeSubTab === 'cyclesInfo' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-300 hover:text-white'
              }`}
            >
              <MousePointerClick className="w-3.5 h-3.5" />
              <span>التعديل بالضغط المتكرر</span>
            </button>
          </div>
        </div>
      </div>

      {/* Success Notification */}
      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Sub Tab 0: Screens & Navigation Tabs Visibility Manager */}
      {activeSubTab === 'screensManager' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <EyeOff className="w-5 h-5 text-indigo-600" />
                <span>إدارة وإخفاء الشاشات والتبويبات غير المطلوبة</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                تم استبعاد وإخفاء الشاشات غير المطلوبة من القائمة الرئيسية لتبسيط وسرعة العمل. يمكنك تفعيلها أو إخفاؤها بنقرة واحدة.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">الحفظ تلقائي وفوري</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Screen 1: Live Tracking Tab */}
            <div
              className={`p-5 rounded-2xl border transition-all ${
                screensConfig.showLiveTracking
                  ? 'bg-blue-50/60 border-blue-200 shadow-xs'
                  : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      screensConfig.showLiveTracking
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-slate-200 text-slate-500'
                    }`}
                  >
                    <Radio className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">شاشة التتبع اللحظي وشاشة الانتظار</h4>
                    <span className="text-[11px] font-mono text-slate-400">Live Waiting Stopwatch Screen</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => toggleScreen('showLiveTracking')}
                  className={`px-3.5 py-1.5 rounded-xl font-bold text-xs cursor-pointer transition flex items-center gap-1.5 shadow-xs ${
                    screensConfig.showLiveTracking
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                  }`}
                >
                  {screensConfig.showLiveTracking ? (
                    <>
                      <Eye className="w-3.5 h-3.5" />
                      <span>ظاهرة بالقائمة</span>
                    </>
                  ) : (
                    <>
                      <EyeOff className="w-3.5 h-3.5" />
                      <span>مخفية (غير نشطة)</span>
                    </>
                  )}
                </button>
              </div>

              <p className="text-xs text-slate-600 mt-3 leading-relaxed">
                شاشة المؤقت التنازلي اللحظي للدقائق وبطاقات انتظار الحالات. تم إخفاؤها تلقائياً لعدم الحاجة إليها ولتسهيل التركيز على النموذج الرسمي.
              </p>

              <div className="mt-4 pt-3 border-t border-slate-200/70 flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">الوضع الحالي:</span>
                <span
                  className={`font-bold px-2.5 py-0.5 rounded-full text-[11px] ${
                    screensConfig.showLiveTracking
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      : 'bg-rose-100 text-rose-800 border border-rose-200'
                  }`}
                >
                  {screensConfig.showLiveTracking ? '✅ معروضة بالقائمة' : '🚫 مخفية ومستبعدة'}
                </span>
              </div>
            </div>

            {/* Screen 2: Bed Management Tab */}
            <div
              className={`p-5 rounded-2xl border transition-all ${
                screensConfig.showBedManagement
                  ? 'bg-purple-50/60 border-purple-200 shadow-xs'
                  : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      screensConfig.showBedManagement
                        ? 'bg-purple-600 text-white shadow-sm'
                        : 'bg-slate-200 text-slate-500'
                    }`}
                  >
                    <Bed className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">شاشة إدارة الأسرّة والأقسام</h4>
                    <span className="text-[11px] font-mono text-slate-400">Bed & Dept Management</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => toggleScreen('showBedManagement')}
                  className={`px-3.5 py-1.5 rounded-xl font-bold text-xs cursor-pointer transition flex items-center gap-1.5 shadow-xs ${
                    screensConfig.showBedManagement
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                  }`}
                >
                  {screensConfig.showBedManagement ? (
                    <>
                      <Eye className="w-3.5 h-3.5" />
                      <span>ظاهرة بالقائمة</span>
                    </>
                  ) : (
                    <>
                      <EyeOff className="w-3.5 h-3.5" />
                      <span>مخفية (غير نشطة)</span>
                    </>
                  )}
                </button>
              </div>

              <p className="text-xs text-slate-600 mt-3 leading-relaxed">
                شاشة توزيع وتخصيص أسرة العناية المركزة والرعاية والأقسام الداخلية. تم إخفاؤها لعدم الحاجة إليها في دورة عمل الطوارئ الحالية.
              </p>

              <div className="mt-4 pt-3 border-t border-slate-200/70 flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">الوضع الحالي:</span>
                <span
                  className={`font-bold px-2.5 py-0.5 rounded-full text-[11px] ${
                    screensConfig.showBedManagement
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      : 'bg-rose-100 text-rose-800 border border-rose-200'
                  }`}
                >
                  {screensConfig.showBedManagement ? '✅ معروضة بالقائمة' : '🚫 مخفية ومستبعدة'}
                </span>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-indigo-50/80 border border-indigo-200 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-indigo-600 shrink-0" />
            <div className="text-xs text-indigo-900 leading-relaxed">
              <span className="font-bold">المظهر الافتراضي للنظام: </span>
              الشاشة الرئيسية الآن هي <strong>«نموذج ER الرسمي»</strong> مباشرةً، وبذلك تكون القائمة خفيفة ونظيفة وخالية من الشاشات الزائدة.
            </div>
          </div>
        </div>
      )}

      {/* Sub Tab 1: Column Visibility */}
      {activeSubTab === 'columns' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Rows className="w-5 h-5 text-indigo-600" />
                <span>إعدادات وتخصيص الأعمدة الظاهرة في الجدول والتقرير الرسمي</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                حدد الأعمدة التي ترغب بإظهارها أو إخفائها في النموذج الرسمي ومطبوعات الـ PDF/Excel. يتم الحفظ تلقائياً.
              </p>
            </div>
            <button
              onClick={() =>
                saveCols({
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
                })
              }
              className="px-3 py-1.5 text-xs text-indigo-600 font-bold hover:bg-indigo-50 rounded-lg flex items-center gap-1 transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>إعادة الضبط الافتراضي للكل</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 text-xs">
            {Object.entries({
              showIndex: '# الرقم المسلسل',
              showDate: 'تاريخ الحالة (Date)',
              showName: 'اسم المريض (Patient Name)',
              showMrn: 'الرقم الطبي (Medical No.)',
              showTriage: 'مستوى الفرز 🚨 (Triage Level)',
              showContract: 'جهة التعاقد 💰 (Contract)',
              showOrderTime: 'وقت أمر النقل (Order Time)',
              showActualTime: 'وقت النقل الفعلي (Actual)',
              showDelay: 'مدة التأخير (Delay Minutes/Hours)',
              showCauses: 'أسباب التأخير (Causes of Delay)',
              showDestination: 'القسم المستهدف ➜ (Destination)',
              showBed: 'رقم السرير (Bed #)',
              showDischarge: 'نوع الخروج (Discharge Outcome)',
              showEntryMethod: 'طريقة الإدخال (Manual / Import)',
              showActions: 'أزرار الإجراءات التفاعلية',
            }).map(([key, label]) => {
              const isChecked = (cols as any)[key];
              return (
                <label
                  key={key}
                  className={`flex items-center justify-between p-3 rounded-xl border transition cursor-pointer ${
                    isChecked
                      ? 'bg-indigo-50/50 border-indigo-200 text-indigo-950 font-bold'
                      : 'bg-slate-50 border-slate-200 text-slate-400'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => saveCols({ ...cols, [key]: !isChecked })}
                      className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
                    />
                    <span>{label}</span>
                  </div>
                  {isChecked ? <Eye className="w-4 h-4 text-indigo-600" /> : <EyeOff className="w-4 h-4 text-slate-400" />}
                </label>
              );
            })}
          </div>
        </div>
      )}

      {/* Sub Tab 2: Row Visibility Rules */}
      {activeSubTab === 'rowFilters' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-6">
          <div>
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <Filter className="w-5 h-5 text-indigo-600" />
              <span>قواعد إظهار وإخفاء الصفوف التلقائية في الجداول</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              تصفية واستبعاد مجموعات من الصفوف بناءً على معايير سريرية أو إدارية محددة.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <label className="flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 cursor-pointer">
              <div>
                <span className="font-bold text-slate-900 block">إخفاء الحالات المكتملة المنقولة (Transferred)</span>
                <span className="text-[11px] text-slate-500">إخفاء أي صف تم استكمال نقله بنجاح للقسم</span>
              </div>
              <input
                type="checkbox"
                checked={rowRules.hideCompleted}
                onChange={e => saveRowRules({ ...rowRules, hideCompleted: e.target.checked })}
                className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 cursor-pointer">
              <div>
                <span className="font-bold text-slate-900 block">إخفاء الحالات الملغاة (Cancelled)</span>
                <span className="text-[11px] text-slate-500">استبعاد الحالات الملغاة من العرض في التقرير</span>
              </div>
              <input
                type="checkbox"
                checked={rowRules.hideCancelled}
                onChange={e => saveRowRules({ ...rowRules, hideCancelled: e.target.checked })}
                className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 cursor-pointer">
              <div>
                <span className="font-bold text-slate-900 block">تصفية الصفوف بحد أدنى للتأخير (بالدقائق)</span>
                <span className="text-[11px] text-slate-500">إظهار الحالات التي تجاوز انتظارها الدقائق المحددة فقط</span>
              </div>
              <input
                type="number"
                min="0"
                value={rowRules.minDelayMinutes}
                onChange={e => saveRowRules({ ...rowRules, minDelayMinutes: Number(e.target.value) })}
                className="w-20 px-2 py-1 border border-slate-300 rounded-lg font-mono text-center bg-white font-bold"
              />
            </label>

            <label className="flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 cursor-pointer">
              <div>
                <span className="font-bold text-slate-900 block">عرض حالات الإدخال اليدوي فقط</span>
                <span className="text-[11px] text-slate-500">استبعاد الصفوف المسحوبة آلياً من ملفات الـ Excel</span>
              </div>
              <input
                type="checkbox"
                checked={rowRules.onlyManualEntries}
                onChange={e => saveRowRules({ ...rowRules, onlyManualEntries: e.target.checked })}
                className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
              />
            </label>
          </div>
        </div>
      )}

      {/* Sub Tab 3: Interactive Rows Manager */}
      {activeSubTab === 'rowsManager' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Rows className="w-5 h-5 text-indigo-600" />
                <span>إدارة الصفوف والحالات الفردية (إظهار/إخفاء صفوف معينة)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                يمكنك الضغط على أيقونة العين لإخفاء أو إظهار أي صف محدد من العرض في جدول التقرير الرسمي.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {hiddenRowIds.length > 0 && (
                <button
                  onClick={handleUnhideAllRows}
                  className="px-3 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-xl text-xs font-bold transition flex items-center gap-1 border border-rose-200 cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>إظهار الكل ({hiddenRowIds.length} مخفي)</span>
                </button>
              )}
            </div>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
            <input
              type="text"
              value={searchRowQuery}
              onChange={e => setSearchRowQuery(e.target.value)}
              placeholder="بحث في الصفوف بالاسم، الرقم الطبي، أو القسم..."
              className="w-full pr-9 pl-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white outline-none"
            />
          </div>

          {/* Rows List */}
          <div className="overflow-x-auto border border-slate-200 rounded-xl max-h-[500px]">
            <table className="w-full text-xs text-right border-collapse">
              <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0">
                <tr>
                  <th className="py-2.5 px-3">الحالة بالجدول</th>
                  <th className="py-2.5 px-3">اسم المريض</th>
                  <th className="py-2.5 px-3 font-mono">الرقم الطبي</th>
                  <th className="py-2.5 px-3">القسم</th>
                  <th className="py-2.5 px-3">التعاقد</th>
                  <th className="py-2.5 px-3">الفرز</th>
                  <th className="py-2.5 px-3 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {filteredManagerRows.map(r => {
                  const isHidden = hiddenRowIds.includes(r.id);
                  return (
                    <tr
                      key={r.id}
                      className={`hover:bg-slate-50 transition ${isHidden ? 'bg-slate-50 opacity-60' : ''}`}
                    >
                      <td className="py-2 px-3">
                        <button
                          onClick={() => toggleHideRow(r.id)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer border ${
                            isHidden
                              ? 'bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                          }`}
                        >
                          {isHidden ? (
                            <>
                              <EyeOff className="w-3.5 h-3.5 text-rose-600" />
                              <span>مخفي (انقر للإظهار)</span>
                            </>
                          ) : (
                            <>
                              <Eye className="w-3.5 h-3.5 text-emerald-600" />
                              <span>ظاهر (انقر للإخفاء)</span>
                            </>
                          )}
                        </button>
                      </td>
                      <td className="py-2 px-3 font-bold text-slate-900">{r.name}</td>
                      <td className="py-2 px-3 font-mono font-semibold text-slate-700">{r.medical}</td>
                      <td className="py-2 px-3 font-medium text-slate-700">{r.dept || '-'}</td>
                      <td className="py-2 px-3 text-slate-600">{r.contract || 'طوارئ المستشفى'}</td>
                      <td className="py-2 px-3">
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 font-bold text-slate-800">
                          {r.triageLevel || 'Level 3'}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          {onOpenEditModal && (
                            <button
                              onClick={() => onOpenEditModal(r)}
                              className="p-1 rounded bg-blue-50 text-blue-600 hover:bg-blue-100 transition"
                              title="تعديل هذا الصف بالكامل"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {onDeleteRecord && (
                            <button
                              onClick={() => {
                                if (confirm(`هل أنت متأكد من حذف صف المريض ${r.name} نهائياً؟`)) {
                                  onDeleteRecord(r.id);
                                }
                              }}
                              className="p-1 rounded bg-rose-50 text-rose-600 hover:bg-rose-100 transition"
                              title="حذف هذا الصف نهائياً"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sub Tab 4: Quick Add New Row Form */}
      {activeSubTab === 'quickAddRows' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div>
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <Plus className="w-5 h-5 text-indigo-600" />
              <span>إضافة صف وسجل مريض جديد مباشرة للجدول وقاعدة البيانات</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              أدخل بيانات الحالة وسيتم إدراجها فوراً في جدول التقرير الرسمي مع خيارات الفرز والتتبع.
            </p>
          </div>

          <form onSubmit={handleAddQuickRow} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs pt-2">
            <div>
              <label className="block font-bold text-slate-700 mb-1">اسم المريض الكامل *</label>
              <input
                type="text"
                required
                value={newPatientName}
                onChange={e => setNewPatientName(e.target.value)}
                placeholder="مثال: أحمد محمود علي"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">الرقم الطبي (MRN) *</label>
              <input
                type="text"
                required
                value={newMedicalNo}
                onChange={e => setNewMedicalNo(e.target.value)}
                placeholder="مثال: 9002341"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">القسم المستهدف (Destination)</label>
              <select
                value={newDept}
                onChange={e => setNewDept(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                {DEPARTMENTS.map(d => (
                  <option key={d.id} value={d.nameAr}>
                    {d.nameAr}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block font-bold text-slate-700">جهة التعاقد (Contract)</label>
                <button
                  type="button"
                  onClick={() => setIsCustomNewContract(!isCustomNewContract)}
                  className="text-xs text-purple-600 hover:text-purple-800 font-bold cursor-pointer"
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
                  className="w-full px-3 py-2 border border-purple-300 bg-purple-50/30 rounded-lg outline-none focus:ring-2 focus:ring-purple-500 font-semibold text-slate-900"
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
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
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
              <label className="block font-bold text-slate-700 mb-1">مستوى الفرز (Triage)</label>
              <select
                value={newTriage}
                onChange={e => setNewTriage(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                {TRIAGE_LEVELS.map(t => (
                  <option key={t.id} value={t.nameAr}>
                    {t.nameAr}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">رقم السرير (Bed #)</label>
              <input
                type="text"
                value={newBedNumber}
                onChange={e => setNewBedNumber(e.target.value)}
                placeholder="مثال: ICU-04"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">نوع الخروج (Discharge Type)</label>
              <select
                value={newDischarge}
                onChange={e => setNewDischarge(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="">-- اختياري / قيد العلاج --</option>
                {DISCHARGE_TYPES.map(dt => (
                  <option key={dt.id} value={dt.nameAr}>
                    {dt.nameAr}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block font-bold text-slate-700 mb-1">ملاحظات سريرية أو إدارية</label>
              <input
                type="text"
                value={newNotes}
                onChange={e => setNewNotes(e.target.value)}
                placeholder="ملاحظات الحالة..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="md:col-span-3 flex justify-end pt-2">
              <button
                type="submit"
                className="py-2.5 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة الصف للحالات وحفظه بقاعدة البيانات</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Sub Tab 5: Quick Multi-Click Cycles Guide */}
      {activeSubTab === 'cyclesInfo' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div>
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <MousePointerClick className="w-5 h-5 text-indigo-600" />
              <span>دليل وخيارات التعديل السريع بالضغط المتكرر على خلايا الجدول (Multi-Click Cycling)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              يتيح النظام للمناوبين والأطباء تغيير الحالات والبيانات بنقرة واحدة متكررة مباشرة من داخل خلايا الجدول بدون الحاجة لفتح شاشات تعديل إضافية.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs pt-2">
            <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/60 space-y-2">
              <div className="font-bold text-amber-950 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-600" />
                <span>الضغط على شارة الفرز (Triage)</span>
              </div>
              <p className="text-amber-900 leading-relaxed">
                الضغط المتكرر على شارة الفرز في الجدول يبدّل المستوى دورياً بين:
                <br />
                <span className="font-semibold font-mono text-[11px] block mt-1">
                  Level 1 (إنعاش) ➜ Level 2 (حرج) ➜ Level 3 (عادي) ➜ Level 4 ➜ Level 5
                </span>
              </p>
            </div>

            <div className="p-4 rounded-xl border border-purple-200 bg-purple-50/60 space-y-2">
              <div className="font-bold text-purple-950 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-purple-600" />
                <span>الضغط على شارة التعاقد (Contract)</span>
              </div>
              <p className="text-purple-900 leading-relaxed">
                الضغط المتكرر على شارة جهة التعاقد يبدّل الجهة دورياً بين:
                <br />
                <span className="font-semibold text-[11px] block mt-1 leading-snug">
                  طوارئ المستشفى ➜ مريض بهية (Baheya patient) ➜ نقدي (Cash) ➜ تأمين صحي ➜ شركة ➜ تأمين شامل ➜ نفقة الدولة ➜ نقابة (أو زر ✏️ لكتابة أي تعاقد يدوياً)
                </span>
              </p>
            </div>

            <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/60 space-y-2">
              <div className="font-bold text-blue-950 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-blue-600" />
                <span>الضغط على وقت النقل / الحالة</span>
              </div>
              <p className="text-blue-900 leading-relaxed">
                الضغط على زر وقت النقل يبدّل الحالة ويسجل الوقت فورياً:
                <br />
                <span className="font-semibold text-[11px] block mt-1">
                  ⏳ قيد الانتظار ➜ ✅ تم النقل الفعلي (تسجيل الوقت الحالي) ➜ 🚫 ملغي
                </span>
              </p>
            </div>

            <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/60 space-y-2">
              <div className="font-bold text-emerald-950 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>الضغط على نوع الخروج (Discharge)</span>
              </div>
              <p className="text-emerald-900 leading-relaxed">
                الضغط المتكرر على خلية نوع الخروج يبدّل النتيجة دورياً بين:
                <br />
                <span className="font-semibold text-[11px] block mt-1">
                  تحسن للمنزل ➜ هروب/مسؤولية ➜ تحويل داخلي ➜ عيادات خارجية ➜ وفاة
                </span>
              </p>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                <Edit2 className="w-4 h-4 text-slate-700" />
                <span>الكتابة المباشرة (Inline Inputs)</span>
              </div>
              <p className="text-slate-700 leading-relaxed">
                القسم المستهدف ورقم السرير قابلان للكتابة المباشرة وتعديل القيمة داخل الجدول مع الحفظ التلقائي في قاعدة البيانات دون أي تأخير.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 6. SubTab: Users & Accounts Management */}
      {activeSubTab === 'usersManager' && (
        <div className="space-y-4">
          <UserManagementTab lang={lang} currentUser={currentUser} />
        </div>
      )}
    </div>
  );
};
