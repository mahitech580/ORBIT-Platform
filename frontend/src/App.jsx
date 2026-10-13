import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { createDemoApi } from './utils/demoApi';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import Deployments from './pages/Deployments';
import Metrics from './pages/Metrics';
import Navigation from './components/Navigation';
import CommandPalette from './components/CommandPalette';

const API_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/+$/, '');
const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';

function readStoredUser() {
  try {
    return JSON.parse(localStorage.getItem('orbit.user') || 'null');
  } catch {
    return null;
  }
}

export default function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [token, setToken] = useState(() => localStorage.getItem('token') || null);
  const [user, setUser] = useState(readStoredUser);
  const [projects, setProjects] = useState([]);
  const [deployments, setDeployments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [commandOpen, setCommandOpen] = useState(false);

  const api = useMemo(() => DEMO_MODE ? createDemoApi() : axios.create({
    baseURL: API_URL,
    timeout: 15000,
    headers: { Accept: 'application/json' }
  }), []);

  useEffect(() => {
    const handleShortcut = event => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k' && token) {
        event.preventDefault();
        setCommandOpen(true);
      }
      if (event.key === 'Escape') setCommandOpen(false);
    };
    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, [token]);

  useEffect(() => {
    if (DEMO_MODE) return undefined;
    const interceptorId = api.interceptors.response.use(
      response => response,
      requestError => {
        if (requestError.response?.status === 401 && localStorage.getItem('token')) {
          localStorage.removeItem('token');
          localStorage.removeItem('orbit.user');
          setToken(null);
          setUser(null);
          setProjects([]);
          setDeployments([]);
          setError('Your session expired. Please sign in again.');
        }
        return Promise.reject(requestError);
      }
    );
    return () => api.interceptors.response.eject(interceptorId);
  }, [api]);

  async function refreshWorkspace() {
    const responses = await Promise.all([api.get('/projects'), api.get('/deployments')]);
    setProjects(responses[0].data.projects || []);
    setDeployments(responses[1].data.deployments || []);
    setError('');
  }

  useEffect(() => {
    if (!token) {
      delete api.defaults.headers.common.Authorization;
      setProjects([]);
      setDeployments([]);
      setLoading(false);
      return undefined;
    }
    api.defaults.headers.common.Authorization = 'Bearer ' + token;
    let active = true;
    setLoading(true);
    Promise.all([api.get('/projects'), api.get('/deployments')])
      .then(responses => {
        if (!active) return;
        setProjects(responses[0].data.projects || []);
        setDeployments(responses[1].data.deployments || []);
        setError('');
      })
      .catch(requestError => {
        if (!active) return;
        if (requestError.response?.status !== 401) {
          setError(requestError.response?.data?.error || 'Could not load the ORBIT workspace. Check the API and database.');
        }
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [api, token]);

  const handleLogin = (newToken, userData) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('orbit.user', JSON.stringify(userData || null));
    setToken(newToken);
    setUser(userData || null);
    setCurrentPage('dashboard');
    setError('');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('orbit.user');
    setToken(null);
    setUser(null);
    setProjects([]);
    setDeployments([]);
    setCurrentPage('dashboard');
    setError('');
  };

  const createProject = async projectData => {
    try {
      setLoading(true);
      await api.post('/projects', projectData);
      await refreshWorkspace();
      return true;
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Could not create the project.');
      return false;
    } finally { setLoading(false); }
  };

  const updateProject = async (projectId, projectData) => {
    try {
      setLoading(true);
      await api.put('/projects/' + projectId, projectData);
      await refreshWorkspace();
      return true;
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Could not update the project.');
      return false;
    } finally { setLoading(false); }
  };

  const deleteProject = async projectId => {
    try {
      setLoading(true);
      await api.delete('/projects/' + projectId);
      await refreshWorkspace();
      return true;
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Could not delete the project.');
      return false;
    } finally { setLoading(false); }
  };

  const createDeployment = async (projectId, deploymentData) => {
    try {
      setLoading(true);
      await api.post('/projects/' + projectId + '/deploy', deploymentData);
      await refreshWorkspace();
      return true;
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Could not record the deployment.');
      return false;
    } finally { setLoading(false); }
  };

  const renderPage = () => {
    if (!token) return <Login onLogin={handleLogin} api={api} />;
    switch (currentPage) {
      case 'projects':
        return <Projects projects={projects} loading={loading} onCreateProject={createProject} onUpdateProject={updateProject} onDeleteProject={deleteProject} />;
      case 'deployments':
        return <Deployments deployments={deployments} projects={projects} loading={loading} onDeploy={createDeployment} />;
      case 'metrics':
        return <Metrics projects={projects} api={api} />;
      case 'dashboard':
      default:
        return <Dashboard projects={projects} deployments={deployments} loading={loading} onPageChange={setCurrentPage} />;
    }
  };

  return (
    <div className={token ? 'app' : 'app app-auth'}>
      {DEMO_MODE && <div className="demo-mode-banner" role="status">
        <span className="demo-banner-dot" />
        <strong>Demo environment</strong>
        <span>Sample workspace · Changes stay in this browser · Cloud provisioning is disabled</span>
      </div>}
      {token && <Navigation
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        onOpenCommand={() => setCommandOpen(true)}
        user={user}
        onLogout={handleLogout}
      />}
      <main className="main-content">
        {error && <div className="error-banner" role="alert"><span>{error}</span><button type="button" aria-label="Dismiss error" onClick={() => setError('')}>×</button></div>}
        {token && loading && projects.length === 0 && deployments.length === 0 && (
          <div className="workspace-loading" role="status"><span className="loading-pulse" /> Loading workspace…</div>
        )}
        {renderPage()}
        {token && <footer className="app-footer"><span>© ORBIT Platform</span><span>Project and deployment tracking · Version 2.0.0</span></footer>}
      </main>
      {token && commandOpen && <CommandPalette onClose={() => setCommandOpen(false)} onSelect={page => { setCurrentPage(page); setCommandOpen(false); }} />}
    </div>
  );
}
