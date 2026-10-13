import React, { useMemo } from 'react';

const formatDate = value => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const formatRelative = value => {
  if (!value) return 'Date not recorded';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date not recorded';
  const days = Math.floor((Date.now() - date.getTime()) / 86400000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return days + ' days ago';
  return formatDate(value);
};

function IconBadge({ children, tone = '' }) {
  return <span className={'stat-icon' + (tone ? ' ' + tone : '')} aria-hidden="true">{children}</span>;
}

export default function Dashboard({ projects, deployments, loading, onPageChange }) {
  const stats = useMemo(() => {
    const completed = deployments.filter(item => item.status === 'completed').length;
    const inProgress = deployments.filter(item => item.status === 'in-progress').length;
    const pending = deployments.filter(item => item.status === 'pending').length;
    const failed = deployments.filter(item => item.status === 'failed').length;
    return {
      totalProjects: projects.length,
      activeProjects: projects.filter(project => project.status === 'active').length,
      archivedProjects: projects.filter(project => project.status === 'archived').length,
      totalDeployments: deployments.length,
      completed,
      inProgress,
      pending,
      failed,
      terminal: completed + failed
    };
  }, [projects, deployments]);

  const activity = useMemo(() => {
    const points = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let offset = 6; offset >= 0; offset -= 1) {
      const date = new Date(today);
      date.setDate(today.getDate() - offset);
      const key = [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
      points.push({
        key,
        label: date.toLocaleDateString(undefined, { weekday: 'short' }),
        count: deployments.filter(item => {
          if (!item.created_at) return false;
          const created = new Date(item.created_at);
          if (Number.isNaN(created.getTime())) return false;
          const createdKey = [created.getFullYear(), String(created.getMonth() + 1).padStart(2, '0'), String(created.getDate()).padStart(2, '0')].join('-');
          return createdKey === key;
        }).length
      });
    }
    return points;
  }, [deployments]);

  const recentDeployments = useMemo(() => [...deployments]
    .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
    .slice(0, 4), [deployments]);

  const maxActivity = Math.max(1, ...activity.map(point => point.count));
  const isEmpty = !projects.length && !deployments.length;
  const totalForRing = deployments.length || 1;
  const successShare = stats.completed / totalForRing * 100;
  const runningShare = (stats.completed + stats.inProgress) / totalForRing * 100;
  const warningShare = (stats.completed + stats.inProgress + stats.pending) / totalForRing * 100;
  const statusParts = [
    { key: 'completed', label: 'Completed', count: stats.completed, color: '#6de0cb' },
    { key: 'in-progress', label: 'In progress', count: stats.inProgress, color: '#8198ff' },
    { key: 'pending', label: 'Pending', count: stats.pending, color: '#ffcf75' },
    { key: 'failed', label: 'Failed', count: stats.failed, color: '#ff829a' }
  ];

  return (
    <div className="page dashboard-page">
      <section className="overview-hero">
        <div className="hero-copy">
          <p className="eyebrow">ORBIT PLATFORM / COMMAND CENTER</p>
          <h1>Your release workflow,<br /><span>in clear view.</span></h1>
          <p>Keep application inventory and release history in one focused workspace. Everything here reflects records saved to your ORBIT workspace.</p>
          <div className="hero-actions">
            <button type="button" className="btn btn-primary" onClick={() => onPageChange('projects')}>Explore projects <span aria-hidden="true">↗</span></button>
            <button type="button" className="btn btn-secondary" onClick={() => onPageChange('deployments')}>View deployments</button>
          </div>
        </div>
        <div className="hero-visual" aria-hidden="true">
          <span className="orbit-ring" />
          <span className="orbit-ring ring-two" />
          <span className="orbit-satellite s-one" />
          <span className="orbit-satellite s-two" />
          <span className="orbit-core">
            <svg width="27" height="27" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="2.5" /><ellipse cx="12" cy="12" rx="9" ry="4.2" transform="rotate(-35 12 12)" /><path d="m17.5 5.4 1.9-1.9" />
            </svg>
          </span>
        </div>
      </section>

      <div className="stats-grid" aria-label="Workspace summary">
        <article className="stat-card">
          <div className="stat-card-head"><span className="stat-kicker">Application inventory</span><IconBadge>▦</IconBadge></div>
          <strong className="stat-value">{stats.totalProjects}</strong>
          <div className="stat-detail"><strong>{stats.activeProjects}</strong> active · {stats.archivedProjects} archived</div>
        </article>
        <article className="stat-card">
          <div className="stat-card-head"><span className="stat-kicker">Active projects</span><IconBadge tone="teal">↗</IconBadge></div>
          <strong className="stat-value">{stats.activeProjects}</strong>
          <div className="stat-detail">Out of {stats.totalProjects} tracked projects</div>
        </article>
        <article className="stat-card">
          <div className="stat-card-head"><span className="stat-kicker">Release records</span><IconBadge tone="violet">⌁</IconBadge></div>
          <strong className="stat-value">{stats.totalDeployments}</strong>
          <div className="stat-detail">{stats.inProgress} in progress · {stats.pending} pending</div>
        </article>
        <article className="stat-card">
          <div className="stat-card-head"><span className="stat-kicker">Completed records</span><IconBadge tone="gold">✓</IconBadge></div>
          <strong className="stat-value">{stats.completed}</strong>
          <div className="stat-detail">{stats.failed} failed record{stats.failed === 1 ? '' : 's'} · {stats.terminal} terminal</div>
        </article>
      </div>

      {loading && isEmpty && <div className="workspace-loading"><span className="loading-pulse" /> Loading workspace records…</div>}
      {!loading && isEmpty && (
        <div className="empty-message enhanced-empty dashboard-empty">
          <div className="empty-icon">✳</div>
          <h3>Welcome to your command center</h3>
          <p>Your workspace is ready. Create a project to start organizing your application inventory and recording release activity.</p>
          <button className="btn btn-primary" type="button" onClick={() => onPageChange('projects')}>Create your first project <span aria-hidden="true">→</span></button>
        </div>
      )}

      <div className="dashboard-layout">
        <section className="panel">
          <div className="panel-heading">
            <div><p className="eyebrow">ACTIVITY / LAST 7 DAYS</p><h2>Release activity</h2><p>Deployment records created each day</p></div>
            <span className="panel-tag"><span className="status-pulse" /> Recorded data</span>
          </div>
          <div className="activity-chart" role="img" aria-label={'Deployment records during the last seven days. Total: ' + activity.reduce((sum, point) => sum + point.count, 0)}>
            <div className="chart-y-axis"><span>{maxActivity}</span><span>{Math.ceil(maxActivity / 2)}</span><span>0</span></div>
            <div className="activity-plot">
              {activity.map(point => (
                <div className="activity-bar-wrap" key={point.key} title={point.count + ' deployment record' + (point.count === 1 ? '' : 's')}>
                  <div className={'activity-bar' + (point.count ? ' has-value' : '')} style={{ height: point.count ? Math.max(9, point.count / maxActivity * 100) + '%' : '0%' }} />
                  <span className="activity-bar-wrap-label">{point.label}</span>
                </div>
              ))}
              {activity.every(point => point.count === 0) && <div className="chart-empty">No deployment records created in the last 7 days</div>}
            </div>
          </div>
          <div className="chart-footnote"><span>7-day window</span><strong>{activity.reduce((sum, point) => sum + point.count, 0)} records</strong></div>
        </section>

        <section className="panel">
          <div className="panel-heading">
            <div><p className="eyebrow">RELEASE RECORDS</p><h2>Status distribution</h2><p>Current states in your history</p></div>
            <span className="panel-tag">All records</span>
          </div>
          <div className="status-overview">
            <div className="status-ring" style={{
              '--success-share': successShare + '%',
              '--running-share': runningShare + '%',
              '--warning-share': warningShare + '%'
            }}>
              <div className="status-ring-inner"><strong>{stats.totalDeployments}</strong><span>records</span></div>
            </div>
            <div className="status-legend">
              {statusParts.map(part => (
                <div className="status-legend-row" key={part.key}>
                  <span className="status-legend-label"><i style={{ '--dot-color': part.color }} />{part.label}</span>
                  <strong>{part.count}</strong>
                </div>
              ))}
            </div>
          </div>
          <div className="status-footnote">These are tracked deployment states. ORBIT does not execute builds or provision cloud resources in this release.</div>
        </section>
      </div>

      <div className="dashboard-layout">
        <section className="panel">
          <div className="panel-heading">
            <div><p className="eyebrow">LATEST UPDATES</p><h2>Recent deployment records</h2><p>Most recently created entries in your workspace</p></div>
            <button type="button" className="btn btn-secondary btn-small" onClick={() => onPageChange('deployments')}>View all <span aria-hidden="true">↗</span></button>
          </div>
          {recentDeployments.length ? (
            <div className="activity-list">
              {recentDeployments.map(deployment => {
                const color = deployment.status === 'completed' ? '#6de0cb' : deployment.status === 'failed' ? '#ff829a' : deployment.status === 'pending' ? '#ffcf75' : '#8ba5ff';
                return <div className="activity-item" key={deployment.id}>
                  <span className="activity-item-icon" aria-hidden="true">↗</span>
                  <div className="activity-item-content">
                    <strong>{deployment.project_name || projects.find(project => Number(project.id) === Number(deployment.project_id))?.name || 'Project'}</strong>
                    <span>Version {deployment.version || '—'} · branch {deployment.branch || '—'}</span>
                    <span className="activity-status" style={{ '--status-color': color }}>{String(deployment.status || 'unknown').replace('-', ' ')}</span>
                  </div>
                  <span className="activity-item-meta">{formatRelative(deployment.created_at)}</span>
                </div>;
              })}
            </div>
          ) : (
            <div className="empty-message enhanced-empty compact-empty">
              <h3>No release records yet</h3>
              <p>Once you record a deployment, it will appear here with its current status and version.</p>
              <button type="button" className="btn btn-secondary" onClick={() => onPageChange('deployments')}>Record a deployment</button>
            </div>
          )}
        </section>

        <section className="panel">
          <div className="panel-heading"><div><p className="eyebrow">SHORTCUTS</p><h2>Quick access</h2><p>Jump straight to a workspace task</p></div></div>
          <div className="quick-actions">
            <button type="button" className="quick-action" onClick={() => onPageChange('projects')}>
              <span className="quick-action-icon">＋</span><span><strong>Project inventory</strong><small>Create, edit, organize</small></span>
            </button>
            <button type="button" className="quick-action" onClick={() => onPageChange('deployments')}>
              <span className="quick-action-icon">↗</span><span><strong>Release history</strong><small>Record a deployment</small></span>
            </button>
            <button type="button" className="quick-action" onClick={() => onPageChange('metrics')}>
              <span className="quick-action-icon">⌁</span><span><strong>Observability</strong><small>Review recorded metrics</small></span>
            </button>
          </div>
          <div className="workspace-note"><span className="workspace-note-mark">i</span><p><strong>Clear by design.</strong> Dashboard counts come from saved workspace records. Telemetry is only shown when measurement data exists.</p></div>
        </section>
      </div>
    </div>
  );
}
