import { ERRecord, User, HospitalBed, AuditLogItem, UserAuditStat, CaseComment, LoginLog } from '../types';
import { formatErrorMessage } from '../utils/errorUtils';

export interface DbHealthStatus {
  status: string;
  db: string;
  connected: boolean;
  latencyMs?: number;
  recordCount?: number;
  serverTime?: string;
  error?: string;
}

// Global robust fetch with retry mechanism to gracefully handle cold-starts, connection resets, and transient errors
export async function safeFetchJson<T>(
  url: string,
  options?: RequestInit,
  retries = 3,
  baseDelay = 800
): Promise<T> {
  let lastError: any = null;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(url, {
        ...options,
        headers: {
          Accept: 'application/json',
          ...(options?.headers || {}),
        },
      });

      const contentType = res.headers.get('content-type') || '';
      const isHtml = contentType.toLowerCase().includes('text/html');
      const isGatewayError = res.status === 502 || res.status === 503 || res.status === 504;

      // If server returned HTML (e.g. gateway error, cold start, or SPA fallback), retry
      if (isHtml || isGatewayError) {
        lastError = new Error(`Server returned non-JSON response (${res.status}) on ${url}`);
        if (attempt < retries - 1) {
          await new Promise(r => setTimeout(r, baseDelay * (attempt + 1)));
          continue;
        }
        throw lastError;
      }

      if (!res.ok) {
        let errMsg = `Request failed with HTTP ${res.status}`;
        try {
          const errBody = await res.json();
          if (errBody && errBody.error) errMsg = errBody.error;
        } catch {
          // not json error body
        }
        throw new Error(errMsg);
      }

      const text = await res.text();
      if (!text || text.trim().startsWith('<')) {
        lastError = new Error(`Malformed JSON response received from ${url}`);
        if (attempt < retries - 1) {
          await new Promise(r => setTimeout(r, baseDelay * (attempt + 1)));
          continue;
        }
        throw lastError;
      }

      return JSON.parse(text) as T;
    } catch (err: any) {
      if (err instanceof Error) {
        lastError = err;
      } else if (typeof err === 'string') {
        lastError = new Error(err);
      } else if (typeof err === 'object' && err !== null) {
        lastError = new Error(err.message || JSON.stringify(err));
      } else {
        lastError = new Error('Unknown connection failure');
      }
      if (attempt < retries - 1) {
        await new Promise(r => setTimeout(r, baseDelay * (attempt + 1)));
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error(`Network failure communicating with ${url}`);
}

async function safeMutationJson<T>(url: string, options: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(options.headers || {}),
      },
    });
  } catch (netErr: any) {
    throw new Error(formatErrorMessage(netErr, `تعذر الاتصال بالخادم على ${url}`));
  }

  const contentType = res.headers.get('content-type') || '';
  if (contentType.toLowerCase().includes('text/html')) {
    throw new Error(`Server returned HTML error (${res.status}) on ${url}`);
  }

  const text = await res.text();
  if (!text || text.trim().startsWith('<')) {
    throw new Error(`Invalid JSON response received from ${url}`);
  }

  let data: any;
  try {
    data = JSON.parse(text);
  } catch (parseErr: any) {
    throw new Error(`خطأ في تحليل استجابة الخادم: ${text.slice(0, 100)}`);
  }

  if (!res.ok) {
    const extracted = typeof data?.error === 'string'
      ? data.error
      : typeof data?.message === 'string'
      ? data.message
      : typeof data === 'string'
      ? data
      : JSON.stringify(data);
    throw new Error(extracted || `HTTP error ${res.status}`);
  }
  return data as T;
}

export async function checkDbHealth(): Promise<DbHealthStatus> {
  try {
    return await safeFetchJson<DbHealthStatus>('/api/health', undefined, 2, 500);
  } catch (err: any) {
    return {
      status: 'error',
      db: 'Neon PostgreSQL',
      connected: false,
      error: err.message || 'Connection failed',
    };
  }
}

// ==========================================
// ER RECORDS API
// ==========================================
export async function fetchRecordsFromDb(): Promise<ERRecord[]> {
  try {
    const data = await safeFetchJson<{ success: boolean; records: ERRecord[] }>('/api/records', undefined, 3, 600);
    const records = data.records || [];
    try {
      localStorage.setItem('cached_records', JSON.stringify(records));
    } catch (e) {
      // ignore quota errors
    }
    return records;
  } catch (err: any) {
    console.warn('fetchRecordsFromDb fallback due to:', err?.message || err);
    try {
      const cached = localStorage.getItem('cached_records');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      // ignore
    }
    const errText = typeof err === 'string' ? err : (err?.message || (typeof err === 'object' ? JSON.stringify(err) : 'Network error'));
    throw new Error(errText);
  }
}

export async function createRecordInDb(record: Partial<ERRecord>): Promise<ERRecord> {
  const data = await safeMutationJson<{ success: boolean; record: ERRecord }>('/api/records', {
    method: 'POST',
    body: JSON.stringify(record),
  });
  return data.record;
}

export async function bulkImportRecordsToDb(records: Partial<ERRecord>[], importedBy?: string): Promise<number> {
  const data = await safeMutationJson<{ success: boolean; count: number }>('/api/records/bulk', {
    method: 'POST',
    body: JSON.stringify({ records, importedBy }),
  });
  return data.count;
}

export async function updateRecordInDb(record: ERRecord): Promise<ERRecord> {
  const data = await safeMutationJson<{ success: boolean; record: ERRecord }>(`/api/records/${encodeURIComponent(record.id)}`, {
    method: 'PUT',
    body: JSON.stringify(record),
  });
  return data.record;
}

export async function updateDeptInDb(id: string, dept: string, changedBy?: string): Promise<ERRecord> {
  const data = await safeMutationJson<{ success: boolean; record: ERRecord }>(`/api/records/${encodeURIComponent(id)}/dept`, {
    method: 'PATCH',
    body: JSON.stringify({ dept, changedBy }),
  });
  return data.record;
}

export async function transferNowInDb(id: string, transferredBy?: string): Promise<ERRecord> {
  const data = await safeMutationJson<{ success: boolean; record: ERRecord }>(`/api/records/${encodeURIComponent(id)}/transfer-now`, {
    method: 'POST',
    body: JSON.stringify({ transferredBy }),
  });
  return data.record;
}

export async function deleteRecordFromDb(id: string): Promise<void> {
  await safeMutationJson<{ success: boolean }>(`/api/records/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

export async function clearAllRecordsFromDb(): Promise<void> {
  await safeMutationJson<{ success: boolean }>('/api/records', {
    method: 'DELETE',
  });
}

export async function resetDemoRecordsInDb(): Promise<ERRecord[]> {
  const data = await safeMutationJson<{ success: boolean; records: ERRecord[] }>('/api/records/reset', {
    method: 'POST',
  });
  return data.records || [];
}

// ==========================================
// USERS API
// ==========================================
export async function fetchUsersFromDb(): Promise<User[]> {
  try {
    const data = await safeFetchJson<{ success: boolean; users: User[] }>('/api/users', undefined, 3, 600);
    const users = data.users || [];
    try {
      localStorage.setItem('cached_users', JSON.stringify(users));
    } catch (e) {
      // ignore
    }
    return users;
  } catch (err: any) {
    console.warn('fetchUsersFromDb fallback to cached users:', err.message || err);
    try {
      const cached = localStorage.getItem('cached_users');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      // ignore
    }
    return [];
  }
}

export async function createUserInDb(user: Partial<User>): Promise<User> {
  const data = await safeMutationJson<{ success: boolean; user: User }>('/api/users', {
    method: 'POST',
    body: JSON.stringify(user),
  });
  return data.user;
}

export async function updateUserInDb(id: string, updates: Partial<User>): Promise<User> {
  const data = await safeMutationJson<{ success: boolean; user: User }>(`/api/users/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
  return data.user;
}

export async function deleteUserFromDb(id: string): Promise<void> {
  await safeMutationJson<{ success: boolean }>(`/api/users/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

export async function logUserLogin(user: User): Promise<void> {
  try {
    await safeMutationJson<{ success: boolean }>('/api/auth/login-log', {
      method: 'POST',
      body: JSON.stringify({
        username: user.username,
        name: user.name,
        role: user.role,
      }),
    });
  } catch {
    // Non-critical
  }
}

export async function fetchLoginLogs(): Promise<LoginLog[]> {
  try {
    const data = await safeFetchJson<{ success: boolean; logs: LoginLog[] }>('/api/users/login-logs', undefined, 2, 500);
    return data.logs || [];
  } catch (err) {
    return [];
  }
}

// ==========================================
// BEDS API
// ==========================================
export async function fetchBedsFromDb(): Promise<HospitalBed[]> {
  try {
    const data = await safeFetchJson<{ success: boolean; beds: HospitalBed[] }>('/api/beds', undefined, 3, 600);
    const beds = data.beds || [];
    try {
      localStorage.setItem('cached_beds', JSON.stringify(beds));
    } catch (e) {
      // ignore
    }
    return beds;
  } catch (err: any) {
    console.warn('fetchBedsFromDb fallback to cached beds:', err.message || err);
    try {
      const cached = localStorage.getItem('cached_beds');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      // ignore
    }
    return [];
  }
}

export async function updateBedStatusInDb(id: string, status: string, notes?: string): Promise<HospitalBed> {
  const data = await safeMutationJson<{ success: boolean; bed: HospitalBed }>(`/api/beds/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify({ status, notes }),
  });
  return data.bed;
}

export async function assignBedToPatientInDb(bedId: string, recordId: string, assignedBy?: string): Promise<{ bedNumber: string; dept: string }> {
  return await safeMutationJson<{ success: boolean; bedNumber: string; dept: string }>('/api/beds/assign', {
    method: 'POST',
    body: JSON.stringify({ bedId, recordId, assignedBy }),
  });
}

export const assignBedInDb = assignBedToPatientInDb;

export async function completeTransferInDb(
  recordId: string,
  actualTime: string,
  reason?: string,
  notes?: string,
  changedBy?: string
): Promise<ERRecord> {
  const data = await safeMutationJson<{ success: boolean; record: ERRecord }>(`/api/records/${encodeURIComponent(recordId)}`, {
    method: 'PATCH',
    body: JSON.stringify({
      actual: actualTime,
      reason: reason || null,
      notes: notes || undefined,
      status: 'Transferred',
      changedBy: changedBy || undefined,
    }),
  });
  return data.record;
}

// ==========================================
// AUDIT LOGS API
// ==========================================
export async function fetchAuditLogsFromDb(
  limit: number = 200,
  options?: { user?: string; action?: string; category?: string; search?: string }
): Promise<AuditLogItem[]> {
  try {
    const params = new URLSearchParams();
    params.set('limit', String(limit));
    if (options?.user && options.user !== 'ALL') params.set('user', options.user);
    if (options?.action && options.action !== 'ALL') params.set('action', options.action);
    if (options?.category && options.category !== 'ALL') params.set('category', options.category);
    if (options?.search && options.search.trim()) params.set('search', options.search.trim());

    const data = await safeFetchJson<{ success: boolean; logs: AuditLogItem[] }>(
      `/api/audit-logs?${params.toString()}`,
      undefined,
      2,
      500
    );
    const logs = data.logs || [];
    if (!options?.user && !options?.action && !options?.search) {
      try {
        localStorage.setItem(`cached_audit_logs`, JSON.stringify(logs));
      } catch (e) {
        // ignore
      }
    }
    return logs;
  } catch (err: any) {
    console.warn('fetchAuditLogsFromDb using cached logs:', err.message || err);
    try {
      const cached = localStorage.getItem(`cached_audit_logs`);
      if (cached) return JSON.parse(cached);
    } catch (e) {
      // ignore
    }
    return [];
  }
}

export async function fetchUserAuditStatsFromDb(): Promise<UserAuditStat[]> {
  try {
    const data = await safeFetchJson<{ success: boolean; stats: UserAuditStat[] }>(
      '/api/audit-logs/user-stats',
      undefined,
      2,
      500
    );
    return data.stats || [];
  } catch (err: any) {
    console.warn('fetchUserAuditStatsFromDb error:', err.message || err);
    return [];
  }
}

// ==========================================
// CASE COMMENTS API
// ==========================================
export async function fetchCommentsFromDb(recordId: string): Promise<CaseComment[]> {
  try {
    const data = await safeFetchJson<{ success: boolean; comments: CaseComment[] }>(
      `/api/records/${encodeURIComponent(recordId)}/comments`,
      undefined,
      2,
      400
    );
    return data.comments || [];
  } catch (err) {
    return [];
  }
}

export async function addCommentToDb(recordId: string, userName: string, userRole: string, text: string): Promise<CaseComment> {
  const data = await safeMutationJson<{ success: boolean; comment: CaseComment }>(
    `/api/records/${encodeURIComponent(recordId)}/comments`,
    {
      method: 'POST',
      body: JSON.stringify({ userName, userRole, text }),
    }
  );
  return data.comment;
}

// ==========================================
// ADVANCED ANALYTICS
// ==========================================
export interface AdvancedAnalyticsData {
  hourlyHeatmap: Array<{ hour: number; label: string; cases: number; avgDelay: number; criticalCases: number }>;
  deptStats: Array<{ name: string; total: number; completed: number; avgDelay: number; complianceRate: number }>;
  rawBeds: Array<{ dept: string; status: string; count: string }>;
}

export async function fetchAdvancedAnalytics(): Promise<AdvancedAnalyticsData> {
  try {
    const data = await safeFetchJson<AdvancedAnalyticsData & { success: boolean }>(
      '/api/analytics/advanced',
      undefined,
      2,
      500
    );
    try {
      localStorage.setItem('cached_analytics', JSON.stringify(data));
    } catch (e) {
      // ignore
    }
    return data;
  } catch (err: any) {
    console.warn('fetchAdvancedAnalytics fallback to cached analytics:', err.message || err);
    try {
      const cached = localStorage.getItem('cached_analytics');
      if (cached) return JSON.parse(cached);
    } catch (e) {
      // ignore
    }
    return {
      hourlyHeatmap: [],
      deptStats: [],
      rawBeds: [],
    };
  }
}
