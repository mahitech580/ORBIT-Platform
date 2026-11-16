/** Validate required text before sending a form payload to the API. */
export function requiredTextError(value, label = 'Value') {
  if (typeof value !== 'string' || !value.trim()) return label + ' is required.';
  return '';
}
