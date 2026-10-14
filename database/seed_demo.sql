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
