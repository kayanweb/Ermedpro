import React, { useState } from 'react';
import { User } from '../types';
import { loginUser, normalizeArabicDigits } from '../services/api';
import { AlertCircle, Shield, MessageCircle, Eye, EyeOff, LogIn, Loader2, User as UserIcon, Lock, HelpCircle } from 'lucide-react';

interface LoginScreenProps {
  onLogin: (user: User) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showHelpHint, setShowHelpHint] = useState(false);

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanU = normalizeArabicDigits(username.trim());
    const cleanP = normalizeArabicDigits(password.trim());

    if (!cleanU) {
      setError('يرجى إدخال اسم المستخدم أو رقم الموظف');
      return;
    }
    if (!cleanP) {
      setError('يرجى إدخال كلمة المرور');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      const authenticatedUser = await loginUser(cleanU, cleanP);
      onLogin(authenticatedUser);
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'اسم المستخدم أو كلمة المرور غير صحيحة');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-slate-100">
      <div className="w-full max-w-md bg-white text-slate-800 rounded-3xl shadow-2xl overflow-hidden border border-slate-200">
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
          {/* Error Message with Smart Guidance */}
          {error && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm space-y-1.5 animate-fadeIn">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 shrink-0 text-red-500" />
                <span className="font-bold">{error}</span>
              </div>
              <p className="text-[11px] text-red-600 leading-relaxed ps-7">
                تأكد من رقم الموظف (مثل <code className="bg-red-100 px-1 rounded font-bold">21094</code> أو <code className="bg-red-100 px-1 rounded font-bold">20810</code> أو <code className="bg-red-100 px-1 rounded font-bold">admin</code>) وكلمة المرور الافتراضية (<code className="bg-red-100 px-1 rounded font-bold">123</code>).
              </p>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <UserIcon className="w-3.5 h-3.5 text-slate-500" />
                  <span>اسم المستخدم أو رقم الموظف (Username)</span>
                </span>
              </label>
              <input
                id="login-username-input"
                type="text"
                value={username}
                onChange={e => {
                  setError('');
                  setUsername(normalizeArabicDigits(e.target.value));
                }}
                placeholder="أدخل اسم المستخدم أو رقم الموظف..."
                required
                disabled={isLoading}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 text-sm transition outline-none font-semibold bg-slate-50 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5 text-slate-500" />
                  <span>كلمة المرور (Password)</span>
                </span>
                <button
                  type="button"
                  onClick={() => setShowHelpHint(!showHelpHint)}
                  className="text-[11px] text-slate-400 hover:text-indigo-600 flex items-center gap-0.5 cursor-pointer"
                  title="المساعدة في الدخول"
                >
                  <HelpCircle className="w-3 h-3" />
                  <span>مساعدة</span>
                </button>
              </label>
              <div className="relative">
                <input
                  id="login-password-input"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => {
                    setError('');
                    setPassword(normalizeArabicDigits(e.target.value));
                  }}
                  placeholder="أدخل كلمة المرور"
                  required
                  disabled={isLoading}
                  className="w-full px-4 py-2.5 pe-11 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 text-sm transition outline-none font-semibold bg-slate-50 focus:bg-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 end-0 flex items-center pe-3 text-slate-400 hover:text-slate-600 transition cursor-pointer"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {showHelpHint && (
                <div className="p-2.5 mt-2 bg-indigo-50/80 border border-indigo-200 rounded-xl text-[11px] text-indigo-900 leading-relaxed animate-in fade-in">
                  <p className="font-bold mb-1">بيانات الحسابات المصرحة بالنظام:</p>
                  <ul className="space-y-0.5 text-indigo-800">
                    <li>• الإدارة: <span className="font-mono font-bold">21094</span> أو <span className="font-mono font-bold">admin</span> (كلمة المرور: <span className="font-mono font-bold">123</span>)</li>
                    <li>• التمريض: <span className="font-mono font-bold">20810</span> (كلمة المرور: <span className="font-mono font-bold">123</span>)</li>
                  </ul>
                </div>
              )}
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
