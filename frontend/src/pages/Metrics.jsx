import React, { useState, useEffect } from 'react';

export default function Metrics({ projects, api }) {
  const [selectedProject, setSelectedProject] = useState(
    projects.length > 0 ? projects[0].id : null
  );
  const [metrics, setMetrics] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedProject) {
      fetchMetrics();
    }
  }, [selectedProject]);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/metrics/${selectedProject}`);
      setMetrics(response.data.metrics);
      setSummary(response.data.summary);
    } catch (error) {
      console.error('Failed to fetch metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getProjectName = (projectId) => {
    const project = projects.find(p => p.id === projectId);
    return project ? project.name : 'Unknown';
  };

  return (
    <div className="page metrics-page">
      <h1>Metrics & Monitoring</h1>

      {/* Project Selector */}
      <div className="section">
        <div className="form-group">
          <label>Select Project</label>
          <select 
            value={selectedProject || ''}
            onChange={(e) => setSelectedProject(parseInt(e.target.value))}
          >
            <option value="">Choose a project...</option>
            {projects.map(project => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {selectedProject && summary && (
        <>
          {/* Summary Stats */}
          <div className="section">
            <h2>Performance Summary</h2>
            <div className="stats-row">
              <div className="stat-item">
                <div className="stat-box">
                  <div className="stat-number">{summary.avg_cpu || 0}%</div>
                  <div className="stat-text">Avg CPU Usage</div>
                </div>
              </div>
              <div className="stat-item">
                <div className="stat-box">
                  <div className="stat-number">{(summary.avg_memory || 0) / 1024}GB</div>
                  <div className="stat-text">Avg Memory</div>
                </div>
              </div>
              <div className="stat-item">
                <div className="stat-box">
                  <div className="stat-number">{summary.total_requests || 0}</div>
                  <div className="stat-text">Total Requests</div>
                </div>
              </div>
            </div>
          </div>

          {/* Metrics Table */}
          <div className="section">
            <h2>Detailed Metrics</h2>
            {metrics.length === 0 ? (
              <p className="empty-message">No metrics data available for this project yet.</p>
            ) : (
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Timestamp</th>
                      <th>CPU %</th>
                      <th>Memory (MB)</th>
                      <th>Requests</th>
                      <th>Errors</th>
                      <th>Response Time (ms)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.map((metric, idx) => (
                      <tr key={idx}>
                        <td>{new Date(metric.timestamp).toLocaleString()}</td>
                        <td>{metric.cpu_usage || 'N/A'}</td>
                        <td>{metric.memory_usage || 'N/A'}</td>
                        <td>{metric.requests_total || 0}</td>
                        <td>
                          {metric.errors_total > 0 ? (
                            <span className="error-text">{metric.errors_total}</span>
                          ) : (
                            '0'
                          )}
                        </td>
                        <td>{metric.response_time_ms || 'N/A'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Charts (Simple representation) */}
          <div className="section">
            <h2>CPU Usage Trend</h2>
            <div className="simple-chart">
              <div className="chart-bars">
                {metrics.slice(-10).map((metric, idx) => (
                  <div 
                    key={idx}
                    className="bar" 
                    style={{ 
                      height: `${Math.min(metric.cpu_usage || 0, 100)}%`,
                      backgroundColor: metric.cpu_usage > 80 ? '#f44336' : '#4CAF50'
                    }}
                    title={`${metric.cpu_usage}%`}
                  ></div>
                ))}
              </div>
              <div className="chart-label">Last 10 Measurements</div>
            </div>
          </div>
        </>
      )}

      {!selectedProject && (
        <div className="empty-message">
          <p>Select a project to view its metrics</p>
        </div>
      )}
    </div>
  );
}
