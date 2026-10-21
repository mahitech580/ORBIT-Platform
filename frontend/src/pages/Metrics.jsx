import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { filterMetricsByRange } from '../utils/metricsFilters.js';
import { summarizeMetrics } from '../utils/metricsSummary.js';
import { buildMetricsCsv } from '../utils/metricsExport.js';
import { getApiErrorMessage } from '../utils/apiError.js';

export default function Metrics({ projects, api, refreshSeconds = 30 }) {
  const requestSequence = useRef(0);
  const [selectedProject, setSelectedProject] = useState(null);
  const [metrics, setMetrics] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [timeRange, setTimeRange] = useState('all');

  useEffect(() => {
    if (!selectedProject && projects.length) setSelectedProject(projects[0].id);
    if (selectedProject && !projects.some(project => Number(project.id) === Number(selectedProject))) {
      setSelectedProject(projects.length ? projects[0].id : null);
    }
  }, [projects, selectedProject]);

  const fetchMetrics = useCallback(async () => {
    const requestId = ++requestSequence.current;
    if (!selectedProject) {
      setMetrics([]);
      setSummary(null);
      setError('');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/metrics/' + selectedProject);
      if (requestId !== requestSequence.current) return;
      setMetrics(response.data.metrics || []);
      setSummary(response.data.summary || { avg_cpu: 0, avg_memory: 0, total_requests: 0 });
    } catch (requestError) {
      if (requestId !== requestSequence.current) return;
      setError(getApiErrorMessage(requestError, 'Could not load project telemetry.'));
      setMetrics([]);
      setSummary(null);
    } finally {
      if (requestId === requestSequence.current) setLoading(false);
    }
  }, [api, selectedProject]);

  useEffect(() => { fetchMetrics(); }, [fetchMetrics]);

  useEffect(() => {
    if (!selectedProject) return undefined;
    const seconds = [15, 30, 60].includes(Number(refreshSeconds)) ? Number(refreshSeconds) : 30;
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') fetchMetrics();
    };
    const intervalId = window.setInterval(refreshWhenVisible, seconds * 1000);
    window.addEventListener('focus', refreshWhenVisible);
    document.addEventListener('visibilitychange', refreshWhenVisible);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', refreshWhenVisible);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, [fetchMetrics, refreshSeconds, selectedProject]);

  const formatNumber = (value, digits = 1) => Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: digits });
  const visibleMetrics = useMemo(() => filterMetricsByRange(metrics, timeRange), [metrics, timeRange]);
  const visibleSummary = useMemo(() => summarizeMetrics(visibleMetrics), [visibleMetrics]);
  const selectedProjectName = projects.find(project => Number(project.id) === Number(selectedProject))?.name || 'Project';
  const selectedProjectRecord = projects.find(project => Number(project.id) === Number(selectedProject)) || { id: selectedProject, name: selectedProjectName };
  const exportMetricsCsv = () => {
    if (!visibleMetrics.length || !selectedProject) return;
    const csv = buildMetricsCsv(visibleMetrics, selectedProjectRecord);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'orbit-metrics-project-' + selectedProject + '-' + new Date().toISOString().slice(0, 10) + '.csv';
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className="page metrics-page">
      <div className="page-header">
        <div>
          <p className="eyebrow">OBSERVABILITY / TELEMETRY</p>
          <h1>Metrics &amp; monitoring</h1>
          <p className="page-subtitle">Inspect stored project telemetry. Refreshes every {refreshSeconds} seconds while this page is open.</p>
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
            <div className="metric-kpi"><span>Average CPU</span><strong>{formatNumber(visibleSummary.avg_cpu)}<small>%</small></strong><div className="metric-track"><span style={{ width: Math.min(Number(visibleSummary.avg_cpu || 0), 100) + '%' }} /></div></div>
            <div className="metric-kpi"><span>Average memory</span><strong>{formatNumber(Number(visibleSummary.avg_memory || 0) / 1024)}<small> GB</small></strong><p>Based on recorded memory values</p></div>
            <div className="metric-kpi"><span>Total requests</span><strong>{formatNumber(visibleSummary.total_requests, 0)}</strong><p>Sum of returned measurement records</p></div>
          </div>

          <div className="section-heading-row metrics-table-heading">
            <div><h2>Recorded measurements</h2><p>{visibleMetrics.length} measurements · {selectedProjectName}</p></div>
            <div className="metrics-export-actions">
              <label className="metrics-range-control"><span>TIME RANGE</span><select aria-label="Filter telemetry by time range" value={timeRange} onChange={event => setTimeRange(event.target.value)}><option value="24h">Last 24 hours</option><option value="7d">Last 7 days</option><option value="30d">Last 30 days</option><option value="all">All returned</option></select></label>
              <button type="button" className="btn btn-secondary" onClick={exportMetricsCsv} disabled={loading || visibleMetrics.length === 0} title="Export the current time-window measurements as CSV">↓ Export CSV</button>
              <span className="data-origin-label">DATABASE TELEMETRY</span>
            </div>
          </div>

          {loading && <p className="inline-loading">Loading telemetry…</p>}
          {!loading && visibleMetrics.length === 0 && (
            <div className="empty-message enhanced-empty compact-empty">
              <h3>{metrics.length ? 'No measurements in this time window' : 'No telemetry recorded'}</h3>
              <p>{metrics.length ? 'Choose a wider time range to view other returned measurements.' : 'This is an empty data state, not a zero-usage reading. Add metrics records to populate the charts and table.'}</p>
            </div>
          )}

          {visibleMetrics.length > 0 && (
            <>
              <div className="table-container metrics-table-container">
                <table className="table">
                  <thead><tr><th>Timestamp</th><th>CPU</th><th>Memory</th><th>Requests</th><th>Errors</th><th>Response time</th></tr></thead>
                  <tbody>{visibleMetrics.map(metric => (
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
                    {[...visibleMetrics].slice(0, 10).reverse().map((metric, index) => {
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
