export function getApiBaseUrl(): string {
  const configuredBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/pnapana/backend/api';

  if (typeof window !== 'undefined') {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (!isLocal) {
      // In production (live domain like pnapana.live), always use relative URL
      return '/backend/api';
    }

    // The PHP dev server listens on IPv4. On some systems, `localhost` resolves
    // to IPv6 (::1), so normalize local API URLs to avoid browser fetch failures.
    try {
      const apiUrl = new URL(configuredBase);
      if (apiUrl.hostname === 'localhost') apiUrl.hostname = '127.0.0.1';
      return apiUrl.toString().replace(/\/+$/, '');
    } catch {
      // Keep relative or otherwise non-standard configured URLs unchanged below.
    }
  }

  return configuredBase.replace(/\/+$/, '');
}

export const API_BASE_URL = getApiBaseUrl();

export function getApiUrl(endpoint: string): string {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  const base = getApiBaseUrl();
  return `${base}/${cleanEndpoint}`;
}

export async function authFetch(endpoint: string, options: RequestInit = {}): Promise<Response> {
  const url = endpoint.startsWith('http') ? endpoint : getApiUrl(endpoint);
  let token = '';

  if (typeof window !== 'undefined') {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        token = user?.token || '';
      } catch {
        // ignore parse errors
      }
    }
  }

  const headers = new Headers(options.headers || {});
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(url, {
    ...options,
    headers,
  });

  if (res.status === 401 && typeof window !== 'undefined') {
    // Session expired or invalid
    localStorage.removeItem('user');
    if (!window.location.pathname.includes('/login')) {
      window.location.href = '/login';
    }
  }

  return res;
}
