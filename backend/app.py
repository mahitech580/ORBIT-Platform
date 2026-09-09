"""
ORBIT Platform - Python Flask Backend
Simple, clean API without extra dependencies
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import psycopg2
from psycopg2.extras import RealDictCursor
import os
import json
import hashlib
import jwt
from datetime import datetime, timedelta
from functools import wraps

app = Flask(__name__)
CORS(app)

# Configuration
DATABASE = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'database': os.getenv('DB_NAME', 'orbit'),
    'user': os.getenv('DB_USER', 'postgres'),
    'password': os.getenv('DB_PASSWORD', 'password'),
    'port': os.getenv('DB_PORT', 5432)
}

SECRET_KEY = os.getenv('SECRET_KEY', 'your-secret-key-change-this')

# Database Connection
def get_db():
    conn = psycopg2.connect(**DATABASE)
    return conn

def execute_query(query, params=None):
    """Execute SELECT query and return results"""
    conn = get_db()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    cur.execute(query, params or [])
    results = cur.fetchall()
    cur.close()
    conn.close()
    return results

def execute_update(query, params=None):
    """Execute INSERT/UPDATE/DELETE and return affected rows"""
    conn = get_db()
    cur = conn.cursor()
    cur.execute(query, params or [])
    conn.commit()
    affected = cur.rowcount
    cur.close()
    conn.close()
    return affected

# JWT Auth
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization', '').replace('Bearer ', '')
        if not token:
            return jsonify({'error': 'Missing token'}), 401
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
            request.user_id = payload['user_id']
        except:
            return jsonify({'error': 'Invalid token'}), 401
        return f(*args, **kwargs)
    return decorated

# Health Check
@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'UP',
        'timestamp': datetime.now().isoformat(),
        'database': 'Connected'
    }), 200

# ============= AUTH ENDPOINTS =============
@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')
    
    # Hash password
    password_hash = hashlib.sha256(password.encode()).hexdigest()
    
    # Check user (demo login)
    if email == 'demo@orbit.local' and password == 'demo123':
        token = jwt.encode({
            'user_id': 1,
            'email': email,
            'exp': datetime.utcnow() + timedelta(hours=24)
        }, SECRET_KEY, algorithm='HS256')
        
        return jsonify({
            'token': token,
            'user': {'id': 1, 'email': email, 'name': 'Demo User'}
        }), 200
    
    return jsonify({'error': 'Invalid credentials'}), 401

@app.route('/api/auth/register', methods=['POST'])
def register():
    data = request.get_json()
    email = data.get('email')
    username = data.get('username')
    password = data.get('password')
    
    password_hash = hashlib.sha256(password.encode()).hexdigest()
    
    try:
        execute_update(
            "INSERT INTO users (email, username, password_hash, first_name) VALUES (%s, %s, %s, %s)",
            [email, username, password_hash, data.get('first_name', '')]
        )
        
        return jsonify({'success': True, 'message': 'User created'}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 400

# ============= PROJECT ENDPOINTS =============
@app.route('/api/projects', methods=['GET'])
@token_required
def get_projects():
    try:
        projects = execute_query(
            "SELECT p.*, t.name as team_name FROM projects p JOIN teams t ON p.team_id = t.id"
        )
        return jsonify({'projects': projects}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/projects', methods=['POST'])
@token_required
def create_project():
    data = request.get_json()
    
    try:
        execute_update(
            "INSERT INTO projects (team_id, name, description, runtime) VALUES (%s, %s, %s, %s)",
            [data.get('team_id', 1), data.get('name'), data.get('description'), data.get('runtime', 'node')]
        )
        
        return jsonify({'success': True, 'message': 'Project created'}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/api/projects/<int:project_id>', methods=['GET'])
@token_required
def get_project(project_id):
    try:
        project = execute_query(
            "SELECT p.*, t.name as team_name FROM projects p JOIN teams t ON p.team_id = t.id WHERE p.id = %s",
            [project_id]
        )
        
        if not project:
            return jsonify({'error': 'Project not found'}), 404
        
        return jsonify(project[0]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/projects/<int:project_id>', methods=['PUT'])
@token_required
def update_project(project_id):
    data = request.get_json()
    
    try:
        execute_update(
            "UPDATE projects SET name = %s, description = %s, status = %s, updated_at = CURRENT_TIMESTAMP WHERE id = %s",
            [data.get('name'), data.get('description'), data.get('status'), project_id]
        )
        
        return jsonify({'success': True, 'message': 'Project updated'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/api/projects/<int:project_id>', methods=['DELETE'])
@token_required
def delete_project(project_id):
    try:
        execute_update("DELETE FROM projects WHERE id = %s", [project_id])
        return jsonify({'success': True, 'message': 'Project deleted'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 400

# ============= DEPLOYMENT ENDPOINTS =============
@app.route('/api/projects/<int:project_id>/deploy', methods=['POST'])
@token_required
def deploy_project(project_id):
    data = request.get_json()
    
    try:
        execute_update(
            "INSERT INTO deployments (project_id, version, status, branch, deployed_by) VALUES (%s, %s, %s, %s, %s)",
            [project_id, data.get('version', '1.0.0'), 'in-progress', data.get('branch', 'main'), request.user_id]
        )
        
        return jsonify({'success': True, 'message': 'Deployment started'}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/api/deployments', methods=['GET'])
@token_required
def get_deployments():
    try:
        deployments = execute_query(
            "SELECT d.*, p.name as project_name FROM deployments d JOIN projects p ON d.project_id = p.id ORDER BY d.created_at DESC"
        )
        return jsonify({'deployments': deployments}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/deployments/<int:deployment_id>', methods=['GET'])
@token_required
def get_deployment(deployment_id):
    try:
        deployment = execute_query(
            "SELECT d.*, p.name as project_name FROM deployments d JOIN projects p ON d.project_id = p.id WHERE d.id = %s",
            [deployment_id]
        )
        
        if not deployment:
            return jsonify({'error': 'Deployment not found'}), 404
        
        return jsonify(deployment[0]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ============= METRICS ENDPOINTS =============
@app.route('/api/metrics/<int:project_id>', methods=['GET'])
@token_required
def get_metrics(project_id):
    try:
        metrics = execute_query(
            "SELECT * FROM metrics WHERE project_id = %s ORDER BY timestamp DESC LIMIT 100",
            [project_id]
        )
        
        if metrics:
            avg_cpu = sum(m['cpu_usage'] for m in metrics if m['cpu_usage']) / len([m for m in metrics if m['cpu_usage']])
            avg_memory = sum(m['memory_usage'] for m in metrics if m['memory_usage']) / len([m for m in metrics if m['memory_usage']])
            
            return jsonify({
                'metrics': metrics,
                'summary': {
                    'avg_cpu': round(avg_cpu, 2),
                    'avg_memory': round(avg_memory, 2),
                    'total_requests': sum(m['requests_total'] for m in metrics if m['requests_total'])
                }
            }), 200
        
        return jsonify({'metrics': [], 'summary': {}}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ============= INSTANCES ENDPOINTS =============
@app.route('/api/instances', methods=['GET'])
@token_required
def get_instances():
    try:
        instances = execute_query(
            "SELECT i.*, p.name as project_name FROM instances i JOIN projects p ON i.project_id = p.id ORDER BY i.created_at DESC"
        )
        return jsonify({'instances': instances}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/instances', methods=['POST'])
@token_required
def create_instance():
    data = request.get_json()
    
    try:
        execute_update(
            "INSERT INTO instances (deployment_id, project_id, name, instance_type, status) VALUES (%s, %s, %s, %s, %s)",
            [data.get('deployment_id'), data.get('project_id'), data.get('name'), data.get('instance_type', 't3.medium'), 'running']
        )
        
        return jsonify({'success': True, 'message': 'Instance created'}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 400

# ============= TEAMS ENDPOINTS =============
@app.route('/api/teams', methods=['GET'])
@token_required
def get_teams():
    try:
        teams = execute_query(
            "SELECT t.*, u.username as owner_name FROM teams t JOIN users u ON t.owner_id = u.id"
        )
        return jsonify({'teams': teams}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/teams', methods=['POST'])
@token_required
def create_team():
    data = request.get_json()
    
    try:
        execute_update(
            "INSERT INTO teams (name, owner_id, description) VALUES (%s, %s, %s)",
            [data.get('name'), request.user_id, data.get('description', '')]
        )
        
        return jsonify({'success': True, 'message': 'Team created'}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 400

# ============= ERROR HANDLERS =============
@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Endpoint not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    print("""
    ╔════════════════════════════════════════╗
    ║   ORBIT Platform - Python Backend      ║
    ║   Running on http://localhost:5000     ║
    ║   Login: demo@orbit.local / demo123    ║
    ╚════════════════════════════════════════╝
    """)
    app.run(debug=True, host='0.0.0.0', port=5000)
