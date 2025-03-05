#!/bin/bash

# Change to SalesPal directory
cd "$(dirname "$0")"

# Kill any existing processes
./stop-app.sh
sleep 1

# Clear any processes using ports
echo "Clearing ports..."
pkill -f "node.*server.js" 2>/dev/null
pkill -f "vite" 2>/dev/null
pkill -f "nodemon" 2>/dev/null
sleep 2

# Start backend server
echo "Starting backend server..."
cd backend
PORT=5001 npm run dev > ../backend.log 2>&1 &
BACKEND_PID=$!

# Start frontend server
echo "Starting frontend server..."
cd ../frontend
npm run dev > ../frontend.log 2>&1 &
FRONTEND_PID=$!

# Wait for servers to start
echo "Waiting for servers to start..."
sleep 8

# Open browser
echo "Opening browser..."
xdg-open http://localhost:5173

echo "SalesPal is running!"
echo "Frontend: http://localhost:5173"
echo "Backend API: http://localhost:5001/api"
echo ""
echo "Press Enter to close this window. The app will continue running."
echo "To stop the app later, run ./stop-app.sh"

# Save PIDs to file
echo $BACKEND_PID > ../app.pid
echo $FRONTEND_PID >> ../app.pid

# Wait for user to press Enter
read