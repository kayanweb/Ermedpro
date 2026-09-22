import React from 'react';
import { UserRole, AppLanguage } from '../types';
import { t } from '../utils/translations';
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

interface TabsNavProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  userRole: UserRole;
  pendingCount: number;
  criticalCount: number;
  availableBedsCount: number;
  lang: AppLanguage;
}

export const TabsNav: React.FC<TabsNavProps> = ({
  activeTab,
  onTabChange,
  userRole,
  pendingCount,
  criticalCount,
  availableBedsCount,
  lang,
}) => {
  const tabs = [
    {
      id: 'live' as TabType,
      label: t('tabLive', lang),
      icon: Radio,
      badge: pendingCount > 0 ? `${pendingCount}` : undefined,
      badgeColor: criticalCount > 0 ? 'bg-rose-500 text-white animate-pulse' : 'bg-amber-100 text-amber-800',
    },
    {
      id: 'report' as TabType,
      label: t('tabReport', lang),
      icon: FileSpreadsheet,
      badge: undefined,
      badgeColor: '',
    },
    {
      id: 'beds' as TabType,
      label: t('tabBeds', lang),
      icon: Bed,
      badge: `${availableBedsCount} ${lang === 'ar' ? 'متاح' : 'free'}`,
      badgeColor: 'bg-emerald-100 text-emerald-800',
    },
    {
      id: 'dash' as TabType,
      label: t('tabDashboard', lang),
      icon: LayoutDashboard,
    },
    {
      id: 'analytics' as TabType,
      label: t('tabAnalytics', lang),
      icon: BarChart3,
    },
    ...(userRole === 'Admin'
      ? [
          {
            id: 'qualityAudit' as TabType,
            label: t('tabQualityAudit', lang),
            icon: ShieldCheck,
            badge: 'Admin/IT',
            badgeColor: 'bg-indigo-600 text-white shadow-xs',
          },
        ]
      : []),
    ...(userRole === 'Admin' || userRole === 'Doctor'
      ? [
          {
            id: 'users' as TabType,
            label: t('tabUsers', lang),
            icon: Users,
          },
        ]
      : []),
    {
      id: 'settings' as TabType,
      label: t('tabSettings', lang),
      icon: Settings,
    },
    ...(userRole !== 'Viewer'
      ? [
          {
            id: 'add' as TabType,
            label: t('tabAdd', lang),
            icon: PlusCircle,
          },
          {
            id: 'import' as TabType,
            label: t('tabImport', lang),
            icon: UploadCloud,
          },
        ]
      : []),
    {
      id: 'export' as TabType,
      label: t('tabExport', lang),
      icon: DownloadCloud,
    },
  ];

  return (
    <div className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex space-x-1 sm:space-x-1.5 rtl:space-x-reverse overflow-x-auto no-scrollbar py-2">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`tab-btn-${tab.id}`}
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold text-xs sm:text-sm transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25'
                    : 'text-slate-600 hover:text-emerald-700 hover:bg-slate-100'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
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
};
