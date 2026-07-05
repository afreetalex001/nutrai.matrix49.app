import { ApiError } from '@/lib/api-error';

type ApiRequestOptions = Omit<RequestInit, 'body'> & {
  token?: string | null;
  body?: unknown;
};

async function parseResponseBody(response: Response) {
  const contentType = response.headers.get('content-type') || '';
  if (response.status === 204) return null;

  if (contentType.includes('application/json')) {
    return response.json();
  }

  const text = await response.text();
  return text || null;
}

async function request<T>(url: string, options: ApiRequestOptions = {}): Promise<T> {
  const { token, body, headers, ...init } = options;

  const requestHeaders = new Headers(headers);
  if (token) requestHeaders.set('Authorization', `Bearer ${token}`);

  const hasBody = body !== undefined && body !== null;
  if (hasBody && !requestHeaders.has('Content-Type') && !(body instanceof FormData)) {
    requestHeaders.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, {
    ...init,
    headers: requestHeaders,
    body: hasBody ? (body instanceof FormData ? body : JSON.stringify(body)) : undefined,
  });

  const data = await parseResponseBody(response);

  if (!response.ok) {
    const message =
      data && typeof data === 'object' && 'error' in data
        ? String((data as { error?: unknown }).error)
        : `Request failed with status ${response.status}`;
    throw new ApiError(message, response.status, data);
  }

  return data as T;
}

export const apiClient = {
  get: <T>(url: string, options?: ApiRequestOptions) =>
    request<T>(url, { ...options, method: 'GET' }),
  post: <T>(url: string, body?: unknown, options?: ApiRequestOptions) =>
    request<T>(url, { ...options, method: 'POST', body }),
  put: <T>(url: string, body?: unknown, options?: ApiRequestOptions) =>
    request<T>(url, { ...options, method: 'PUT', body }),
  patch: <T>(url: string, body?: unknown, options?: ApiRequestOptions) =>
    request<T>(url, { ...options, method: 'PATCH', body }),
  delete: <T>(url: string, options?: ApiRequestOptions) =>
    request<T>(url, { ...options, method: 'DELETE' }),
};
