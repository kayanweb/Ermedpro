import React, { useState, useEffect, useMemo } from 'react';
import { User, UserRole, LoginLog, AppLanguage } from '../types';
import { fetchUsersFromDb, createUserInDb, updateUserInDb, deleteUserFromDb, fetchLoginLogs } from '../services/api';
import { t } from '../utils/translations';
import {
  Users,
  UserPlus,
  Shield,
  Key,
  CheckCircle2,
  XCircle,
  Clock,
  History,
  Trash2,
  Edit2,
  Lock,
  UserCheck,
  Search,
  Eye,
  EyeOff,
  RefreshCw,
  AlertTriangle,
  Check,
  Sparkles,
  ShieldAlert,
  KeyRound,
  Filter,
} from 'lucide-react';

interface UserManagementTabProps {
  lang: AppLanguage;
  currentUser: User | null;
}

export const UserManagementTab: React.FC<UserManagementTabProps> = ({ lang, currentUser }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loginLogs, setLoginLogs] = useState<LoginLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'users' | 'logs'>('users');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | UserRole>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'DISABLED'>('ALL');

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [userToResetPassword, setUserToResetPassword] = useState<User | null>(null);

  // Form states (Add / Edit)
  const [formUsername, setFormUsername] = useState('');
  const [formName, setFormName] = useState('');
  const [formRole, setFormRole] = useState<UserRole>('Doctor');
  const [formTitleAr, setFormTitleAr] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formActive, setFormActive] = useState(true);
  const [showPasswordText, setShowPasswordText] = useState(false);
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Quick reset password state
  const [newQuickPassword, setNewQuickPassword] = useState('');
  const [showQuickPasswordText, setShowQuickPasswordText] = useState(false);

  // Feedback notifications
  const [notification, setNotification] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setNotification({ text, type });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [usersData, logsData] = await Promise.all([
        fetchUsersFromDb(),
        fetchLoginLogs().catch(() => []),
      ]);
      setUsers(usersData);
      setLoginLogs(logsData);
    } catch (err: any) {
      console.error('Failed to load users data:', err);
      showToast(lang === 'ar' ? 'تعذر جلب بيانات المستخدمين' : 'Failed to load users data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Stats calculation
  const stats = useMemo(() => {
    const total = users.length;
    const active = users.filter(u => u.active !== false).length;
    const admins = users.filter(u => u.role === 'Admin').length;
    const doctors = users.filter(u => u.role === 'Doctor').length;
    const nurses = users.filter(u => u.role === 'Nurse').length;
    const viewers = users.filter(u => u.role === 'Viewer').length;
    return { total, active, disabled: total - active, admins, doctors, nurses, viewers };
  }, [users]);

  // Open Add Modal
  const handleOpenAdd = () => {
    setFormUsername('');
    setFormName('');
    setFormRole('Doctor');
    setFormTitleAr('طبيب طوارئ');
    setFormPassword('123456');
    setShowPasswordText(false);
    setFormActive(true);
    setFormError('');
    setShowAddModal(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (user: User) => {
    setEditingUser(user);
    setFormUsername(user.username);
    setFormName(user.name);
    setFormRole(user.role);
    setFormTitleAr(user.titleAr || user.role);
    setFormPassword('');
    setShowPasswordText(false);
    setFormActive(user.active !== false);
    setFormError('');
  };

  // Generate random safe password
  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$';
    let res = '';
    for (let i = 0; i < 8; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormPassword(res);
    setShowPasswordText(true);
  };

  // Save New User
  const handleSaveAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formUsername.trim() || !formName.trim()) {
      setFormError(lang === 'ar' ? 'يرجى إدخال اسم الدخول والاسم الكامل للمستخدم' : 'Please provide username and full name');
      return;
    }
    setIsSubmitting(true);
    setFormError('');
    try {
      await createUserInDb({
        username: formUsername.trim().toLowerCase(),
        name: formName.trim(),
        role: formRole,
        titleAr: formTitleAr.trim() || formRole,
        password: formPassword.trim() || '123456',
        active: formActive,
        ...({ adminName: currentUser?.name || currentUser?.username || 'Admin/IT' } as any),
      });
      setShowAddModal(false);
      showToast(lang === 'ar' ? `تمت إضافة حساب (${formName.trim()}) بنجاح` : `Account (${formName.trim()}) created successfully`);
      await loadData();
    } catch (err: any) {
      setFormError(err.message || (lang === 'ar' ? 'حدث خطأ أثناء إضافة المستخدم' : 'Error creating user'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Save Edit User
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser || !editingUser.id) return;
    if (!formName.trim() || !formUsername.trim()) {
      setFormError(lang === 'ar' ? 'اسم المستخدم والاسم الكامل مطلوبان' : 'Username and full name are required');
      return;
    }
    setIsSubmitting(true);
    setFormError('');
    try {
      await updateUserInDb(editingUser.id, {
        username: formUsername.trim().toLowerCase(),
        name: formName.trim(),
        role: formRole,
        titleAr: formTitleAr.trim(),
        active: formActive,
        password: formPassword.trim() ? formPassword.trim() : undefined,
        ...({ adminName: currentUser?.name || currentUser?.username || 'Admin/IT' } as any),
      });
      setEditingUser(null);
      showToast(lang === 'ar' ? `تم تحديث بيانات حساب (${formName.trim()}) بنجاح` : `Account (${formName.trim()}) updated successfully`);
      await loadData();
    } catch (err: any) {
      setFormError(err.message || (lang === 'ar' ? 'حدث خطأ أثناء تعديل الحساب' : 'Error updating user'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle user active status directly
  const handleToggleActive = async (user: User) => {
    if (!user.id) return;
    if (user.username === 'admin') {
      showToast(lang === 'ar' ? 'لا يمكن تعطيل حساب المسؤول الرئيسي' : 'Cannot disable primary admin account', 'error');
      return;
    }
    const newStatus = user.active === false;
    try {
      await updateUserInDb(user.id, {
        active: newStatus,
        ...({ adminName: currentUser?.name || currentUser?.username || 'Admin/IT' } as any),
      });
      showToast(
        lang === 'ar'
          ? `تم ${newStatus ? 'تفعيل' : 'تعطيل'} حساب (${user.name}) بنجاح`
          : `Account (${user.name}) ${newStatus ? 'activated' : 'disabled'}`,
        'success'
      );
      await loadData();
    } catch (err: any) {
      showToast(err.message || (lang === 'ar' ? 'فشل تغيير حالة الحساب' : 'Failed to update account status'), 'error');
    }
  };

  // Save Quick Password Reset
  const handleSaveQuickPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userToResetPassword || !userToResetPassword.id) return;
    if (!newQuickPassword.trim()) return;

    setIsSubmitting(true);
    try {
      await updateUserInDb(userToResetPassword.id, {
        password: newQuickPassword.trim(),
      });
      setUserToResetPassword(null);
      setNewQuickPassword('');
      showToast(
        lang === 'ar'
          ? `تم تغيير كلمة المرور للمستخدم (${userToResetPassword.name}) بنجاح`
          : `Password reset successfully for (${userToResetPassword.name})`,
        'success'
      );
    } catch (err: any) {
      showToast(err.message || (lang === 'ar' ? 'فشل تغيير كلمة المرور' : 'Failed to reset password'), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete User Confirm
  const handleConfirmDelete = async () => {
    if (!userToDelete || !userToDelete.id) return;
    if (userToDelete.username === 'admin') {
      showToast(lang === 'ar' ? 'لا يمكن حذف حساب المسؤول الرئيسي' : 'Cannot delete primary admin account', 'error');
      setUserToDelete(null);
      return;
    }

    setIsSubmitting(true);
    try {
      await deleteUserFromDb(userToDelete.id);
      showToast(
        lang === 'ar'
          ? `تم حذف حساب المستخدم (${userToDelete.name}) نهائياً`
          : `User (${userToDelete.name}) deleted successfully`,
        'success'
      );
      setUserToDelete(null);
      await loadData();
    } catch (err: any) {
      showToast(err.message || (lang === 'ar' ? 'فشل حذف الحساب' : 'Failed to delete user'), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered users
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      // Role filter
      if (roleFilter !== 'ALL' && u.role !== roleFilter) return false;
      // Status filter
      if (statusFilter === 'ACTIVE' && u.active === false) return false;
      if (statusFilter === 'DISABLED' && u.active !== false) return false;
      // Text search
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const matchName = u.name?.toLowerCase().includes(q);
        const matchUser = u.username?.toLowerCase().includes(q);
        const matchRole = u.role?.toLowerCase().includes(q);
        const matchTitle = u.titleAr?.toLowerCase().includes(q);
        const matchId = u.id?.toLowerCase().includes(q);
        return matchName || matchUser || matchRole || matchTitle || matchId;
      }
      return true;
    });
  }, [users, roleFilter, statusFilter, search]);

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'Admin':
        return (
          <span className="inline-flex items-center gap-1 bg-rose-100 text-rose-800 text-xs font-bold px-2.5 py-1 rounded-lg border border-rose-200">
            <Shield className="w-3 h-3 text-rose-600" />
            <span>مدير النظام (Admin)</span>
          </span>
        );
      case 'Doctor':
        return (
          <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 text-xs font-bold px-2.5 py-1 rounded-lg border border-blue-200">
            <UserCheck className="w-3 h-3 text-blue-600" />
            <span>طبيب طوارئ (Doctor)</span>
          </span>
        );
      case 'Nurse':
        return (
          <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-1 rounded-lg border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span>مشرف تمريض (Nurse)</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-800 text-xs font-bold px-2.5 py-1 rounded-lg border border-slate-200">
            <Users className="w-3 h-3 text-slate-600" />
            <span>مراقب (Viewer)</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification Banner */}
      {notification && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between shadow-md transition-all animate-in fade-in duration-200 ${
            notification.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : 'bg-rose-50 border-rose-300 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-2.5 font-bold text-sm">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-600" />
            )}
            <span>{notification.text}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-xs font-bold px-2 py-1 rounded-lg hover:bg-black/5"
          >
            ✕
          </button>
        </div>
      )}

      {/* Top Header Card */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-indigo-50 text-indigo-700 rounded-xl">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900">
                {lang === 'ar' ? 'إدارة الحسابات والمستخدمين والصلاحيات' : 'Accounts, Users & Access Control'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {lang === 'ar'
                  ? 'إضافة، تعديل، حذف، وتفعيل حسابات الطاقم الطبي والإداري المحفوظة بقاعدة بيانات Neon PostgreSQL'
                  : 'Add, edit, delete, and control access permissions for all hospital staff accounts'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
          {/* Sub-tab Switcher (Users vs Login Logs) */}
          <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 text-xs font-semibold">
            <button
              onClick={() => setActiveTab('users')}
              className={`px-3.5 py-2 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'users' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-4 h-4 text-indigo-600" />
              <span>{lang === 'ar' ? 'الحسابات والمستخدمين' : 'Accounts & Users'}</span>
              <span className="bg-indigo-100 text-indigo-800 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                {users.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('logs')}
              className={`px-3.5 py-2 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'logs' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <History className="w-4 h-4 text-purple-600" />
              <span>{lang === 'ar' ? 'سجل تسجيل الدخول' : 'Login Audit'}</span>
              <span className="bg-purple-100 text-purple-800 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                {loginLogs.length}
              </span>
            </button>
          </div>

          {/* Refresh Button */}
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition cursor-pointer"
            title={lang === 'ar' ? 'تحديث القائمة' : 'Refresh'}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
          </button>

          {/* Add Account Button */}
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>{lang === 'ar' ? 'إضافة حساب جديد' : 'New Account'}</span>
          </button>
        </div>
      </div>

      {/* Metric Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-[11px] font-bold text-slate-500">{lang === 'ar' ? 'إجمالي الحسابات' : 'Total Accounts'}</p>
          <p className="text-2xl font-black text-slate-900 mt-1 font-mono">{stats.total}</p>
        </div>
        <div className="bg-white p-3.5 rounded-2xl border border-emerald-200 bg-emerald-50/20 shadow-xs">
          <p className="text-[11px] font-bold text-emerald-800">{lang === 'ar' ? 'حسابات نشطة' : 'Active'}</p>
          <p className="text-2xl font-black text-emerald-700 mt-1 font-mono">{stats.active}</p>
        </div>
        <div className="bg-white p-3.5 rounded-2xl border border-rose-200 bg-rose-50/20 shadow-xs">
          <p className="text-[11px] font-bold text-rose-800">{lang === 'ar' ? 'مدراء النظام' : 'Admins'}</p>
          <p className="text-2xl font-black text-rose-700 mt-1 font-mono">{stats.admins}</p>
        </div>
        <div className="bg-white p-3.5 rounded-2xl border border-blue-200 bg-blue-50/20 shadow-xs">
          <p className="text-[11px] font-bold text-blue-800">{lang === 'ar' ? 'أطباء طوارئ' : 'Doctors'}</p>
          <p className="text-2xl font-black text-blue-700 mt-1 font-mono">{stats.doctors}</p>
        </div>
        <div className="bg-white p-3.5 rounded-2xl border border-purple-200 bg-purple-50/20 shadow-xs">
          <p className="text-[11px] font-bold text-purple-800">{lang === 'ar' ? 'تمريض' : 'Nurses'}</p>
          <p className="text-2xl font-black text-purple-700 mt-1 font-mono">{stats.nurses}</p>
        </div>
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-[11px] font-bold text-slate-500">{lang === 'ar' ? 'معطل / غير نشط' : 'Disabled'}</p>
          <p className="text-2xl font-black text-slate-600 mt-1 font-mono">{stats.disabled}</p>
        </div>
      </div>

      {activeTab === 'users' ? (
        <div className="space-y-4">
          {/* Filters & Search Toolbar */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute start-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={lang === 'ar' ? 'بحث بالاسم، اسم الحساب (Username)، الدور، أو المعرّف...' : 'Search by name, username, role, or ID...'}
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full ps-10 pe-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>

            {/* Role Filter & Status Filter */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs text-slate-600">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-semibold">{lang === 'ar' ? 'الدور:' : 'Role:'}</span>
              </div>
              <select
                value={roleFilter}
                onChange={e => setRoleFilter(e.target.value as any)}
                className="p-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-hidden font-semibold cursor-pointer"
              >
                <option value="ALL">{lang === 'ar' ? 'كافة الأدوار' : 'All Roles'}</option>
                <option value="Admin">{lang === 'ar' ? 'مدير النظام (Admin)' : 'Admin'}</option>
                <option value="Doctor">{lang === 'ar' ? 'طبيب (Doctor)' : 'Doctor'}</option>
                <option value="Nurse">{lang === 'ar' ? 'تمريض (Nurse)' : 'Nurse'}</option>
                <option value="Viewer">{lang === 'ar' ? 'مراقب (Viewer)' : 'Viewer'}</option>
              </select>

              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as any)}
                className="p-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-hidden font-semibold cursor-pointer"
              >
                <option value="ALL">{lang === 'ar' ? 'كافة الحالات' : 'All Statuses'}</option>
                <option value="ACTIVE">{lang === 'ar' ? 'نشط فقط' : 'Active Only'}</option>
                <option value="DISABLED">{lang === 'ar' ? 'معطل فقط' : 'Disabled Only'}</option>
              </select>

              {(search || roleFilter !== 'ALL' || statusFilter !== 'ALL') && (
                <button
                  onClick={() => {
                    setSearch('');
                    setRoleFilter('ALL');
                    setStatusFilter('ALL');
                  }}
                  className="px-2.5 py-2 text-xs text-rose-600 hover:bg-rose-50 font-bold rounded-xl transition cursor-pointer"
                >
                  {lang === 'ar' ? 'إعادة ضبط' : 'Reset'}
                </button>
              )}
            </div>
          </div>

          {/* Accounts & Users Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-start">
                <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4 text-start">{lang === 'ar' ? 'المستخدم والطاقم' : 'Staff Member'}</th>
                    <th className="py-3.5 px-4 text-start">{lang === 'ar' ? 'اسم الدخول (Username)' : 'Username / Login'}</th>
                    <th className="py-3.5 px-4 text-start">{lang === 'ar' ? 'الدور الوظيفي والصلاحيات' : 'Role & Permissions'}</th>
                    <th className="py-3.5 px-4 text-start">{lang === 'ar' ? 'المسمى المعتمد' : 'Title'}</th>
                    <th className="py-3.5 px-4 text-center">{lang === 'ar' ? 'حالة الحساب' : 'Account Status'}</th>
                    <th className="py-3.5 px-4 text-center">{lang === 'ar' ? 'إجراءات الحساب' : 'Account Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        <Users className="w-10 h-10 mx-auto mb-2 opacity-30 text-indigo-400" />
                        <p className="font-bold text-sm text-slate-600">
                          {lang === 'ar' ? 'لا يوجد حسابات مطابقة لمعايير البحث' : 'No matching accounts found'}
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          {lang === 'ar' ? 'جرّب البحث باسم آخر أو اضغط «إضافة حساب جديد»' : 'Try modifying your search or click "New Account"'}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map(u => {
                      const isAdminAccount = u.username === 'admin' || u.id === 'u-admin';
                      return (
                        <tr key={u.id || u.username} className="hover:bg-slate-50/70 transition">
                          {/* Staff Name & ID */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs ${
                                  u.role === 'Admin'
                                    ? 'bg-rose-100 text-rose-800'
                                    : u.role === 'Doctor'
                                    ? 'bg-blue-100 text-blue-800'
                                    : u.role === 'Nurse'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-slate-100 text-slate-800'
                                }`}
                              >
                                {u.name ? u.name.slice(0, 2) : 'US'}
                              </div>
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <p className="font-bold text-slate-900 text-sm">{u.name}</p>
                                  {isAdminAccount && (
                                    <span className="text-[10px] bg-rose-50 text-rose-700 px-1.5 py-0.5 rounded-sm font-black border border-rose-200">
                                      رئيسي
                                    </span>
                                  )}
                                </div>
                                <p className="text-[10px] text-slate-400 font-mono mt-0.5">ID: {u.id || '-'}</p>
                              </div>
                            </div>
                          </td>

                          {/* Username / Account */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-1.5 font-mono font-bold text-slate-800 bg-slate-100/80 px-2.5 py-1 rounded-lg w-fit border border-slate-200/80">
                              <Key className="w-3 h-3 text-slate-400" />
                              <span>{u.username}</span>
                            </div>
                          </td>

                          {/* Role Badge */}
                          <td className="py-3.5 px-4">{getRoleBadge(u.role)}</td>

                          {/* Title */}
                          <td className="py-3.5 px-4 text-slate-700 font-medium">{u.titleAr || '-'}</td>

                          {/* Status Toggle */}
                          <td className="py-3.5 px-4 text-center">
                            <button
                              type="button"
                              onClick={() => handleToggleActive(u)}
                              disabled={isAdminAccount}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition cursor-pointer ${
                                u.active !== false
                                  ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                  : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                              } ${isAdminAccount ? 'opacity-80 cursor-not-allowed' : ''}`}
                              title={
                                isAdminAccount
                                  ? 'حساب المسؤول الرئيسي مفعّل دائماً'
                                  : u.active !== false
                                  ? 'الحساب نشط - اضغط للتعطيل'
                                  : 'الحساب معطل - اضغط للتفعيل'
                              }
                            >
                              {u.active !== false ? (
                                <>
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>{lang === 'ar' ? 'نشط' : 'Active'}</span>
                                </>
                              ) : (
                                <>
                                  <XCircle className="w-3.5 h-3.5 text-slate-500" />
                                  <span>{lang === 'ar' ? 'معطل' : 'Disabled'}</span>
                                </>
                              )}
                            </button>
                          </td>

                          {/* Actions: Edit, Quick Password, Delete */}
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {/* Edit User Button */}
                              <button
                                onClick={() => handleOpenEdit(u)}
                                className="p-1.5 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition cursor-pointer"
                                title={lang === 'ar' ? 'تعديل الحساب والصلاحيات' : 'Edit Account & Permissions'}
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>

                              {/* Quick Password Reset */}
                              <button
                                onClick={() => {
                                  setUserToResetPassword(u);
                                  setNewQuickPassword('');
                                  setShowQuickPasswordText(false);
                                }}
                                className="p-1.5 text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg transition cursor-pointer"
                                title={lang === 'ar' ? 'تغيير كلمة المرور' : 'Change Password'}
                              >
                                <KeyRound className="w-4 h-4" />
                              </button>

                              {/* Delete User Button */}
                              {!isAdminAccount && (
                                <button
                                  onClick={() => setUserToDelete(u)}
                                  className="p-1.5 text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition cursor-pointer"
                                  title={lang === 'ar' ? 'حذف الحساب نهائياً' : 'Delete Account'}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Role Permissions Matrix Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
            <h4 className="font-bold text-xs text-slate-900 mb-3 flex items-center gap-2">
              <Shield className="w-4 h-4 text-indigo-600" />
              <span>{lang === 'ar' ? 'مصفوفة أدوار وصلاحيات الحسابات (RBAC Architecture)' : 'Role Permissions Matrix'}</span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs text-slate-600">
              <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-600"></span>
                  <strong className="text-rose-700">Admin (مدير النظام)</strong>
                </div>
                <p className="text-[11px] leading-relaxed text-slate-600">
                  {lang === 'ar'
                    ? 'إدارة الحسابات، حذف وإضافة المستخدمين، التحكم بالأسرّة، التعديل الشامل للحالات، والتصدير والنسخ الاحتياطي.'
                    : 'Full access to user management, database settings, beds, full patient records, and backups.'}
                </p>
              </div>

              <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                  <strong className="text-blue-700">Doctor (طبيب طوارئ)</strong>
                </div>
                <p className="text-[11px] leading-relaxed text-slate-600">
                  {lang === 'ar'
                    ? 'تسجيل أوامر النقل، إتمام النقل الفعلي، تخصيص الأسرة، كتابة الملاحظات الطبية، والاطلاع على الحسابات.'
                    : 'Order transfers, mark transferred, bed assignment, clinical documentation, and view users.'}
                </p>
              </div>

              <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                  <strong className="text-emerald-700">Nurse (مشرف تمريض)</strong>
                </div>
                <p className="text-[11px] leading-relaxed text-slate-600">
                  {lang === 'ar'
                    ? 'تحديث جهة النقل والسرير، تسجيل وقت النقل الفعلي، تحديث حالة الأسرّة (متاح/تعقيم)، وتوليد بطاقات QR.'
                    : 'Update transfer status, bed status updates, QR generation, and actual transfer timestamps.'}
                </p>
              </div>

              <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-slate-500"></span>
                  <strong className="text-slate-700">Viewer (مراقب ومتابع)</strong>
                </div>
                <p className="text-[11px] leading-relaxed text-slate-600">
                  {lang === 'ar'
                    ? 'صلاحيات القراءة فقط لشاشات الانتظار اللحظية، والتقارير الإحصائية والتحليلية دون صلاحيات تعديل أو حذف.'
                    : 'Read-only access to waiting monitors, reports, and dashboards without modification permissions.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Login Audit Trail Subtab */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <h3 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
              <History className="w-4 h-4 text-purple-600" />
              <span>{lang === 'ar' ? 'سجل حركات تسجيل الدخول الحية' : 'User Login Audit Trail'}</span>
            </h3>
            <span className="text-xs text-slate-500 font-mono">
              {loginLogs.length} {lang === 'ar' ? 'تسجيل موثق' : 'entries'}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-start">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase">
                <tr>
                  <th className="py-3 px-4 text-start">{lang === 'ar' ? 'المستخدم' : 'User'}</th>
                  <th className="py-3 px-4 text-start">{lang === 'ar' ? 'اسم الدخول' : 'Username'}</th>
                  <th className="py-3 px-4 text-start">{lang === 'ar' ? 'الدور' : 'Role'}</th>
                  <th className="py-3 px-4 text-start">IP</th>
                  <th className="py-3 px-4 text-end">{lang === 'ar' ? 'التوقيت' : 'Time'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loginLogs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50 transition">
                    <td className="py-2.5 px-4 font-bold text-slate-900">{log.userName}</td>
                    <td className="py-2.5 px-4 font-mono text-slate-600">{log.username}</td>
                    <td className="py-2.5 px-4">{getRoleBadge(log.role as UserRole)}</td>
                    <td className="py-2.5 px-4 font-mono text-slate-400">{log.ip || '127.0.0.1'}</td>
                    <td className="py-2.5 px-4 text-end text-slate-500 font-mono">
                      {new Date(log.loginTime).toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 1. Modal: Add New Account & User */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base">
                    {lang === 'ar' ? 'إضافة حساب ومستخدم جديد' : 'Create New Account'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {lang === 'ar' ? 'إنشاء حساب جديد وتعيين اسم الدخول والصلاحيات' : 'Create a staff account with credentials'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveAdd} className="p-6 space-y-4 text-xs">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span className="font-bold">{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  {lang === 'ar' ? 'الاسم الكامل للطبيب / الموظف *' : 'Full Name *'}
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  placeholder="مثال: د. طارق عبد العزيز"
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-hidden font-semibold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  {lang === 'ar' ? 'اسم الدخول والحساب (Username) *' : 'Username / Login ID *'}
                </label>
                <input
                  type="text"
                  required
                  value={formUsername}
                  onChange={e => setFormUsername(e.target.value)}
                  placeholder="e.g. dr.tarek"
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-hidden font-mono font-bold text-slate-900"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  {lang === 'ar' ? 'يُستخدم لتسجيل الدخول للنظام (أحرف إنجليزية وأرقام ونقاط)' : 'Used for login authentication'}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    {lang === 'ar' ? 'الدور والصلاحيات (Role) *' : 'Role *'}
                  </label>
                  <select
                    value={formRole}
                    onChange={e => {
                      const newRole = e.target.value as UserRole;
                      setFormRole(newRole);
                      if (newRole === 'Doctor') setFormTitleAr('طبيب طوارئ');
                      else if (newRole === 'Nurse') setFormTitleAr('مشرف تمريض');
                      else if (newRole === 'Admin') setFormTitleAr('مدير النظام');
                      else setFormTitleAr('مراقب إحصائي');
                    }}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-hidden font-semibold text-slate-900 cursor-pointer"
                  >
                    <option value="Doctor">طبيب طوارئ (Doctor)</option>
                    <option value="Nurse">مشرف تمريض (Nurse)</option>
                    <option value="Admin">مدير النظام (Admin)</option>
                    <option value="Viewer">مراقب (Viewer)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    {lang === 'ar' ? 'المسمى المعتمد' : 'Title'}
                  </label>
                  <input
                    type="text"
                    value={formTitleAr}
                    onChange={e => setFormTitleAr(e.target.value)}
                    placeholder="مثال: استشاري طب الطوارئ"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-hidden font-medium text-slate-900"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-slate-700 font-bold">
                    {lang === 'ar' ? 'كلمة المرور (Password) *' : 'Password *'}
                  </label>
                  <button
                    type="button"
                    onClick={generateRandomPassword}
                    className="text-[11px] text-indigo-600 hover:text-indigo-800 font-bold cursor-pointer flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>{lang === 'ar' ? 'توليد كلمة سر عشوائية' : 'Generate'}</span>
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPasswordText ? 'text' : 'password'}
                    required
                    value={formPassword}
                    onChange={e => setFormPassword(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-hidden font-mono font-bold text-slate-900 pe-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswordText(!showPasswordText)}
                    className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                  >
                    {showPasswordText ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-800">{lang === 'ar' ? 'حالة الحساب' : 'Account Status'}</p>
                  <p className="text-[10px] text-slate-500">
                    {formActive ? (lang === 'ar' ? 'الحساب مفعّل ويستطيع تسجيل الدخول' : 'User can login immediately') : (lang === 'ar' ? 'الحساب معطل وموقوف' : 'Account is disabled')}
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formActive}
                    onChange={e => setFormActive(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-slate-200">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>{lang === 'ar' ? 'جاري الحفظ...' : 'Saving...'}</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>{lang === 'ar' ? 'حفظ الحساب في Neon' : 'Save Account'}</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition cursor-pointer"
                >
                  {t('cancel', lang)}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Modal: Edit User & Account */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl">
                  <Edit2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base">
                    {lang === 'ar' ? `تعديل الحساب (${editingUser.name})` : `Edit Account (${editingUser.name})`}
                  </h3>
                  <p className="text-[11px] text-slate-400 font-mono">ID: {editingUser.id}</p>
                </div>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-4 text-xs">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span className="font-bold">{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  {lang === 'ar' ? 'الاسم الكامل للطبيب / الموظف *' : 'Full Name *'}
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-hidden font-semibold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  {lang === 'ar' ? 'اسم الحساب / الدخول (Username) *' : 'Username / Account ID *'}
                </label>
                <input
                  type="text"
                  required
                  disabled={editingUser.username === 'admin'}
                  value={formUsername}
                  onChange={e => setFormUsername(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-hidden font-mono font-bold text-slate-900 disabled:opacity-60 disabled:cursor-not-allowed"
                />
                {editingUser.username === 'admin' ? (
                  <p className="text-[10px] text-amber-600 mt-1 font-semibold">
                    {lang === 'ar' ? 'لا يمكن تغيير اسم دخول المسؤول الرئيسي (admin)' : 'Primary admin username cannot be modified'}
                  </p>
                ) : (
                  <p className="text-[10px] text-slate-400 mt-1">
                    {lang === 'ar' ? 'يمكنك تحديث اسم الدخول مع ضمان عدم تكراره' : 'Unique login username for this account'}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    {lang === 'ar' ? 'الدور والصلاحيات *' : 'Role *'}
                  </label>
                  <select
                    value={formRole}
                    disabled={editingUser.username === 'admin'}
                    onChange={e => setFormRole(e.target.value as UserRole)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-hidden font-semibold text-slate-900 disabled:opacity-60 cursor-pointer"
                  >
                    <option value="Doctor">طبيب طوارئ (Doctor)</option>
                    <option value="Nurse">مشرف تمريض (Nurse)</option>
                    <option value="Admin">مدير النظام (Admin)</option>
                    <option value="Viewer">مراقب (Viewer)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    {lang === 'ar' ? 'المسمى المعتمد' : 'Title'}
                  </label>
                  <input
                    type="text"
                    value={formTitleAr}
                    onChange={e => setFormTitleAr(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-hidden font-medium text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  {lang === 'ar' ? 'تغيير كلمة المرور (اختياري)' : 'Change Password (Optional)'}
                </label>
                <div className="relative">
                  <input
                    type={showPasswordText ? 'text' : 'password'}
                    placeholder={lang === 'ar' ? 'اتركه فارغاً للإبقاء على كلمة المرور السابقة' : 'Leave empty to keep unchanged'}
                    value={formPassword}
                    onChange={e => setFormPassword(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-hidden font-mono font-bold text-slate-900 pe-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswordText(!showPasswordText)}
                    className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                  >
                    {showPasswordText ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-800">{lang === 'ar' ? 'حالة تفعيل الحساب' : 'Account Active Status'}</p>
                  <p className="text-[10px] text-slate-500">
                    {formActive ? (lang === 'ar' ? 'الحساب مفعّل ويستطيع الدخول' : 'User is active') : (lang === 'ar' ? 'الحساب موقوف عن الدخول' : 'User is disabled')}
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    disabled={editingUser.username === 'admin'}
                    checked={formActive}
                    onChange={e => setFormActive(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-slate-200">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>{lang === 'ar' ? 'جاري حفظ التعديل...' : 'Updating...'}</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>{lang === 'ar' ? 'حفظ تعديلات الحساب' : 'Save Changes'}</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition cursor-pointer"
                >
                  {t('cancel', lang)}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Modal: Delete Account Confirmation (No window.confirm!) */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-rose-600 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-white/20 rounded-xl">
                  <ShieldAlert className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-black text-base">
                    {lang === 'ar' ? 'تأكيد حذف الحساب' : 'Delete Account Confirmation'}
                  </h3>
                  <p className="text-[11px] text-rose-100">
                    {lang === 'ar' ? 'إجراء نهائي لا يمكن التراجع عنه' : 'Irreversible permanent action'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setUserToDelete(null)}
                className="text-white/80 hover:text-white p-1 rounded-lg text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <p className="text-slate-700 leading-relaxed text-sm">
                {lang === 'ar' ? (
                  <>
                    هل أنت متأكد من رغبتك في حذف حساب المستخدم{' '}
                    <strong className="text-slate-950 underline decoration-rose-500 font-bold">
                      {userToDelete.name}
                    </strong>{' '}
                    (اسم الحساب:{' '}
                    <span className="font-mono font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded-sm">
                      {userToDelete.username}
                    </span>
                    )؟
                  </>
                ) : (
                  <>
                    Are you sure you want to permanently delete account for{' '}
                    <strong className="text-slate-950 font-bold">{userToDelete.name}</strong> ({userToDelete.username})?
                  </>
                )}
              </p>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span className="text-[11px] leading-relaxed">
                  {lang === 'ar'
                    ? 'سيتم حذف بيانات اعتماد الدخول وسجل الحساب نهائياً من قاعدة بيانات السحابة Neon PostgreSQL.'
                    : 'This will permanently remove login credentials and account profile from Neon PostgreSQL.'}
                </span>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleConfirmDelete}
                  className="flex-1 py-2.5 px-4 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>{lang === 'ar' ? 'جاري الحذف...' : 'Deleting...'}</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      <span>{lang === 'ar' ? 'نعم، حذف الحساب نهائياً' : 'Yes, Delete Permanently'}</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setUserToDelete(null)}
                  className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition cursor-pointer"
                >
                  {t('cancel', lang)}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. Modal: Quick Reset Password */}
      {userToResetPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-purple-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-purple-500/20 text-purple-300 rounded-xl">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base">
                    {lang === 'ar' ? 'تغيير كلمة المرور' : 'Reset Account Password'}
                  </h3>
                  <p className="text-[11px] text-purple-200">
                    {userToResetPassword.name} ({userToResetPassword.username})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setUserToResetPassword(null)}
                className="text-purple-300 hover:text-white p-1 rounded-lg text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveQuickPassword} className="p-6 space-y-4 text-xs">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-slate-700 font-bold">
                    {lang === 'ar' ? 'كلمة المرور الجديدة *' : 'New Password *'}
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$';
                      let res = '';
                      for (let i = 0; i < 8; i++) {
                        res += chars.charAt(Math.floor(Math.random() * chars.length));
                      }
                      setNewQuickPassword(res);
                      setShowQuickPasswordText(true);
                    }}
                    className="text-[11px] text-purple-600 hover:text-purple-800 font-bold cursor-pointer flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>{lang === 'ar' ? 'توليد كلمة سر عشوائية' : 'Generate'}</span>
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showQuickPasswordText ? 'text' : 'password'}
                    required
                    value={newQuickPassword}
                    onChange={e => setNewQuickPassword(e.target.value)}
                    placeholder="اكتب كلمة المرور الجديدة..."
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 outline-hidden font-mono font-bold text-slate-900 pe-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowQuickPasswordText(!showQuickPasswordText)}
                    className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                  >
                    {showQuickPasswordText ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
                <button
                  type="submit"
                  disabled={isSubmitting || !newQuickPassword.trim()}
                  className="flex-1 py-2.5 px-4 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>{lang === 'ar' ? 'جاري الحفظ...' : 'Saving...'}</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>{lang === 'ar' ? 'تحديث كلمة المرور' : 'Update Password'}</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setUserToResetPassword(null)}
                  className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition cursor-pointer"
                >
                  {t('cancel', lang)}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
