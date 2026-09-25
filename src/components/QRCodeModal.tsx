import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { ERRecord, AppLanguage } from '../types';
import { t } from '../utils/translations';
import { QrCode, Printer, X, CheckCircle2, ShieldCheck } from 'lucide-react';

interface QRCodeModalProps {
  record: ERRecord | null;
  onClose: () => void;
  lang: AppLanguage;
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({ record, onClose, lang }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!record || !canvasRef.current) return;

    // Build payload
    const qrData = JSON.stringify({
      mrn: record.medical,
      name: record.name,
      dept: record.dept || 'ER-Unassigned',
      bed: record.bedNumber || 'N/A',
      order: record.order,
      status: record.status,
      id: record.id,
      system: 'HOSPITAL-ER-OPS',
    });

    QRCode.toCanvas(
      canvasRef.current,
      qrData,
      {
        width: 220,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      },
      (error) => {
        if (error) console.error('Error generating QR code:', error);
      }
    );
  }, [record]);

  if (!record) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`MRN: ${record.medical} | ${record.name} | Status: ${record.status}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[92vh] flex flex-col border border-slate-200 overflow-hidden my-auto">
        {/* Header */}
        <div className="shrink-0 bg-gradient-to-r from-slate-900 to-slate-800 text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">
                {lang === 'ar' ? 'بطاقة التحويل الطبية الرقمية (QR Code)' : 'Digital Patient Transfer Pass (QR Code)'}
              </h3>
              <p className="text-xs text-slate-300">
                {lang === 'ar' ? 'فحص ومطابقة بيانات المريض إلكترونياً' : 'Electronic Patient Verification'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Card Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 text-center print:p-8" id="printable-qr-card">
          {/* Hospital Header for Print */}
          <div className="border-b border-slate-200 pb-3 mb-4 text-center">
            <div className="flex items-center justify-center gap-1.5 text-emerald-600 font-bold text-sm mb-0.5">
              <ShieldCheck className="w-4 h-4" />
              <span>{lang === 'ar' ? 'طوارئ المستشفى - بطاقة نقل معتمدة' : 'Hospital Emergency - Approved Transfer Pass'}</span>
            </div>
            <p className="text-xs text-slate-500">
              {lang === 'ar' ? 'نظام تتبع فترات الانتظار والتحويلات اللحظية' : 'Emergency Waiting Time Tracking & Real-Time Sync'}
            </p>
          </div>

          {/* QR Canvas */}
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-white border-2 border-dashed border-slate-300 rounded-xl shadow-xs">
              <canvas ref={canvasRef} className="max-w-full h-auto" />
            </div>
          </div>

          {/* Patient Details Grid */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-start space-y-2 mb-4 text-xs">
            <div className="flex justify-between border-b border-slate-200/80 pb-1.5">
              <span className="text-slate-500">{t('patientName', lang)}:</span>
              <span className="font-bold text-slate-900">{record.name}</span>
            </div>
            <div className="flex justify-between border-b border-slate-200/80 pb-1.5">
              <span className="text-slate-500">{t('mrn', lang)}:</span>
              <span className="font-mono font-bold text-emerald-700">{record.medical}</span>
            </div>
            <div className="flex justify-between border-b border-slate-200/80 pb-1.5">
              <span className="text-slate-500">{t('dept', lang)}:</span>
              <span className="font-semibold text-slate-800">{record.dept || (lang === 'ar' ? 'غير محدد' : 'Unassigned')}</span>
            </div>
            {record.bedNumber && (
              <div className="flex justify-between border-b border-slate-200/80 pb-1.5">
                <span className="text-slate-500">{lang === 'ar' ? 'السرير المخصص' : 'Assigned Bed'}:</span>
                <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">{record.bedNumber}</span>
              </div>
            )}
            <div className="flex justify-between border-b border-slate-200/80 pb-1.5">
              <span className="text-slate-500">{t('orderTime', lang)}:</span>
              <span className="text-slate-700 font-mono">{record.order ? record.order.replace('T', ' ') : '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">{t('status', lang)}:</span>
              <span className={`font-bold px-2 py-0.5 rounded-full text-[11px] ${
                record.status === 'Transferred' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
              }`}>
                {record.status === 'Transferred' ? (lang === 'ar' ? 'تم النقل' : 'Transferred') : (lang === 'ar' ? 'قيد الانتظار' : 'Pending')}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 print:hidden">
            <button
              onClick={handlePrint}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl shadow-xs transition"
            >
              <Printer className="w-4 h-4" />
              <span>{lang === 'ar' ? 'طباعة البطاقة' : 'Print Pass'}</span>
            </button>
            <button
              onClick={handleCopyLink}
              className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-xl transition flex items-center gap-1.5"
            >
              {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : null}
              <span>{copied ? (lang === 'ar' ? 'تم النسخ!' : 'Copied!') : (lang === 'ar' ? 'نسخ' : 'Copy')}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
