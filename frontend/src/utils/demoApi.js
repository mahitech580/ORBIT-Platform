import { buildWorkspaceExport, validateWorkspaceBackup } from './workspaceExport.js';

const STORAGE_KEY = 'orbit.pages.demo.data.v2';
const DEMO_EMAIL = 'demo@orbit.local';
const DEMO_PASSWORD = 'demo123';

function isoDaysAgo(days, hour = 12) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString();
}

function initialState() {
  return {
    nextProjectId: 4,
    nextDeploymentId: 3,
    nextTeamId: 2,
    accounts: [],
    teams: [{ id: 1, name: 'Demo Team', owner_id: 1, description: 'Example workspace' }],
    projects: [
      { id: 1, owner_id: 1, team_id: 1, team_name: 'Demo Team', name: 'Sample App', description: 'Example Node.js project for exploring the ORBIT workflow.', runtime: 'node', status: 'active', created_at: isoDaysAgo(12), updated_at: isoDaysAgo(1) },
      { id: 2, owner_id: 1, team_id: 1, team_name: 'Demo Team', name: 'API Server', description: 'Example Python REST API and service boundary.', runtime: 'python', status: 'active', created_at: isoDaysAgo(9), updated_at: isoDaysAgo(2) },
      { id: 3, owner_id: 1, team_id: 1, team_name: 'Demo Team', name: 'Frontend App', description: 'Example React application and user interface.', runtime: 'node', status: 'archived', created_at: isoDaysAgo(18), updated_at: isoDaysAgo(6) }
    ],
    deployments: [
      { id: 1, project_id: 1, project_name: 'Sample App', version: '1.0.0', branch: 'main', status: 'completed', deployed_by: 1, created_at: isoDaysAgo(4), completed_at: isoDaysAgo(4, 13) },
      { id: 2, project_id: 2, project_name: 'API Server', version: '0.8.2', branch: 'develop', status: 'in-progress', deployed_by: 1, created_at: isoDaysAgo(1), completed_at: null }
    ],
    instances: [],
    nextInstanceId: 1,
    metrics: {
      1: Array.from({ length: 8 }, (_, index) => {
        const cpu = [24, 31, 28, 44, 38, 57, 41, 35][index];
        return {
          id: index + 1,
          project_id: 1,
          cpu_usage: cpu,
          memory_usage: [420, 448, 430, 502, 480, 546, 518, 492][index],
          requests_total: [120, 145, 138, 181, 169, 204, 190, 216][index],
          errors_total: [1, 0, 2, 1, 0, 3, 1, 0][index],
          response_time_ms: [112, 106, 121, 134, 119, 142, 128, 116][index],
          timestamp: new Date(Date.now() - (7 - index) * 60 * 60 * 1000).toISOString()
        };
      })
    }
  };
}

function readState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const state = initialState();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      return state;
    }
    const state = JSON.parse(raw);
    if (!state || !Array.isArray(state.projects) || !Array.isArray(state.deployments)) throw new Error('Invalid demo data');
    state.accounts ||= [];
    state.teams ||= [];
    state.metrics ||= {};
    state.instances ||= [];
    return state;
  } catch {
    const state = initialState();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return state;
  }
}

function writeState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function response(data, status = 200) {
  return { data, status, headers: {}, config: { demo: true } };
}

function fail(message, status = 400) {
  const error = new Error(message);
  error.response = { status, data: { error: message } };
  throw error;
}

function currentUserId() {
  try {
    return Number(JSON.parse(localStorage.getItem('orbit.user') || 'null')?.id || 1);
  } catch {
    return 1;
  }
}

function activeUserId() {
  const token = localStorage.getItem('token') || '';
  const prefix = 'orbit-pages-demo-';
  if (token.startsWith(prefix)) return Number(token.slice(prefix.length).split('-')[0]) || 1;
  return currentUserId();
}

function ownedProjects(state) {
  const userId = activeUserId();
  return state.projects.filter(project => Number(project.owner_id || 1) === userId);
}

function ownedProject(state, id) {
  return ownedProjects(state).find(project => Number(project.id) === Number(id));
}

function nextId(state, key, collection) {
  const maxId = collection.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0);
  const id = Math.max(Number(state[key]) || 1, maxId + 1);
  state[key] = id + 1;
  return id;
}

async function passwordDigest(password) {
  if (!globalThis.crypto?.subtle) fail('This browser does not support demo sign-in. Try a current browser over HTTPS.', 501);
  const bytes = new TextEncoder().encode(password);
  const hash = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, '0')).join('');
}

function userView(account) {
  return {
    id: account.id,
    email: account.email,
    username: account.username,
    name: [account.first_name, account.last_name].filter(Boolean).join(' ') || account.username || account.email
  };
}

function tokenFor(user) {
  // This is only a client-side demo identifier, not a JWT or secure session.
  return 'orbit-pages-demo-' + user.id + '-' + Date.now().toString(36);
}

function visibleDeployments(state) {
  const projectIds = new Set(ownedProjects(state).map(project => Number(project.id)));
  return state.deployments
    .filter(deployment => projectIds.has(Number(deployment.project_id)))
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .map(deployment => ({
      ...deployment,
      project_name: deployment.project_name || state.projects.find(project => Number(project.id) === Number(deployment.project_id))?.name || 'Unknown project'
    }));
}

export function createDemoApi() {
  return {
    defaults: { headers: { common: {} } },

    async restoreWorkspace(snapshot) {
      const validation = validateWorkspaceBackup(snapshot);
      if (!validation.valid) fail(validation.errors.join(' '), 400);

      const safe = buildWorkspaceExport({
        mode: 'browser-demo',
        ...snapshot.records
      }).records;
      const state = readState();
      const userId = activeUserId();
      const previousProjects = ownedProjects(state);
      const previousProjectIds = new Set(previousProjects.map(item => Number(item.id)));

      state.projects = state.projects.filter(item => !previousProjectIds.has(Number(item.id)) || Number(item.owner_id || 1) !== userId);
      state.deployments = (state.deployments || []).filter(item => !previousProjectIds.has(Number(item.project_id)));
      state.instances = (state.instances || []).filter(item => !previousProjectIds.has(Number(item.project_id)));
      previousProjectIds.forEach(id => { delete state.metrics[id]; });
      state.teams = (state.teams || []).filter(item => Number(item.owner_id || 1) !== userId);

      const teamIdMap = new Map();
      const importedTeams = safe.teams.map((source, index) => {
        const id = nextId(state, 'nextTeamId', state.teams);
        if (source.id != null) teamIdMap.set(Number(source.id), id);
        const team = {
          id, owner_id: userId,
          name: String(source.name).trim().slice(0, 120),
          description: typeof source.description === 'string' ? source.description.slice(0, 2000) : 'Imported from ORBIT workspace backup'
        };
        state.teams.push(team);
        return team;
      });

      let fallbackTeam = importedTeams[0] || state.teams.find(item => Number(item.owner_id || 1) === userId);
      if (!fallbackTeam && safe.projects.length) {
        fallbackTeam = {
          id: nextId(state, 'nextTeamId', state.teams),
          owner_id: userId,
          name: 'Restored Workspace',
          description: 'Created while restoring a workspace backup'
        };
        state.teams.push(fallbackTeam);
      }

      const projectIdMap = new Map();
      const importedProjects = safe.projects.map(source => {
        const id = nextId(state, 'nextProjectId', state.projects);
        if (source.id != null) projectIdMap.set(Number(source.id), id);
        const teamId = teamIdMap.get(Number(source.team_id)) || fallbackTeam?.id || null;
        const team = state.teams.find(item => Number(item.id) === Number(teamId));
        const project = {
          id,
          owner_id: userId,
          team_id: teamId,
          team_name: team?.name || 'Personal workspace',
          name: String(source.name).trim().slice(0, 120),
          description: typeof source.description === 'string' ? source.description.slice(0, 2000) : '',
          runtime: ['node', 'python', 'java', 'go'].includes(String(source.runtime).toLowerCase()) ? String(source.runtime).toLowerCase() : 'node',
          status: source.status === 'archived' ? 'archived' : 'active',
          created_at: typeof source.created_at === 'string' ? source.created_at : new Date().toISOString(),
          updated_at: typeof source.updated_at === 'string' ? source.updated_at : new Date().toISOString()
        };
        state.projects.push(project);
        return project;
      });

      const deploymentIdMap = new Map();
      const importedDeployments = safe.deployments.flatMap(source => {
        const projectId = projectIdMap.get(Number(source.project_id));
        if (!projectId) return [];
        const id = nextId(state, 'nextDeploymentId', state.deployments);
        if (source.id != null) deploymentIdMap.set(Number(source.id), id);
        const project = state.projects.find(item => Number(item.id) === Number(projectId));
        const deployment = {
          id,
          project_id: projectId,
          project_name: project?.name || 'Unknown project',
          version: String(source.version || '1.0.0').slice(0, 80),
          branch: String(source.branch || 'main').slice(0, 200),
          status: String(source.status || 'recorded').slice(0, 40),
          deployed_by: userId,
          created_at: typeof source.created_at === 'string' ? source.created_at : new Date().toISOString(),
          completed_at: typeof source.completed_at === 'string' ? source.completed_at : null
        };
        state.deployments.push(deployment);
        return [deployment];
      });

      const importedInstances = safe.instances.flatMap(source => {
        const projectId = projectIdMap.get(Number(source.project_id));
        const deploymentId = deploymentIdMap.get(Number(source.deployment_id));
        if (!projectId || !deploymentId) return [];
        const id = nextId(state, 'nextInstanceId', state.instances);
        const project = state.projects.find(item => Number(item.id) === Number(projectId));
        const instance = {
          id,
          project_id: projectId,
          project_name: project?.name || 'Unknown project',
          deployment_id: deploymentId,
          name: String(source.name).trim().slice(0, 120),
          instance_type: String(source.instance_type || 't3.medium').slice(0, 80),
          status: String(source.status || 'running').slice(0, 40),
          created_at: typeof source.created_at === 'string' ? source.created_at : new Date().toISOString()
        };
        state.instances.push(instance);
        return [instance];
      });

      writeState(state);
      return response({
        success: true,
        restored: {
          projects: importedProjects.length,
          deployments: importedDeployments.length,
          teams: importedTeams.length,
          instances: importedInstances.length
        },
        notice: 'Workspace records were replaced for the current demo user. Metrics are not included in backup files.'
      });
    },

    async get(path) {
      const route = String(path).replace(/^\/api(?=\/)/, '');
      const state = readState();

      if (route === '/meta') return response({
        name: 'ORBIT Platform',
        version: '2.0.0-demo',
        mode: 'browser-demo',
        capabilities: { project_management: true, deployment_tracking: true, metrics_reporting: true, cloud_resource_provisioning: false, build_execution: false }
      });
      if (route === '/projects') return response({
        projects: ownedProjects(state).sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      });
      if (route === '/deployments') return response({ deployments: visibleDeployments(state) });
      if (route === '/auth/me') {
        const account = state.accounts.find(item => item.id === activeUserId());
        return response({ user: account ? userView(account) : { id: 1, email: DEMO_EMAIL, username: 'demo', name: 'Demo User' } });
      }

      const projectMatch = route.match(/^\/projects\/(\d+)$/);
      if (projectMatch) {
        const project = ownedProject(state, projectMatch[1]);
        if (!project) fail('Project not found.', 404);
        return response(project);
      }

      const metricsMatch = route.match(/^\/metrics\/(\d+)$/);
      if (metricsMatch) {
        if (!ownedProject(state, metricsMatch[1])) fail('Project not found.', 404);
        const metrics = state.metrics[metricsMatch[1]] || [];
        const cpu = metrics.filter(row => row.cpu_usage != null).map(row => Number(row.cpu_usage));
        const memory = metrics.filter(row => row.memory_usage != null).map(row => Number(row.memory_usage));
        return response({
          metrics: [...metrics].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 100),
          summary: {
            avg_cpu: cpu.length ? Number((cpu.reduce((sum, value) => sum + value, 0) / cpu.length).toFixed(2)) : 0,
            avg_memory: memory.length ? Number((memory.reduce((sum, value) => sum + value, 0) / memory.length).toFixed(2)) : 0,
            total_requests: metrics.reduce((sum, row) => sum + Number(row.requests_total || 0), 0)
          }
        });
      }
      if (route === '/teams') return response({ teams: state.teams.filter(team => Number(team.owner_id) === activeUserId()) });
      if (route === '/instances') {
        const projectIds = new Set(ownedProjects(state).map(project => Number(project.id)));
        const instances = (state.instances || [])
          .filter(instance => projectIds.has(Number(instance.project_id)))
          .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
          .map(instance => ({
            ...instance,
            project_name: instance.project_name || state.projects.find(project => Number(project.id) === Number(instance.project_id))?.name || 'Unknown project'
          }));
        return response({ instances });
      }
      fail('Demo API route not found: GET ' + route, 404);
    },

    async post(path, payload = {}) {
      const route = String(path).replace(/^\/api(?=\/)/, '');
      const state = readState();

      if (route === '/auth/login') {
        const email = String(payload.email || '').trim().toLowerCase();
        const password = String(payload.password || '');
        if (email === DEMO_EMAIL && password === DEMO_PASSWORD) {
          const user = { id: 1, email: DEMO_EMAIL, username: 'demo', name: 'Demo User' };
          return response({ token: tokenFor(user), user });
        }
        const digest = await passwordDigest(password);
        const account = state.accounts.find(item => item.email === email && item.password_hash === digest);
        if (!account) fail('Invalid email or password for this browser demo.', 401);
        const user = userView(account);
        return response({ token: tokenFor(user), user });
      }

      if (route === '/auth/register') {
        const email = String(payload.email || '').trim().toLowerCase();
        const username = String(payload.username || '').trim();
        const password = String(payload.password || '');
        const firstName = String(payload.first_name || '').trim();
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) fail('Enter a valid email address.');
        if (email === DEMO_EMAIL) fail('This email address is reserved for the built-in demo account.');
        if (!/^[A-Za-z0-9_.-]{3,50}$/.test(username)) fail('Username must be 3–50 valid characters.');
        if (password.length < 8) fail('Password must contain at least 8 characters.');
        if (state.accounts.some(item => item.email === email || item.username.toLowerCase() === username.toLowerCase())) {
          fail('That email address or username is already registered in this browser.', 409);
        }
        const userId = Math.max(1, ...state.accounts.map(item => Number(item.id))) + 1;
        const account = { id: userId, email, username, first_name: firstName, password_hash: await passwordDigest(password) };
        state.accounts.push(account);
        const teamId = nextId(state, 'nextTeamId', state.teams);
        state.teams.push({ id: teamId, name: 'Default Team', owner_id: userId, description: 'Browser demo workspace' });
        writeState(state);
        const user = userView(account);
        return response({ success: true, token: tokenFor(user), user }, 201);
      }

      if (route === '/projects') {
        const name = String(payload.name || '').trim();
        const description = String(payload.description || '').trim();
        const runtime = String(payload.runtime || 'node').toLowerCase();
        if (!name) fail('Project name is required.');
        if (name.length > 120 || description.length > 2000) fail('Project fields exceed their maximum length.');
        if (!['node', 'python', 'java', 'go'].includes(runtime)) fail('Unsupported runtime.');
        const team = state.teams.find(item => Number(item.owner_id) === currentUserId());
        const projectId = nextId(state, 'nextProjectId', state.projects);
        const project = {
          id: projectId, owner_id: currentUserId(), team_id: team?.id || null,
          team_name: team?.name || 'Personal workspace', name, description, runtime,
          status: 'active', created_at: new Date().toISOString(), updated_at: new Date().toISOString()
        };
        state.projects.push(project);
        writeState(state);
        return response({ success: true, project }, 201);
      }

      const deployMatch = route.match(/^\/projects\/(\d+)\/deploy$/);
      if (deployMatch) {
        const project = ownedProject(state, deployMatch[1]);
        if (!project) fail('Project not found.', 404);
        const version = String(payload.version || '1.0.0').trim();
        const branch = String(payload.branch || 'main').trim();
        if (!version || !branch) fail('Version and branch are required.');
        if (version.length > 80 || branch.length > 200) fail('Deployment fields exceed their maximum length.');
        const id = nextId(state, 'nextDeploymentId', state.deployments);
        const deployment = {
          id, project_id: project.id, project_name: project.name, version, branch,
          status: 'in-progress', deployed_by: activeUserId(),
          created_at: new Date().toISOString(), completed_at: null
        };
        state.deployments.push(deployment);
        writeState(state);
        return response({
          success: true,
          message: 'Demo deployment record created. No build or cloud resource was started.',
          deployment
        }, 201);
      }

      if (route === '/instances') {
        const project = ownedProject(state, payload.project_id);
        if (!project) fail('Project not found.', 404);
        const name = String(payload.name || '').trim();
        const instanceType = String(payload.instance_type || 't3.medium').trim();
        if (!name) fail('Instance name is required.');
        if (name.length > 120 || instanceType.length > 80) fail('Instance fields exceed their maximum length.');
        const allDeployments = visibleDeployments(state);
        const deployment = allDeployments.find(item =>
          Number(item.id) === Number(payload.deployment_id) &&
          Number(item.project_id) === Number(project.id)
        );
        if (!deployment) fail('Choose a deployment record that belongs to this project.', 400);
        state.instances ||= [];
        const id = nextId(state, 'nextInstanceId', state.instances);
        const instance = {
          id,
          project_id: project.id,
          project_name: project.name,
          deployment_id: deployment.id,
          name,
          instance_type: instanceType,
          status: 'running',
          created_at: new Date().toISOString()
        };
        state.instances.push(instance);
        writeState(state);
        return response({ success: true, instance }, 201);
      }

      if (route === '/teams') {
        const name = String(payload.name || '').trim();
        if (!name) fail('Team name is required.');
        const id = nextId(state, 'nextTeamId', state.teams);
        const team = { id, name, owner_id: activeUserId(), description: String(payload.description || '') };
        state.teams.push(team);
        writeState(state);
        return response({ success: true, team }, 201);
      }
      fail('Demo API route not found: POST ' + route, 404);
    },

    async put(path, payload = {}) {
      const route = String(path).replace(/^\/api(?=\/)/, '');
      const match = route.match(/^\/projects\/(\d+)$/);
      if (!match) fail('Demo API route not found: PUT ' + route, 404);
      const state = readState();
      const project = ownedProject(state, match[1]);
      if (!project) fail('Project not found.', 404);
      const name = payload.name == null ? project.name : String(payload.name).trim();
      const description = payload.description == null ? (project.description || '') : String(payload.description).trim();
      const runtime = String(payload.runtime || project.runtime).toLowerCase();
      const status = String(payload.status || project.status).toLowerCase();
      if (!name) fail('Project name is required.');
      if (name.length > 120 || description.length > 2000) fail('Project fields exceed their maximum length.');
      if (!['node', 'python', 'java', 'go'].includes(runtime)) fail('Unsupported runtime.');
      if (!['active', 'archived'].includes(status)) fail('Status must be active or archived.');
      Object.assign(project, { name, description, runtime, status, updated_at: new Date().toISOString() });
      writeState(state);
      return response({ success: true, project });
    },

    async delete(path) {
      const route = String(path).replace(/^\/api(?=\/)/, '');
      const match = route.match(/^\/projects\/(\d+)$/);
      if (!match) fail('Demo API route not found: DELETE ' + route, 404);
      const state = readState();
      const project = ownedProject(state, match[1]);
      if (!project) fail('Project not found.', 404);
      state.projects = state.projects.filter(item => Number(item.id) !== Number(project.id));
      state.deployments = state.deployments.filter(item => Number(item.project_id) !== Number(project.id));
      state.instances = (state.instances || []).filter(item => Number(item.project_id) !== Number(project.id));
      delete state.metrics[project.id];
      writeState(state);
      return response({ success: true, deleted_id: project.id });
    }
  };
}

export const demoStorageKey = STORAGE_KEY;
