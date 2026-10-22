"""ORBIT Platform 2.0 API.

ORBIT manages project metadata and deployment records. The current release does
not build artifacts or provision cloud infrastructure; that requires a runner
and a cloud-provider adapter, neither of which is present in the repository.
"""
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from functools import wraps
import hashlib
import hmac
import math
import os
import re
import uuid

import jwt
import psycopg2
from dotenv import load_dotenv
from flask import Flask, abort, has_request_context, jsonify, request
from werkzeug.exceptions import HTTPException
from flask_cors import CORS
from psycopg2 import IntegrityError
from psycopg2.extras import RealDictCursor
from werkzeug.security import check_password_hash, generate_password_hash

load_dotenv()

APP_VERSION = "2.1.0"
APP_ENV = os.getenv("APP_ENV", "development").strip().lower()
IS_PRODUCTION = APP_ENV in {"production", "prod"}
SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    if IS_PRODUCTION:
        raise RuntimeError("SECRET_KEY must be configured in production.")
    SECRET_KEY = "development-only-key-change-before-deployment"
    print("WARNING: using a development SECRET_KEY; configure SECRET_KEY before deployment.")

DEMO_EMAIL = "demo@orbit.local"
DEMO_PASSWORD = "demo123"
DEMO_AUTH_ENABLED = os.getenv("ENABLE_DEMO_AUTH", "false" if IS_PRODUCTION else "true").lower() in {"1", "true", "yes"}

DATABASE = {
    "host": os.getenv("DB_HOST", "localhost"),
    "database": os.getenv("DB_NAME", "orbit"),
    "user": os.getenv("DB_USER", "postgres"),
    "password": os.getenv("DB_PASSWORD", "password"),
    "port": int(os.getenv("DB_PORT", "5432")),
    "connect_timeout": int(os.getenv("DB_CONNECT_TIMEOUT", "5")),
}
if os.getenv("DB_SSLMODE"):
    DATABASE["sslmode"] = os.getenv("DB_SSLMODE")

# Render provides DATABASE_URL; local development can continue using DB_* fields.
DATABASE_URL = os.getenv("DATABASE_URL", "").strip()


def validate_database_configuration(is_production, database_url, environment):
    """Prevent production from silently falling back to local development DB defaults."""
    if not is_production or (isinstance(database_url, str) and database_url.strip()):
        return
    required = ("DB_HOST", "DB_NAME", "DB_USER", "DB_PASSWORD")
    missing = [
        name for name in required
        if not isinstance(environment.get(name), str) or not environment.get(name, "").strip()
    ]
    if missing:
        raise RuntimeError(
            "Production database configuration is incomplete. Set DATABASE_URL or "
            "explicitly provide DB_HOST, DB_NAME, DB_USER, and DB_PASSWORD."
        )


validate_database_configuration(IS_PRODUCTION, DATABASE_URL, os.environ)

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 1024 * 1024
allowed_origins = [origin.strip() for origin in os.getenv(
    "CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000,https://mahitech580.github.io"
).split(",") if origin.strip()]
# Ensure the public GitHub Pages app is allowed even if Render has explicit CORS_ORIGINS.
if "https://mahitech580.github.io" not in allowed_origins:
    allowed_origins.append("https://mahitech580.github.io")
CORS(app, resources={
    r"/api/*": {"origins": allowed_origins},
    r"/health": {"origins": allowed_origins},
})


@app.before_request
def assign_request_id():
    """Attach a server-generated correlation ID to each incoming request."""
    request.orbit_request_id = uuid.uuid4().hex


@app.after_request
def add_browser_security_headers(response):
    """Set defensive headers and a request correlation ID on every response."""
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("Cache-Control", "no-store")
    response.headers.setdefault("Pragma", "no-cache")
    response.headers.setdefault("X-Frame-Options", "DENY")
    response.headers.setdefault("Referrer-Policy", "no-referrer")
    response.headers.setdefault("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
    request_id = getattr(request, "orbit_request_id", None) if has_request_context() else None
    response.headers.setdefault("X-Request-ID", request_id or uuid.uuid4().hex)
    return response


RUNTIMES = {"node", "python", "java", "go"}
PROJECT_STATUSES = {"active", "archived"}
USERNAME_RE = re.compile(r"^[A-Za-z0-9_.-]{3,50}$")
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def json_safe(value):
    """Convert common PostgreSQL values into portable JSON types."""
    if isinstance(value, dict):
        return {key: json_safe(item) for key, item in value.items()}
    if isinstance(value, (list, tuple)):
        return [json_safe(item) for item in value]
    if isinstance(value, Decimal):
        # PostgreSQL NUMERIC can represent NaN and infinities; JSON cannot
        # portably represent those values, so expose them as null. A finite
        # Decimal can also overflow when narrowed to a JSON-compatible float.
        if not value.is_finite():
            return None
        try:
            number = float(value)
        except (OverflowError, ValueError):
            return None
        return number if math.isfinite(number) else None
    if isinstance(value, datetime):
        # PostgreSQL TIMESTAMP columns are stored as UTC-naive by the API.
        # Emit an explicit UTC offset so browsers never reinterpret them as local time.
        normalized = value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value.astimezone(timezone.utc)
        return normalized.isoformat()
    if isinstance(value, date):
        return value.isoformat()
    return value


def get_db():
    """Open a short-lived PostgreSQL connection using Render's URL or local DB_* settings."""
    if DATABASE_URL:
        options = {"connect_timeout": DATABASE["connect_timeout"]}
        explicit_sslmode = os.getenv("DB_SSLMODE")
        if explicit_sslmode:
            options["sslmode"] = explicit_sslmode
        elif IS_PRODUCTION:
            # Render's managed PostgreSQL endpoint requires TLS in production.
            options["sslmode"] = "require"
        return psycopg2.connect(DATABASE_URL, **options)
    return psycopg2.connect(**DATABASE)


def db_fetch_all(query, params=()):
    conn = get_db()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute(query, params)
            rows = cursor.fetchall()
        conn.commit()
        return json_safe([dict(row) for row in rows])
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def db_execute(query, params=(), returning=False):
    conn = get_db()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute(query, params)
            result = json_safe([dict(row) for row in cursor.fetchall()]) if returning else cursor.rowcount
        conn.commit()
        return result
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def hash_password(password):
    return generate_password_hash(password, method="pbkdf2:sha256:600000")


def verify_password(password, stored_hash):
    """Verify modern Werkzeug hashes and migrate legacy SHA-256 hashes on login."""
    if not isinstance(password, str) or not isinstance(stored_hash, str):
        return False
    if re.fullmatch(r"[a-fA-F0-9]{64}", stored_hash):
        digest = hashlib.sha256(password.encode("utf-8")).hexdigest()
        return hmac.compare_digest(digest, stored_hash.lower())
    # Avoid passing arbitrary database text to Werkzeug's parser: unknown hash
    # prefixes can emit deprecation warnings and can never authenticate here.
    if not stored_hash.startswith(("pbkdf2:", "scrypt:")):
        return False
    try:
        return check_password_hash(stored_hash, password)
    except (ValueError, TypeError):
        return False


def public_user(user):
    first = (user.get("first_name") or "").strip()
    last = (user.get("last_name") or "").strip()
    display_name = " ".join(part for part in (first, last) if part) or user.get("username") or user.get("email")
    return {
        "id": user.get("id"),
        "email": user.get("email"),
        "username": user.get("username"),
        "name": display_name,
    }


def issue_token(user):
    payload = {
        "user_id": int(user["id"]),
        "email": user.get("email"),
        "iat": datetime.now(timezone.utc),
        "exp": datetime.now(timezone.utc) + timedelta(hours=12),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm="HS256")


def json_body():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        abort(400, description="Send a JSON object in the request body.")
    return data


def read_string(data, key, default="", required=False, max_length=255):
    value = data.get(key, default)
    if value is None:
        value = default
    if not isinstance(value, str):
        abort(400, description=key.replace("_", " ").capitalize() + " must be text.")
    value = value.strip()
    if required and not value:
        abort(400, description=key.replace("_", " ").capitalize() + " is required.")
    if len(value) > max_length:
        abort(400, description=key.replace("_", " ").capitalize() + " must be at most " + str(max_length) + " characters.")
    return value


def read_password(data):
    password = data.get("password")
    if not isinstance(password, str) or not password.strip():
        abort(400, description="Password is required.")
    if len(password) > 1024:
        abort(400, description="Password must be at most 1024 characters.")
    return password


POSTGRES_INTEGER_MAX = 2147483647


def positive_int(value, label):
    """Parse IDs without silently truncating non-integers or exceeding SERIAL range."""
    message = label + " must be a positive integer."
    if isinstance(value, bool):
        abort(400, description=message)
    if isinstance(value, int):
        number = value
    elif isinstance(value, str):
        normalized = value.strip()
        if not normalized or not normalized.isascii() or not normalized.isdecimal():
            abort(400, description=message)
        try:
            number = int(normalized)
        except (ValueError, OverflowError):
            abort(400, description=message)
    else:
        abort(400, description=message)
    if not 1 <= number <= POSTGRES_INTEGER_MAX:
        abort(400, description=message)
    return number


def token_required(view):
    @wraps(view)
    def decorated(*args, **kwargs):
        header = request.headers.get("Authorization", "")
        scheme, separator, token = header.partition(" ")
        if not separator or scheme.lower() != "bearer" or not token.strip():
            return jsonify({"error": "A Bearer token is required."}), 401
        try:
            claims = jwt.decode(token.strip(), SECRET_KEY, algorithms=["HS256"])
            request.user_id = positive_int(claims.get("user_id"), "Token user ID")
        except (jwt.ExpiredSignatureError, jwt.InvalidTokenError, TypeError, ValueError, HTTPException):
            return jsonify({"error": "Your session is invalid or expired. Please sign in again."}), 401
        return view(*args, **kwargs)
    return decorated


def owned_project(project_id, user_id):
    rows = db_fetch_all(
        """SELECT p.*, t.name AS team_name
           FROM projects p
           JOIN teams t ON t.id = p.team_id
           WHERE p.id = %s AND t.owner_id = %s""",
        (project_id, user_id),
    )
    return rows[0] if rows else None


@app.errorhandler(413)
def payload_too_large(error):
    return jsonify({"error": "Request body is too large."}), 413



@app.errorhandler(HTTPException)
def handle_http_error(error):
    return jsonify({"error": error.description, "status": error.code}), error.code


@app.errorhandler(Exception)
def handle_unexpected_error(error):
    app.logger.exception("Unhandled API error (request_id=%s)", getattr(request, "orbit_request_id", "unknown"))
    return jsonify({"error": "An unexpected server error occurred."}), 500


@app.route("/health", methods=["GET"])
@app.route("/api/health", methods=["GET"])
def health():
    database_status = "unavailable"
    try:
        conn = get_db()
        try:
            with conn.cursor() as cursor:
                cursor.execute("SELECT 1")
                cursor.fetchone()
            database_status = "connected"
        finally:
            conn.close()
    except Exception:
        app.logger.warning("Health check could not connect to PostgreSQL.")
    status_code = 200 if database_status == "connected" else 503
    return jsonify({
        "status": "ok" if status_code == 200 else "degraded",
        "version": APP_VERSION,
        "database": database_status,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }), status_code


@app.route("/api/meta", methods=["GET"])
def metadata():
    return jsonify({
        "name": "ORBIT Platform",
        "version": APP_VERSION,
        "capabilities": {
            "project_management": True,
            "deployment_tracking": True,
            "metrics_reporting": True,
            "telemetry_ingestion": True,
            "cloud_resource_provisioning": False,
            "build_execution": False,
        },
    })


@app.route("/api/auth/register", methods=["POST"])
def register():
    data = json_body()
    email = read_string(data, "email", required=True, max_length=255).lower()
    username = read_string(data, "username", required=True, max_length=50)
    password = read_password(data)
    first_name = read_string(data, "first_name", default="", max_length=100)
    if not EMAIL_RE.fullmatch(email):
        abort(400, description="Enter a valid email address.")
    if email == DEMO_EMAIL:
        abort(400, description="This email address is reserved for the built-in demo account.")
    if not USERNAME_RE.fullmatch(username):
        abort(400, description="Username must be 3–50 characters and use letters, numbers, dots, underscores, or hyphens.")
    if len(password) < 8:
        abort(400, description="Password must contain at least 8 characters.")

    conn = None
    try:
        conn = get_db()
        with conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                cursor.execute(
                    """INSERT INTO users (email, username, password_hash, first_name)
                       VALUES (%s, %s, %s, %s)
                       RETURNING id, email, username, first_name, last_name""",
                    (email, username, hash_password(password), first_name),
                )
                user = dict(cursor.fetchone())
                cursor.execute(
                    "INSERT INTO teams (name, owner_id, description) VALUES (%s, %s, %s)",
                    ("Default Team", user["id"], "Default workspace"),
                )
        user = json_safe(user)
        return jsonify({"success": True, "token": issue_token(user), "user": public_user(user)}), 201
    except IntegrityError:
        return jsonify({"error": "That email address or username is already registered."}), 409
    except psycopg2.Error:
        app.logger.exception("Registration database error")
        return jsonify({"error": "Registration is temporarily unavailable."}), 503
    finally:
        if conn is not None:
            conn.close()


@app.route("/api/auth/login", methods=["POST"])
def login():
    data = json_body()
    email = read_string(data, "email", required=True, max_length=255).lower()
    password = read_password(data)

    if email == DEMO_EMAIL and not DEMO_AUTH_ENABLED:
        return jsonify({"error": "The demo account is disabled in this environment."}), 401

    try:
        rows = db_fetch_all(
            """SELECT id, email, username, password_hash, first_name, last_name
               FROM users WHERE LOWER(email) = %s LIMIT 1""",
            (email,),
        )
        if not rows:
            return jsonify({"error": "Invalid email or password."}), 401
        user = rows[0]
        password_matches = verify_password(password, user.get("password_hash"))
        local_demo_signin = (
            email == DEMO_EMAIL
            and DEMO_AUTH_ENABLED
            and hmac.compare_digest(password, DEMO_PASSWORD)
        )
        # Upgrade the placeholder seed hash used by older ORBIT 1.x databases,
        # but only for the explicit local demo account and only in demo-enabled environments.
        if not password_matches and local_demo_signin:
            upgraded_hash = hash_password(password)
            db_execute(
                "UPDATE users SET password_hash = %s, updated_at = CURRENT_TIMESTAMP WHERE id = %s",
                (upgraded_hash, user["id"]),
            )
            user["password_hash"] = upgraded_hash
            password_matches = True
        if not password_matches:
            return jsonify({"error": "Invalid email or password."}), 401
        if re.fullmatch(r"[a-fA-F0-9]{64}", user.get("password_hash") or ""):
            upgraded_hash = hash_password(password)
            db_execute(
                "UPDATE users SET password_hash = %s, updated_at = CURRENT_TIMESTAMP WHERE id = %s",
                (upgraded_hash, user["id"]),
            )
            user["password_hash"] = upgraded_hash
        return jsonify({"token": issue_token(user), "user": public_user(user)})
    except psycopg2.Error:
        app.logger.exception("Login database error")
        return jsonify({"error": "Sign-in is temporarily unavailable."}), 503


@app.route("/api/auth/me", methods=["GET"])
@token_required
def auth_me():
    rows = db_fetch_all(
        "SELECT id, email, username, first_name, last_name FROM users WHERE id = %s",
        (request.user_id,),
    )
    if not rows:
        return jsonify({"error": "Account not found."}), 401
    return jsonify({"user": public_user(rows[0])})


@app.route("/api/projects", methods=["GET"])
@token_required
def get_projects():
    rows = db_fetch_all(
        """SELECT p.*, t.name AS team_name
           FROM projects p JOIN teams t ON t.id = p.team_id
           WHERE t.owner_id = %s
           ORDER BY p.created_at DESC, p.id DESC""",
        (request.user_id,),
    )
    return jsonify({"projects": rows})


@app.route("/api/projects", methods=["POST"])
@token_required
def create_project():
    data = json_body()
    name = read_string(data, "name", required=True, max_length=120)
    description = read_string(data, "description", default="", max_length=2000)
    runtime = read_string(data, "runtime", default="node", max_length=30).lower()
    if runtime not in RUNTIMES:
        abort(400, description="Runtime must be one of: node, python, java, go.")

    supplied_team = data.get("team_id")
    if supplied_team is None:
        teams = db_fetch_all("SELECT id FROM teams WHERE owner_id = %s ORDER BY id LIMIT 1", (request.user_id,))
        if not teams:
            abort(400, description="Create a team before creating a project.")
        team_id = teams[0]["id"]
    else:
        team_id = positive_int(supplied_team, "Team ID")

    permitted = db_fetch_all("SELECT id FROM teams WHERE id = %s AND owner_id = %s", (team_id, request.user_id))
    if not permitted:
        abort(404, description="Team not found.")
    created = db_execute(
        """INSERT INTO projects (team_id, name, description, runtime)
           VALUES (%s, %s, %s, %s) RETURNING id""",
        (team_id, name, description, runtime),
        returning=True,
    )
    project = owned_project(created[0]["id"], request.user_id)
    return jsonify({"success": True, "project": project}), 201


@app.route("/api/projects/<int:project_id>", methods=["GET"])
@token_required
def get_project(project_id):
    project = owned_project(project_id, request.user_id)
    if not project:
        abort(404, description="Project not found.")
    return jsonify(project)


@app.route("/api/projects/<int:project_id>", methods=["PUT"])
@token_required
def update_project(project_id):
    data = json_body()
    current = owned_project(project_id, request.user_id)
    if not current:
        abort(404, description="Project not found.")
    name = read_string(data, "name", default=current["name"], required=True, max_length=120)
    description = read_string(data, "description", default=current.get("description") or "", max_length=2000)
    runtime = read_string(data, "runtime", default=current["runtime"], max_length=30).lower()
    status = read_string(data, "status", default=current["status"], max_length=30).lower()
    if runtime not in RUNTIMES:
        abort(400, description="Runtime must be one of: node, python, java, go.")
    if status not in PROJECT_STATUSES:
        abort(400, description="Status must be active or archived.")
    db_execute(
        """UPDATE projects AS p
           SET name = %s, description = %s, runtime = %s, status = %s,
               updated_at = CURRENT_TIMESTAMP
           FROM teams AS t
           WHERE p.id = %s AND p.team_id = t.id AND t.owner_id = %s""",
        (name, description, runtime, status, project_id, request.user_id),
    )
    return jsonify({"success": True, "project": owned_project(project_id, request.user_id)})


@app.route("/api/projects/<int:project_id>", methods=["DELETE"])
@token_required
def delete_project(project_id):
    deleted = db_execute(
        """DELETE FROM projects AS p USING teams AS t
           WHERE p.team_id = t.id AND t.owner_id = %s AND p.id = %s
           RETURNING p.id""",
        (request.user_id, project_id),
        returning=True,
    )
    if not deleted:
        abort(404, description="Project not found.")
    return jsonify({"success": True, "deleted_id": project_id})


@app.route("/api/projects/<int:project_id>/deploy", methods=["POST"])
@token_required
def deploy_project(project_id):
    data = json_body()
    project = owned_project(project_id, request.user_id)
    if not project:
        abort(404, description="Project not found.")
    version = read_string(data, "version", default="1.0.0", required=True, max_length=80)
    branch = read_string(data, "branch", default="main", required=True, max_length=200)
    rows = db_execute(
        """INSERT INTO deployments (project_id, version, status, branch, deployed_by)
           VALUES (%s, %s, %s, %s, %s)
           RETURNING id, project_id, version, status, branch, created_at""",
        (project_id, version, "in-progress", branch, request.user_id),
        returning=True,
    )
    return jsonify({
        "success": True,
        "message": "Deployment record created. This release tracks deployments but does not provision cloud resources.",
        "deployment": rows[0],
    }), 201


@app.route("/api/deployments", methods=["GET"])
@token_required
def get_deployments():
    rows = db_fetch_all(
        """SELECT d.*, p.name AS project_name
           FROM deployments d
           JOIN projects p ON p.id = d.project_id
           JOIN teams t ON t.id = p.team_id
           WHERE t.owner_id = %s
           ORDER BY d.created_at DESC, d.id DESC""",
        (request.user_id,),
    )
    return jsonify({"deployments": rows})


@app.route("/api/deployments/<int:deployment_id>", methods=["GET"])
@token_required
def get_deployment(deployment_id):
    rows = db_fetch_all(
        """SELECT d.*, p.name AS project_name
           FROM deployments d
           JOIN projects p ON p.id = d.project_id
           JOIN teams t ON t.id = p.team_id
           WHERE d.id = %s AND t.owner_id = %s""",
        (deployment_id, request.user_id),
    )
    if not rows:
        abort(404, description="Deployment not found.")
    return jsonify(rows[0])


@app.route("/api/metrics/<int:project_id>", methods=["GET"])
@token_required
def get_metrics(project_id):
    project = owned_project(project_id, request.user_id)
    if not project:
        abort(404, description="Project not found.")
    metrics = db_fetch_all(
        """SELECT * FROM metrics WHERE project_id = %s
           ORDER BY timestamp DESC, id DESC LIMIT 100""",
        (project_id,),
    )
    cpu_values = [float(row["cpu_usage"]) for row in metrics if row.get("cpu_usage") is not None]
    memory_values = [float(row["memory_usage"]) for row in metrics if row.get("memory_usage") is not None]
    summary = {
        "avg_cpu": round(sum(cpu_values) / len(cpu_values), 2) if cpu_values else 0,
        "avg_memory": round(sum(memory_values) / len(memory_values), 2) if memory_values else 0,
        "total_requests": sum(int(row.get("requests_total") or 0) for row in metrics),
    }
    return jsonify({"metrics": metrics, "summary": summary})

def read_metric_value(data, field, *, integer=False, minimum=0, maximum=None):
    """Validate finite telemetry while preserving exact integer inputs."""
    value = data.get(field)
    label = field.replace("_", " ").capitalize()
    if value is None:
        return None
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        abort(400, description=label + " must be a number.")

    # Avoid converting large Python integers to float: that conversion can
    # overflow or round a valid integer before its database bounds are checked.
    if integer and isinstance(value, int):
        number = value
    else:
        try:
            number = float(value)
        except (OverflowError, ValueError):
            abort(400, description=label + " must be finite.")
        if not math.isfinite(number):
            abort(400, description=label + " must be finite.")
        if integer:
            if not number.is_integer():
                abort(400, description=label + " must be a whole number.")
            number = int(number)

    if number < minimum or (maximum is not None and number > maximum):
        limit = str(minimum) + ((" to " + str(maximum)) if maximum is not None else " or greater")
        abort(400, description=label + " must be " + limit + ".")
    return number


def parse_metric_timestamp(value):
    """Parse an ISO-8601 value into the UTC-naive timestamp used by the schema."""
    message = "Timestamp must be an ISO-8601 date-time string."
    if not isinstance(value, str) or not value.strip():
        abort(400, description=message)
    normalized = value.strip()
    if not re.match(r"^\d{4}-\d{2}-\d{2}[Tt ]\d{2}:\d{2}", normalized):
        abort(400, description=message)
    if normalized.endswith(("Z", "z")):
        normalized = normalized[:-1] + "+00:00"
    try:
        parsed = datetime.fromisoformat(normalized)
    except ValueError:
        abort(400, description=message)
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc).replace(tzinfo=None)


@app.route("/api/metrics/<int:project_id>", methods=["POST"])
@token_required
def ingest_metrics(project_id):
    """Persist measurements for a project owned by the authenticated user."""
    if not owned_project(project_id, request.user_id):
        abort(404, description="Project not found.")

    data = json_body()
    cpu_usage = read_metric_value(data, "cpu_usage", maximum=100)
    memory_usage = read_metric_value(data, "memory_usage", integer=True, maximum=POSTGRES_INTEGER_MAX)
    requests_total = read_metric_value(data, "requests_total", integer=True, maximum=POSTGRES_INTEGER_MAX)
    errors_total = read_metric_value(data, "errors_total", integer=True, maximum=POSTGRES_INTEGER_MAX)
    response_time_ms = read_metric_value(data, "response_time_ms", maximum=999999.99)
    if all(value is None for value in (cpu_usage, memory_usage, requests_total, errors_total, response_time_ms)):
        abort(400, description="Provide at least one telemetry measurement.")
    if requests_total is not None and errors_total is not None and errors_total > requests_total:
        abort(400, description="Errors total cannot exceed requests total.")

    recorded_at = parse_metric_timestamp(data.get("timestamp")) if "timestamp" in data else None

    try:
        rows = db_execute(
            """INSERT INTO metrics
                   (project_id, cpu_usage, memory_usage, requests_total, errors_total, response_time_ms, timestamp)
               VALUES (%s, %s, %s, %s, %s, %s, COALESCE(%s::timestamp, CURRENT_TIMESTAMP))
               RETURNING id, project_id, cpu_usage, memory_usage, requests_total,
                         errors_total, response_time_ms, timestamp""",
            (project_id, cpu_usage, memory_usage, requests_total, errors_total, response_time_ms, recorded_at),
            returning=True,
        )
    except psycopg2.Error:
        app.logger.exception("Telemetry insert failed for project %s.", project_id)
        return jsonify({"error": "Telemetry could not be stored right now."}), 503
    if not rows:
        app.logger.error("Telemetry insert returned no row for project %s.", project_id)
        return jsonify({"error": "Telemetry could not be stored right now."}), 503
    return jsonify({"success": True, "metric": rows[0]}), 201


@app.route("/api/instances", methods=["GET"])
@token_required
def get_instances():
    rows = db_fetch_all(
        """SELECT i.*, p.name AS project_name
           FROM instances i
           JOIN projects p ON p.id = i.project_id
           JOIN teams t ON t.id = p.team_id
           WHERE t.owner_id = %s
           ORDER BY i.created_at DESC""",
        (request.user_id,),
    )
    return jsonify({"instances": rows})


@app.route("/api/instances", methods=["POST"])
@token_required
def create_instance():
    data = json_body()
    project_id = positive_int(data.get("project_id"), "Project ID")
    if not owned_project(project_id, request.user_id):
        abort(404, description="Project not found.")
    name = read_string(data, "name", required=True, max_length=120)
    instance_type = read_string(data, "instance_type", default="t3.medium", max_length=80)
    deployment_id = data.get("deployment_id")
    if deployment_id is not None:
        deployment_id = positive_int(deployment_id, "Deployment ID")
        match = db_fetch_all(
            """SELECT d.id FROM deployments d
               JOIN projects p ON p.id = d.project_id
               JOIN teams t ON t.id = p.team_id
               WHERE d.id = %s AND d.project_id = %s AND t.owner_id = %s""",
            (deployment_id, project_id, request.user_id),
        )
        if not match:
            abort(400, description="Deployment must belong to the selected project.")
    else:
        recent = db_fetch_all(
            "SELECT id FROM deployments WHERE project_id = %s ORDER BY created_at DESC LIMIT 1",
            (project_id,),
        )
        if not recent:
            abort(400, description="Create a deployment record before adding an instance.")
        deployment_id = recent[0]["id"]
    rows = db_execute(
        """INSERT INTO instances (deployment_id, project_id, name, instance_type, status)
           VALUES (%s, %s, %s, %s, %s) RETURNING id, deployment_id, project_id, name, instance_type, status""",
        (deployment_id, project_id, name, instance_type, "running"),
        returning=True,
    )
    return jsonify({"success": True, "instance": rows[0]}), 201


@app.route("/api/teams", methods=["GET"])
@token_required
def get_teams():
    rows = db_fetch_all(
        """SELECT t.*, u.username AS owner_name
           FROM teams t JOIN users u ON u.id = t.owner_id
           WHERE t.owner_id = %s ORDER BY t.created_at DESC""",
        (request.user_id,),
    )
    return jsonify({"teams": rows})


@app.route("/api/teams", methods=["POST"])
@token_required
def create_team():
    data = json_body()
    name = read_string(data, "name", required=True, max_length=120)
    description = read_string(data, "description", default="", max_length=2000)
    rows = db_execute(
        """INSERT INTO teams (name, owner_id, description)
           VALUES (%s, %s, %s) RETURNING id, name, owner_id, description, created_at""",
        (name, request.user_id, description),
        returning=True,
    )
    return jsonify({"success": True, "team": rows[0]}), 201


if __name__ == "__main__":
    app.run(
        debug=os.getenv("FLASK_DEBUG", "0") == "1" and not IS_PRODUCTION,
        host=os.getenv("FLASK_HOST", "127.0.0.1"),
        port=int(os.getenv("PORT", "5000")),
    )
