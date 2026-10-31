/** Count deployment records without silently treating unknown states as pending. */
export function summarizeDeploymentStatuses(deployments) {
  const records = Array.isArray(deployments)
    ? deployments.filter(item => item && typeof item === 'object' && !Array.isArray(item))
    : [];
  const summary = { total: records.length, completed: 0, failed: 0, pending: 0, other: 0 };

  for (const deployment of records) {
    const status = String(deployment.status ?? '').trim().toLowerCase();
    if (status === 'completed') summary.completed += 1;
    else if (status === 'failed') summary.failed += 1;
    else if (status === 'pending' || status === 'in-progress') summary.pending += 1;
    else summary.other += 1;
  }
  return summary;
}
