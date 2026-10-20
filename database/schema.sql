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
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT projects_domain_valid CHECK (
        (runtime IS NULL OR runtime IN ('node', 'python', 'java', 'go'))
        AND (status IS NULL OR status IN ('active', 'archived'))
    )
);

-- Preserve API-supported project values at the database boundary for older installs.
DO $orbit_project_domains$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'projects_domain_valid'
          AND conrelid = 'projects'::regclass
    ) THEN
        ALTER TABLE projects
        ADD CONSTRAINT projects_domain_valid
        CHECK (
            (runtime IS NULL OR runtime IN ('node', 'python', 'java', 'go'))
            AND (status IS NULL OR status IN ('active', 'archived'))
        ) NOT VALID;
    END IF;
END $orbit_project_domains$;

CREATE TABLE IF NOT EXISTS deployments (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    version VARCHAR(80) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    branch VARCHAR(200) DEFAULT 'main',
    deployed_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

-- Required as the referenced key for instances' composite project/deployment FK.
CREATE UNIQUE INDEX IF NOT EXISTS idx_deployments_project_id_id
    ON deployments(project_id, id);

CREATE TABLE IF NOT EXISTS instances (
    id SERIAL PRIMARY KEY,
    deployment_id INTEGER NOT NULL REFERENCES deployments(id) ON DELETE CASCADE,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    instance_type VARCHAR(80) DEFAULT 't3.medium',
    status VARCHAR(20) DEFAULT 'running',
    ip_address VARCHAR(50),
    cpu_percent DECIMAL(5,2),
    memory_mb INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT instances_project_deployment_match
        FOREIGN KEY (project_id, deployment_id)
        REFERENCES deployments(project_id, id) ON DELETE CASCADE
);


-- Add the relationship check to databases that already had an instances table.
DO $orbit_instance_match$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'instances_project_deployment_match'
          AND conrelid = 'instances'::regclass
    ) THEN
        ALTER TABLE instances
        ADD CONSTRAINT instances_project_deployment_match
        FOREIGN KEY (project_id, deployment_id)
        REFERENCES deployments(project_id, id) ON DELETE CASCADE NOT VALID;
    END IF;
END $orbit_instance_match$;

-- Widen columns to match the API and UI's accepted field lengths on older installs.
DO $orbit_column_limits$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = current_schema() AND table_name = 'deployments'
          AND column_name = 'version' AND character_maximum_length < 80
    ) THEN
        ALTER TABLE deployments ALTER COLUMN version TYPE VARCHAR(80);
    END IF;
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = current_schema() AND table_name = 'deployments'
          AND column_name = 'branch' AND character_maximum_length < 200
    ) THEN
        ALTER TABLE deployments ALTER COLUMN branch TYPE VARCHAR(200);
    END IF;
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = current_schema() AND table_name = 'instances'
          AND column_name = 'instance_type' AND character_maximum_length < 80
    ) THEN
        ALTER TABLE instances ALTER COLUMN instance_type TYPE VARCHAR(80);
    END IF;
END $orbit_column_limits$;

CREATE TABLE IF NOT EXISTS metrics (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    cpu_usage DECIMAL(5,2),
    memory_usage INTEGER,
    requests_total INTEGER,
    errors_total INTEGER,
    response_time_ms DECIMAL(8,2),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT metrics_measurements_valid CHECK (
        (cpu_usage IS NULL OR cpu_usage BETWEEN 0 AND 100)
        AND (memory_usage IS NULL OR memory_usage >= 0)
        AND (requests_total IS NULL OR requests_total >= 0)
        AND (errors_total IS NULL OR errors_total >= 0)
        AND (response_time_ms IS NULL OR response_time_ms >= 0)
        AND (requests_total IS NULL OR errors_total IS NULL OR errors_total <= requests_total)
    )
);


-- Idempotent additive migration for installations created before the checks
-- were introduced. NOT VALID avoids scanning legacy rows during deployment,
-- while PostgreSQL still enforces the constraint on every new or changed row.
DO $orbit_migration$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'metrics_measurements_valid'
          AND conrelid = 'metrics'::regclass
    ) THEN
        ALTER TABLE metrics
        ADD CONSTRAINT metrics_measurements_valid
        CHECK (
            (cpu_usage IS NULL OR cpu_usage BETWEEN 0 AND 100)
            AND (memory_usage IS NULL OR memory_usage >= 0)
            AND (requests_total IS NULL OR requests_total >= 0)
            AND (errors_total IS NULL OR errors_total >= 0)
            AND (response_time_ms IS NULL OR response_time_ms >= 0)
            AND (requests_total IS NULL OR errors_total IS NULL OR errors_total <= requests_total)
        ) NOT VALID;
    END IF;
END $orbit_migration$;

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
CREATE INDEX IF NOT EXISTS idx_metrics_project_timestamp ON metrics(project_id, timestamp DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_logs_project_id ON logs(project_id);
CREATE INDEX IF NOT EXISTS idx_users_email_lower ON users(LOWER(email));
