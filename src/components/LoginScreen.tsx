import React, { useState } from 'react';
import { User } from '../types';
import { USERS } from '../constants';
import { ShieldCheck, UserCheck, Stethoscope, Eye, AlertCircle } from 'lucide-react';

interface LoginScreenProps {
  onLogin: (user: User) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('1');
  const [password, setPassword] = useState('1');
  const [error, setError] = useState('');

  const handleLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError('');

    const found = USERS.find(u => u.username.toLowerCase() === username.trim().toLowerCase() && u.password === password);
    if (!found) {
      setError('اسم المستخدم أو كلمة المرور غير صحيحة');
      return;
    }

    onLogin(found);
  };

  const handleQuickSelect = (u: User) => {
    setUsername(u.username);
    setPassword(u.password || '');
    setError('');
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

          <div className="mt-8 pt-6 border-t border-slate-100">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 text-center">
              حسابات تجريبية سريعة بنقرة واحدة:
            </p>
            <div className="grid grid-cols-2 gap-2">
              {USERS.map(u => (
                <button
                  key={u.username}
                  type="button"
                  onClick={() => handleQuickSelect(u)}
                  className={`p-2.5 text-right rounded-lg border text-xs transition flex items-center gap-2 ${
                    username === u.username
                      ? 'border-blue-500 bg-blue-50 text-blue-900 font-bold ring-1 ring-blue-500'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="shrink-0 p-1.5 rounded-md bg-white shadow-xs border border-slate-100">
                    {u.role === 'Admin' && <ShieldCheck className="w-3.5 h-3.5 text-red-600" />}
                    {u.role === 'Doctor' && <Stethoscope className="w-3.5 h-3.5 text-blue-600" />}
                    {u.role === 'Nurse' && <UserCheck className="w-3.5 h-3.5 text-emerald-600" />}
                    {u.role === 'Viewer' && <Eye className="w-3.5 h-3.5 text-amber-600" />}
                  </div>
                  <div className="truncate">
                    <div className="font-semibold truncate">{u.name}</div>
                    <div className="text-[10px] text-slate-500">{u.role}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
