/**
 * Cliente HTTP Centralizado para o Frontend.
 * Fornece timeout, extração de Request-ID, tratamento uniforme de erros e AbortSignal.
 */
export async function httpClient(url, options = {}) {
  const { timeout = 15000, signal, headers = {}, ...customConfig } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  // Se houver um signal externo passado (ex: de um AbortController do React Hook), encadeia o cancelamento
  if (signal) {
    signal.addEventListener('abort', () => controller.abort());
  }

  const token = typeof window !== 'undefined' ? localStorage.getItem('bi_auth_token') : null;

  const config = {
    method: options.body ? 'POST' : 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...headers
    },
    signal: controller.signal,
    ...customConfig
  };

  try {
    const response = await fetch(url, config);
    clearTimeout(timeoutId);

    const requestId = response.headers.get('X-Request-ID') || 'unknown';

    if (!response.ok) {
      if (response.status === 401) {
        // Credenciais expiradas ou inválidas
        if (typeof window !== 'undefined') {
          localStorage.removeItem('bi_auth_token');
          localStorage.removeItem('bi_auth_user');
          window.dispatchEvent(new Event('auth_logout'));
        }
      }

      let errorData;
      try {
        errorData = await response.json();
      } catch (e) {
        errorData = { error: { message: response.statusText } };
      }

      const err = new Error(errorData.error?.message || 'HTTP Request failed');
      err.status = response.status;
      err.code = errorData.error?.code || 'HTTP_ERROR';
      err.requestId = requestId;
      throw err;
    }

    const data = await response.json();
    return {
      data,
      requestId
    };
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      const abortErr = new Error('Request canceled by user or timeout.');
      abortErr.code = 'REQUEST_CANCELED';
      throw abortErr;
    }
    throw error;
  }
}
