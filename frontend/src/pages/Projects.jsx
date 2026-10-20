import React, { useEffect, useMemo, useRef, useState } from 'react';
import { getDialogFocusWrapIndex } from '../utils/dialogFocus.js';
import { buildProjectCsv } from '../utils/projectExport.js';

const EMPTY_FORM = { name: '', description: '', runtime: 'node', status: 'active' };

export default function Projects({ projects, loading, onCreateProject, onUpdateProject, onDeleteProject }) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [selectedProject, setSelectedProject] = useState(null);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [runtimeFilter, setRuntimeFilter] = useState('all');
  const detailsDialogRef = useRef(null);

  useEffect(() => {
    if (!selectedProject) return undefined;
    const previouslyFocused = document.activeElement;
    const dialog = detailsDialogRef.current;
    const focusableElements = () => Array.from(dialog?.querySelectorAll(
      'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    ) || []);
    focusableElements()[0]?.focus();

    const handleDialogKeyDown = event => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setSelectedProject(null);
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = focusableElements();
      const currentIndex = focusable.indexOf(document.activeElement);
      const wrappedIndex = getDialogFocusWrapIndex(currentIndex, focusable.length, event.shiftKey);
      if (wrappedIndex !== -1) {
        event.preventDefault();
        focusable[wrappedIndex].focus();
      }
    };
    dialog?.addEventListener('keydown', handleDialogKeyDown);
    return () => {
      dialog?.removeEventListener('keydown', handleDialogKeyDown);
      if (previouslyFocused?.isConnected && typeof previouslyFocused.focus === 'function') {
        previouslyFocused.focus();
      }
    };
  }, [selectedProject]);

  const filteredProjects = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return projects.filter(project => {
      const matchesText = !needle || [project.name, project.description, project.team_name]
        .some(value => String(value || '').toLowerCase().includes(needle));
      const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
      const matchesRuntime = runtimeFilter === 'all' || project.runtime === runtimeFilter;
      return matchesText && matchesStatus && matchesRuntime;
    });
  }, [projects, query, statusFilter, runtimeFilter]);

  const startCreate = () => {
    setEditingId(null);
    setFormData(EMPTY_FORM);
    setSelectedProject(null);
    setShowForm(true);
  };

  const startEdit = project => {
    setEditingId(project.id);
    setFormData({
      name: project.name || '',
      description: project.description || '',
      runtime: project.runtime || 'node',
      status: project.status || 'active'
    });
    setSelectedProject(null);
    setShowForm(true);
  };

  const handleInputChange = event => {
    const { name, value } = event.target;
    setFormData(previous => ({ ...previous, [name]: value }));
  };

  const handleSubmit = async event => {
    event.preventDefault();
    const payload = {
      name: formData.name.trim(),
      description: formData.description.trim(),
      runtime: formData.runtime
    };
    const success = editingId
      ? await onUpdateProject(editingId, { ...payload, status: formData.status })
      : await onCreateProject(payload);
    if (success) {
      setShowForm(false);
      setEditingId(null);
      setFormData(EMPTY_FORM);
    }
  };

  const handleDelete = async project => {
    const confirmed = window.confirm('Delete "' + project.name + '"? Its deployment records and telemetry are also removed.');
    if (confirmed) {
      const success = await onDeleteProject(project.id);
      if (success) setSelectedProject(null);
    }
  };

  const exportFilteredProjects = () => {
    if (!filteredProjects.length) return;
    const csv = buildProjectCsv(filteredProjects);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'orbit-projects-' + new Date().toISOString().slice(0, 10) + '.csv';
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const formatDate = value => value ? new Date(value).toLocaleDateString() : '—';

  return (
    <div className="page projects-page">
      <div className="page-header">
        <div>
          <p className="eyebrow">WORKSPACE / INVENTORY</p>
          <h1>Projects</h1>
          <p className="page-subtitle">Manage your application inventory and runtime configuration.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={showForm ? () => setShowForm(false) : startCreate}>
          {showForm ? 'Cancel' : <><span aria-hidden="true">＋</span> New project</>}
        </button>
      </div>

      <div className="project-toolbar">
        <label className="search-field">
          <span aria-hidden="true">⌕</span>
          <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search projects…" aria-label="Search projects" />
        </label>
        <select value={statusFilter} onChange={event => setStatusFilter(event.target.value)} aria-label="Filter by status">
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="archived">Archived</option>
        </select>
        <select value={runtimeFilter} onChange={event => setRuntimeFilter(event.target.value)} aria-label="Filter by runtime">
          <option value="all">All runtimes</option>
          <option value="node">Node.js</option>
          <option value="python">Python</option>
          <option value="java">Java</option>
          <option value="go">Go</option>
        </select>
        <button type="button" className="btn btn-secondary project-export-button" onClick={exportFilteredProjects} disabled={!filteredProjects.length} title="Export the filtered project list as CSV">↓ Export CSV</button>
        <span className="result-count">{filteredProjects.length} of {projects.length} projects</span>
      </div>

      {showForm && (
        <section className="form-card project-form-card">
          <div className="section-heading-row">
            <div>
              <p className="eyebrow">{editingId ? 'UPDATE INVENTORY' : 'NEW RESOURCE'}</p>
              <h2>{editingId ? 'Edit project' : 'Create a project'}</h2>
            </div>
            <button type="button" className="icon-button" aria-label="Close project form" onClick={() => setShowForm(false)}>×</button>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="project-name">Project name</label>
                <input id="project-name" type="text" name="name" value={formData.name} onChange={handleInputChange} maxLength={120} required placeholder="e.g. customer-api" />
              </div>
              <div className="form-group">
                <label htmlFor="project-runtime">Runtime</label>
                <select id="project-runtime" name="runtime" value={formData.runtime} onChange={handleInputChange}>
                  <option value="node">Node.js</option>
                  <option value="python">Python</option>
                  <option value="java">Java</option>
                  <option value="go">Go</option>
                </select>
              </div>
              {editingId && (
                <div className="form-group">
                  <label htmlFor="project-status">Status</label>
                  <select id="project-status" name="status" value={formData.status} onChange={handleInputChange}>
                    <option value="active">Active</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              )}
            </div>
            <div className="form-group">
              <label htmlFor="project-description">Description</label>
              <textarea id="project-description" name="description" value={formData.description} onChange={handleInputChange} maxLength={2000} placeholder="What does this project do?" rows={3} />
            </div>
            <div className="form-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Saving…' : editingId ? 'Save changes' : 'Create project'}
              </button>
            </div>
          </form>
        </section>
      )}

      <div className="project-summary-row">
        <div className="mini-stat"><span>Total projects</span><strong>{projects.length}</strong></div>
        <div className="mini-stat"><span>Active</span><strong>{projects.filter(project => project.status === 'active').length}</strong></div>
        <div className="mini-stat"><span>Archived</span><strong>{projects.filter(project => project.status === 'archived').length}</strong></div>
      </div>

      {filteredProjects.length === 0 ? (
        <div className="empty-message enhanced-empty">
          <div className="empty-icon">⌘</div>
          <h3>{projects.length ? 'No matching projects' : 'Your workspace starts here'}</h3>
          <p>{projects.length ? 'Try changing your search or filters.' : 'Create your first project to begin tracking deployments and metrics.'}</p>
          {!projects.length && <button type="button" className="btn btn-primary" onClick={startCreate}>Create your first project</button>}
        </div>
      ) : (
        <div className="projects-grid">
          {filteredProjects.map((project, index) => (
            <article key={project.id} className="project-card">
              <div className="project-card-top">
                <div className="project-app-icon">{(project.name || 'P').trim().charAt(0).toUpperCase()}</div>
                <span className={'badge badge-' + (project.status || 'active')}>{project.status || 'active'}</span>
              </div>
              <div className="project-card-title">
                <h3>{project.name}</h3>
                <p>{project.description || 'No description provided.'}</p>
              </div>
              <div className="project-facts">
                <span className="runtime-tag"><i className={'runtime-indicator runtime-' + project.runtime} />{project.runtime === 'node' ? 'Node.js' : project.runtime}</span>
                <span className="date-tag">Added {formatDate(project.created_at)}</span>
              </div>
              <div className="project-card-footer">
                <span className="project-id">ORB-{String(project.id).padStart(4, '0')}</span>
                <div className="project-actions">
                  <button type="button" className="btn btn-small btn-secondary" onClick={() => setSelectedProject(project)}>Details</button>
                  <button type="button" className="btn btn-small btn-secondary" onClick={() => startEdit(project)}>Edit</button>
                  <button type="button" className="btn btn-small btn-danger" onClick={() => handleDelete(project)}>Delete</button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {selectedProject && (
        <div className="modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setSelectedProject(null); }}>
          <section ref={detailsDialogRef} className="details-modal" role="dialog" aria-modal="true" aria-labelledby="project-details-title">
            <div className="section-heading-row">
              <div className="project-card-top">
                <div className="project-app-icon">{(selectedProject.name || 'P').trim().charAt(0).toUpperCase()}</div>
                <span className={'badge badge-' + (selectedProject.status || 'active')}>{selectedProject.status || 'active'}</span>
              </div>
              <button type="button" className="icon-button" aria-label="Close project details" onClick={() => setSelectedProject(null)}>×</button>
            </div>
            <p className="eyebrow">PROJECT DETAILS</p>
            <h2 id="project-details-title">{selectedProject.name}</h2>
            <p className="modal-description">{selectedProject.description || 'No description provided.'}</p>
            <dl className="details-list">
              <div><dt>Project ID</dt><dd>{selectedProject.id}</dd></div>
              <div><dt>Runtime</dt><dd>{selectedProject.runtime}</dd></div>
              <div><dt>Team</dt><dd>{selectedProject.team_name || 'Default Team'}</dd></div>
              <div><dt>Created</dt><dd>{selectedProject.created_at ? new Date(selectedProject.created_at).toLocaleString() : '—'}</dd></div>
              <div><dt>Last updated</dt><dd>{selectedProject.updated_at ? new Date(selectedProject.updated_at).toLocaleString() : '—'}</dd></div>
            </dl>
            <div className="form-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setSelectedProject(null)}>Close</button>
              <button type="button" className="btn btn-primary" onClick={() => startEdit(selectedProject)}>Edit project</button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
