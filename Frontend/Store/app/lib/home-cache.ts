const memoryCache = new Map<string, { timestamp: number; data: unknown }>();

export async function getCachedData<T>(
  key: string,
  ttlMs: number,
  loader: () => Promise<T>,
): Promise<T> {
  const now = Date.now();
  const inMemory = memoryCache.get(key);

  if (inMemory && now - inMemory.timestamp < ttlMs) {
    return inMemory.data as T;
  }

  if (typeof window !== 'undefined') {
    const stored = sessionStorage.getItem(key);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as { timestamp: number; data: T };
        if (now - parsed.timestamp < ttlMs) {
          memoryCache.set(key, parsed);
          return parsed.data;
        }
      } catch {
        sessionStorage.removeItem(key);
      }
    }
  }

  const freshData = await loader();
  const record = { timestamp: now, data: freshData };
  memoryCache.set(key, record);

  if (typeof window !== 'undefined') {
    sessionStorage.setItem(key, JSON.stringify(record));
  }

  return freshData;
}
