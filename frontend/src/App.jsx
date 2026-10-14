import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { createDemoApi } from './utils/demoApi';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import Deployments from './pages/Deployments';
import Metrics from './pages/Metrics';
import Teams from './pages/Teams';
import Instances from './pages/Instances';
import Settings from './pages/Settings';
import Navigation from './components/Navigation';
import CommandPalette from './components/CommandPalette';
import SmokeBackground from './components/SmokeBackground';
import { AnimatePresence, motion } from 'framer-motion';

const API_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/+$/, '');
const HEALTH_URL = import.meta.env.VITE_HEALTH_URL || API_URL.replace(/\/api\/?$/, '') + '/health';
const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';
const DEFAULT_REFRESH_SECONDS = 30;

function readInitialToken() {
  try {
    const existing = localStorage.getItem('token');
    if (existing) return existing;
    // GitHub Pages is a browser-only demo; open the workspace immediately on first visit.
    // This token is only a demo identifier consumed by demoApi, never a server JWT.
    if (DEMO_MODE && localStorage.getItem('orbit.demo.loggedOut') !== 'true') {
      const demoToken = 'orbit-pages-demo-1-' + Date.now().toString(36);
      localStorage.setItem('token', demoToken);
      if (!localStorage.getItem('orbit.user')) {
        localStorage.setItem('orbit.user', JSON.stringify({
          id: 1, email: 'demo@orbit.local', username: 'demo', name: 'Demo User'
        }));
      }
      return demoToken;
    }
    return null;
  } catch { return null; }
}

function readStoredUser() {
  try {
    const stored = JSON.parse(localStorage.getItem('orbit.user') || 'null');
    if (stored) return stored;
    return DEMO_MODE && localStorage.getItem('token')?.startsWith('orbit-pages-demo-')
      ? { id: 1, email: 'demo@orbit.local', username: 'demo', name: 'Demo User' }
      : null;
  } catch { return null; }
}

function readStoredTheme() {
  try { return localStorage.getItem('orbit.theme') !== 'dark'; }
  catch { return true; }
}

function readRefreshSeconds() {
  try {
    const seconds = Number(localStorage.getItem('orbit.refreshSeconds'));
    return [15, 30, 60].includes(seconds) ? seconds : DEFAULT_REFRESH_SECONDS;
  } catch { return DEFAULT_REFRESH_SECONDS; }
}

export default function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [token, setToken] = useState(readInitialToken);
  const [user, setUser] = useState(readStoredUser);
  const [projects, setProjects] = useState([]);
  const [deployments, setDeployments] = useState([]);
  const [teams, setTeams] = useState([]);
  const [instances, setInstances] = useState([]);
  const [health, setHealth] = useState(null);
  const [lastSyncedAt, setLastSyncedAt] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [commandOpen, setCommandOpen] = useState(false);
  const [lightMode, setLightMode] = useState(readStoredTheme);
  const [refreshSeconds, setRefreshSeconds] = useState(readRefreshSeconds);

  const api = useMemo(() => DEMO_MODE ? createDemoApi() : axios.create({
    baseURL: API_URL,
    timeout: 15000,
    headers: { Accept: 'application/json' }
  }), []);

  const updateHealth = useCallback(() => {
    if (DEMO_MODE) {
      setHealth({ status: 'demo', database: 'browser storage', mode: 'browser-demo', timestamp: new Date().toISOString() });
      return;
    }
    axios.get(HEALTH_URL, { timeout: 5000 })
      .then(response => setHealth(response.data || { status: 'unknown' }))
      .catch(requestError => {
        setHealth(requestError.response?.data || {
          status: 'unavailable',
          database: 'unavailable',
          timestamp: new Date().toISOString()
        });
      });
  }, []);

  const loadWorkspace = useCallback(async ({ showSpinner = false } = {}) => {
    if (!token) return false;
    if (showSpinner) setLoading(true);
    try {
      const [projectResponse, deploymentResponse, teamResponse, instanceResponse] = await Promise.all([
        api.get('/projects'),
        api.get('/deployments'),
        api.get('/teams'),
        api.get('/instances')
      ]);
      setProjects(projectResponse.data.projects || []);
      setDeployments(deploymentResponse.data.deployments || []);
      setTeams(teamResponse.data.teams || []);
      setInstances(instanceResponse.data.instances || []);
      setLastSyncedAt(new Date());
      setError('');
      updateHealth();
      return true;
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Could not refresh the workspace. Your last loaded data is still visible.');
      updateHealth();
      return false;
    } finally {
      if (showSpinner) setLoading(false);
    }
  }, [api, token, updateHealth]);

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
          setTeams([]);
          setInstances([]);
          setError('Your session expired. Please sign in again.');
        }
        return Promise.reject(requestError);
      }
    );
    return () => api.interceptors.response.eject(interceptorId);
  }, [api]);

  useEffect(() => {
    if (!token) {
      delete api.defaults.headers.common.Authorization;
      setProjects([]);
      setDeployments([]);
      setTeams([]);
      setInstances([]);
      setHealth(null);
      setLastSyncedAt(null);
      setLoading(false);
      return undefined;
    }
    api.defaults.headers.common.Authorization = 'Bearer ' + token;
    loadWorkspace({ showSpinner: true });
    return undefined;
  }, [api, token, loadWorkspace]);

  useEffect(() => {
    if (!token) return undefined;
    const tick = () => {
      if (document.visibilityState === 'visible') loadWorkspace();
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') loadWorkspace();
    };
    window.addEventListener('focus', tick);
    document.addEventListener('visibilitychange', onVisibility);
    const interval = window.setInterval(tick, refreshSeconds * 1000);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', tick);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [token, refreshSeconds, loadWorkspace]);

  const handleLogin = (newToken, userData) => {
    localStorage.removeItem('orbit.demo.loggedOut');
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
    if (DEMO_MODE) localStorage.setItem('orbit.demo.loggedOut', 'true');
    setToken(null);
    setUser(null);
    setProjects([]);
    setDeployments([]);
    setTeams([]);
    setInstances([]);
    setHealth(null);
    setCurrentPage('dashboard');
    setError('');
  };

  const refreshNow = async () => {
    setRefreshing(true);
    try { await loadWorkspace(); }
    finally { setRefreshing(false); }
  };

  const createProject = async projectData => {
    try {
      setLoading(true);
      await api.post('/projects', projectData);
      await loadWorkspace();
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
      await loadWorkspace();
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
      await loadWorkspace();
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
      await loadWorkspace();
      return true;
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Could not record the deployment.');
      return false;
    } finally { setLoading(false); }
  };

  const createTeam = async teamData => {
    try {
      setLoading(true);
      await api.post('/teams', teamData);
      await loadWorkspace();
      return true;
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Could not create the team.');
      return false;
    } finally { setLoading(false); }
  };

  const createInstance = async instanceData => {
    try {
      setLoading(true);
      await api.post('/instances', instanceData);
      await loadWorkspace();
      return true;
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Could not create the instance record.');
      return false;
    } finally { setLoading(false); }
  };

  const changeRefreshSeconds = value => {
    const normalized = [15, 30, 60].includes(Number(value)) ? Number(value) : DEFAULT_REFRESH_SECONDS;
    localStorage.setItem('orbit.refreshSeconds', String(normalized));
    setRefreshSeconds(normalized);
  };

  const toggleTheme = () => {
    const next = !lightMode;
    localStorage.setItem('orbit.theme', next ? 'light' : 'dark');
    setLightMode(next);
  };

  const importWorkspaceBackup = async snapshot => {
    if (!DEMO_MODE || typeof api.restoreWorkspace !== 'function') {
      throw new Error('Restore is available only in browser-demo mode.');
    }
    const result = await api.restoreWorkspace(snapshot);
    const loaded = await loadWorkspace({ showSpinner: true });
    if (!loaded) throw new Error('Backup was restored but the workspace could not refresh. Reload this page to verify the records.');
    return result.data;
  };

  const renderPage = () => {
    if (!token) return <Login onLogin={handleLogin} api={api} />;
    switch (currentPage) {
      case 'projects':
        return <Projects projects={projects} loading={loading} onCreateProject={createProject} onUpdateProject={updateProject} onDeleteProject={deleteProject} />;
      case 'deployments':
        return <Deployments deployments={deployments} projects={projects} loading={loading} onDeploy={createDeployment} />;
      case 'metrics':
        return <Metrics projects={projects} api={api} refreshSeconds={refreshSeconds} />;
      case 'teams':
        return <Teams teams={teams} loading={loading} onCreateTeam={createTeam} onRefresh={refreshNow} />;
      case 'instances':
        return <Instances instances={instances} projects={projects} deployments={deployments} loading={loading} onCreateInstance={createInstance} />;
      case 'settings':
        return <Settings demoMode={DEMO_MODE} health={health} lastSyncedAt={lastSyncedAt} refreshSeconds={refreshSeconds} onRefreshSecondsChange={changeRefreshSeconds} lightMode={lightMode} onToggleTheme={toggleTheme} onRefresh={refreshNow} onImportBackup={importWorkspaceBackup} projects={projects} deployments={deployments} teams={teams} instances={instances} />;
      case 'dashboard':
      default:
        return <Dashboard
          projects={projects}
          deployments={deployments}
          teams={teams}
          instances={instances}
          health={health}
          user={user}
          demoMode={DEMO_MODE}
          loading={loading}
          refreshing={refreshing}
          lastSyncedAt={lastSyncedAt}
          onRefresh={refreshNow}
          onPageChange={setCurrentPage}
        />;
    }
  };

  return (
    <div className={'app' + (lightMode ? ' light-mode' : ' dark-mode') + (!token ? ' app-auth' : '')}>
      <SmokeBackground lightMode={lightMode} />
      {DEMO_MODE && token && <div className="demo-mode-banner" role="status">
        <span className="demo-banner-dot" /><strong>Browser demo</strong>
        <span>Changes stay in this browser · Cloud provisioning is disabled</span>
      </div>}
      {token && <Navigation
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        onOpenCommand={() => setCommandOpen(true)}
        onToggleTheme={toggleTheme}
        lightMode={lightMode}
        user={user}
        onLogout={handleLogout}
        health={health}
        demoMode={DEMO_MODE}
      />}
      <main className="main-content">
        {error && <div className="error-banner" role="alert"><span>{error}</span><button type="button" aria-label="Dismiss error" onClick={() => setError('')}>×</button></div>}
        {token && loading && projects.length === 0 && deployments.length === 0 && (
          <div className="workspace-loading" role="status"><span className="loading-pulse" /> Loading workspace records…</div>
        )}
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={token ? currentPage : 'login'} className="page-transition" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} transition={{ duration: 0.22, ease: 'easeOut' }}>
            {renderPage()}
          </motion.div>
        </AnimatePresence>
        {token && <footer className="app-footer">
          <span><strong>ORBIT</strong> · Project Operations Platform</span>
          <span>v2.0.0 <i /> {DEMO_MODE ? 'Browser demo' : 'Live API workspace'} · <a href="https://github.com/mahitech580/ORBIT-Platform" target="_blank" rel="noreferrer">Source code</a></span>
        </footer>}
      </main>
      {token && commandOpen && <CommandPalette onClose={() => setCommandOpen(false)} onSelect={page => { setCurrentPage(page); setCommandOpen(false); }} />}
    </div>
  );
}
