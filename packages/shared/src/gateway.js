export const API_URL = (typeof __FITFORGE_API_URL__ !== 'undefined' ? __FITFORGE_API_URL__ : '').replace(/\/+$/, '');
export const AUTH_REQUIRED = typeof __FITFORGE_REQUIRE_AUTH__ !== 'undefined' && __FITFORGE_REQUIRE_AUTH__;

// Os bundles federados são independentes e executam na mesma janela.
const authSlot = Symbol.for('fitforge.gateway.authorization');

export function setGatewayCredentials(username, password) {
  const bytes = new TextEncoder().encode(`${username}:${password}`);
  globalThis[authSlot] = `Basic ${btoa(String.fromCharCode(...bytes))}`;
}

export function clearGatewayCredentials() {
  delete globalThis[authSlot];
}

export async function gatewayRequest(path, { method = 'GET', body, signal } = {}) {
  if (!path.startsWith('/api/') || !API_URL) {
    throw new Error('Configure o endereço do API Gateway.');
  }
  const headers = { Accept: 'application/json' };
  if (globalThis[authSlot]) headers.Authorization = globalThis[authSlot];
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    credentials: 'omit',
    signal: signal ?? AbortSignal.timeout(25000)
  });
  if (!response.ok) {
    const details = await response.json().catch(() => ({}));
    const advice = response.status === 401 ? 'Confira o usuário e a senha do FitForge.' : `A API respondeu HTTP ${response.status}.`;
    throw Object.assign(new Error(details.message || advice), { status: response.status });
  }
  return response.status === 204 ? null : response.json();
}
