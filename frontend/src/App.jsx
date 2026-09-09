import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import Deployments from './pages/Deployments';
import Metrics from './pages/Metrics';
import Navigation from './components/Navigation';

const API_URL = 'http://localhost:5000/api';

export default function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [user, setUser] = useState(null);
  const [projects, setProjects] = useState([]);
  const [deployments, setDeployments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // API Client
  const api = axios.create({
    baseURL: API_URL,
    headers: token ? { 'Authorization': `Bearer ${token}` } : {}
  });

  // Update API headers when token changes
  useEffect(() => {
    if (token) {
      api.defaults.headers['Authorization'] = `Bearer ${token}`;
    }
  }, [token]);

  // Fetch projects
  const fetchProjects = async () => {
    try {
      setLoading(true);
      const response = await api.get('/projects');
      setProjects(response.data.projects);
      setError(null);
    } catch (err) {
      setError('Failed to fetch projects: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch deployments
  const fetchDeployments = async () => {
    try {
      setLoading(true);
      const response = await api.get('/deployments');
      setDeployments(response.data.deployments);
      setError(null);
    } catch (err) {
      setError('Failed to fetch deployments: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Create project
  const createProject = async (projectData) => {
    try {
      setLoading(true);
      await api.post('/projects', projectData);
      fetchProjects();
      setError(null);
      return true;
    } catch (err) {
      setError('Failed to create project: ' + err.message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Deploy project
  const deployProject = async (projectId, deployData) => {
    try {
      setLoading(true);
      await api.post(`/projects/${projectId}/deploy`, deployData);
      fetchDeployments();
      setError(null);
      return true;
    } catch (err) {
      setError('Failed to deploy: ' + err.message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Delete project
  const deleteProject = async (projectId) => {
    try {
      setLoading(true);
      await api.delete(`/projects/${projectId}`);
      fetchProjects();
      setError(null);
      return true;
    } catch (err) {
      setError('Failed to delete project: ' + err.message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Handle login
  const handleLogin = (newToken, userData) => {
    setToken(newToken);
    setUser(userData);
    localStorage.setItem('token', newToken);
    fetchProjects();
    fetchDeployments();
    setCurrentPage('dashboard');
  };

  // Handle logout
  const handleLogout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    setCurrentPage('login');
  };

  // Render page
  const renderPage = () => {
    if (!token) {
      return <Login onLogin={handleLogin} api={api} />;
    }

    switch (currentPage) {
      case 'dashboard':
        return (
          <Dashboard 
            projects={projects} 
            deployments={deployments}
            loading={loading}
          />
        );
      case 'projects':
        return (
          <Projects 
            projects={projects}
            loading={loading}
            onCreateProject={createProject}
            onDeleteProject={deleteProject}
            api={api}
          />
        );
      case 'deployments':
        return (
          <Deployments 
            deployments={deployments}
            projects={projects}
            loading={loading}
            onDeploy={deployProject}
            api={api}
          />
        );
      case 'metrics':
        return (
          <Metrics 
            projects={projects}
            api={api}
          />
        );
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="app">
      {token && (
        <Navigation 
          currentPage={currentPage} 
          onPageChange={setCurrentPage}
          user={user}
          onLogout={handleLogout}
        />
      )}
      
      <div className="main-content">
        {error && (
          <div className="error-banner">
            <span>{error}</span>
            <button onClick={() => setError(null)}>✕</button>
          </div>
        )}
        
        {renderPage()}
      </div>
    </div>
  );
}
