// The Resend SDK resolves its send promise with `{ data, error }` instead of
// rejecting on an API error (e.g. a 403 when the sending domain isn't verified).
// Left unchecked, a failed send looks exactly like a successful one — which is
// how feedback emails silently died for days (QA finding SEV-1). Convert a
// populated `error` into a thrown Error so callers' `.catch` actually fires and
// the real reason lands in the logs.
export function unwrapResend(result) {
  const { data, error } = result ?? {};
  if (error) {
    throw new Error(`Resend send failed: ${error.message || error.name || 'unknown error'}`);
  }
  return data;
}
