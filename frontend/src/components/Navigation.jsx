import React from 'react';

export default function Navigation({ currentPage, onPageChange, user, onLogout }) {
  return (
    <nav className="navbar">
      <div className="nav-container">
        <div className="nav-logo">
          <h1>🚀 ORBIT</h1>
          <span className="logo-subtitle">Platform</span>
        </div>

        <ul className="nav-menu">
          <li>
            <button 
              className={`nav-link ${currentPage === 'dashboard' ? 'active' : ''}`}
              onClick={() => onPageChange('dashboard')}
            >
              📊 Dashboard
            </button>
          </li>
          <li>
            <button 
              className={`nav-link ${currentPage === 'projects' ? 'active' : ''}`}
              onClick={() => onPageChange('projects')}
            >
              📁 Projects
            </button>
          </li>
          <li>
            <button 
              className={`nav-link ${currentPage === 'deployments' ? 'active' : ''}`}
              onClick={() => onPageChange('deployments')}
            >
              🚀 Deployments
            </button>
          </li>
          <li>
            <button 
              className={`nav-link ${currentPage === 'metrics' ? 'active' : ''}`}
              onClick={() => onPageChange('metrics')}
            >
              📈 Metrics
            </button>
          </li>
        </ul>

        <div className="nav-user">
          {user && (
            <span className="user-info">
              👤 {user.email || user.name}
            </span>
          )}
          <button className="btn btn-small btn-danger" onClick={onLogout}>
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}
