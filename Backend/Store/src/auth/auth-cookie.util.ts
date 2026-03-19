import { CookieOptions } from 'express';

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function isProductionEnvironment() {
  return (process.env.NODE_ENV ?? '').toLowerCase() === 'production';
}

function getCookieDomain() {
  const domain = process.env.COOKIE_DOMAIN?.trim();
  return domain ? domain : undefined;
}

function buildBaseCookieOptions(httpOnly: boolean): CookieOptions {
  const isProduction = isProductionEnvironment();
  const domain = getCookieDomain();

  return {
    httpOnly,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    path: '/',
    ...(domain ? { domain } : {}),
  };
}

export function buildAuthCookieOptions(): CookieOptions {
  return {
    ...buildBaseCookieOptions(true),
    maxAge: ONE_WEEK_MS,
  };
}

export function buildAuthCookieClearOptions(): CookieOptions {
  return buildBaseCookieOptions(true);
}

export function buildCsrfCookieOptions(): CookieOptions {
  return buildBaseCookieOptions(false);
}

export function buildCsrfCookieClearOptions(): CookieOptions {
  return buildBaseCookieOptions(false);
}
