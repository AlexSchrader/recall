const BASE = '/api';

async function request(method, path, body) {
  const opts = { method, credentials: 'include' };
  if (body !== undefined) {
    opts.headers = { 'Content-Type': 'application/json' };
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(BASE + path, opts);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    const e = new Error(err.error || res.statusText);
    e.status = res.status;
    // Session expired — notify AuthContext so it redirects to login cleanly.
    // Skip auth paths to allow login/register error messages to surface normally.
    if (res.status === 401 && !path.startsWith('/auth/')) {
      window.dispatchEvent(new CustomEvent('auth:expired'));
    }
    throw e;
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  get: (path) => request('GET', path),
  post: (path, body) => request('POST', path, body),
  put: (path, body) => request('PUT', path, body),
  delete: (path) => request('DELETE', path),
};

export async function uploadDocument(unitId, file) {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${BASE}/units/${unitId}/documents`, {
    method: 'POST',
    body: form,
    credentials: 'include',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}
