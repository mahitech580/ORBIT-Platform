import React, { useMemo } from 'react';

export default function Dashboard({ projects, deployments, loading }) {
  const stats = useMemo(() => {
    return {
      totalProjects: projects.length,
      activeProjects: projects.filter(p => p.status === 'active').length,
      totalDeployments: deployments.length,
      recentDeployments: deployments.slice(0, 5),
      deploymentStatus: {
        success: deployments.filter(d => d.status === 'completed').length,
        pending: deployments.filter(d => d.status === 'pending').length,
        failed: deployments.filter(d => d.status === 'failed').length
      }
    };
  }, [projects, deployments]);

  return (
    <div className="page dashboard-page">
      <h1>Dashboard</h1>
      <p className="page-subtitle">Welcome to ORBIT Platform</p>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{stats.totalProjects}</div>
          <div className="stat-label">Total Projects</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.activeProjects}</div>
          <div className="stat-label">Active Projects</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.totalDeployments}</div>
          <div className="stat-label">Total Deployments</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.deploymentStatus.success}</div>
          <div className="stat-label">Successful Deployments</div>
        </div>
      </div>

      {/* Recent Projects */}
      <div className="section">
        <h2>Recent Projects</h2>
        {projects.length === 0 ? (
          <p className="empty-message">No projects yet. Create one to get started!</p>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Runtime</th>
                  <th>Status</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {projects.slice(0, 5).map(project => (
                  <tr key={project.id}>
                    <td className="table-name">{project.name}</td>
                    <td>{project.runtime}</td>
                    <td>
                      <span className={`badge badge-${project.status}`}>
                        {project.status}
                      </span>
                    </td>
                    <td>{new Date(project.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent Deployments */}
      <div className="section">
        <h2>Recent Deployments</h2>
        {deployments.length === 0 ? (
          <p className="empty-message">No deployments yet.</p>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Project</th>
                  <th>Version</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentDeployments.map(deployment => (
                  <tr key={deployment.id}>
                    <td className="table-name">{deployment.project_name}</td>
                    <td>{deployment.version}</td>
                    <td>
                      <span className={`badge badge-${deployment.status}`}>
                        {deployment.status}
                      </span>
                    </td>
                    <td>{new Date(deployment.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Deployment Stats */}
      <div className="section">
        <h2>Deployment Statistics</h2>
        <div className="stats-row">
          <div className="stat-item">
            <div className="stat-box success">
              <div className="stat-number">{stats.deploymentStatus.success}</div>
              <div className="stat-text">Successful</div>
            </div>
          </div>
          <div className="stat-item">
            <div className="stat-box pending">
              <div className="stat-number">{stats.deploymentStatus.pending}</div>
              <div className="stat-text">Pending</div>
            </div>
          </div>
          <div className="stat-item">
            <div className="stat-box failed">
              <div className="stat-number">{stats.deploymentStatus.failed}</div>
              <div className="stat-text">Failed</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
