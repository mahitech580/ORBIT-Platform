# 🚀 ORBIT Platform

A complete cloud deployment management system built with **Python Flask**, **React**, and **PostgreSQL**.

## 📋 Tech Stack

- **Backend**: Python 3.10+ (Flask)
- **Frontend**: React 18 (Vite)
- **Database**: PostgreSQL 14+
- **Only**: HTML, CSS, JavaScript, ReactJS, Python, SQL

## 🎯 Features

✅ User authentication with JWT  
✅ Project management  
✅ Deployment tracking  
✅ Metrics & monitoring  
✅ Real-time dashboard  
✅ Responsive UI  

## 📂 Project Structure

```
ORBIT-CLEAN/
├── backend/
│   ├── app.py              # Flask API server
│   └── requirements.txt     # Python dependencies
├── frontend/
│   ├── index.html          # HTML entry
│   ├── vite.config.js      # Vite config
│   ├── package.json        # NPM dependencies
│   └── src/
│       ├── App.jsx         # Main React component
│       ├── main.jsx        # React entry point
│       ├── pages/          # Page components
│       ├── components/     # Reusable components
│       └── css/            # Stylesheets
├── database/
│   └── schema.sql          # PostgreSQL schema
└── .env                    # Configuration
```

## 🚀 Quick Start

### 1. Install PostgreSQL

**Windows:**
```bash
# Download and install from https://www.postgresql.org/download/windows/
# Or use Chocolatey:
choco install postgresql
```

**Mac:**
```bash
brew install postgresql
brew services start postgresql
```

**Linux:**
```bash
sudo apt-get install postgresql postgresql-contrib
sudo systemctl start postgresql
```

### 2. Set Up Database

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE orbit;

# Exit psql
\q

# Load schema
psql -U postgres -d orbit -f database/schema.sql
```

### 3. Backend Setup

```bash
# Install Python dependencies
pip install -r backend/requirements.txt

# Run Flask server
cd backend
python app.py
```

Backend runs on: **http://localhost:5000**

### 4. Frontend Setup

```bash
# Install Node dependencies
cd frontend
npm install

# Run development server
npm run dev
```

Frontend runs on: **http://localhost:3000**

## 📖 Usage

### Login

- **Email**: demo@orbit.local
- **Password**: demo123

### Features

**Dashboard**
- View total projects and deployments
- See recent projects and deployments
- Monitor deployment statistics

**Projects**
- Create new projects
- Select runtime (Node.js, Python, Java, Go)
- View all projects
- Delete projects

**Deployments**
- Deploy projects by version and branch
- Track deployment status
- View deployment history
- Timeline view of all deployments

**Metrics**
- View performance metrics
- Monitor CPU, memory, requests
- See average metrics and trends
- Visual chart representation

## 🔌 API Endpoints

### Authentication
```bash
POST /api/auth/login
POST /api/auth/register
```

### Projects
```bash
GET /api/projects
POST /api/projects
GET /api/projects/<id>
PUT /api/projects/<id>
DELETE /api/projects/<id>
```

### Deployments
```bash
GET /api/deployments
POST /api/projects/<id>/deploy
GET /api/deployments/<id>
```

### Metrics
```bash
GET /api/metrics/<project_id>
```

### Instances
```bash
GET /api/instances
POST /api/instances
```

### Teams
```bash
GET /api/teams
POST /api/teams
```

## 🗄️ Database Schema

**Tables:**
- `users` - User accounts
- `teams` - Team management
- `projects` - Projects
- `deployments` - Deployment records
- `instances` - Compute instances
- `metrics` - Performance metrics
- `logs` - Application logs

## 🛠️ Development

### Backend Development

Edit `backend/app.py` to add new endpoints:

```python
@app.route('/api/your-endpoint', methods=['POST'])
@token_required
def your_endpoint():
    data = request.get_json()
    # Your logic here
    return jsonify({'success': True}), 200
```

### Frontend Development

React components in `frontend/src/`:

```jsx
import React, { useState, useEffect } from 'react';

export default function YourComponent() {
  const [data, setData] = useState(null);
  
  useEffect(() => {
    // Fetch data
  }, []);
  
  return (
    <div>
      {/* Your JSX */}
    </div>
  );
}
```

## 🔐 Security

- JWT authentication (token-based)
- Password hashing
- CORS enabled
- Input validation
- SQL injection prevention

## 📊 Production Deployment

### Python Backend
```bash
# Install gunicorn
pip install gunicorn

# Run with gunicorn
gunicorn -w 4 -b 0.0.0.0:5000 backend.app:app
```

### React Frontend
```bash
# Build for production
npm run build

# Deploy dist/ folder to static hosting
```

### Database
- Use managed PostgreSQL (AWS RDS, Google Cloud SQL, Heroku Postgres)
- Enable backups
- Use connection pooling

## 🐛 Troubleshooting

### Port already in use
```bash
# Windows
netstat -ano | findstr :5000

# Mac/Linux
lsof -i :5000
```

### Database connection fails
```bash
# Check PostgreSQL is running
# Windows: Services > PostgreSQL
# Mac: brew services list
# Linux: sudo systemctl status postgresql

# Check credentials in .env
# Create database if not exists
psql -U postgres -c "CREATE DATABASE orbit;"
```

### Node modules issues
```bash
rm -rf node_modules package-lock.json
npm install
```

## 📝 Notes

- Demo credentials: `demo@orbit.local` / `demo123`
- API runs on `http://localhost:5000`
- Frontend runs on `http://localhost:3000`
- Database: PostgreSQL on `localhost:5432`

## 🚀 What's Included

- **Backend**: 400+ lines of Python Flask code
- **Frontend**: 1000+ lines of React code
- **Database**: Complete SQL schema with indexes
- **CSS**: Professional styling (800+ lines)
- **HTML**: Semantic markup

## 📚 Documentation

All code is well-commented and easy to understand. Just edit files and restart servers to see changes.

## 💡 Next Steps

1. Create an account with registration endpoint
2. Create your first project
3. Deploy it
4. Monitor metrics
5. Add more features

## 🎓 Learning Resources

- [Flask Documentation](https://flask.palletsprojects.com/)
- [React Documentation](https://react.dev/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [JWT Authentication](https://jwt.io/)

## 📞 Support

- Check console logs for errors
- Review database queries in `backend/app.py`
- Check network tab in browser DevTools
- Read error messages carefully

---

**Version**: 1.0.0  
**Status**: Production Ready  
**License**: MIT

🎉 **Happy Coding!**
