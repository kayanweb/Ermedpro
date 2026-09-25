import { useState, useEffect } from 'react';

export interface InstitutionSettings {
  systemName: string;
  hospitalName: string;
  logo: string; // Emoji like "🏥" or base64 data url
  subTitle: string;
}

const DEFAULT_SETTINGS: InstitutionSettings = {
  systemName: 'ER Waiting Time',
  hospitalName: 'مستشفى الطوارئ والحالات الحرجة',
  logo: '🏥',
  subTitle: 'نظام قياس وإدارة أوقات انتظار الطوارئ الآلي',
};

const STORAGE_KEY = 'er_waiting_time_institution_settings_v1';
export const INSTITUTION_SETTINGS_EVENT = 'er_institution_settings_changed';

export function getInstitutionSettings(): InstitutionSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch (e) {
    console.error('Error reading institution settings', e);
  }
  return DEFAULT_SETTINGS;
}

export function saveInstitutionSettings(settings: Partial<InstitutionSettings>): InstitutionSettings {
  const current = getInstitutionSettings();
  const updated = { ...current, ...settings };
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent(INSTITUTION_SETTINGS_EVENT, { detail: updated }));
    } catch (e) {
      console.error('Error saving institution settings', e);
    }
  }
  return updated;
}

export function useInstitutionSettings() {
  const [settings, setSettings] = useState<InstitutionSettings>(getInstitutionSettings);

  useEffect(() => {
    const handleUpdate = (e: any) => {
      if (e.detail) {
        setSettings(e.detail);
      } else {
        setSettings(getInstitutionSettings());
      }
    };
    window.addEventListener(INSTITUTION_SETTINGS_EVENT, handleUpdate);
    return () => window.removeEventListener(INSTITUTION_SETTINGS_EVENT, handleUpdate);
  }, []);

  return settings;
}
