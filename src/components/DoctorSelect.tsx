import React, { useState, useEffect } from 'react';
import { HospitalDoctor } from '../types';
import { fetchDoctorsFromDb, createDoctorInDb } from '../services/api';
import { DEFAULT_DOCTORS } from '../constants';
import { Stethoscope, Plus, Check, X, RefreshCw, Edit3 } from 'lucide-react';

interface DoctorSelectProps {
  value: string;
  onChange: (doctorName: string) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
  showLabel?: boolean;
  label?: string;
}

export const DoctorSelect: React.FC<DoctorSelectProps> = ({
  value,
  onChange,
  placeholder = 'اختر الطبيب المعالج...',
  required = false,
  className = '',
  showLabel = false,
  label = 'اسم الطبيب المعالج',
}) => {
  const [doctors, setDoctors] = useState<HospitalDoctor[]>([]);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'select' | 'new_doc' | 'manual'>('select');
  const [newDocName, setNewDocName] = useState('');
  const [newDocSpecialty, setNewDocSpecialty] = useState('طبيب طوارئ');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Load doctors from server / cache
  useEffect(() => {
    let isMounted = true;
    async function load() {
      try {
        const list = await fetchDoctorsFromDb();
        if (isMounted && Array.isArray(list) && list.length > 0) {
          setDoctors(list);
        }
      } catch (e) {
        console.error('Failed to load doctors:', e);
      }
    }
    load();
    return () => {
      isMounted = false;
    };
  }, []);

  // Ensure current value is in doctors list options if not empty
  const cleanVal = (value || '').trim();
  const hasCurrentInList = cleanVal
    ? doctors.some(d => d.name.trim().toLowerCase() === cleanVal.toLowerCase())
    : true;

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === '__ADD_NEW__') {
      setNewDocName('');
      setSaveError('');
      setMode('new_doc');
    } else {
      onChange(val);
    }
  };

  const handleSaveNewDoctor = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newDocName.trim();
    if (!trimmed) {
      setSaveError('يرجى كتابة اسم الطبيب');
      return;
    }

    setIsSaving(true);
    setSaveError('');
    try {
      const created = await createDoctorInDb(trimmed, newDocSpecialty.trim() || 'طبيب طوارئ');
      setDoctors(prev => {
        if (prev.some(d => d.name.trim().toLowerCase() === created.name.trim().toLowerCase())) {
          return prev;
        }
        return [...prev, created];
      });
      onChange(created.name);
      setMode('select');
      setNewDocName('');
    } catch (err: any) {
      // Even if network fails, add locally to list and set value
      const fallbackDoc: HospitalDoctor = {
        id: `doc-${Date.now()}`,
        name: trimmed,
        specialty: newDocSpecialty.trim() || 'طبيب طوارئ',
        active: true,
      };
      setDoctors(prev => [...prev, fallbackDoc]);
      onChange(trimmed);
      setMode('select');
      setNewDocName('');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={`space-y-1.5 ${className}`}>
      {showLabel && (
        <div className="flex items-center justify-between">
          <label className="block text-slate-700 font-bold text-xs flex items-center gap-1.5">
            <Stethoscope className="w-3.5 h-3.5 text-blue-600" />
            <span>{label}</span>
            {required && <span className="text-rose-500">*</span>}
          </label>
          <div className="flex items-center gap-1 text-[11px]">
            {mode === 'select' ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setNewDocName('');
                    setSaveError('');
                    setMode('new_doc');
                  }}
                  className="text-blue-600 hover:text-blue-800 font-bold hover:underline flex items-center gap-0.5 cursor-pointer"
                  title="إضافة طبيب جديد للقائمة وقاعدة البيانات"
                >
                  <Plus className="w-3 h-3" />
                  <span>إضافة طبيب جديد</span>
                </button>
                <span className="text-slate-300">|</span>
                <button
                  type="button"
                  onClick={() => setMode('manual')}
                  className="text-slate-500 hover:text-slate-700 font-medium hover:underline flex items-center gap-0.5 cursor-pointer"
                  title="كتابة يدوية"
                >
                  <Edit3 className="w-3 h-3" />
                  <span>كتابة</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setMode('select')}
                className="text-slate-600 hover:text-slate-800 font-bold hover:underline flex items-center gap-0.5 cursor-pointer"
              >
                <span>العودة للقائمة</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Mode 1: Select Dropdown */}
      {mode === 'select' && (
        <div className="relative">
          <select
            value={cleanVal}
            onChange={handleSelectChange}
            required={required}
            className="w-full p-2.5 bg-white border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none font-semibold text-xs sm:text-sm text-slate-800 cursor-pointer"
          >
            <option value="">{placeholder}</option>

            {/* If current value is not in fetched list, show it at top so it is selected */}
            {!hasCurrentInList && cleanVal && (
              <option value={cleanVal}>
                {cleanVal} (الحالي)
              </option>
            )}

            {doctors.map(d => (
              <option key={d.id || d.name} value={d.name}>
                {d.name} {d.specialty ? `— (${d.specialty})` : ''}
              </option>
            ))}

            <option value="__ADD_NEW__" className="font-bold text-blue-700 bg-blue-50/50">
              ➕ إضافة طبيب جديد إلى النظام...
            </option>
          </select>
        </div>
      )}

      {/* Mode 2: Create New Doctor Form (Saves to DB) */}
      {mode === 'new_doc' && (
        <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl space-y-2 animate-in fade-in duration-150">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-blue-900 flex items-center gap-1">
              <Plus className="w-3.5 h-3.5 text-blue-600" />
              <span>إنشاء طبيب جديد في النظام:</span>
            </span>
            <button
              type="button"
              onClick={() => setMode('select')}
              className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
              title="إلغاء"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {saveError && (
            <p className="text-[11px] text-rose-600 font-bold bg-rose-50 p-1.5 rounded border border-rose-200">
              {saveError}
            </p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="sm:col-span-2">
              <input
                type="text"
                autoFocus
                placeholder="اسم الطبيب (مثال: د. إسلام محمد)..."
                value={newDocName}
                onChange={e => setNewDocName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSaveNewDoctor();
                  }
                }}
                className="w-full p-2 bg-white border border-blue-300 rounded-lg text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <select
                value={newDocSpecialty}
                onChange={e => setNewDocSpecialty(e.target.value)}
                className="w-full p-2 bg-white border border-blue-300 rounded-lg text-xs font-semibold text-slate-800 outline-none cursor-pointer"
              >
                <option value="طبيب طوارئ">طبيب طوارئ</option>
                <option value="أخصائي طوارئ">أخصائي طوارئ</option>
                <option value="استشاري طوارئ">استشاري طوارئ</option>
                <option value="طبيب مقيم">طبيب مقيم</option>
                <option value="أخصائي عظام">أخصائي عظام</option>
                <option value="أخصائي جراحة">أخصائي جراحة</option>
                <option value="أخصائي باطنة">أخصائي باطنة</option>
                <option value="أخصائي قلب">أخصائي قلب</option>
                <option value="أخصائي عناية">أخصائي عناية</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              disabled={isSaving || !newDocName.trim()}
              onClick={() => handleSaveNewDoctor()}
              className="flex-1 py-1.5 px-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-lg transition cursor-pointer flex items-center justify-center gap-1 shadow-xs"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>جاري الحفظ...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>حفظ في النظام واختيار</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => setMode('select')}
              className="py-1.5 px-3 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-lg transition cursor-pointer"
            >
              إلغاء
            </button>
          </div>
        </div>
      )}

      {/* Mode 3: Manual Direct Typing */}
      {mode === 'manual' && (
        <div className="flex items-center gap-2">
          <input
            type="text"
            autoFocus
            placeholder="اكتب اسم الطبيب يدوياً..."
            value={value || ''}
            onChange={e => onChange(e.target.value)}
            className="flex-1 p-2.5 bg-white border border-slate-300 rounded-lg focus:border-blue-500 outline-none text-xs sm:text-sm font-semibold"
          />
          <button
            type="button"
            onClick={() => setMode('select')}
            className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 font-bold text-xs rounded-lg transition cursor-pointer shrink-0"
            title="العودة لاختيار طبيب من القائمة"
          >
            القائمة
          </button>
        </div>
      )}
    </div>
  );
};
