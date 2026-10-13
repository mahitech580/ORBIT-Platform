import React, { useMemo } from 'react';

const dateLabel = value => {
  if (!value) return 'date unavailable';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'date unavailable' : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};
const relativeDate = value => {
  if (!value) return 'Date not recorded';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date not recorded';
  const days = Math.floor((Date.now() - date.getTime()) / 86400000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return days + ' days ago';
  return dateLabel(value);
};
const runtimeLabel = runtime => ({ node: 'Node.js', python: 'Python', java: 'Java', go: 'Go' }[String(runtime || '').toLowerCase()] || runtime || 'Unknown');

export default function Dashboard({ projects, deployments, loading, onPageChange }) {
  const stats = useMemo(() => ({
    total: projects.length,
    active: projects.filter(project => project.status === 'active').length,
    archived: projects.filter(project => project.status === 'archived').length,
    releases: deployments.length,
    completed: deployments.filter(item => item.status === 'completed').length,
    running: deployments.filter(item => item.status === 'in-progress').length,
    failed: deployments.filter(item => item.status === 'failed').length
  }), [projects, deployments]);

  const recentProjects = useMemo(() => [...projects].sort((a, b) => new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0)).slice(0, 5), [projects]);
  const recentDeployments = useMemo(() => [...deployments].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)).slice(0, 5), [deployments]);
  const activity = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Array.from({ length: 35 }, (_, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() - (34 - index));
      const key = [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
      const count = deployments.filter(item => {
        if (!item.created_at) return false;
        const created = new Date(item.created_at);
        return !Number.isNaN(created.getTime()) &&
          [created.getFullYear(), String(created.getMonth() + 1).padStart(2, '0'), String(created.getDate()).padStart(2, '0')].join('-') === key;
      }).length;
      return { key, date, count };
    });
  }, [deployments]);
  const maxDaily = Math.max(1, ...activity.map(point => point.count));

  const getProjectName = deployment => deployment.project_name ||
    projects.find(project => Number(project.id) === Number(deployment.project_id))?.name || 'Unknown project';

  return (
    <div className="page dashboard-page">
      <div className="repo-heading-row">
        <div className="repo-title-group">
          <div className="repo-avatar"><svg viewBox="0 0 24 24" width="27" height="27" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="2.4" /><ellipse cx="12" cy="12" rx="9" ry="4.2" transform="rotate(-35 12 12)" /></svg></div>
          <div><div className="breadcrumb"><span>workspace</span><span>/</span><strong>overview</strong><span className="public-tag">PUBLIC DEMO</span></div><p className="repo-description">A single place to organize projects, review deployment records, and inspect recorded metrics.</p></div>
        </div>
        <div className="repo-heading-actions"><button type="button" className="btn btn-secondary" onClick={() => onPageChange('projects')}>＋ New project</button></div>
      </div>

      <div className="repo-underbar">
        <span><strong>{stats.total}</strong> projects</span>
        <span className="underbar-sep">·</span>
        <span><strong>{stats.releases}</strong> deployment records</span>
        <span className="underbar-sep">·</span>
        <span><i className="status-dot" /> {stats.active} active</span>
      </div>

      <div className="github-page-grid">
        <section className="github-main-column">
          <div className="section-header">
            <div><h2>Workspace activity</h2><p>Deployment records created over the last 5 weeks</p></div>
            <span className="muted-label">{stats.releases} total</span>
          </div>

          <div className="contribution-card">
            <div className="contribution-topline">
              <span>{stats.releases} deployment records tracked</span>
              <span className="contribution-caption">Less <i className="level-0" /><i className="level-1" /><i className="level-2" /><i className="level-3" /> More</span>
            </div>
            <div className="contribution-months"><span>5 weeks ago</span><span>4 weeks ago</span><span>3 weeks ago</span><span>2 weeks ago</span><span>This week</span></div>
            <div className="contribution-grid" role="img" aria-label="Daily deployment records represented as activity squares">
              {activity.map(point => {
                const level = point.count === 0 ? 0 : point.count / maxDaily >= .75 ? 3 : point.count / maxDaily >= .4 ? 2 : 1;
                return <span key={point.key} className={'contribution-cell level-' + level} title={point.count + ' record' + (point.count === 1 ? '' : 's') + ' on ' + point.date.toLocaleDateString()} />;
              })}
            </div>
            <div className="contribution-bottomline"><span>Activity based on saved records, not real-time build telemetry.</span><button type="button" className="text-button" onClick={() => onPageChange('deployments')}>View deployment history →</button></div>
          </div>

          <div className="section-header section-header-with-action">
            <div><h2>Repositories <span className="count-pill">{stats.total}</span></h2><p>Projects registered in this workspace</p></div>
            <button type="button" className="text-button" onClick={() => onPageChange('projects')}>View all projects →</button>
          </div>

          {recentProjects.length ? <div className="repository-list">
            {recentProjects.map(project => (
              <article className="repository-list-item" key={project.id}>
                <div className="repo-list-icon">{runtimeLabel(project.runtime).slice(0, 1)}</div>
                <div className="repo-list-content">
                  <button type="button" className="repo-link" onClick={() => onPageChange('projects')}>{project.name}</button>
                  <p>{project.description || 'No description provided.'}</p>
                  <div className="repo-item-meta">
                    <span className={"language-dot runtime-" + String(project.runtime || "").toLowerCase()} />
                    <span>{runtimeLabel(project.runtime)}</span>
                    <span className={'state-pill ' + (project.status === 'active' ? 'green' : 'gray')}>{project.status || 'active'}</span>
                    <span>Updated {relativeDate(project.updated_at || project.created_at)}</span>
                  </div>
                </div>
                <button type="button" className="btn btn-secondary btn-small" onClick={() => onPageChange('projects')}>Manage</button>
              </article>
            ))}
          </div> : <div className="github-empty"><div className="empty-icon">▤</div><h3>No projects yet</h3><p>Create your first project to start organizing your workspace.</p><button className="btn btn-primary" type="button" onClick={() => onPageChange('projects')}>Create a project</button></div>}

          <div className="section-header section-header-with-action recent-release-heading">
            <div><h2>Recent deployments <span className="count-pill">{stats.releases}</span></h2><p>Newest deployment records and their current status</p></div>
            <button type="button" className="text-button" onClick={() => onPageChange('deployments')}>View history →</button>
          </div>
          {recentDeployments.length ? <div className="table-shell">
            <table className="table github-table">
              <thead><tr><th>Project</th><th>Version / branch</th><th>Status</th><th>Created</th></tr></thead>
              <tbody>{recentDeployments.map(deployment => <tr key={deployment.id}>
                <td><button type="button" className="repo-link" onClick={() => onPageChange('deployments')}>{getProjectName(deployment)}</button></td>
                <td><span className="code-chip">{deployment.version || '—'}</span><span className="table-secondary">{deployment.branch || 'main'}</span></td>
                <td><span className={'state-pill ' + (deployment.status === 'completed' ? 'green' : deployment.status === 'failed' ? 'red' : deployment.status === 'pending' ? 'yellow' : 'blue')}>{String(deployment.status || 'unknown').replace('-', ' ')}</span></td>
                <td className="table-secondary">{dateLabel(deployment.created_at)}</td>
              </tr>)}</tbody>
            </table>
          </div> : <div className="github-empty github-empty-small"><p>No deployment records yet.</p><button className="text-button" type="button" onClick={() => onPageChange('deployments')}>Record your first deployment →</button></div>}
        </section>

        <aside className="github-sidebar-column">
          <section className="about-panel">
            <h2>About</h2>
            <p>ORBIT is a project operations workspace for tracking application inventory, deployment history, and measured metrics.</p>
            <div className="about-link"><span>⌘</span><span>Project operations</span></div>
            <div className="about-link"><span>◷</span><span>Deployment history</span></div>
            <div className="about-link"><span>⌁</span><span>Recorded observability</span></div>
            <div className="about-note"><strong>Demo limitation</strong><p>This public version saves sample data in your browser. It does not execute builds, provision cloud infrastructure, or generate live telemetry.</p></div>
          </section>

          <section className="sidebar-section">
            <div className="section-header"><h2>Summary</h2></div>
            <div className="summary-row"><span><i className="summary-dot green-dot" /> Active projects</span><strong>{stats.active}</strong></div>
            <div className="summary-row"><span><i className="summary-dot blue-dot" /> Completed records</span><strong>{stats.completed}</strong></div>
            <div className="summary-row"><span><i className="summary-dot yellow-dot" /> In progress</span><strong>{stats.running}</strong></div>
            <div className="summary-row"><span><i className="summary-dot red-dot" /> Failed records</span><strong>{stats.failed}</strong></div>
          </section>

          <section className="sidebar-section">
            <div className="section-header"><h2>Explore</h2></div>
            <button type="button" className="sidebar-action" onClick={() => onPageChange('projects')}><span className="sidebar-action-icon">▤</span><span><strong>Projects</strong><small>Create and manage runtimes</small></span><span className="sidebar-action-arrow">→</span></button>
            <button type="button" className="sidebar-action" onClick={() => onPageChange('deployments')}><span className="sidebar-action-icon">↗</span><span><strong>Deployments</strong><small>View tracked release history</small></span><span className="sidebar-action-arrow">→</span></button>
            <button type="button" className="sidebar-action" onClick={() => onPageChange('metrics')}><span className="sidebar-action-icon">⌁</span><span><strong>Observability</strong><small>Review recorded measurements</small></span><span className="sidebar-action-arrow">→</span></button>
          </section>
        </aside>
      </div>
      {loading && <div className="inline-loading"><span className="loading-pulse" /> Syncing workspace records…</div>}
    </div>
  );
}
