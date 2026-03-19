const LOCALE_PREFIX_PATTERN = /^\/(?:en|es)(?=\/|$)/i;

function normalizePathname(pathname: string | null | undefined): string {
  const raw = (pathname || "/").trim() || "/";
  const withoutLocale = raw.replace(LOCALE_PREFIX_PATTERN, "") || "/";
  return withoutLocale.startsWith("/") ? withoutLocale : `/${withoutLocale}`;
}

export function isAuthScreenPath(pathname: string | null | undefined): boolean {
  const normalized = normalizePathname(pathname);

  return (
    normalized === "/login" ||
    normalized === "/register" ||
    normalized === "/forgot-password" ||
    normalized === "/reset-password"
  );
}
