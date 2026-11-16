const RESOURCE_KEYS = ['projects', 'deployments', 'teams', 'instances'];

/**
 * Keep successful resource responses when another workspace endpoint fails.
 * A fulfilled response with an invalid collection is treated as a failure so
 * malformed API data never clears a previously loaded workspace collection.
 */
export function collectWorkspaceRefresh(results) {
  const updates = {};
  const failures = [];
  const settled = Array.isArray(results) ? results : [];

  RESOURCE_KEYS.forEach((resource, index) => {
    const result = settled[index];
    if (result?.status !== 'fulfilled') {
      failures.push({
        resource,
        error: result?.reason || new Error('No response was returned for ' + resource + '.')
      });
      return;
    }

    const collection = result.value?.data?.[resource];
    if (!Array.isArray(collection)) {
      failures.push({
        resource,
        error: new Error('The ' + resource + ' response did not contain a valid collection.')
      });
      return;
    }
    updates[resource] = collection;
  });

  return { updates, failures };
}
