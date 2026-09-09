@echo off
echo.
echo ╔════════════════════════════════════════════════════════════════╗
echo ║                  ORBIT Platform Setup Script                   ║
echo ║                      Windows (PowerShell)                      ║
echo ╚════════════════════════════════════════════════════════════════╝
echo.

REM Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python not found. Install from https://www.python.org/
    exit /b 1
)
echo ✅ Python found

REM Check Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js not found. Install from https://nodejs.org/
    exit /b 1
)
echo ✅ Node.js found

REM Check PostgreSQL
psql --version >nul 2>&1
if errorlevel 1 (
    echo ❌ PostgreSQL not found. Install from https://www.postgresql.org/download/windows/
    exit /b 1
)
echo ✅ PostgreSQL found

echo.
echo Setting up backend...
cd backend
pip install -r requirements.txt
if errorlevel 1 (
    echo ❌ Failed to install Python dependencies
    exit /b 1
)
echo ✅ Backend dependencies installed
cd ..

echo.
echo Setting up frontend...
cd frontend
call npm install
if errorlevel 1 (
    echo ❌ Failed to install Node dependencies
    exit /b 1
)
echo ✅ Frontend dependencies installed
cd ..

echo.
echo ╔════════════════════════════════════════════════════════════════╗
echo ║                    Setup Complete! 🎉                          ║
echo ║                                                                ║
echo ║  Next steps:                                                   ║
echo ║                                                                ║
echo ║  1. Create database:                                           ║
echo ║     psql -U postgres -f database/schema.sql                    ║
echo ║                                                                ║
echo ║  2. Start backend (Terminal 1):                                ║
echo ║     cd backend                                                 ║
echo ║     python app.py                                              ║
echo ║                                                                ║
echo ║  3. Start frontend (Terminal 2):                               ║
echo ║     cd frontend                                                ║
echo ║     npm run dev                                                ║
echo ║                                                                ║
echo ║  4. Open http://localhost:3000                                 ║
echo ║     Login: demo@orbit.local / demo123                          ║
echo ║                                                                ║
echo ╚════════════════════════════════════════════════════════════════╝
echo.
pause
