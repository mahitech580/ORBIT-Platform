import React, { useMemo, useState } from 'react';
import { filterDeployments } from '../utils/deploymentFilters.js';
import { buildDeploymentCsv } from '../utils/deploymentExport.js';

export default function Deployments({ deployments, projects, loading, onDeploy }) {
  const [showForm, setShowForm] = useState(false);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState('all');
  const [formData, setFormData] = useState({
    project_id: projects.length > 0 ? projects[0].id : '',
    version: '1.0.0',
    branch: 'main'
  });

  const filteredDeployments = useMemo(() => filterDeployments(deployments, {
    query,
    status: statusFilter,
    projectId: projectFilter,
    projects
  }), [deployments, projects, query, projectFilter, statusFilter]);

  const hasActiveFilters = Boolean(query.trim()) || projectFilter !== 'all' || statusFilter !== 'all';
  const clearFilters = () => {
    setQuery('');
    setProjectFilter('all');
    setStatusFilter('all');
  };

  const exportFilteredDeployments = () => {
    const csv = buildDeploymentCsv(filteredDeployments, projects);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'orbit-deployments-' + new Date().toISOString().slice(0, 10) + '.csv';
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleInputChange = event => {
    const { name, value } = event.target;
    setFormData(previous => ({
      ...previous,
      [name]: name === 'project_id' ? (value ? Number(value) : '') : value
    }));
  };

  const handleSubmit = async event => {
    event.preventDefault();
    if (!formData.project_id) return;
    const success = await onDeploy(formData.project_id, {
      version: formData.version.trim(),
      branch: formData.branch.trim()
    });
    if (success) {
      setShowForm(false);
      setFormData({ project_id: projects.length ? projects[0].id : '', version: '1.0.0', branch: 'main' });
    }
  };

  const getProjectName = id => {
    const project = projects.find(item => Number(item.id) === Number(id));
    return project ? project.name : 'Unknown project';
  };

  const getStatusColor = status => ({
    completed: '#34d399',
    'in-progress': '#818cf8',
    failed: '#fb7185',
    pending: '#fbbf24'
  }[status] || '#94a3b8');

  return (
    <div className="page deployments-page">
      <div className="page-header">
        <div>
          <p className="eyebrow">WORKSPACE / RELEASE HISTORY</p>
          <h1>Deployments</h1>
          <p className="page-subtitle">Review versioned deployment records and their recorded status.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setShowForm(previous => !previous)} disabled={!projects.length}>
          {showForm ? 'Cancel' : '＋ Record deployment'}
        </button>
      </div>

      <div className="capability-notice">
        <span className="notice-icon">i</span>
        <p><strong>Tracking mode:</strong> ORBIT records deployment requests and history. This release does not run builds or provision cloud infrastructure.</p>
      </div>

      {!projects.length && <div className="warning-banner">Create a project before recording a deployment.</div>}

      {showForm && projects.length > 0 && (
        <section className="form-card deploy-form-card">
          <p className="eyebrow">NEW RECORD</p>
          <h2>Record a deployment</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="deployment-project">Project</label>
              <select id="deployment-project" name="project_id" value={formData.project_id} onChange={handleInputChange} required>
                {projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}
              </select>
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="deployment-version">Version</label>
                <input id="deployment-version" type="text" name="version" value={formData.version} onChange={handleInputChange} maxLength={80} placeholder="e.g. 2.0.0" required />
              </div>
              <div className="form-group">
                <label htmlFor="deployment-branch">Source branch</label>
                <input id="deployment-branch" type="text" name="branch" value={formData.branch} onChange={handleInputChange} maxLength={200} placeholder="main" required />
              </div>
            </div>
            <div className="form-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Saving…' : 'Create deployment record'}</button>
            </div>
          </form>
        </section>
      )}

      <div className="deployment-summary-grid">
        <div className="mini-stat"><span>Total records</span><strong>{deployments.length}</strong></div>
        <div className="mini-stat"><span>Completed</span><strong>{deployments.filter(item => item.status === 'completed').length}</strong></div>
        <div className="mini-stat"><span>In progress</span><strong>{deployments.filter(item => item.status === 'in-progress').length}</strong></div>
        <div className="mini-stat"><span>Failed</span><strong>{deployments.filter(item => item.status === 'failed').length}</strong></div>
      </div>

      <div className="section-heading-row deployment-list-heading">
        <div className="deployment-list-copy">
          <h2>Deployment history</h2>
          <p aria-live="polite">Newest activity first · Showing {filteredDeployments.length} of {deployments.length} records.</p>
        </div>
        <div className="deployment-filters">
          <input
            className="deployment-search-field"
            type="search"
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="Search ID, project, version, branch…"
            aria-label="Search deployment history"
          />
          <select value={projectFilter} onChange={event => setProjectFilter(event.target.value)} aria-label="Filter deployments by project">
            <option value="all">All projects</option>
            {projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}
          </select>
          <select value={statusFilter} onChange={event => setStatusFilter(event.target.value)} aria-label="Filter deployments by status">
            <option value="all">All statuses</option>
            <option value="in-progress">In progress</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
          </select>
          <button
            type="button"
            className="btn btn-secondary deployment-export-button"
            onClick={exportFilteredDeployments}
            disabled={!filteredDeployments.length}
            title={filteredDeployments.length ? 'Export the currently filtered deployment records' : 'No deployment records to export'}
          >↓ Export CSV</button>
          {hasActiveFilters && <button type="button" className="btn btn-secondary" onClick={clearFilters}>Clear filters</button>}
        </div>
      </div>

      {filteredDeployments.length === 0 ? (
        <div className="empty-message enhanced-empty">
          <div className="empty-icon">↗</div>
          <h3>{hasActiveFilters ? 'No deployments match these filters' : 'No deployment records yet'}</h3>
          <p>{hasActiveFilters ? 'Try changing your search, project, or status filter.' : 'Create a record to start building a version history for a project.'}</p>
          {hasActiveFilters && <button type="button" className="btn btn-secondary" onClick={clearFilters}>Clear filters</button>}
        </div>
      ) : (
        <div className="deployment-timeline">
          {filteredDeployments.map(deployment => (
            <article key={deployment.id} className="deployment-item">
              <div className="deployment-rail"><span className="deployment-dot" style={{ backgroundColor: getStatusColor(deployment.status) }} /></div>
              <div className="deployment-content">
                <div className="deployment-header">
                  <div><p className="eyebrow">DEPLOYMENT #{String(deployment.id).padStart(4, '0')}</p><h3>{deployment.project_name || getProjectName(deployment.project_id)}</h3></div>
                  <span className={'badge badge-' + deployment.status}>{deployment.status}</span>
                </div>
                <div className="deployment-meta-grid">
                  <div><span>Version</span><strong>{deployment.version}</strong></div>
                  <div><span>Branch</span><strong>{deployment.branch}</strong></div>
                  <div><span>Created</span><strong>{deployment.created_at ? new Date(deployment.created_at).toLocaleString() : '—'}</strong></div>
                  <div><span>Completed</span><strong>{deployment.completed_at ? new Date(deployment.completed_at).toLocaleString() : 'Not recorded'}</strong></div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
