import React from 'react';

const items = [
  { id: 'dashboard', label: 'Dashboard', icon: '⌂' },
  { id: 'projects', label: 'Projects', icon: '▤' },
  { id: 'deployments', label: 'Deployments', icon: '↗' },
  { id: 'metrics', label: 'Metrics', icon: '⌁' },
  { id: 'teams', label: 'Teams', icon: '♧' },
  { id: 'instances', label: 'Instances', icon: '▧' },
  { id: 'settings', label: 'Settings', icon: '⚙' }
];

function OrbitMark() {
  return <span className="orbit-brand-mark" aria-hidden="true">
    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="2.5" /><ellipse cx="12" cy="12" rx="9" ry="4.4" transform="rotate(-35 12 12)" /><path d="m17.5 5.4 1.9-1.9" />
    </svg>
  </span>;
}

export default function Navigation({ currentPage, onPageChange, onOpenCommand, onToggleTheme, lightMode, user, onLogout, health, demoMode }) {
  const displayName = user?.name || user?.username || user?.email || 'Workspace user';
  const initials = displayName.trim().charAt(0).toUpperCase() || 'U';
  const status = demoMode ? 'Demo environment' : health?.status === 'ok' ? 'API connected' : health?.status === 'degraded' ? 'API degraded' : health?.status === 'unavailable' ? 'API unavailable' : 'Checking API';

  return <>
    <header className="global-header">
      <div className="global-header-left">
        <button type="button" className="brand-home" onClick={() => onPageChange('dashboard')} aria-label="ORBIT home">
          <OrbitMark /><span className="brand-words"><strong>ORBIT</strong><small>PROJECT OPERATIONS</small></span>
        </button>
        <span className="brand-divider" />
        <button type="button" className="workspace-switcher" onClick={() => onPageChange('dashboard')}>
          <span className="workspace-switcher-icon">O</span><span>Workspace</span><span className="chevron">⌄</span>
        </button>
      </div>
      <div className="global-header-right">
        <button type="button" className="global-search" onClick={onOpenCommand} aria-label="Search or jump to a page">
          <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true"><circle cx="6.8" cy="6.8" r="4.7" /><path d="m10.3 10.3 3 3" /></svg>
          <span>Search or jump to a page…</span><kbd>Ctrl K</kbd>
        </button>
        <button type="button" className="header-icon-button" onClick={() => onPageChange('deployments')} aria-label="Open deployment activity" title="Deployment activity">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></svg>
        </button>
        <button type="button" className="header-icon-button theme-toggle" onClick={onToggleTheme} aria-label={lightMode ? 'Switch to dark appearance' : 'Switch to light appearance'} title={lightMode ? 'Dark appearance' : 'Light appearance'}>
          {lightMode ? '☾' : '☼'}
        </button>
        <div className="header-account">
          <span className="account-avatar">{initials}</span>
          <span className="account-copy"><strong>{displayName}</strong><small>{user?.email || status}</small></span>
          <button type="button" className="account-menu-button" onClick={onLogout} aria-label="Sign out" title="Sign out">⌄</button>
        </div>
      </div>
    </header>

    <aside className="workspace-sidebar" aria-label="Workspace navigation">
      <div className="sidebar-workspace-label"><span className="workspace-mini-mark">O</span><span><strong>ORBIT Platform</strong><small>Workspace console</small></span></div>
      <p className="sidebar-caption">WORKSPACE</p>
      <nav className="sidebar-nav">
        {items.map(item => <button
          key={item.id}
          type="button"
          className={'sidebar-nav-item' + (currentPage === item.id ? ' active' : '')}
          aria-current={currentPage === item.id ? 'page' : undefined}
          onClick={() => onPageChange(item.id)}
        >
          <span className="sidebar-nav-icon" aria-hidden="true">{item.icon}</span><span>{item.label}</span>
          {item.id === 'deployments' && <span className="nav-item-arrow">›</span>}
        </button>)}
      </nav>

      <p className="sidebar-caption quick-access-caption">QUICK ACCESS</p>
      <div className="sidebar-quick-access">
        <button type="button" onClick={() => onPageChange('projects')}><span>＋</span>Create project</button>
        <button type="button" onClick={() => onPageChange('deployments')}><span>↗</span>View deployments</button>
        <button type="button" onClick={() => onPageChange('metrics')}><span>⌁</span>View metrics</button>
        <button type="button" onClick={() => onPageChange('settings')}><span>⚙</span>Workspace settings</button>
      </div>

      <div className="sidebar-flex-spacer" />
      <div className="sidebar-space-card">
        <div className="sidebar-space-picture" role="img" aria-label="Earth viewed from space" />
        <div className="sidebar-space-content"><span>BUILD · DEPLOY · MONITOR</span><strong>Turn ideas into something real.</strong><small>Your projects, releases, and runtime records in one place.</small></div>
      </div>
      <div className="sidebar-environment">
        <span className={'environment-indicator' + (demoMode ? ' demo' : health?.status === 'ok' ? ' online' : ' uncertain')} />
        <span><strong>{demoMode ? 'Demo environment' : status}</strong><small>{demoMode ? 'Local browser data' : health?.database === 'connected' ? 'Database connected' : health?.database ? 'Database ' + health.database : 'Checking service health'}</small></span>
      </div>
      <div className="sidebar-user-row">
        <span className="sidebar-user-avatar">{initials}</span><span className="sidebar-user-copy"><strong>{displayName}</strong><small>{user?.email || 'Signed-in account'}</small></span>
        <button type="button" onClick={onLogout} title="Sign out" aria-label="Sign out">⇥</button>
      </div>
    </aside>
  </>;
}
