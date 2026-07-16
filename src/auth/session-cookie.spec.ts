// @ts-nocheck -- Jest globals are provided at runtime by the existing test dependency.
import { getSessionCookieClearOptions, getSessionCookieOptions } from './session-cookie';

function config(values: Record<string, string> = {}) {
  return { get: (key: string, fallback?: string) => values[key] ?? fallback };
}

describe('session cookie', () => {
  it('uses a secure cross-site cookie in production by default', () => {
    expect(getSessionCookieOptions(config({ NODE_ENV: 'production' }) as never)).toMatchObject({
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      path: '/api',
    });
  });

  it('uses lax cookies for local development', () => {
    expect(getSessionCookieOptions(config({ NODE_ENV: 'development' }) as never)).toMatchObject({
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
    });
  });

  it('clears the cookie with the same scope and without a max age', () => {
    const options = getSessionCookieClearOptions(config({ NODE_ENV: 'production' }) as never);
    expect(options.maxAge).toBeUndefined();
    expect(options).toMatchObject({ secure: true, sameSite: 'none', path: '/api' });
  });
});
