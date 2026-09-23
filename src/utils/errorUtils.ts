/**
 * Helper to safely extract a readable string error message from any error,
 * preventing '[object Object]' from ever being shown in UI toasts.
 */
export function formatErrorMessage(err: any, fallback = 'حدث خطأ غير متوقع'): string {
  if (!err) return fallback;
  if (typeof err === 'string') {
    const trimmed = err.trim();
    if (trimmed && trimmed !== '[object Object]') return trimmed;
    return fallback;
  }
  if (err instanceof Error && err.message) {
    const trimmed = err.message.trim();
    if (trimmed && trimmed !== '[object Object]') return trimmed;
  }
  if (typeof err.message === 'string' && err.message.trim() && err.message.trim() !== '[object Object]') {
    return err.message.trim();
  }
  if (typeof err.error === 'string' && err.error.trim() && err.error.trim() !== '[object Object]') {
    return err.error.trim();
  }
  if (typeof err.statusText === 'string' && err.statusText.trim()) {
    return `خطأ في الخادم (${err.status || ''}): ${err.statusText}`;
  }
  if (typeof err === 'object') {
    try {
      const stringified = JSON.stringify(err);
      if (stringified && stringified !== '{}' && stringified !== '[]') {
        return stringified;
      }
    } catch {
      // ignore serialization error
    }
  }
  const str = String(err);
  if (str && str !== '[object Object]') return str;
  return fallback;
}
