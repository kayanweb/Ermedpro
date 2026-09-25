import React, { useState, useEffect } from 'react';
import { UserRole, AppLanguage, ScreensVisibilityConfig } from '../types';
import { t } from '../utils/translations';
import { getScreensVisibility, SCREENS_CHANGE_EVENT } from '../utils/screensConfig';
import {
  Radio,
  FileSpreadsheet,
  Bed,
  LayoutDashboard,
  BarChart3,
  Users,
  UploadCloud,
  PlusCircle,
  DownloadCloud,
  Settings,
  ShieldCheck,
  LayoutGrid,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
} from 'lucide-react';

export type TabType =
  | 'live'
  | 'report'
  | 'beds'
  | 'dash'
  | 'analytics'
  | 'qualityAudit'
  | 'users'
  | 'settings'
  | 'import'
  | 'add'
  | 'export';

export interface TabItem {
  id: TabType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  badgeColor?: string;
  category: 'clinical' | 'analytics' | 'system';
}

interface TabsNavProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  userRole: UserRole;
  pendingCount: number;
  criticalCount: number;
  availableBedsCount: number;
  lang: AppLanguage;
  variant?: 'horizontal' | 'sidebar';
}

export const TabsNav: React.FC<TabsNavProps> = ({
  activeTab,
  onTabChange,
  userRole,
  pendingCount,
  criticalCount,
  availableBedsCount,
  lang,
  variant = 'horizontal',
}) => {
  // Sidebar collapsed state stored in localStorage for user convenience
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('ermedpro_sidebar_collapsed') === 'true';
    }
    return false;
  });

  // Screens visibility config (defaults to false for live and beds)
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

  const toggleCollapse = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('ermedpro_sidebar_collapsed', String(next));
      }
      return next;
    });
  };

  const tabs: TabItem[] = [
    ...(screensConfig.showLiveTracking
      ? [
          {
            id: 'live' as TabType,
            label: t('tabLive', lang),
            icon: Radio,
            badge: pendingCount > 0 ? `${pendingCount}` : undefined,
            badgeColor: criticalCount > 0 ? 'bg-rose-500 text-white animate-pulse' : 'bg-amber-100 text-amber-800',
            category: 'clinical' as const,
          },
        ]
      : []),
    {
      id: 'report',
      label: t('tabReport', lang),
      icon: FileSpreadsheet,
      category: 'clinical',
    },
    ...(screensConfig.showBedManagement
      ? [
          {
            id: 'beds' as TabType,
            label: t('tabBeds', lang),
            icon: Bed,
            badge: `${availableBedsCount} ${lang === 'ar' ? 'متاح' : 'free'}`,
            badgeColor: 'bg-emerald-100 text-emerald-800',
            category: 'clinical' as const,
          },
        ]
      : []),
    {
      id: 'dash',
      label: t('tabDashboard', lang),
      icon: LayoutDashboard,
      category: 'analytics',
    },
    {
      id: 'analytics',
      label: t('tabAnalytics', lang),
      icon: BarChart3,
      category: 'analytics',
    },
    ...(userRole === 'Admin'
      ? [
          {
            id: 'qualityAudit' as TabType,
            label: t('tabQualityAudit', lang),
            icon: ShieldCheck,
            badge: 'Admin/IT',
            badgeColor: 'bg-indigo-600 text-white shadow-xs',
            category: 'analytics' as const,
          },
        ]
      : []),
    ...(userRole === 'Admin' || userRole === 'Doctor'
      ? [
          {
            id: 'users' as TabType,
            label: t('tabUsers', lang),
            icon: Users,
            category: 'system' as const,
          },
        ]
      : []),
    {
      id: 'settings',
      label: t('tabSettings', lang),
      icon: Settings,
      category: 'system',
    },
    ...(userRole !== 'Viewer'
      ? [
          {
            id: 'add' as TabType,
            label: t('tabAdd', lang),
            icon: PlusCircle,
            category: 'system' as const,
          },
          {
            id: 'import' as TabType,
            label: t('tabImport', lang),
            icon: UploadCloud,
            category: 'system' as const,
          },
        ]
      : []),
    {
      id: 'export',
      label: t('tabExport', lang),
      icon: DownloadCloud,
      category: 'system',
    },
  ];

  const categories = [
    {
      id: 'clinical',
      title: lang === 'ar' ? 'المتابعة السريرية والأسرة' : 'Clinical & Bed Care',
    },
    {
      id: 'analytics',
      title: lang === 'ar' ? 'التقارير ومؤشرات الجودة' : 'Analytics & Quality',
    },
    {
      id: 'system',
      title: lang === 'ar' ? 'إدارة المستشفى والنظام' : 'Hospital Operations',
    },
  ];

  // --------------------------------------------------------------------------
  // 1. HORIZONTAL BAR (Default for mobile / tablet screens)
  // --------------------------------------------------------------------------
  if (variant === 'horizontal') {
    return (
      <div className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-xs">
        <div className="max-w-[1720px] mx-auto px-4 sm:px-6">
          <div className="flex space-x-1 sm:space-x-1.5 rtl:space-x-reverse overflow-x-auto no-scrollbar py-2">
            {tabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  id={`tab-btn-h-${tab.id}`}
                  onClick={() => onTabChange(tab.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold text-xs sm:text-sm transition-all whitespace-nowrap cursor-pointer ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25'
                      : 'text-slate-600 hover:text-emerald-700 hover:bg-slate-100'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                  <span>{tab.label}</span>
                  {tab.badge && (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                        isActive ? 'bg-white text-emerald-800' : tab.badgeColor
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // 2. VERTICAL SIDEBAR (For desktop / computer & large screens)
  // --------------------------------------------------------------------------
  return (
    <nav
      aria-label={lang === 'ar' ? 'القائمة الجانبية للنظام' : 'System Sidebar Navigation'}
      className={`bg-white rounded-2xl border border-slate-200/90 shadow-xs p-3 transition-all duration-300 sticky top-4 max-h-[calc(100vh-2rem)] flex flex-col ${
        isCollapsed ? 'w-20' : 'w-64 xl:w-72'
      }`}
    >
      {/* Sidebar Header with Toggle Collapse */}
      <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-100 px-1">
        {!isCollapsed && (
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <LayoutGrid className="w-4 h-4" />
            </div>
            <div className="truncate">
              <span className="text-xs font-bold text-slate-800 block truncate">
                {lang === 'ar' ? 'أقسام النظام' : 'System Navigation'}
              </span>
              <span className="text-[10px] text-slate-400 font-mono block">
                {tabs.length} {lang === 'ar' ? 'شاشات متاحة' : 'modules'}
              </span>
            </div>
          </div>
        )}

        {isCollapsed && (
          <div className="mx-auto">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <LayoutGrid className="w-5 h-5" />
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={toggleCollapse}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0 cursor-pointer"
          title={
            isCollapsed
              ? lang === 'ar'
                ? 'توسيع القائمة'
                : 'Expand sidebar'
              : lang === 'ar'
              ? 'تصغير القائمة'
              : 'Collapse sidebar'
          }
        >
          {lang === 'ar' ? (
            isCollapsed ? (
              <ChevronLeft className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )
          ) : isCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Tabs Items List (Scrollable if screen height is constrained) */}
      <div className="space-y-4 overflow-y-auto no-scrollbar flex-1 pr-0.5">
        {categories.map(cat => {
          const categoryTabs = tabs.filter(t => t.category === cat.id);
          if (categoryTabs.length === 0) return null;

          return (
            <div key={cat.id} className="space-y-1">
              {!isCollapsed && (
                <div className="px-2.5 py-1 text-[10px] font-extrabold tracking-wider text-slate-400 uppercase flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                  <span className="truncate">{cat.title}</span>
                </div>
              )}

              <div className="space-y-1">
                {categoryTabs.map(tab => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;

                  return (
                    <button
                      key={tab.id}
                      id={`tab-btn-s-${tab.id}`}
                      onClick={() => onTabChange(tab.id)}
                      className={`w-full group flex items-center rounded-xl font-bold transition-all duration-200 cursor-pointer text-start ${
                        isCollapsed
                          ? 'justify-center p-2.5'
                          : 'justify-between px-3.5 py-2.5 text-xs sm:text-sm'
                      } ${
                        isActive
                          ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25 ring-1 ring-emerald-500/50'
                          : 'text-slate-700 hover:text-emerald-700 hover:bg-emerald-50/70'
                      }`}
                      title={isCollapsed ? tab.label : undefined}
                    >
                      <div className={`flex items-center gap-2.5 min-w-0 ${isCollapsed ? 'justify-center' : ''}`}>
                        <Icon
                          className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${
                            isActive ? 'text-white' : 'text-slate-500 group-hover:text-emerald-600'
                          }`}
                        />
                        {!isCollapsed && (
                          <span className="truncate">{tab.label}</span>
                        )}
                      </div>

                      {!isCollapsed && tab.badge && (
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0 ${
                            isActive ? 'bg-white text-emerald-800' : tab.badgeColor
                          }`}
                        >
                          {tab.badge}
                        </span>
                      )}

                      {/* Mini indicator dot when collapsed */}
                      {isCollapsed && tab.badge && (
                        <span className="absolute top-1 end-1 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white"></span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Info in Sidebar */}
      {!isCollapsed && (
        <div className="pt-3 mt-2 border-t border-slate-100 px-2 flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="font-semibold text-slate-600">Neon Cloud</span>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-mono">
            {userRole}
          </span>
        </div>
      )}
    </nav>
  );
};
