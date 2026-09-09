import React, { useState } from 'react';

export default function Projects({ projects, loading, onCreateProject, onDeleteProject, api }) {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    runtime: 'node',
    team_id: 1
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
    const success = await onCreateProject(formData);
    if (success) {
      setFormData({
        name: '',
        description: '',
        runtime: 'node',
        team_id: 1
      });
      setShowForm(false);
    }
  };

  const handleDelete = async (projectId) => {
    if (confirm('Are you sure you want to delete this project?')) {
      await onDeleteProject(projectId);
    }
  };

  return (
    <div className="page projects-page">
      <div className="page-header">
        <h1>Projects</h1>
        <button 
          className="btn btn-primary"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? 'Cancel' : '+ New Project'}
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="form-card">
          <h2>Create New Project</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Project Name</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Enter project name"
                required
              />
            </div>

            <div className="form-group">
              <label>Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Project description"
                rows="4"
              ></textarea>
            </div>

            <div className="form-group">
              <label>Runtime</label>
              <select 
                name="runtime" 
                value={formData.runtime}
                onChange={handleInputChange}
              >
                <option value="node">Node.js</option>
                <option value="python">Python</option>
                <option value="java">Java</option>
                <option value="go">Go</option>
              </select>
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Creating...' : 'Create Project'}
            </button>
          </form>
        </div>
      )}

      {/* Projects List */}
      <div className="section">
        <h2>Your Projects</h2>
        {projects.length === 0 ? (
          <p className="empty-message">No projects yet. Create your first project!</p>
        ) : (
          <div className="projects-grid">
            {projects.map(project => (
              <div key={project.id} className="project-card">
                <div className="project-header">
                  <h3>{project.name}</h3>
                  <span className={`badge badge-${project.status}`}>
                    {project.status}
                  </span>
                </div>

                <p className="project-description">{project.description}</p>

                <div className="project-meta">
                  <span className="runtime-tag">{project.runtime}</span>
                  <span className="date-tag">
                    {new Date(project.created_at).toLocaleDateString()}
                  </span>
                </div>

                <div className="project-actions">
                  <button className="btn btn-small btn-secondary">View</button>
                  <button 
                    className="btn btn-small btn-danger"
                    onClick={() => handleDelete(project.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="section">
        <h2>Project Statistics</h2>
        <div className="stats-row">
          <div className="stat-item">
            <div className="stat-box">
              <div className="stat-number">{projects.length}</div>
              <div className="stat-text">Total Projects</div>
            </div>
          </div>
          <div className="stat-item">
            <div className="stat-box">
              <div className="stat-number">{projects.filter(p => p.status === 'active').length}</div>
              <div className="stat-text">Active</div>
            </div>
          </div>
          <div className="stat-item">
            <div className="stat-box">
              <div className="stat-number">{projects.filter(p => p.status === 'archived').length}</div>
              <div className="stat-text">Archived</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
