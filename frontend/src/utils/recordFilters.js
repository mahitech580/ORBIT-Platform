function searchable(value) {
  return String(value ?? '').toLocaleLowerCase();
}

export function filterTeams(teams, query = '') {
  const records = Array.isArray(teams)
    ? teams.filter(item => item && typeof item === 'object' && !Array.isArray(item))
    : [];
  const needle = String(query ?? '').trim().toLocaleLowerCase();
  if (!needle) return records;
  return records.filter(team => [
    team.id, team.name, team.description, team.owner_id, team.owner_name
  ].some(value => searchable(value).includes(needle)));
}

export function filterInstances(instances, projects = [], query = '', filters = {}) {
  const records = Array.isArray(instances)
    ? instances.filter(item => item && typeof item === 'object' && !Array.isArray(item))
    : [];
  const projectRecords = Array.isArray(projects) ? projects : [];
  const needle = String(query ?? '').trim().toLocaleLowerCase();
  const status = String(filters.status ?? 'all');
  const projectId = String(filters.projectId ?? 'all');
  const instanceType = String(filters.instanceType ?? 'all');
  return records.filter(instance => {
    if (status !== 'all' && String(instance.status ?? '') !== status) return false;
    if (projectId !== 'all' && String(instance.project_id ?? '') !== projectId) return false;
    if (instanceType !== 'all' && String(instance.instance_type ?? '') !== instanceType) return false;
    if (!needle) return true;
    const project = projectRecords.find(item => item && String(item.id) === String(instance.project_id));
    const projectName = instance.project_name || project?.name || '';
    return [
      instance.id, instance.name, instance.project_id, projectName,
      instance.instance_type, instance.status, instance.deployment_id
    ].some(value => searchable(value).includes(needle));
  });
}


function compareText(left, right) {
  return String(left ?? '').localeCompare(String(right ?? ''), undefined, { sensitivity: 'base', numeric: true });
}

function timestampOrZero(value) {
  const timestamp = Date.parse(value || '');
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function compareByMode(left, right, mode, labelField) {
  if (mode === 'name-desc') return compareText(right[labelField], left[labelField]) || compareText(left.id, right.id);
  if (mode === 'oldest') return timestampOrZero(left.created_at) - timestampOrZero(right.created_at) || compareText(left.id, right.id);
  if (mode === 'status') return compareText(left.status, right.status) || compareText(left[labelField], right[labelField]) || compareText(left.id, right.id);
  if (mode === 'newest') return timestampOrZero(right.created_at) - timestampOrZero(left.created_at) || compareText(left.id, right.id);
  return compareText(left[labelField], right[labelField]) || compareText(left.id, right.id);
}

/** Return a deterministically sorted copy of the supplied team list. */
export function sortTeams(teams, mode = 'name-asc') {
  const records = Array.isArray(teams)
    ? teams.filter(item => item && typeof item === 'object' && !Array.isArray(item))
    : [];
  const supported = new Set(['name-asc', 'name-desc', 'newest', 'oldest', 'status', 'owner']);
  const sortMode = supported.has(mode) ? mode : 'name-asc';
  return [...records].sort((left, right) => sortMode === 'owner' ? compareText(left.owner_name || left.owner_id, right.owner_name || right.owner_id) || compareText(left.id, right.id) : compareByMode(left, right, sortMode, 'name'));
}

/** Return a deterministically sorted copy of the supplied instance list. */
export function sortInstances(instances, mode = 'newest') {
  const records = Array.isArray(instances)
    ? instances.filter(item => item && typeof item === 'object' && !Array.isArray(item))
    : [];
  const supported = new Set(['name-asc', 'name-desc', 'newest', 'oldest', 'status']);
  const sortMode = supported.has(mode) ? mode : 'newest';
  return [...records].sort((left, right) => compareByMode(left, right, sortMode, 'name'));
}
