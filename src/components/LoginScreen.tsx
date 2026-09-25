import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { USERS } from '../constants';
import { loginUser, fetchUsersFromDb } from '../services/api';
import { AlertCircle, Shield, MessageCircle, Eye, EyeOff, LogIn, Loader2, Sparkles, User as UserIcon } from 'lucide-react';

interface LoginScreenProps {
  onLogin: (user: User) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<User[]>(USERS);

  // Fetch actual live users from database so any newly created user is immediately available
  useEffect(() => {
    let isMounted = true;
    fetchUsersFromDb()
      .then(users => {
        if (isMounted && users && users.length > 0) {
          setAvailableUsers(users);
        }
      })
      .catch(() => {
        // Fallback to default USERS constant
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!username.trim()) {
      setError('يرجى إدخال اسم المستخدم');
      return;
    }
    if (!password) {
      setError('يرجى إدخال كلمة المرور');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      const authenticatedUser = await loginUser(username, password);
      onLogin(authenticatedUser);
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'اسم المستخدم أو كلمة المرور غير صحيحة');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectQuickUser = (user: User) => {
    setUsername(user.username);
    // Real users default password is '123'
    setPassword(user.password || '123');
    setError('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-slate-100">
      <div className="w-full max-w-lg bg-white text-slate-800 rounded-3xl shadow-2xl overflow-hidden border border-slate-200">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-600 to-blue-800 p-6 sm:p-7 text-white text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 rounded-full bg-white/10 blur-xl"></div>
          <div className="absolute bottom-0 left-0 -ml-8 -mb-8 w-32 h-32 rounded-full bg-indigo-400/20 blur-xl"></div>

          <div className="relative z-10">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-md mb-3 border border-white/20 shadow-inner">
              <span className="text-3xl">🏥</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight">نظام ER Waiting Time</h1>
            <p className="text-blue-100 text-xs sm:text-sm mt-1 font-medium">
              إدارة وتحليل أوقات انتظار ونقل مرضى الطوارئ
            </p>
          </div>
        </div>

        <div className="p-6 sm:p-8 space-y-6">
          {/* Error Message */}
          {error && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2.5 animate-fadeIn">
              <AlertCircle className="w-5 h-5 shrink-0 text-red-500" />
              <span className="font-semibold">{error}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                <UserIcon className="w-3.5 h-3.5 text-slate-500" />
                <span>اسم المستخدم أو رقم الموظف (Username)</span>
              </label>
              <input
                id="login-username-input"
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="أدخل اسم المستخدم (مثال: admin أو 20810)"
                required
                disabled={isLoading}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 text-sm transition outline-none font-semibold bg-slate-50 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                <span>كلمة المرور (Password)</span>
                <span className="text-[11px] font-normal text-slate-400">كلمة المرور الافتراضية: 123</span>
              </label>
              <div className="relative">
                <input
                  id="login-password-input"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="أدخل كلمة المرور"
                  required
                  disabled={isLoading}
                  className="w-full px-4 py-2.5 pe-11 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 text-sm transition outline-none font-semibold bg-slate-50 focus:bg-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 end-0 flex items-center pe-3 text-slate-400 hover:text-slate-600 transition"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              id="login-submit-btn"
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:from-blue-800 active:to-indigo-800 text-white font-bold text-sm shadow-lg shadow-indigo-500/25 transition duration-150 flex items-center justify-center gap-2 cursor-pointer mt-3 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>جاري التحقق وتسجيل الدخول...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>تسجيل الدخول إلى النظام</span>
                  <span>←</span>
                </>
              )}
            </button>
          </form>

          {/* Quick Select Hospital Accounts */}
          <div className="pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>حسابات المستشفى المصرحة (اختيار سريع):</span>
              </span>
              <span className="text-[10px] text-slate-400 font-mono">انقر للملء السريع</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {availableUsers.slice(0, 6).map((u, idx) => (
                <button
                  key={u.id || u.username || idx}
                  type="button"
                  onClick={() => handleSelectQuickUser(u)}
                  className={`p-2.5 rounded-xl border text-start transition cursor-pointer flex flex-col justify-between ${
                    username.toLowerCase() === u.username.toLowerCase()
                      ? 'bg-blue-50 border-blue-400 ring-2 ring-blue-400/20'
                      : 'bg-slate-50 hover:bg-indigo-50/60 border-slate-200 hover:border-indigo-300'
                  }`}
                >
                  <div className="font-bold text-xs text-slate-800 truncate" title={u.name}>
                    {u.name}
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[10px]">
                    <span className="font-mono text-indigo-600 font-semibold bg-indigo-50 px-1 rounded">
                      {u.username}
                    </span>
                    <span className="text-slate-500 truncate max-w-[80px]" title={u.titleAr || u.role}>
                      {u.titleAr || u.role}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Secure Developer Signature & Contact */}
          <div className="pt-4 border-t border-slate-100 text-center space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-600 text-[11px] font-semibold">
              <Shield className="w-3.5 h-3.5 text-blue-600" />
              <span>نظام محمي ومشفر بالكامل - متصل بقاعدة البيانات</span>
            </div>

            <div className="bg-gradient-to-r from-slate-50 via-blue-50 to-slate-50 p-3.5 rounded-xl border border-blue-100 shadow-2xs">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
                BY :
              </div>
              <div className="text-sm sm:text-base font-black text-slate-900 tracking-wide font-sans">
                MOHAMED ELSAYED ABD ALLAH
              </div>

              <div className="mt-2 pt-2 border-t border-blue-200/60 flex items-center justify-center gap-2">
                <a
                  href="https://wa.me/201121499017"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs hover:shadow-md cursor-pointer"
                  title="تواصل عبر واتساب"
                >
                  <MessageCircle className="w-3.5 h-3.5 text-emerald-100" />
                  <span className="font-sans font-bold tracking-wider" dir="ltr">01121499017</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
