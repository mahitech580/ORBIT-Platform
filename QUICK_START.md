# ORBIT Platform - Quick Start Guide

## ⚡ 5-Minute Setup

### Prerequisites
- Python 3.10+
- Node.js 16+
- PostgreSQL 14+

### Step 1: Run Setup Script (1 minute)

**Windows:**
```bash
setup.bat
```

**Mac/Linux:**
```bash
bash setup.sh
```

### Step 2: Create Database (1 minute)

```bash
psql -U postgres -f database/schema.sql
```

**Note**: If prompted for password, use your PostgreSQL password set during installation.

### Step 3: Start Backend (1 minute)

Open Terminal/PowerShell and run:
```bash
cd backend
python app.py
# or
python3 app.py
```

You should see:
```
╔════════════════════════════════════════════════════════════════╗
║   ORBIT Platform - Python Backend                              ║
║   Running on http://localhost:5000                             ║
║   Login: demo@orbit.local / demo123                            ║
╚════════════════════════════════════════════════════════════════╝
```

### Step 4: Start Frontend (1 minute)

Open another Terminal/PowerShell and run:
```bash
cd frontend
npm run dev
```

You should see:
```
VITE v4.3.0  ready in 234 ms

➜  Local:   http://localhost:3000/
➜  press h to show help
```

### Step 5: Open in Browser (1 minute)

Go to: **http://localhost:3000**

Login with:
- **Email**: demo@orbit.local
- **Password**: demo123

## 🎯 What You Can Do

### Dashboard
- See total projects and deployments
- View recent activity
- Monitor deployment statistics

### Projects
- Create new projects
- Select runtime (Node, Python, Java, Go)
- View project list
- Delete projects

### Deployments
- Deploy projects
- Track deployment status
- View deployment history
- Timeline visualization

### Metrics
- Monitor CPU usage
- Check memory consumption
- View request statistics
- See response times
- Visual charts

## 📝 API Testing

Test the API with curl or Postman:

```bash
# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@orbit.local","password":"demo123"}'

# Get projects (replace TOKEN with response token)
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:5000/api/projects

# Create project
curl -X POST http://localhost:5000/api/projects \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"My App","description":"Test","runtime":"node","team_id":1}'
```

## 🛑 Stop Services

Press `Ctrl+C` in each terminal to stop:
- Backend Flask server
- Frontend Vite server

## ❌ Troubleshooting

### "Port 5000 already in use"
```bash
# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Mac/Linux
lsof -i :5000
kill -9 <PID>
```

### "PostgreSQL connection failed"
```bash
# Check PostgreSQL is running
# Windows: Services > PostgreSQL
# Mac: brew services list | grep postgresql
# Linux: sudo systemctl status postgresql

# Check database exists
psql -U postgres -l | grep orbit
```

### "Module not found" (Python)
```bash
pip install -r backend/requirements.txt
# or
pip3 install -r backend/requirements.txt
```

### "npm ERR!" (Node)
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
```

## 📂 File Structure

```
ORBIT-CLEAN/
├── backend/
│   ├── app.py              # Flask API (400+ lines)
│   └── requirements.txt     # Python packages
├── frontend/
│   ├── src/
│   │   ├── App.jsx         # Main component
│   │   ├── pages/          # 4 page components
│   │   ├── components/     # Navigation
│   │   └── css/            # Styling (800+ lines)
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── database/
│   └── schema.sql          # PostgreSQL schema
├── setup.bat               # Windows setup
├── setup.sh                # Mac/Linux setup
├── .env                    # Configuration
└── README.md               # Full docs
```

## 💻 Code Overview

### Backend (app.py)
- 400+ lines of Flask code
- JWT authentication
- 20+ API endpoints
- PostgreSQL integration
- Error handling

### Frontend (React)
- 1000+ lines of JSX
- 4 main pages (Dashboard, Projects, Deployments, Metrics)
- Responsive design
- 800+ lines of CSS
- Axios for API calls

### Database (SQL)
- 7 tables with relationships
- Proper indexes
- Sample data included
- Supports PostgreSQL 14+

## 🚀 Next Steps

1. ✅ Install dependencies (setup script)
2. ✅ Create database (schema.sql)
3. ✅ Start backend (python app.py)
4. ✅ Start frontend (npm run dev)
5. ✅ Open http://localhost:3000
6. 📖 Read README.md for full documentation
7. 🛠️ Explore the code and customize
8. 🚀 Deploy to production

## 📚 Learn More

- **Backend**: Edit `backend/app.py`
- **Frontend**: Edit `frontend/src/App.jsx` and pages
- **Styling**: Edit `frontend/src/css/style.css`
- **Database**: Edit `database/schema.sql`

## 🎓 Features

✅ User authentication (JWT)  
✅ Project management  
✅ Deployment tracking  
✅ Metrics & monitoring  
✅ Real-time dashboard  
✅ Responsive design  
✅ Production-ready code  
✅ Well-documented  

## 📞 Support

- Check browser console (F12) for frontend errors
- Check terminal for backend errors
- Review database logs with: `psql -U postgres -d orbit`
- Read README.md for detailed documentation

---

**You're all set! Happy coding! 🎉**
