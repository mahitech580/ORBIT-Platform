#!/bin/bash

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                  ORBIT Platform Setup Script                   ║"
echo "║                      Mac / Linux (Bash)                        ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Check Python
if ! command -v python3 &> /dev/null; then
    echo "❌ Python not found. Install: brew install python3 (Mac) or sudo apt install python3 (Linux)"
    exit 1
fi
echo "✅ Python found"

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Install from https://nodejs.org/"
    exit 1
fi
echo "✅ Node.js found"

# Check PostgreSQL
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL not found. Install: brew install postgresql (Mac) or sudo apt install postgresql (Linux)"
    exit 1
fi
echo "✅ PostgreSQL found"

echo ""
echo "Setting up backend..."
cd backend
pip3 install -r requirements.txt
if [ $? -ne 0 ]; then
    echo "❌ Failed to install Python dependencies"
    exit 1
fi
echo "✅ Backend dependencies installed"
cd ..

echo ""
echo "Setting up frontend..."
cd frontend
npm install
if [ $? -ne 0 ]; then
    echo "❌ Failed to install Node dependencies"
    exit 1
fi
echo "✅ Frontend dependencies installed"
cd ..

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                    Setup Complete! 🎉                          ║"
echo "║                                                                ║"
echo "║  Next steps:                                                   ║"
echo "║                                                                ║"
echo "║  1. Create database:                                           ║"
echo "║     psql -U postgres -f database/schema.sql                    ║"
echo "║                                                                ║"
echo "║  2. Start backend (Terminal 1):                                ║"
echo "║     cd backend                                                 ║"
echo "║     python3 app.py                                             ║"
echo "║                                                                ║"
echo "║  3. Start frontend (Terminal 2):                               ║"
echo "║     cd frontend                                                ║"
echo "║     npm run dev                                                ║"
echo "║                                                                ║"
echo "║  4. Open http://localhost:3000                                 ║"
echo "║     Login: demo@orbit.local / demo123                          ║"
echo "║                                                                ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
