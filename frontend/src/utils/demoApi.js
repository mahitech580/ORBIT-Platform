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

// Keep browser-demo records usable in private windows or when storage quota is
// exhausted. This fallback is intentionally in-memory and does not imply durable saves.
let volatileStateRaw = null;
let volatileStorageOnly = false;

function getStateStorage() {
  try {
    if (typeof localStorage === 'undefined') return null;
    return localStorage;
  } catch {
    return null;
  }
}

function readStateStorage() {
  const storage = getStateStorage();
  if (!storage || volatileStorageOnly) {
    volatileStorageOnly = true;
    return volatileStateRaw;
  }
  try {
    return storage.getItem(STORAGE_KEY);
  } catch {
    volatileStorageOnly = true;
    return volatileStateRaw;
  }
}

function writeStateStorage(state) {
  const serialized = JSON.stringify(state);
  volatileStateRaw = serialized;
  const storage = getStateStorage();
  if (!storage || volatileStorageOnly) {
    volatileStorageOnly = true;
    return;
  }
  try {
    storage.setItem(STORAGE_KEY, serialized);
  } catch {
    // Avoid reading a stale durable copy after a failed/quota-limited write.
    volatileStorageOnly = true;
  }
}

function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function readState() {
  try {
    const raw = readStateStorage();
    if (!raw) {
      const state = initialState();
      writeStateStorage(state);
      return state;
    }
    const state = JSON.parse(raw);
    if (!state || typeof state !== 'object' || Array.isArray(state) ||
        !Array.isArray(state.projects) || !Array.isArray(state.deployments)) {
      throw new Error('Invalid demo data');
    }

    // Old or partially edited browser snapshots can contain malformed optional
    // collections. Normalize them before any route calls array/object methods.
    const hasValidId = value => Number.isSafeInteger(Number(value)) && Number(value) > 0;
    state.projects = state.projects.filter(item => isRecord(item) && hasValidId(item.id) && typeof item.name === 'string');
    state.deployments = state.deployments.filter(item => isRecord(item) && hasValidId(item.id) && hasValidId(item.project_id));
    if (!Array.isArray(state.accounts)) state.accounts = [];
    else state.accounts = state.accounts.filter(item => isRecord(item) &&
      hasValidId(item.id) && typeof item.email === 'string' &&
      typeof item.username === 'string' && typeof item.password_hash === 'string');
    if (!Array.isArray(state.teams)) state.teams = [];
    else state.teams = state.teams.filter(item => isRecord(item) &&
      hasValidId(item.id) && hasValidId(item.owner_id) && typeof item.name === 'string');
    if (!Array.isArray(state.instances)) state.instances = [];
    else state.instances = state.instances.filter(item => isRecord(item) &&
      hasValidId(item.id) && hasValidId(item.project_id) &&
      hasValidId(item.deployment_id) && typeof item.name === 'string');
    if (!state.metrics || typeof state.metrics !== 'object' || Array.isArray(state.metrics)) {
      state.metrics = {};
    } else {
      state.metrics = Object.fromEntries(Object.entries(state.metrics).map(([projectId, rows]) => [
        projectId,
        Array.isArray(rows) ? rows.filter(isRecord) : []
      ]));
    }

    const nextIdAbove = (candidate, records) => {
      const highestId = records.reduce((highest, record) => {
        const id = Number(record?.id);
        return Number.isSafeInteger(id) && id > highest ? id : highest;
      }, 0);
      const minimum = highestId + 1;
      return Number.isSafeInteger(candidate) && candidate >= minimum ? candidate : minimum;
    };
    state.nextProjectId = nextIdAbove(state.nextProjectId, state.projects);
    state.nextDeploymentId = nextIdAbove(state.nextDeploymentId, state.deployments);
    state.nextTeamId = nextIdAbove(state.nextTeamId, state.teams);
    state.nextInstanceId = nextIdAbove(state.nextInstanceId, state.instances);
    return state;
  } catch {
    const state = initialState();
    writeStateStorage(state);
    return state;
  }
}

function writeState(state) {
  writeStateStorage(state);
}

function response(data, status = 200) {
  return { data, status, headers: {}, config: { demo: true } };
}

function fail(message, status = 400) {
  const error = new Error(message);
  error.response = { status, data: { error: message } };
  throw error;
}

function readDemoString(payload, key, { defaultValue = "", required = false, maxLength = 255 } = {}) {
  const label = key.replace(/_/g, " ").replace(/^./, character => character.toUpperCase());
  let value = payload?.[key];
  if (value == null) value = defaultValue;
  if (typeof value !== 'string') fail(label + " must be text.");
  value = value.trim();
  if (required && !value) fail(label + " is required.");
  if (value.length > maxLength) fail(label + " must be at most " + maxLength + " characters.");
  return value;
}

function currentUserId() {
  try {
    return Number(JSON.parse(localStorage.getItem('orbit.user') || 'null')?.id || 1);
  } catch {
    return 1;
  }
}

function activeUserId() {
  try {
    const token = localStorage.getItem('token') || '';
    const prefix = 'orbit-pages-demo-';
    if (token.startsWith(prefix)) return Number(token.slice(prefix.length).split('-')[0]) || 1;
  } catch {
    // Storage may be blocked; use the current demo-user fallback.
  }
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
        const email = readDemoString(payload, 'email', { required: true, maxLength: 255 }).toLowerCase();
        const username = readDemoString(payload, 'username', { required: true, maxLength: 50 });
        const password = payload.password;
        if (typeof password !== 'string' || !password.trim()) fail('Password is required.');
        if (password.length > 1024) fail('Password must be at most 1024 characters.');
        const firstName = readDemoString(payload, 'first_name', { maxLength: 100 });
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
        const name = readDemoString(payload, 'name', { required: true, maxLength: 120 });
        const description = readDemoString(payload, 'description', { maxLength: 2000 });
        const runtimeValue = payload.runtime == null ? 'node' : payload.runtime;
        const runtime = readDemoString({ runtime: runtimeValue }, 'runtime', { required: true, maxLength: 30 }).toLowerCase();
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
        const versionValue = payload.version == null ? '1.0.0' : payload.version;
        const branchValue = payload.branch == null ? 'main' : payload.branch;
        const version = readDemoString({ version: versionValue }, 'version', { required: true, maxLength: 80 });
        const branch = readDemoString({ branch: branchValue }, 'branch', { required: true, maxLength: 200 });
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
        const name = readDemoString(payload, 'name', { required: true, maxLength: 120 });
        const instanceTypeValue = payload.instance_type == null ? 't3.medium' : payload.instance_type;
        const instanceType = readDemoString({ instance_type: instanceTypeValue }, 'instance_type', { maxLength: 80 });
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
