import React from 'react';

const items = [
  { id: 'dashboard', label: 'Overview', icon: '◉' },
  { id: 'projects', label: 'Projects', icon: '▤' },
  { id: 'deployments', label: 'Deployments', icon: '↗' },
  { id: 'metrics', label: 'Observability', icon: '⌁' }
];

function OrbitMark() {
  return (
    <span className="github-style-mark" aria-hidden="true">
      <svg viewBox="0 0 24 24" width="23" height="23" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="2.4" />
        <ellipse cx="12" cy="12" rx="9.1" ry="4.3" transform="rotate(-35 12 12)" />
        <path d="m17.4 5.4 2-2" />
      </svg>
    </span>
  );
}

export default function Navigation({ currentPage, onPageChange, onOpenCommand, user, onLogout }) {
  const displayName = user?.name || user?.username || user?.email || 'Workspace user';
  const initials = displayName.trim().charAt(0).toUpperCase() || 'U';
  const isDemo = import.meta.env.VITE_DEMO_MODE === 'true';

  return (
    <header className="site-header">
      <div className="global-header">
        <div className="global-header-left">
          <button type="button" className="brand-home" onClick={() => onPageChange('dashboard')} aria-label="ORBIT home"><OrbitMark /><span>ORBIT</span></button>
          <span className="global-divider" aria-hidden="true">/</span>
          <button type="button" className="workspace-switcher" onClick={() => onPageChange('dashboard')}><span className="workspace-switcher-icon">O</span><span>platform</span><span className="chevron">⌄</span></button>
        </div>
        <div className="global-header-right">
          <button type="button" className="global-search" onClick={onOpenCommand} aria-label="Search or jump to a page">
            <svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true"><circle cx="6.8" cy="6.8" r="4.7" /><path d="m10.3 10.3 3 3" /></svg>
            <span>Search or jump to…</span><kbd>Ctrl K</kbd>
          </button>
          <span className={'header-status' + (isDemo ? ' demo' : '')}><i />{isDemo ? 'Demo' : 'Connected'}</span>
          <div className="header-user" title={displayName}>{initials}</div>
          <button type="button" className="header-logout" onClick={onLogout} title="Sign out" aria-label="Sign out">⇥</button>
        </div>
      </div>
      <div className="repository-navigation">
        <div className="repository-tabs" role="navigation" aria-label="Workspace sections">
          {items.map(item => (
            <button
              key={item.id}
              type="button"
              className={'repository-tab' + (currentPage === item.id ? ' active' : '')}
              aria-current={currentPage === item.id ? 'page' : undefined}
              onClick={() => onPageChange(item.id)}
            >
              <span className="repository-tab-icon" aria-hidden="true">{item.icon}</span>
              <span>{item.label}</span>
              {item.id === 'projects' && <span className="tab-count">{/* Count intentionally omitted until source count is passed */}</span>}
            </button>
          ))}
        </div>
        <span className="repository-nav-meta"><span className="status-dot" /> {isDemo ? 'Browser demo' : 'Workspace'}</span>
      </div>
    </header>
  );
}
