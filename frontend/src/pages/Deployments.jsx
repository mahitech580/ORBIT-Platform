import React, { useState } from 'react';

export default function Deployments({ deployments, projects, loading, onDeploy, api }) {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    project_id: projects.length > 0 ? projects[0].id : 1,
    version: '1.0.0',
    branch: 'main'
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const success = await onDeploy(formData.project_id, formData);
    if (success) {
      setFormData({
        project_id: projects.length > 0 ? projects[0].id : 1,
        version: '1.0.0',
        branch: 'main'
      });
      setShowForm(false);
    }
  };

  const getProjectName = (projectId) => {
    const project = projects.find(p => p.id === projectId);
    return project ? project.name : 'Unknown Project';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return '#4CAF50';
      case 'in-progress':
        return '#2196F3';
      case 'failed':
        return '#f44336';
      case 'pending':
        return '#FF9800';
      default:
        return '#9E9E9E';
    }
  };

  return (
    <div className="page deployments-page">
      <div className="page-header">
        <h1>Deployments</h1>
        <button 
          className="btn btn-primary"
          onClick={() => setShowForm(!showForm)}
          disabled={projects.length === 0}
        >
          {showForm ? 'Cancel' : '+ New Deployment'}
        </button>
      </div>

      {projects.length === 0 && (
        <div className="warning-banner">
          <p>Create a project first before deploying</p>
        </div>
      )}

      {/* Deploy Form */}
      {showForm && projects.length > 0 && (
        <div className="form-card">
          <h2>Start New Deployment</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Project</label>
              <select 
                name="project_id" 
                value={formData.project_id}
                onChange={handleInputChange}
              >
                {projects.map(project => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Version</label>
                <input
                  type="text"
                  name="version"
                  value={formData.version}
                  onChange={handleInputChange}
                  placeholder="e.g., 1.0.0"
                  required
                />
              </div>

              <div className="form-group">
                <label>Branch</label>
                <input
                  type="text"
                  name="branch"
                  value={formData.branch}
                  onChange={handleInputChange}
                  placeholder="e.g., main"
                  required
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Deploying...' : 'Deploy Now'}
            </button>
          </form>
        </div>
      )}

      {/* Deployments Timeline */}
      <div className="section">
        <h2>Deployment History</h2>
        {deployments.length === 0 ? (
          <p className="empty-message">No deployments yet.</p>
        ) : (
          <div className="deployment-timeline">
            {deployments.map((deployment, index) => (
              <div key={deployment.id} className="deployment-item">
                <div className="deployment-dot" style={{ backgroundColor: getStatusColor(deployment.status) }}></div>
                
                <div className="deployment-content">
                  <div className="deployment-header">
                    <h3>{getProjectName(deployment.project_id)}</h3>
                    <span className={`badge badge-${deployment.status}`}>
                      {deployment.status}
                    </span>
                  </div>

                  <div className="deployment-details">
                    <p><strong>Version:</strong> {deployment.version}</p>
                    <p><strong>Branch:</strong> {deployment.branch}</p>
                    <p><strong>Date:</strong> {new Date(deployment.created_at).toLocaleString()}</p>
                    {deployment.completed_at && (
                      <p><strong>Completed:</strong> {new Date(deployment.completed_at).toLocaleString()}</p>
                    )}
                  </div>
                </div>

                {index < deployments.length - 1 && <div className="deployment-line"></div>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Deployment Stats */}
      <div className="section">
        <h2>Deployment Statistics</h2>
        <div className="stats-row">
          <div className="stat-item">
            <div className="stat-box">
              <div className="stat-number">{deployments.length}</div>
              <div className="stat-text">Total Deployments</div>
            </div>
          </div>
          <div className="stat-item">
            <div className="stat-box">
              <div className="stat-number">{deployments.filter(d => d.status === 'completed').length}</div>
              <div className="stat-text">Successful</div>
            </div>
          </div>
          <div className="stat-item">
            <div className="stat-box">
              <div className="stat-number">{deployments.filter(d => d.status === 'in-progress').length}</div>
              <div className="stat-text">In Progress</div>
            </div>
          </div>
          <div className="stat-item">
            <div className="stat-box">
              <div className="stat-number">{deployments.filter(d => d.status === 'failed').length}</div>
              <div className="stat-text">Failed</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
