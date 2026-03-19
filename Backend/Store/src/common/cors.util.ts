const STATIC_ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:4000',
  'https://www.thenexustore.com',
  'https://admin.thenexustore.com',
  'https://nexus-store-vpq8.vercel.app',
  'https://nexus-store-eight.vercel.app',
] as const;

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0', '::1', '[::1]']);

function parseOrigin(origin: string): URL | null {
  try {
    return new URL(origin);
  } catch {
    return null;
  }
}

function isPrivateIpv4Host(hostname: string): boolean {
  const segments = hostname.split('.');
  if (segments.length !== 4) {
    return false;
  }

  const octets = segments.map((segment) => Number(segment));
  if (octets.some((octet) => Number.isNaN(octet) || octet < 0 || octet > 255)) {
    return false;
  }

  const [first, second] = octets;

  if (first === 10 || first === 127) {
    return true;
  }

  if (first === 192 && second === 168) {
    return true;
  }

  if (first === 172 && second >= 16 && second <= 31) {
    return true;
  }

  return first === 169 && second === 254;
}

function isDevelopmentHost(hostname: string): boolean {
  const normalized = hostname.trim().toLowerCase();
  if (!normalized) {
    return false;
  }

  return (
    LOOPBACK_HOSTS.has(normalized) ||
    normalized.endsWith('.local') ||
    isPrivateIpv4Host(normalized)
  );
}

function getConfiguredOrigins(): Set<string> {
  const envOrigins = (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  return new Set<string>(
    [
      ...STATIC_ALLOWED_ORIGINS,
      process.env.FRONTEND_URL ?? '',
      process.env.ADMIN_URL ?? '',
      ...envOrigins,
    ].filter(Boolean),
  );
}

export function isAllowedCorsOrigin(origin?: string | null): boolean {
  if (!origin) {
    return true;
  }

  if (getConfiguredOrigins().has(origin)) {
    return true;
  }

  if (process.env.NODE_ENV === 'production') {
    return false;
  }

  const parsed = parseOrigin(origin);
  if (!parsed) {
    return false;
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return false;
  }

  return isDevelopmentHost(parsed.hostname);
}

export function corsOriginDelegate(
  origin: string | undefined,
  callback: (error: Error | null, allow?: boolean) => void,
) {
  if (isAllowedCorsOrigin(origin)) {
    callback(null, true);
    return;
  }

  callback(new Error(`Not allowed by CORS: ${origin}`));
}
