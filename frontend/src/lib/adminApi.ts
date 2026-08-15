export function getAdminToken(): string | undefined {
  const stored = localStorage.getItem('user');
  return stored ? JSON.parse(stored).token : undefined;
}

// Wraps fetch for admin endpoints: attaches the bearer token, and bounces to
// /login on an expired/invalid session instead of leaving the page stuck on
// an infinite loading spinner with no explanation.
export async function adminFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getAdminToken();
  const res = await fetch(url, {
    ...options,
    headers: { ...(options.headers || {}), 'Authorization': `Bearer ${token}` }
  });

  if (res.status === 401) {
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
