export const api = async <T,>(url: string, options: RequestInit = {}, token?: string): Promise<T> => {
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const metaEnv = (import.meta as ImportMeta & { env?: Record<string, string | boolean> }).env;
  const directApiBase = metaEnv?.DEV ? String(metaEnv.VITE_API_URL ?? 'http://192.168.0.106:4000') : '';
  const requestUrl = isFormData && !url.startsWith('http') ? `${directApiBase}${url}` : url;

  const response = await fetch(requestUrl, {
    ...options,
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(payload.error ?? 'Server error');
  }

  if (response.status === 204) return {} as T;
  return (await response.json()) as T;
};
