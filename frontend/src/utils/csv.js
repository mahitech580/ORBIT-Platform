const FORMULA_PREFIX = /^[\u0000-\u0020]*[=+\-@]/;

/** Escape one CSV cell and neutralize spreadsheet formulas before quoting. */
export function csvCell(value) {
  let text = String(value ?? '');
  if (FORMULA_PREFIX.test(text)) text = "'" + text;
  if (/[",\r\n]/.test(text)) return '"' + text.replace(/"/g, '""') + '"';
  return text;
}

/** Serialize a header and rows as UTF-8-friendly, CRLF-terminated CSV text. */
export function serializeCsv(header, rows) {
  return '\uFEFF' + [header, ...rows]
    .map(row => row.map(csvCell).join(','))
    .join('\r\n') + '\r\n';
}
