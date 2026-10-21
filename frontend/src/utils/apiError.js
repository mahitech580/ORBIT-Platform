/**
 * Resolve a readable API error and append a server request ID when available.
 * Only accept the format emitted by ORBIT's server-generated correlation IDs.
 */
export function getApiErrorMessage(error, fallback = 'The request could not be completed.') {
  const candidate = error?.response?.data?.error;
  const message = typeof candidate === 'string' && candidate.trim()
    ? candidate.trim()
    : fallback;

  const headers = error?.response?.headers;
  const requestId = typeof headers?.get === 'function'
    ? headers.get('x-request-id')
    : headers?.['x-request-id'] || headers?.['X-Request-ID'];

  return typeof requestId === 'string' && /^[a-f0-9]{32}$/i.test(requestId)
    ? message + ' (Reference: ' + requestId + ')'
    : message;
}
