export function createSessionRestorer<T>(url: string, timeoutMs = 10_000): () => Promise<T | null> {
  let pending: Promise<T | null> | null = null;

  return () => {
    if (!pending) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      pending = fetch(url, {
        method: 'POST',
        credentials: 'include',
        signal: controller.signal,
      })
        .then(async (response) => (response.ok ? ((await response.json()) as T) : null))
        .catch((error: unknown) => {
          if (
            typeof error === 'object' &&
            error &&
            'name' in error &&
            error.name === 'AbortError'
          ) {
            return null;
          }
          throw error;
        })
        .finally(() => {
          clearTimeout(timeout);
          pending = null;
        });
    }
    return pending;
  };
}

export function createAuthRevisionGuard() {
  let current = 0;

  return {
    capture: () => current,
    advance: () => {
      current += 1;
      return current;
    },
    isCurrent: (revision: number) => revision === current,
  };
}
