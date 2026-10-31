import React, { useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import OrbitalScene from '../components/OrbitalScene';
import { describeDeploymentActivity } from '../utils/deploymentActivityLabel.js';
import { summarizeDeploymentStatuses } from '../utils/deploymentStatusSummary.js';

const riseIn = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.48, ease: [0.22, 1, 0.36, 1] } } };
const staggerIn = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.075, delayChildren: 0.06 } } };

const EARTH_IMAGE = 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&w=1800&q=85';
const MOUNTAIN_IMAGE = 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1000&q=85';

function safeDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}
function formatDate(value) {
  const date = safeDate(value);
  return date ? date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '—';
}
function relativeTime(value) {
  const date = safeDate(value);
  if (!date) return 'Date unavailable';
  const delta = Math.max(0, Date.now() - date.getTime());
  const minutes = Math.floor(delta / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return minutes + ' min ago';
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours + ' hr ago';
  const days = Math.floor(hours / 24);
  return days === 1 ? 'Yesterday' : days + ' days ago';
}
function runtimeLabel(value) {
  return ({ node: 'Node.js', python: 'Python', java: 'Java', go: 'Go' })[String(value || '').toLowerCase()] || value || 'Runtime not set';
}
function healthLabel(health, demoMode) {
  if (demoMode || health?.status === 'demo') return 'Demo data';
  if (health?.status === 'ok') return 'Healthy';
  if (health?.status === 'degraded') return 'Degraded';
  if (health?.status === 'unavailable') return 'Unavailable';
  return 'Checking';
}
function stateTone(status) {
  if (status === 'completed' || status === 'active' || status === 'ok') return 'green';
  if (status === 'failed' || status === 'unavailable') return 'red';
  if (status === 'pending' || status === 'in-progress' || status === 'degraded') return 'yellow';
  return 'blue';
}
function linePath(values, width, height, topPad = 10, sidePad = 12, scaleMax = null) {
  if (!values.length) return '';
  const max = scaleMax || Math.max(1, ...values);
  const usableWidth = width - sidePad * 2;
  const usableHeight = height - topPad - 12;
  return values.map((value, index) => {
    const x = sidePad + (values.length === 1 ? 0 : index * usableWidth / (values.length - 1));
    const y = topPad + usableHeight - (Number(value || 0) / max) * usableHeight;
    return (index ? 'L' : 'M') + x.toFixed(1) + ',' + y.toFixed(1);
  }).join(' ');
}
function StatIcon({ icon, color }) {
  return <span className={'stat-icon-tile ' + color} aria-hidden="true">{icon}</span>;
}

export default function Dashboard({
  projects = [],
  deployments = [],
  teams = [],
  instances = [],
  health,
  user,
  demoMode,
  loading,
  refreshing,
  lastSyncedAt,
  onRefresh,
  onPageChange
}) {
  const shouldReduceMotion = useReducedMotion();
  const cardVariants = shouldReduceMotion
    ? { hidden: { opacity: 1, y: 0 }, show: { opacity: 1, y: 0, transition: { duration: 0 } } }
    : riseIn;
  const groupVariants = shouldReduceMotion
    ? { hidden: { opacity: 1 }, show: { opacity: 1, transition: { duration: 0, staggerChildren: 0, delayChildren: 0 } } }
    : staggerIn;
  const stats = useMemo(() => {
    const deploymentStatuses = summarizeDeploymentStatuses(deployments);
    return {
      projects: projects.length,
      activeProjects: projects.filter(project => project.status === 'active').length,
      releases: deploymentStatuses.total,
      completed: deploymentStatuses.completed,
      failed: deploymentStatuses.failed,
      pending: deploymentStatuses.pending,
      other: deploymentStatuses.other,
      activeTeams: teams.length,
      instanceRecords: instances.length
    };
  }, [projects, deployments, teams, instances]);

  const weekly = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() - (6 - index));
      const key = [date.getFullYear(), date.getMonth(), date.getDate()].join('-');
      const entries = deployments.filter(item => {
        const itemDate = safeDate(item.created_at);
        return itemDate && [itemDate.getFullYear(), itemDate.getMonth(), itemDate.getDate()].join('-') === key;
      });
      return {
        key,
        day: date.toLocaleDateString(undefined, { weekday: 'short' }),
        date,
        total: entries.length,
        completed: entries.filter(item => item.status === 'completed').length,
        failed: entries.filter(item => item.status === 'failed').length,
        pending: entries.filter(item => ['pending', 'in-progress'].includes(item.status)).length
      };
    });
  }, [deployments]);

  const recentProjects = useMemo(() => [...projects]
    .sort((a, b) => new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0))
    .slice(0, 5), [projects]);

  const activity = useMemo(() => {
    const rows = [
      ...deployments.map(item => ({
        key: 'deployment-' + item.id,
        type: 'deployment',
        title: item.status === 'completed' ? 'Deployment completed' : item.status === 'failed' ? 'Deployment failed' : 'Deployment record created',
        detail: (item.project_name || projects.find(project => Number(project.id) === Number(item.project_id))?.name || 'Project') + ' · ' + (item.version || 'version not set'),
        status: item.status,
        at: item.completed_at || item.created_at
      })),
      ...projects.map(item => {
        const created = safeDate(item.created_at);
        const updated = safeDate(item.updated_at);
        const changed = created && updated && updated.getTime() - created.getTime() > 60000;
        return {
          key: 'project-' + item.id,
          type: 'project',
          title: changed ? 'Project updated' : 'Project created',
          detail: item.name || 'Unnamed project',
          status: item.status,
          at: item.updated_at || item.created_at
        };
      }),
      ...instances.map(item => ({
        key: 'instance-' + item.id,
        type: 'instance',
        title: 'Instance record created',
        detail: (item.project_name || 'Project') + ' · ' + (item.name || item.instance_type || 'Instance'),
        status: item.status,
        at: item.created_at
      }))
    ];
    return rows.sort((a, b) => (safeDate(b.at)?.getTime() || 0) - (safeDate(a.at)?.getTime() || 0)).slice(0, 5);
  }, [deployments, projects, instances]);

  const getProjectName = deployment => deployment.project_name ||
    projects.find(project => Number(project.id) === Number(deployment.project_id))?.name || 'Unknown project';

  const healthText = healthLabel(health, demoMode);
  const apiHealthy = demoMode ? null : health?.status === 'ok' ? true : health?.status === 'degraded' ? 'degraded' : health?.status === 'unavailable' ? false : null;
  const dbHealthy = demoMode ? null : health?.database === 'connected';
  const noReleaseData = deployments.length === 0;
  const successPercent = deployments.length ? stats.completed / deployments.length * 100 : 0;
  const failedPercent = deployments.length ? stats.failed / deployments.length * 100 : 0;
  const pendingPercent = deployments.length ? stats.pending / deployments.length * 100 : 0;
  const otherPercent = deployments.length ? stats.other / deployments.length * 100 : 0;
  const pendingEnd = successPercent + failedPercent + pendingPercent;
  const donutStyle = deployments.length ? {
    background: 'conic-gradient(#20c997 0 ' + successPercent + '%, #ff637d ' + successPercent + '% ' + (successPercent + failedPercent) + '%, #3b91ff ' + (successPercent + failedPercent) + '% ' + pendingEnd + '%, #8b9bb0 ' + pendingEnd + '% 100%)'
  } : { background: 'conic-gradient(#334360 0 100%)' };
  const name = user?.name || user?.username || user?.email?.split('@')[0] || 'there';
  const completedLine = weekly.map(item => item.completed);
  const failedLine = weekly.map(item => item.failed);
  const pendingLine = weekly.map(item => item.pending);
  const maxDaily = Math.max(1, ...weekly.map(item => item.total));
  const syncedLabel = lastSyncedAt ? lastSyncedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Not synced yet';

  return <div className="page dashboard-page">
    <div className="dashboard-intro">
      <div>
        <div className="breadcrumb-line"><span>Workspace</span><span className="breadcrumb-slash">/</span><strong>Dashboard</strong><span className="release-chip">ORBIT 2.0</span></div>
        <h1>Dashboard</h1>
        <p className="dashboard-intro-subtitle">Your project operations, simplified.</p>
        <p className="dashboard-intro-copy">Build, track, and understand what is happening across your project workspace.</p>
      </div>
      <div className="dashboard-header-actions">
        <span className={'sync-state' + (demoMode ? ' demo' : health?.status === 'ok' ? ' good' : ' warn')}><i />{demoMode ? 'Browser demo' : healthText}</span>
        <button type="button" className="btn btn-secondary refresh-button" onClick={onRefresh} disabled={refreshing || loading} aria-label="Refresh workspace">
          <span className={refreshing ? 'refresh-glyph rotating' : 'refresh-glyph'}>↻</span>{refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>
    </div>

    <div className="dashboard-layout">
      <section className="dashboard-primary" aria-label="Dashboard overview">
        <motion.section className="hero-banner" style={{ '--earth-image': 'url("' + EARTH_IMAGE + '")' }} initial={shouldReduceMotion ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.62, ease: [0.22, 1, 0.36, 1] }}>
          <div className="hero-image-shade" />
          <div className="hero-content">
            <span className="hero-eyebrow"><i /> PROJECT OPERATIONS PLATFORM</span>
            <h2>Welcome back, {name} <span className="wave">👋</span><br /><span>let’s build something great.</span></h2>
            <p>Manage projects, track deployment records, and review the performance data that is actually available.</p>
            <div className="hero-actions">
              <button className="btn btn-primary" type="button" onClick={() => onPageChange('projects')}><span>＋</span> New project</button>
              <a className="btn btn-hero-secondary" href="https://github.com/mahitech580/ORBIT-Platform#readme" target="_blank" rel="noreferrer">View documentation <span>↗</span></a>
            </div>
          </div>
          <OrbitalScene />
        </motion.section>

        <motion.section className="stats-grid" aria-label="Workspace counts" variants={groupVariants} initial="hidden" animate="show">
          <motion.article className="metric-card metric-blue" variants={cardVariants} whileHover={shouldReduceMotion ? undefined : { y: -3, transition: { duration: 0.18 } }}>
            <div className="metric-card-top"><span>Total projects</span><StatIcon icon="▣" color="blue" /></div>
            <div className="metric-value">{stats.projects}<span className="metric-detail-count">{stats.activeProjects} active</span></div>
            <div className="metric-card-foot"><span className="metric-foot-dot" /> Project inventory</div><span className="metric-card-glow" />
          </motion.article>
          <motion.article className="metric-card metric-violet" variants={cardVariants} whileHover={shouldReduceMotion ? undefined : { y: -3, transition: { duration: 0.18 } }}>
            <div className="metric-card-top"><span>Deployment records</span><StatIcon icon="↗" color="violet" /></div>
            <div className="metric-value">{stats.releases}<span className="metric-detail-count">{stats.pending} in progress</span></div>
            <div className="metric-card-foot"><span className="metric-foot-dot" /> Release history</div><span className="metric-card-glow" />
          </motion.article>
          <motion.article className="metric-card metric-green" variants={cardVariants} whileHover={shouldReduceMotion ? undefined : { y: -3, transition: { duration: 0.18 } }}>
            <div className="metric-card-top"><span>System health</span><StatIcon icon="⌁" color="green" /></div>
            <div className="metric-value metric-health-value">{healthText}<i className={'health-status-dot ' + stateTone(health?.status)} /></div>
            <div className="metric-card-foot"><span className="metric-foot-dot" />{demoMode ? 'Local sample data' : health?.database === 'connected' ? 'Database connected' : 'Based on API health check'}</div><span className="metric-card-glow" />
          </motion.article>
          <motion.article className="metric-card metric-orange" variants={cardVariants} whileHover={shouldReduceMotion ? undefined : { y: -3, transition: { duration: 0.18 } }}>
            <div className="metric-card-top"><span>Workspace teams</span><StatIcon icon="♧" color="orange" /></div>
            <div className="metric-value">{stats.activeTeams}<span className="metric-detail-count">{stats.instanceRecords} instance records</span></div>
            <div className="metric-card-foot"><span className="metric-foot-dot" /> Teams & resources</div><span className="metric-card-glow" />
          </motion.article>
        </motion.section>

        <div className="dashboard-analytics-grid">
          <section className="surface-card deployment-activity-card">
            <div className="surface-card-header">
              <div><h2>Deployment activity</h2><p>New records created over the last 7 days</p></div>
              <span className="range-select-label">Last 7 days <span>⌄</span></span>
            </div>
            <div className="chart-legend">
              <span><i className="legend-green" /> Completed</span><span><i className="legend-red" /> Failed</span><span><i className="legend-blue" /> Pending / in progress</span>
            </div>
            {noReleaseData ? <div className="chart-empty-state"><span className="chart-empty-glyph">⌁</span><strong>No deployment activity yet</strong><small>Record a deployment to start building your history chart.</small><button className="text-link" type="button" onClick={() => onPageChange('deployments')}>Record deployment →</button></div> : <div className="activity-chart-shell">
              <div className="chart-y-labels"><span>{maxDaily}</span><span>{Math.ceil(maxDaily * .66)}</span><span>{Math.ceil(maxDaily * .33)}</span><span>0</span></div>
              <svg className="activity-chart-svg" viewBox="0 0 700 190" role="img" aria-label={describeDeploymentActivity(weekly)} preserveAspectRatio="none">
                <defs>
                  <linearGradient id="completedFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#20c997" stopOpacity=".25" /><stop offset="1" stopColor="#20c997" stopOpacity="0" /></linearGradient>
                  <linearGradient id="pendingFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#3b91ff" stopOpacity=".16" /><stop offset="1" stopColor="#3b91ff" stopOpacity="0" /></linearGradient>
                </defs>
                {[28, 70, 112, 154].map(y => <line key={y} x1="12" y1={y} x2="688" y2={y} className="chart-grid-line" />)}
                {[
                  { values: completedLine, color: '#20c997', fill: 'url(#completedFill)' },
                  { values: pendingLine, color: '#3b91ff', fill: 'url(#pendingFill)' },
                  { values: failedLine, color: '#ff637d', fill: '' }
                ].map(series => {
                  const path = linePath(series.values, 700, 175, 18, 12, maxDaily);
                  const fillPath = path ? path + ' L688,175 L12,175 Z' : '';
                  return <g key={series.color}>
                    {series.fill && <path d={fillPath} fill={series.fill} />}
                    <path d={path} fill="none" stroke={series.color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
                    {series.values.map((value, index) => {
                      const x = 12 + (index * 676 / 6);
                      const y = 18 + 145 - (Number(value || 0) / maxDaily * 145);
                      return <circle key={index} cx={x} cy={y} r="3.5" fill={series.color} stroke="#09162a" strokeWidth="1.5"><title>{value} records</title></circle>;
                    })}
                  </g>;
                })}
              </svg>
              <div className="chart-x-labels">{weekly.map(item => <span key={item.key}><strong>{item.day}</strong><small>{item.date.getDate()}</small></span>)}</div>
            </div>}
            <div className="chart-card-footer"><span>Activity derived from saved deployment records</span><button type="button" className="text-link" onClick={() => onPageChange('deployments')}>View history →</button></div>
          </section>

          <section className="surface-card deployment-status-card">
            <div className="surface-card-header"><div><h2>Deployment status</h2><p>Current record distribution</p></div><button className="icon-text-button" type="button" title="Open deployments" onClick={() => onPageChange('deployments')}>↗</button></div>
            <div className="donut-wrap"><div className="status-donut" style={donutStyle}><div><strong>{stats.releases}</strong><span>Total</span></div></div></div>
            <div className="donut-legend">
              <div><span><i className="legend-green" />Completed</span><strong>{stats.completed}</strong><small>{stats.releases ? Math.round(successPercent) : 0}%</small></div>
              <div><span><i className="legend-blue" />Pending / in progress</span><strong>{stats.pending}</strong><small>{stats.releases ? Math.round(pendingPercent) : 0}%</small></div>
              <div><span><i className="legend-red" />Failed</span><strong>{stats.failed}</strong><small>{stats.releases ? Math.round(failedPercent) : 0}%</small></div>
              <div><span><i className="legend-gray" />Other / unclassified</span><strong>{stats.other}</strong><small>{stats.releases ? Math.round(otherPercent) : 0}%</small></div>
            </div>
            <p className="card-disclaimer">Tracking only. This version does not run builds or provision cloud infrastructure.</p>
          </section>
        </div>

        <div className="dashboard-lower-grid">
          <section className="surface-card recent-projects-card">
            <div className="surface-card-header">
              <div><h2>Recent projects <span className="section-count">{stats.projects}</span></h2><p>Latest updates from your inventory</p></div>
              <button className="text-link" type="button" onClick={() => onPageChange('projects')}>View all →</button>
            </div>
            {recentProjects.length ? <div className="responsive-table-wrap">
              <table className="dashboard-table">
                <thead><tr><th>Name</th><th>Runtime</th><th>Last updated</th><th>Status</th><th aria-label="Actions" /></tr></thead>
                <tbody>{recentProjects.map(project => <tr key={project.id}>
                  <td><div className="table-project-cell"><span className={'project-mini-icon runtime-' + String(project.runtime || '').toLowerCase()}>{runtimeLabel(project.runtime).slice(0, 1).toUpperCase()}</span><span><button className="table-link" type="button" onClick={() => onPageChange('projects')}>{project.name}</button><small>{project.description || 'No description provided'}</small></span></div></td>
                  <td><span className="runtime-name"><i className={'runtime-dot runtime-' + String(project.runtime || '').toLowerCase()} />{runtimeLabel(project.runtime)}</span></td>
                  <td className="muted-cell">{relativeTime(project.updated_at || project.created_at)}</td>
                  <td><span className={'status-pill ' + stateTone(project.status)}>{project.status || 'active'}</span></td>
                  <td><button className="row-more-button" type="button" onClick={() => onPageChange('projects')} aria-label={'Manage ' + project.name}>⋮</button></td>
                </tr>)}</tbody>
              </table>
            </div> : <div className="empty-list-state"><p>No projects have been created yet.</p><button className="text-link" type="button" onClick={() => onPageChange('projects')}>Create your first project →</button></div>}
          </section>

          <section className="surface-card quick-actions-card">
            <div className="surface-card-header"><div><h2>Quick actions</h2><p>Jump straight into your workflow</p></div><span className="surface-header-mark">⌘</span></div>
            <div className="quick-action-grid">
              <button type="button" className="quick-action-tile" onClick={() => onPageChange('projects')}><span className="quick-action-icon blue">＋</span><strong>New project</strong><small>Create a project</small></button>
              <button type="button" className="quick-action-tile" onClick={() => onPageChange('deployments')}><span className="quick-action-icon violet">↗</span><strong>Deploy</strong><small>Record a release</small></button>
              <button type="button" className="quick-action-tile" onClick={() => onPageChange('metrics')}><span className="quick-action-icon green">⌁</span><strong>View metrics</strong><small>Check measurements</small></button>
              <button type="button" className="quick-action-tile" onClick={() => onPageChange('teams')}><span className="quick-action-icon orange">♧</span><strong>Manage teams</strong><small>Organize workspace</small></button>
            </div>
          </section>
        </div>
      </section>

      <aside className="dashboard-right-rail">
        <section className="promo-card" style={{ '--mountain-image': 'url("' + MOUNTAIN_IMAGE + '")' }}>
          <div className="promo-card-overlay" />
          <div className="promo-card-content"><span className="promo-kicker">ORBIT WORKSPACE</span><h2>Build something<br />remarkable.</h2><p>Projects, releases, and operational records — together in one place.</p><button className="btn btn-promo" type="button" onClick={() => onPageChange('projects')}>Explore projects <span>→</span></button></div>
        </section>

        <section className="rail-card recent-activity-card">
          <div className="rail-card-heading"><div><h2>Recent activity</h2><p>From saved workspace records</p></div><button className="text-link" type="button" onClick={() => onPageChange('deployments')}>View all</button></div>
          {activity.length ? <div className="activity-feed">{activity.map(item => {
            const icon = item.type === 'deployment' ? (item.status === 'failed' ? '!' : '↗') : item.type === 'instance' ? '▧' : '▤';
            return <article className="activity-feed-item" key={item.key}>
              <span className={'activity-feed-icon ' + (item.type === 'deployment' ? 'violet' : item.type === 'instance' ? 'orange' : 'blue')}>{icon}</span>
              <div className="activity-feed-copy"><strong>{item.title}</strong><span>{item.detail}</span><small>{relativeTime(item.at)}</small></div>
            </article>;
          })}</div> : <div className="rail-empty-state">Workspace activity will appear here after a project or deployment record is created.</div>}
        </section>

        <section className="rail-card system-status-card">
          <div className="rail-card-heading"><div><h2>System status</h2><p>Verified service signals</p></div><button className="icon-text-button" type="button" title="Open settings" onClick={() => onPageChange('settings')}>↗</button></div>
          <div className="system-status-list">
            <div className="system-status-row"><span className="service-icon">⌘</span><span className="service-label"><strong>API server</strong><small>{demoMode ? 'Not connected in browser demo' : 'Health endpoint'}</small></span><span className={'service-state ' + (apiHealthy === true ? 'up' : apiHealthy === false ? 'down' : apiHealthy === 'degraded' ? 'warn' : 'demo')}>{demoMode ? 'Demo' : healthText}</span></div>
            <div className="system-status-row"><span className="service-icon">▤</span><span className="service-label"><strong>Database</strong><small>{demoMode ? 'Browser local storage' : 'PostgreSQL health check'}</small></span><span className={'service-state ' + (dbHealthy === true ? 'up' : dbHealthy === false ? 'down' : 'demo')}>{demoMode ? 'Local only' : health?.database || 'Unknown'}</span></div>
            <div className="system-status-row"><span className="service-icon">⚙</span><span className="service-label"><strong>Build runner</strong><small>Build execution capability</small></span><span className="service-state disabled">Disabled</span></div>
            <div className="system-status-row"><span className="service-icon">☁</span><span className="service-label"><strong>Cloud provisioner</strong><small>Cloud resource provisioning</small></span><span className="service-state disabled">Disabled</span></div>
          </div>
          <div className="status-card-footer"><span className="status-card-dot" /> Last sync {syncedLabel}<button type="button" onClick={onRefresh} disabled={refreshing || loading} aria-label="Refresh system status">↻</button></div>
        </section>
      </aside>
    </div>
  </div>;
}
