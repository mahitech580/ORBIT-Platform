import React from 'react';

const items = [
  { id: 'dashboard', label: 'Overview', icon: 'grid' },
  { id: 'projects', label: 'Projects', icon: 'layers' },
  { id: 'deployments', label: 'Deployments', icon: 'rocket' },
  { id: 'metrics', label: 'Observability', icon: 'activity' }
];

function Icon({ name, size = 18 }) {
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true };
  const paths = {
    grid: <><rect x="3.5" y="3.5" width="7" height="7" rx="1.8" /><rect x="13.5" y="3.5" width="7" height="7" rx="1.8" /><rect x="3.5" y="13.5" width="7" height="7" rx="1.8" /><rect x="13.5" y="13.5" width="7" height="7" rx="1.8" /></>,
    layers: <><path d="m12 3 8.5 4.7L12 12.4 3.5 7.7 12 3Z" /><path d="m3.5 12.1 8.5 4.7 8.5-4.7M3.5 16.5l8.5 4.7 8.5-4.7" /></>,
    rocket: <><path d="M5.2 14.4c-1.7-4.8 3.4-9.7 11.7-10.1 0 8.3-5.3 13.1-10.1 11.7" /><path d="m8.5 15.5-1.1 4.1-3.1-3.1 4.2-1M9 10.8h.1M13.3 7.2h.1" /><path d="M14.9 15.7c.8 1.1 2.2 1.5 3.3 1.1.4-1.1 0-2.5-1.1-3.3" /></>,
    activity: <><path d="M3 12h4l2.2-6 4.1 12 2.2-6H21" /></>,
    orbit: <><circle cx="12" cy="12" r="2.3" /><ellipse cx="12" cy="12" rx="9" ry="4.1" transform="rotate(-35 12 12)" /><path d="M17.7 5.3 19.5 3.5" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="m19.4 15 .1.1 1.2.9-1.3 2.3-1.4-.6a7.8 7.8 0 0 1-1.5.9l-.2 1.5h-2.7l-.2-1.5a7.8 7.8 0 0 1-1.5-.9l-1.4.6-1.3-2.3 1.2-.9a7.2 7.2 0 0 1 0-1.8l-1.2-.9 1.3-2.3 1.4.6a7.8 7.8 0 0 1 1.5-.9l.2-1.5h2.7l.2 1.5a7.8 7.8 0 0 1 1.5.9l1.4-.6 1.3 2.3-1.2.9a7.2 7.2 0 0 1 0 1.8Z" /></>,
    logout: <><path d="M10 17l5-5-5-5M15 12H3" /><path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6" /></>
  };
  return <svg {...common}>{paths[name] || paths.grid}</svg>;
}

export default function Navigation({ currentPage, onPageChange, user, onLogout }) {
  const displayName = user?.name || user?.username || user?.email || 'Workspace user';
  const initials = displayName.trim().charAt(0).toUpperCase() || 'U';
  const isDemo = import.meta.env.VITE_DEMO_MODE === 'true';

  return (
    <aside className="navbar" aria-label="Main navigation">
      <div className="nav-container">
        <button type="button" className="nav-logo" onClick={() => onPageChange('dashboard')} aria-label="ORBIT overview">
          <span className="brand-mark"><Icon name="orbit" size={23} /></span>
          <span className="brand-wordmark"><strong>ORBIT</strong><small>PLATFORM</small></span>
          <span className="brand-version">2.0</span>
        </button>

        <div className="nav-section-label">Workspace</div>
        <nav className="nav-menu">
          {items.map(item => (
            <button
              key={item.id}
              type="button"
              className={'nav-link' + (currentPage === item.id ? ' active' : '')}
              aria-current={currentPage === item.id ? 'page' : undefined}
              onClick={() => onPageChange(item.id)}
            >
              <span className="nav-link-icon"><Icon name={item.icon} /></span>
              <span>{item.label}</span>
              {item.id === 'projects' && <span className="nav-link-arrow">↗</span>}
            </button>
          ))}
        </nav>

        <div className="sidebar-spacer" />
        <div className="sidebar-status-card">
          <div className="sidebar-status-top"><span className="status-pulse" /><span>{isDemo ? 'Demo environment' : 'API workspace'}</span></div>
          <p>{isDemo ? 'Sample data stays in this browser.' : 'Project operations at a glance.'}</p>
          <div className="sidebar-status-foot"><span>ORBIT CORE</span><span>v2.0.0</span></div>
        </div>

        <div className="nav-user">
          <div className="user-avatar" aria-hidden="true">{initials}</div>
          <div className="user-details"><strong title={displayName}>{displayName}</strong><span>{user?.email || 'Workspace account'}</span></div>
          <button type="button" className="logout-button" onClick={onLogout} aria-label="Sign out" title="Sign out"><Icon name="logout" size={17} /></button>
        </div>
      </div>
    </aside>
  );
}
