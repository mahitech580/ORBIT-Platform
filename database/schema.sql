-- ORBIT Platform - PostgreSQL Schema
-- Simple, clean SQL without extra tools

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE teams (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    owner_id INTEGER NOT NULL REFERENCES users(id),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE projects (
    id SERIAL PRIMARY KEY,
    team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    runtime VARCHAR(50) DEFAULT 'node',
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE deployments (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    version VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    branch VARCHAR(100) DEFAULT 'main',
    deployed_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

CREATE TABLE instances (
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

CREATE TABLE metrics (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    cpu_usage DECIMAL(5,2),
    memory_usage INTEGER,
    requests_total INTEGER,
    errors_total INTEGER,
    response_time_ms DECIMAL(8,2),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE logs (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    level VARCHAR(20),
    message TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_projects_team_id ON projects(team_id);
CREATE INDEX idx_deployments_project_id ON deployments(project_id);
CREATE INDEX idx_instances_deployment_id ON instances(deployment_id);
CREATE INDEX idx_metrics_project_id ON metrics(project_id);
CREATE INDEX idx_metrics_timestamp ON metrics(timestamp DESC);

-- Sample data
INSERT INTO users (email, username, password_hash, first_name, last_name) VALUES
('demo@orbit.local', 'demo', '$2b$10$abc123hash', 'Demo', 'User');

INSERT INTO teams (name, owner_id, description) VALUES
('Default Team', 1, 'Your first team');

INSERT INTO projects (team_id, name, description, runtime) VALUES
(1, 'Sample App', 'My first application', 'node'),
(1, 'API Server', 'REST API Backend', 'python'),
(1, 'Frontend App', 'React Application', 'node');
