export function createSessionRestorer<T>(url: string): () => Promise<T | null> {
  let pending: Promise<T | null> | null = null;

  return () => {
    if (!pending) {
      pending = fetch(url, {
        method: 'POST',
        credentials: 'include',
      })
        .then(async (response) => (response.ok ? ((await response.json()) as T) : null))
        .finally(() => {
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
