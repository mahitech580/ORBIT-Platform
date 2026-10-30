function readAuthorizationHeader(headers) {
  if (!headers || typeof headers !== 'object') return null;
  if (typeof headers.get === 'function') {
    const value = headers.get('Authorization');
    if (value !== undefined && value !== null) return value;
  }
  const key = Object.keys(headers).find(name => name.toLowerCase() === 'authorization');
  return key ? headers[key] : null;
}

/** Only let a 401 from the currently stored bearer token end the active session. */
export function isCurrentBearerRequest(headers, currentToken) {
  if (typeof currentToken !== 'string' || !currentToken) return false;
  const authorization = readAuthorizationHeader(headers);
  return typeof authorization === 'string' && authorization.trim() === 'Bearer ' + currentToken;
}
