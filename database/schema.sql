-- ORBIT Platform 2.0 bootstrap schema.
-- Safe to re-run against an existing ORBIT 1.x database. This schema stores
-- projects, deployment records and telemetry; it does not provision cloud resources.

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS teams (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    owner_id INTEGER NOT NULL REFERENCES users(id),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS projects (
    id SERIAL PRIMARY KEY,
    team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    runtime VARCHAR(50) DEFAULT 'node',
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS deployments (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    version VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    branch VARCHAR(100) DEFAULT 'main',
    deployed_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS instances (
    id SERIAL PRIMARY KEY,
    deployment_id INTEGER NOT NULL REFERENCES deployments(id) ON DELETE CASCADE,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    instance_type VARCHAR(50) DEFAULT 't3.medium',
    status VARCHAR(20) DEFAULT 'running',
    ip_address VARCHAR(50),
    cpu_percent DECIMAL(5,2),
    memory_mb INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS metrics (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    cpu_usage DECIMAL(5,2),
    memory_usage INTEGER,
    requests_total INTEGER,
    errors_total INTEGER,
    response_time_ms DECIMAL(8,2),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS logs (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    level VARCHAR(20),
    message TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_teams_owner_id ON teams(owner_id);
CREATE INDEX IF NOT EXISTS idx_projects_team_id ON projects(team_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_deployments_project_id ON deployments(project_id);
CREATE INDEX IF NOT EXISTS idx_deployments_created_at ON deployments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_instances_deployment_id ON instances(deployment_id);
CREATE INDEX IF NOT EXISTS idx_instances_project_id ON instances(project_id);
CREATE INDEX IF NOT EXISTS idx_metrics_project_id ON metrics(project_id);
CREATE INDEX IF NOT EXISTS idx_metrics_timestamp ON metrics(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_logs_project_id ON logs(project_id);
CREATE INDEX IF NOT EXISTS idx_users_email_lower ON users(LOWER(email));

-- This hash is compatible with Werkzeug's PBKDF2-SHA256 password verifier for demo123.
INSERT INTO users (email, username, password_hash, first_name, last_name)
VALUES (
    'demo@orbit.local',
    'demo',
    'pbkdf2:sha256:600000$orbit-demo-v2$d209d210480d40b28eb7db8796206033b20831a52af49e4e41a5a6c66d231bce',
    'Demo',
    'User'
)
ON CONFLICT (email) DO NOTHING;

INSERT INTO teams (name, owner_id, description)
SELECT 'Default Team', u.id, 'Your first ORBIT workspace'
FROM users u
WHERE u.email = 'demo@orbit.local'
AND NOT EXISTS (
    SELECT 1 FROM teams t WHERE t.owner_id = u.id AND t.name = 'Default Team'
);

INSERT INTO projects (team_id, name, description, runtime)
SELECT t.id, sample.name, sample.description, sample.runtime
FROM teams t
JOIN users u ON u.id = t.owner_id
CROSS JOIN (
    VALUES
        ('Sample App', 'Example Node.js project', 'node'),
        ('API Server', 'Example Python REST API', 'python'),
        ('Frontend App', 'Example React application', 'node')
) AS sample(name, description, runtime)
WHERE u.email = 'demo@orbit.local'
  AND t.name = 'Default Team'
  AND NOT EXISTS (
      SELECT 1 FROM projects p WHERE p.team_id = t.id AND p.name = sample.name
  );
