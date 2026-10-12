import React, { useCallback, useEffect, useState } from 'react';

export default function Metrics({ projects, api }) {
  const [selectedProject, setSelectedProject] = useState(null);
  const [metrics, setMetrics] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!selectedProject && projects.length) setSelectedProject(projects[0].id);
    if (selectedProject && !projects.some(project => Number(project.id) === Number(selectedProject))) {
      setSelectedProject(projects.length ? projects[0].id : null);
    }
  }, [projects, selectedProject]);

  const fetchMetrics = useCallback(async () => {
    if (!selectedProject) {
      setMetrics([]);
      setSummary(null);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/metrics/' + selectedProject);
      setMetrics(response.data.metrics || []);
      setSummary(response.data.summary || { avg_cpu: 0, avg_memory: 0, total_requests: 0 });
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Could not load project telemetry.');
      setMetrics([]);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [api, selectedProject]);

  useEffect(() => { fetchMetrics(); }, [fetchMetrics]);

  const formatNumber = (value, digits = 1) => Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: digits });
  const selectedProjectName = projects.find(project => Number(project.id) === Number(selectedProject))?.name || 'Project';

  return (
    <div className="page metrics-page">
      <div className="page-header">
        <div>
          <p className="eyebrow">OBSERVABILITY / TELEMETRY</p>
          <h1>Metrics &amp; monitoring</h1>
          <p className="page-subtitle">Inspect the latest metrics recorded for each project.</p>
        </div>
        <button type="button" className="btn btn-secondary" onClick={fetchMetrics} disabled={loading || !selectedProject}>
          {loading ? 'Refreshing…' : '↻ Refresh'}
        </button>
      </div>

      <section className="metrics-selector">
        <div className="form-group">
          <label htmlFor="metrics-project">Project</label>
          <select id="metrics-project" value={selectedProject || ''} onChange={event => setSelectedProject(event.target.value ? Number(event.target.value) : null)}>
            <option value="">Choose a project…</option>
            {projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}
          </select>
        </div>
        <div className="telemetry-context"><span className="status-light" /> Project scope <strong>{selectedProjectName}</strong></div>
      </section>

      {error && <div className="error-message" role="alert">{error}</div>}

      {!projects.length && (
        <div className="empty-message enhanced-empty">
          <div className="empty-icon">⌁</div>
          <h3>No projects to monitor</h3>
          <p>Create a project first. Metrics appear here when telemetry records are written to the database.</p>
        </div>
      )}

      {selectedProject && summary && (
        <>
          <div className="metrics-kpi-grid">
            <div className="metric-kpi"><span>Average CPU</span><strong>{formatNumber(summary.avg_cpu)}<small>%</small></strong><div className="metric-track"><span style={{ width: Math.min(Number(summary.avg_cpu || 0), 100) + '%' }} /></div></div>
            <div className="metric-kpi"><span>Average memory</span><strong>{formatNumber(Number(summary.avg_memory || 0) / 1024)}<small> GB</small></strong><p>Based on recorded memory values</p></div>
            <div className="metric-kpi"><span>Total requests</span><strong>{formatNumber(summary.total_requests, 0)}</strong><p>Sum of returned measurement records</p></div>
          </div>

          <div className="section-heading-row metrics-table-heading">
            <div><h2>Recorded measurements</h2><p>{metrics.length} measurements · {selectedProjectName}</p></div>
            <span className="data-origin-label">DATABASE TELEMETRY</span>
          </div>

          {loading && <p className="inline-loading">Loading telemetry…</p>}
          {!loading && metrics.length === 0 && (
            <div className="empty-message enhanced-empty compact-empty">
              <h3>No telemetry recorded</h3>
              <p>This is an empty data state, not a zero-usage reading. Add metrics records to populate the charts and table.</p>
            </div>
          )}

          {metrics.length > 0 && (
            <>
              <div className="table-container metrics-table-container">
                <table className="table">
                  <thead><tr><th>Timestamp</th><th>CPU</th><th>Memory</th><th>Requests</th><th>Errors</th><th>Response time</th></tr></thead>
                  <tbody>{metrics.map(metric => (
                    <tr key={metric.id || metric.timestamp}>
                      <td>{metric.timestamp ? new Date(metric.timestamp).toLocaleString() : '—'}</td>
                      <td>{metric.cpu_usage == null ? '—' : formatNumber(metric.cpu_usage) + '%'}</td>
                      <td>{metric.memory_usage == null ? '—' : formatNumber(metric.memory_usage, 0) + ' MB'}</td>
                      <td>{formatNumber(metric.requests_total, 0)}</td>
                      <td><span className={Number(metric.errors_total || 0) > 0 ? 'error-text' : ''}>{formatNumber(metric.errors_total, 0)}</span></td>
                      <td>{metric.response_time_ms == null ? '—' : formatNumber(metric.response_time_ms) + ' ms'}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>

              <section className="section metric-chart-section">
                <div className="section-heading-row"><div><h2>CPU trend</h2><p>Most recent 10 measurements returned by the API</p></div><span className="chart-legend"><i /> CPU usage</span></div>
                <div className="simple-chart improved-chart">
                  <div className="chart-bars">
                    {[...metrics].slice(0, 10).reverse().map((metric, index) => {
                      const value = Math.max(0, Math.min(Number(metric.cpu_usage || 0), 100));
                      return <div key={metric.id || metric.timestamp || index} className="chart-column">
                        <div className="bar" style={{ height: Math.max(value, 2) + '%' }} title={formatNumber(value) + '% CPU'} />
                        <span>{metric.timestamp ? new Date(metric.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : index + 1}</span>
                      </div>;
                    })}
                  </div>
                  <div className="chart-axis-labels"><span>0%</span><span>50%</span><span>100%</span></div>
                </div>
              </section>
            </>
          )}
        </>
      )}
    </div>
  );
}
