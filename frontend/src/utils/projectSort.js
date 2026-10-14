const SORTERS = Object.freeze({
  name: (a, b) => String(a.name || '').localeCompare(String(b.name || ''), undefined, { sensitivity: 'base' }),
  'updated-desc': (a, b) => dateValue(b.updated_at) - dateValue(a.updated_at) || numericId(a) - numericId(b),
  'created-desc': (a, b) => dateValue(b.created_at) - dateValue(a.created_at) || numericId(a) - numericId(b),
  'created-asc': (a, b) => dateValue(a.created_at) - dateValue(b.created_at) || numericId(a) - numericId(b),
  'status-name': (a, b) => String(a.status || '').localeCompare(String(b.status || '')) || String(a.name || '').localeCompare(String(b.name || ''))
});

function dateValue(value) {
  if (!value) return 0;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function numericId(project) {
  const id = Number(project.id);
  return Number.isFinite(id) ? id : 0;
}

/** Return a newly sorted project list, leaving the caller's array untouched. */
export function sortProjects(projects, sortBy = 'updated-desc') {
  const records = Array.isArray(projects)
    ? projects.filter(project => project && typeof project === 'object' && !Array.isArray(project))
    : [];
  const comparator = SORTERS[sortBy] || SORTERS['updated-desc'];
  return records.map((project, index) => ({ project, index }))
    .sort((left, right) => comparator(left.project, right.project) || left.index - right.index)
    .map(item => item.project);
}
