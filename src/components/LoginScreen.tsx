import React, { useState } from 'react';
import { User } from '../types';
import { USERS } from '../constants';
import { AlertCircle, Shield, MessageCircle } from 'lucide-react';

interface LoginScreenProps {
  onLogin: (user: User) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError('');

    const found = USERS.find(
      u => u.username.toLowerCase() === username.trim().toLowerCase() && u.password === password
    );
    if (!found) {
      setError('اسم المستخدم أو كلمة المرور غير صحيحة');
      return;
    }

    onLogin(found);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-900 via-indigo-950 to-slate-900 text-slate-100">
      <div className="w-full max-w-md bg-white text-slate-800 rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
        <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 p-6 text-white text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md mb-3 border border-white/20">
            <span className="text-3xl">🏥</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">نظام ER Waiting Time</h1>
          <p className="text-blue-100 text-sm mt-1">إدارة وتحليل أوقات انتظار ونقل مرضى الطوارئ</p>
        </div>

        <div className="p-6 sm:p-8">
          {error && (
            <div className="mb-5 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
              <AlertCircle className="w-5 h-5 shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">اسم المستخدم</label>
              <input
                id="login-username-input"
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="أدخل اسم المستخدم"
                required
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-800 text-sm transition outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">كلمة المرور</label>
              <input
                id="login-password-input"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="أدخل كلمة المرور"
                required
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-800 text-sm transition outline-none"
              />
            </div>

            <button
              id="login-submit-btn"
              type="submit"
              className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-sm shadow-lg shadow-blue-500/30 transition duration-150 flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              <span>تسجيل الدخول إلى النظام</span>
              <span>←</span>
            </button>
          </form>

          {/* Secure Developer Signature & Contact */}
          <div className="mt-8 pt-6 border-t border-slate-200 text-center space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-600 text-[11px] font-semibold">
              <Shield className="w-3.5 h-3.5 text-blue-600" />
              <span>نظام محمي ومشفر بالكامل</span>
            </div>

            <div className="bg-gradient-to-r from-slate-50 via-blue-50 to-slate-50 p-4 rounded-xl border border-blue-100 shadow-2xs">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1">
                BY :
              </div>
              <div className="text-base font-black text-slate-900 tracking-wide font-sans">
                MOHAMED ELSAYED ABD ALLAH
              </div>

              <div className="mt-2.5 pt-2.5 border-t border-blue-200/60 flex items-center justify-center gap-2">
                <a
                  href="https://wa.me/201121499017"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs hover:shadow-md cursor-pointer"
                  title="تواصل عبر واتساب"
                >
                  <MessageCircle className="w-4 h-4 text-emerald-100" />
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
