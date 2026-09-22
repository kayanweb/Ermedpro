import React, { useRef } from 'react';
import { ERRecord, UserRole } from '../types';
import { exportToExcel, exportToCSV, printOfficialReport } from '../utils/export';
import { FileSpreadsheet, Printer, FileDown, Database, Upload, Trash2, RotateCcw, AlertTriangle } from 'lucide-react';

interface ExportTabProps {
  records: ERRecord[];
  userRole: UserRole;
  onClearAll: () => void;
  onResetToDemo: () => void;
  onRestoreBackup: (records: ERRecord[]) => void;
}

export const ExportTab: React.FC<ExportTabProps> = ({
  records,
  userRole,
  onClearAll,
  onResetToDemo,
  onRestoreBackup,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDownloadBackup = () => {
    const jsonStr = JSON.stringify(records, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ER_WTMS_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = event => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (Array.isArray(data)) {
          onRestoreBackup(data);
        } else {
          alert('الملف المرفوع لا يحتوي على صيغة مصفوفة سجلات صالحة');
        }
      } catch (err) {
        alert('حدث خطأ أثناء قراءة ملف النسخة الاحتياطية');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Export Cards */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800">تصدير تقارير وبيانات أوقات الانتظار</h2>
          <p className="text-xs text-slate-500">
            احصل على تقارير رسمية معتمدة بصيغ متعددة متوافقة مع متطلبات لجان الجودة والاعتماد
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          {/* Excel Export Card */}
          <div className="p-5 rounded-2xl border border-emerald-200 bg-emerald-50/50 flex flex-col justify-between space-y-4">
            <div>
              <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20 mb-3">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-800 text-sm">تصدير Excel (.xls)</h3>
              <p className="text-xs text-slate-600 mt-1">
                بنفس التنسيق الرسمي المعتمد (العنوان، ملخص أعداد الحالات حسب القسم، والألوان التحذيرية لمدد التأخير).
              </p>
            </div>
            <button
              onClick={() => exportToExcel(records)}
              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition shadow-sm cursor-pointer"
            >
              تحميل ملف Excel الآن
            </button>
          </div>

          {/* PDF / Print Card */}
          <div className="p-5 rounded-2xl border border-rose-200 bg-rose-50/50 flex flex-col justify-between space-y-4">
            <div>
              <div className="w-12 h-12 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-md shadow-rose-600/20 mb-3">
                <Printer className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-800 text-sm">طباعة رسمية / PDF</h3>
              <p className="text-xs text-slate-600 mt-1">
                نموذج رسمي منسق أفقياً (Landscape) جاهز للطباعة الفورية على الورق الرسمي أو الحفظ كملف PDF.
              </p>
            </div>
            <button
              onClick={() => printOfficialReport(records)}
              className="w-full py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition shadow-sm cursor-pointer"
            >
              فتح نافذة الطباعة / PDF
            </button>
          </div>

          {/* CSV Export Card */}
          <div className="p-5 rounded-2xl border border-blue-200 bg-blue-50/50 flex flex-col justify-between space-y-4">
            <div>
              <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-600/20 mb-3">
                <FileDown className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-800 text-sm">ملف نصي CSV</h3>
              <p className="text-xs text-slate-600 mt-1">
                ملف بيانات مجدولة بصيغة UTF-8 BOM لضمان عرض اللغة العربية بشكل صحيح على برامج التحليل والإحصاء.
              </p>
            </div>
            <button
              onClick={() => exportToCSV(records)}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition shadow-sm cursor-pointer"
            >
              تحميل ملف CSV
            </button>
          </div>
        </div>
      </div>

      {/* Backup and Restore */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-4">
        <div>
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <Database className="w-5 h-5 text-indigo-600" />
            <span>النسخ الاحتياطي واستعادة قاعدة بيانات Neon السحابية</span>
          </h2>
          <p className="text-xs text-slate-500">حفظ أو استعادة كافة الحالات وسجلات أوقات الانتظار من وإلى قاعدة بيانات Neon الحية</p>
        </div>

        <div className="flex flex-wrap gap-3 pt-1">
          <button
            onClick={handleDownloadBackup}
            className="px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer"
          >
            <Database className="w-4 h-4" />
            <span>تنزيل نسخة احتياطية (JSON Backup)</span>
          </button>

          {userRole !== 'Viewer' && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                <span>استعادة من ملف نسخة احتياطية</span>
              </button>
            </>
          )}

          <button
            onClick={onResetToDemo}
            className="px-4 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>استعادة بيانات العرض النموذجية (Demo Cases)</span>
          </button>
        </div>
      </div>

      {/* Danger Zone (Admin Only) */}
      {userRole === 'Admin' && (
        <div className="bg-red-50/50 rounded-2xl p-6 sm:p-8 border border-red-200 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-red-900 font-bold text-sm">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <span>منطقة العمليات الحساسة (صلاحية مدير النظام فقط)</span>
          </div>
          <p className="text-xs text-slate-600">
            حذف جميع السجلات سيقوم بتفريغ جدول الحالات نهائياً. يرجى تنزيل نسخة احتياطية قبل المتابعة.
          </p>

          <div className="pt-2">
            <button
              onClick={() => {
                if (confirm('تحذير: هل أنت متأكد من حذف كافة سجلات حالات الانتظار؟ هذا الإجراء لا يمكن التراجع عنه!')) {
                  if (confirm('تأكيد نهائي: تفريغ قاعدة البيانات بالكامل؟')) {
                    onClearAll();
                  }
                }
              }}
              className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-sm cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>تفريغ وحذف جميع السجلات من النظام</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
