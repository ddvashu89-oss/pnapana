import { getApiUrl } from './api';

export function getAdminToken(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  const stored = localStorage.getItem('user');
  try {
    return stored ? JSON.parse(stored).token : undefined;
  } catch {
    return undefined;
  }
}

// Wraps fetch for admin endpoints: attaches the bearer token, and bounces to
// /login on an expired/invalid session instead of leaving the page stuck on
// an infinite loading spinner with no explanation.
export async function adminFetch(endpointOrUrl: string, options: RequestInit = {}): Promise<Response> {
  const url = endpointOrUrl.startsWith('http') ? endpointOrUrl : getApiUrl(endpointOrUrl);
  const token = getAdminToken();
  const headers = new Headers(options.headers || {});
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const res = await fetch(url, {
    ...options,
    headers
  });

  if (res.status === 401 && typeof window !== 'undefined') {
    localStorage.removeItem('user');
    window.location.href = '/login';
    throw new Error('Session expired');
  }

  return res;
}

export async function adminFetchJson<T = any>(url: string, options: RequestInit = {}): Promise<T> {
  const res = await adminFetch(url, options);
  const data = await res.json();
  if (data.status !== 'success') {
    throw new Error(data.message || 'Request failed');
  }
  return data;
}
