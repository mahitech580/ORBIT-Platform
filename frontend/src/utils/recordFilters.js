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

export function filterInstances(instances, projects = [], query = '') {
  const records = Array.isArray(instances)
    ? instances.filter(item => item && typeof item === 'object' && !Array.isArray(item))
    : [];
  const projectRecords = Array.isArray(projects) ? projects : [];
  const needle = String(query ?? '').trim().toLocaleLowerCase();
  if (!needle) return records;
  return records.filter(instance => {
    const project = projectRecords.find(item => item && String(item.id) === String(instance.project_id));
    const projectName = instance.project_name || project?.name || '';
    return [
      instance.id, instance.name, instance.project_id, projectName,
      instance.instance_type, instance.status, instance.deployment_id
    ].some(value => searchable(value).includes(needle));
  });
}
