import React from 'react';
import { buildWorkspaceExport } from '../utils/workspaceExport.js';

const timeLabel = value => {
  if (!value) return 'Not synced in this session';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Unknown' : date.toLocaleString();
};

export default function Settings({ demoMode, health, lastSyncedAt, refreshSeconds, onRefreshSecondsChange, lightMode, onToggleTheme, onRefresh, projects = [], deployments = [], teams = [], instances = [] }) {
  const exportWorkspace = () => {
    const backup = buildWorkspaceExport({
      mode: demoMode ? 'browser-demo' : 'server-api',
      projects,
      deployments,
      teams,
      instances
    });
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'orbit-workspace-' + new Date().toISOString().slice(0, 10) + '.json';
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const apiStatus = demoMode ? 'Browser demo' : health?.status === 'ok' ? 'Connected' : health?.status === 'degraded' ? 'Degraded' : health?.status === 'unavailable' ? 'Unavailable' : 'Checking';
  const databaseStatus = demoMode ? 'Local browser storage' : health?.database || 'Unknown';

  return <div className="page management-page settings-page">
    <div className="page-heading-row"><div><div className="eyebrow">WORKSPACE / PREFERENCES</div><h1>Settings</h1><p>Control how this workspace refreshes and displays data.</p></div><button type="button" className="btn btn-secondary" onClick={onRefresh}>↻ Check now</button></div>
    <section className="surface-card settings-section"><div className="settings-section-head"><span className="settings-icon">◷</span><div><h2>Data refresh</h2><p>ORBIT re-reads workspace records on the selected interval while this tab is open and visible.</p></div></div>
      <div className="setting-row"><div><strong>Automatic refresh interval</strong><small>Applies to projects, deployments, teams, and instance records.</small></div><select aria-label="Automatic refresh interval" value={refreshSeconds} onChange={event => onRefreshSecondsChange(Number(event.target.value))}><option value={15}>Every 15 seconds</option><option value={30}>Every 30 seconds</option><option value={60}>Every 60 seconds</option></select></div>
      <div className="setting-row"><div><strong>Last workspace refresh</strong><small>Timestamp from the most recent successful workspace read.</small></div><span className="setting-value">{timeLabel(lastSyncedAt)}</span></div>
    </section>
    <section className="surface-card settings-section"><div className="settings-section-head"><span className="settings-icon">☼</span><div><h2>Appearance</h2><p>Choose the default visual mode for the dashboard.</p></div></div>
      <div className="setting-row"><div><strong>Light appearance</strong><small>Switch between the immersive dark workspace and a brighter content canvas.</small></div><button type="button" className={'toggle-switch' + (lightMode ? ' enabled' : '')} role="switch" aria-checked={lightMode} onClick={onToggleTheme}><span /></button></div>
    </section>
    <section className="surface-card settings-section"><div className="settings-section-head"><span className="settings-icon">⌁</span><div><h2>Service connection</h2><p>Status comes from the API health endpoint; the browser demo cannot query backend infrastructure.</p></div></div>
      <div className="setting-row"><div><strong>Application API</strong><small>{demoMode ? 'The public demo uses a browser-only adapter.' : 'Backend health endpoint.'}</small></div><span className={'status-pill ' + (health?.status === 'ok' ? 'green' : demoMode ? 'blue' : 'yellow')}>{apiStatus}</span></div>
      <div className="setting-row"><div><strong>Database</strong><small>{demoMode ? 'Records are stored locally in this browser.' : 'Database connectivity reported by the backend.'}</small></div><span className={'status-pill ' + (health?.database === 'connected' ? 'green' : demoMode ? 'blue' : 'yellow')}>{databaseStatus}</span></div>
      <div className="setting-row"><div><strong>Build execution</strong><small>This release tracks deployment records only.</small></div><span className="status-pill gray">Not configured</span></div>
      <div className="setting-row"><div><strong>Cloud resource provisioning</strong><small>No cloud provider adapter is configured in this release.</small></div><span className="status-pill gray">Not configured</span></div>
    </section>
    <section className="surface-card settings-section"><div className="settings-section-head"><span className="settings-icon">⇩</span><div><h2>Workspace backup</h2><p>Download the records currently loaded in this workspace as a versioned JSON file.</p></div></div>
      <div className="setting-row"><div><strong>Export workspace records</strong><small>Project, deployment, team, and instance data only. Credential-like fields are stripped; the file may still contain operational information.</small></div><button type="button" className="btn btn-secondary" onClick={exportWorkspace}>↓ Export JSON</button></div>
    </section>
    <p className="settings-footnote">Settings for refresh interval and appearance are saved in this browser. Account, project, team, deployment, and instance records use the active API mode. A backup does not include sign-in tokens or account credentials.</p>
  </div>;
}
