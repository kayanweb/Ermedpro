import { ScreensVisibilityConfig } from '../types';

export const DEFAULT_SCREENS_VISIBILITY: ScreensVisibilityConfig = {
  showLiveTracking: false, // Hidden by default as requested by user
  showBedManagement: false, // Hidden by default as requested by user
};

export const SCREENS_STORAGE_KEY = 'er_screens_visibility_v1';
export const SCREENS_CHANGE_EVENT = 'er_screens_visibility_changed';

export function getScreensVisibility(): ScreensVisibilityConfig {
  if (typeof window === 'undefined') return DEFAULT_SCREENS_VISIBILITY;
  try {
    const saved = localStorage.getItem(SCREENS_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        showLiveTracking: Boolean(parsed.showLiveTracking),
        showBedManagement: Boolean(parsed.showBedManagement),
      };
    }
  } catch {
    // fallback
  }
  return DEFAULT_SCREENS_VISIBILITY;
}

export function saveScreensVisibility(config: ScreensVisibilityConfig): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SCREENS_STORAGE_KEY, JSON.stringify(config));
    window.dispatchEvent(new CustomEvent(SCREENS_CHANGE_EVENT, { detail: config }));
  } catch (err) {
    console.error('Failed to save screens visibility config:', err);
  }
}
