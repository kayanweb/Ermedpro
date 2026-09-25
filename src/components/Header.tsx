import React from 'react';
import { User, ERRecord, AppLanguage } from '../types';
import { t } from '../utils/translations';
import { soundService } from '../services/sound';
import {
  LogOut,
  Activity,
  Clock,
  AlertTriangle,
  Database,
  RefreshCw,
  History,
  Languages,
  Volume2,
  VolumeX,
} from 'lucide-react';

interface HeaderProps {
  currentUser: User;
  onLogout: () => void;
  records: ERRecord[];
  dbConnected?: boolean;
  dbLatency?: number;
  isSyncing?: boolean;
  onRefresh?: () => void;
  onOpenAuditLog?: () => void;
  lang: AppLanguage;
  onToggleLang: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  onLogout,
  records,
  dbConnected = true,
  dbLatency,
  isSyncing = false,
  onRefresh,
  onOpenAuditLog,
  lang,
  onToggleLang,
}) => {
  const pendingCount = records.filter(r => r.status === 'Pending').length;
  const criticalCount = records.filter(r => r.delay && r.delay > 60).length;

  const getRoleBadge = () => {
    switch (currentUser.role) {
      case 'Admin':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'Doctor':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Nurse':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'Viewer':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 shadow-md">
      <div className="max-w-[1720px] mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
        {/* Brand & System Title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-xl shadow-lg shadow-emerald-500/20 font-bold border border-emerald-400/30">
            🏥
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-white">
                {t('systemTitle', lang)}
              </h1>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono">
                ENTERPRISE v4.0
              </span>
            </div>
            <p className="text-[11px] text-slate-400">{t('systemSubtitle', lang)}</p>
          </div>
        </div>

        {/* Action Controls & Indicators */}
        <div className="flex items-center flex-wrap gap-2 text-xs">
          {/* Neon PostgreSQL Cloud DB Indicator */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border font-mono text-xs transition ${
              dbConnected
                ? 'bg-emerald-950/70 border-emerald-600/60 text-emerald-300'
                : 'bg-rose-950/70 border-rose-700 text-rose-300'
            }`}
            title={dbConnected ? 'Neon PostgreSQL Live' : 'Reconnecting...'}
          >
            <span className="relative flex h-2 w-2">
              {dbConnected && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              )}
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${
                  dbConnected ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse'
                }`}
              ></span>
            </span>
            <Database className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-semibold font-sans">
              {dbConnected ? (lang === 'ar' ? 'قاعدة البيانات متصلة' : 'Neon DB') : (lang === 'ar' ? 'غير متصل' : 'Disconnected')}
            </span>
            {dbLatency !== undefined && (
              <span className="text-[10px] opacity-75">({dbLatency}ms)</span>
            )}
            
            {/* Dedicated Reconnect / Manual Health Check Verification Button */}
            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                disabled={isSyncing}
                title={lang === 'ar' ? 'إعادة الاتصال وفحص حالة قاعدة البيانات' : 'Reconnect & Verify Database Health'}
                className={`ms-1.5 flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold transition cursor-pointer shadow-sm ${
                  dbConnected
                    ? 'bg-emerald-900/80 hover:bg-emerald-800 text-emerald-200 border border-emerald-700'
                    : 'bg-rose-600 hover:bg-rose-500 text-white animate-pulse'
                }`}
              >
                <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{lang === 'ar' ? (isSyncing ? 'جاري الاتصال...' : 'إعادة اتصال') : (isSyncing ? 'Connecting...' : 'Reconnect')}</span>
              </button>
            )}
          </div>

          {/* Global Sound Mute/Enable Toggle Button */}
          <button
            type="button"
            onClick={() => {
              const current = soundService.isEnabled();
              const next = !current;
              soundService.setEnabled(next);
              if (next) soundService.playChime();
              // Force re-render or trigger custom event if needed, or update state
              const btn = document.getElementById('global-sound-toggle-btn');
              if (btn) {
                btn.setAttribute('data-sound', String(next));
              }
              window.dispatchEvent(new CustomEvent('sound-toggle', { detail: next }));
            }}
            id="global-sound-toggle-btn"
            title={lang === 'ar' ? 'كتم أو تفعيل التنبيهات الصوتية' : 'Mute or Enable Sound Alerts'}
            className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-slate-700 transition cursor-pointer"
          >
            {soundService.isEnabled() ? (
              <>
                <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">{lang === 'ar' ? 'الصوت: مفعل' : 'Sound: On'}</span>
              </>
            ) : (
              <>
                <VolumeX className="w-3.5 h-3.5 text-rose-400" />
                <span className="hidden sm:inline">{lang === 'ar' ? 'الصوت: مكتوم' : 'Sound: Muted'}</span>
              </>
            )}
          </button>

          {/* Language Switcher */}
          <button
            onClick={onToggleLang}
            className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-slate-700 transition font-bold"
            title={lang === 'ar' ? 'Switch to English' : 'التحويل للعربية'}
          >
            <Languages className="w-3.5 h-3.5 text-amber-400" />
            <span>{lang === 'ar' ? 'EN' : 'عربي'}</span>
          </button>

          {criticalCount > 0 && (
            <div className="hidden lg:flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-950/80 border border-red-800 text-red-300 animate-pulse">
              <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
              <span>{criticalCount} {lang === 'ar' ? 'حرجة' : 'critical'}</span>
            </div>
          )}

          <div className="hidden md:flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-300">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>{pendingCount} {lang === 'ar' ? 'انتظار' : 'waiting'}</span>
          </div>

          {/* User Profile */}
          <div className="flex items-center gap-2 ps-2 border-s border-slate-700">
            <div className="text-end">
              <div className="font-semibold text-white text-xs">{currentUser.name}</div>
              <div className="text-[10px] text-slate-400 flex items-center justify-end gap-1">
                <span>{currentUser.titleAr}</span>
                <span className={`px-1.5 py-0.2 text-[9px] font-bold rounded border ${getRoleBadge()}`}>
                  {currentUser.role}
                </span>
              </div>
            </div>

            <button
              id="logout-btn"
              onClick={onLogout}
              title={lang === 'ar' ? 'تسجيل الخروج' : 'Logout'}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-900/40 text-slate-300 hover:text-red-300 border border-slate-700 hover:border-red-700 transition cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
