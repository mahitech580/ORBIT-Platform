const FORMULA_PREFIX = /^[\u0000-\u0020]*[=+\-@]/;

function csvCell(value) {
  let text = String(value ?? '');
  if (FORMULA_PREFIX.test(text)) text = "'" + text;
  if (/[",\r\n]/.test(text)) return '"' + text.replace(/"/g, '""') + '"';
  return text;
}

export function buildInstanceCsv(instances, projects = []) {
  const records = Array.isArray(instances)
    ? instances.filter(item => item && typeof item === 'object' && !Array.isArray(item))
    : [];
  const projectRecords = Array.isArray(projects) ? projects : [];
  const header = ['Instance ID', 'Name', 'Project ID', 'Project', 'Instance Type', 'Status', 'Deployment ID', 'Created At'];
  const rows = records.map(instance => {
    const project = projectRecords.find(item => item && String(item.id) === String(instance.project_id));
    return [
      instance.id, instance.name, instance.project_id,
      instance.project_name || project?.name || 'Unknown project',
      instance.instance_type, instance.status, instance.deployment_id, instance.created_at
    ];
  });
  return '\uFEFF' + [header, ...rows].map(row => row.map(csvCell).join(',')).join('\r\n') + '\r\n';
}
