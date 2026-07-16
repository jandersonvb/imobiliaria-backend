import { ConfigService } from '@nestjs/config';
import { CookieOptions } from 'express';

export const DEFAULT_SESSION_COOKIE_NAME = 'imobconnect_session';

export function getSessionCookieName(config: ConfigService) {
  return config.get<string>('SESSION_COOKIE_NAME', DEFAULT_SESSION_COOKIE_NAME);
}

export function getSessionCookieOptions(config: ConfigService): CookieOptions {
  const production = config.get<string>('NODE_ENV') === 'production';
  const configuredSameSite = config.get<string>('SESSION_COOKIE_SAME_SITE');
  const sameSite = configuredSameSite === 'strict' || configuredSameSite === 'lax' || configuredSameSite === 'none'
    ? configuredSameSite
    : production ? 'none' : 'lax';
  const domain = config.get<string>('SESSION_COOKIE_DOMAIN')?.trim() || undefined;

  return {
    httpOnly: true,
    secure: production || sameSite === 'none',
    sameSite,
    domain,
    path: '/api',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };
}

export function getSessionCookieClearOptions(config: ConfigService): CookieOptions {
  const options = getSessionCookieOptions(config);
  delete options.maxAge;
  return options;
}
