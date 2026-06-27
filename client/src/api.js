const BASE = '/api';

async function request(method, path, body) {
  // Mutations can't work offline. Fail fast with a friendly message rather than a
  // raw network error. GETs still go through — the service worker serves cached
  // quizzes / flashcards / chats.
  if (method !== 'GET' && typeof navigator !== 'undefined' && navigator.onLine === false) {
    const e = new Error("You're offline. New quizzes and changes need a connection — but your past quizzes, flashcards and chats still work.");
    e.status = 0;
    e.offline = true;
    throw e;
  }

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
    e.data = err;
    // Session expired — notify AuthContext so it redirects to login cleanly.
    // Skip auth paths to allow login/register error messages to surface normally.
    if (res.status === 401 && !path.startsWith('/auth/') && path !== '/me') {
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

// Bulk import: one new unit per file, named from the filename. Returns { created: [{unit, document}] }.
export async function bulkImportUnits(courseId, files) {
  const form = new FormData();
  for (const f of files) form.append('files', f);
  const res = await fetch(`${BASE}/courses/${courseId}/bulk-import`, {
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
