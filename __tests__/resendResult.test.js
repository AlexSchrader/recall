import { describe, it, expect } from 'vitest';
import { unwrapResend } from '../server/src/services/resendResult.js';

describe('unwrapResend — surface silent Resend failures', () => {
  it('returns data on success', () => {
    expect(unwrapResend({ data: { id: 'abc' }, error: null })).toEqual({ id: 'abc' });
  });

  it('throws when Resend reports an error (e.g. 403 unverified domain)', () => {
    expect(() => unwrapResend({ data: null, error: { message: 'You can only send testing emails to your own address' } }))
      .toThrow(/Resend send failed: You can only send testing emails/);
  });

  it('falls back to the error name when there is no message', () => {
    expect(() => unwrapResend({ error: { name: 'validation_error' } }))
      .toThrow(/Resend send failed: validation_error/);
  });

  it('is safe on a null/empty result', () => {
    expect(unwrapResend(null)).toBeUndefined();
  });
});
