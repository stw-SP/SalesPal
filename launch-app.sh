#!/bin/bash

# Clean kill all existing processes
echo "Stopping any existing SalesPal processes..."
./stop-app.sh

# Kill any processes using our ports
echo "Clearing ports..."
pkill -f "node.*server.js" 2>/dev/null
pkill -f "vite" 2>/dev/null
pkill -f "nodemon" 2>/dev/null

# Add a small delay to ensure ports are released
sleep 2

# Force-set PORT environment variable for backend
export PORT=5001

# Change to SalesPal directory
cd "$(dirname "$0")"

# Terminal colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print banner
echo -e "${GREEN}"
echo "  _____       _           _____      _ "
echo " / ____|     | |         |  __ \    | |"
echo "| (___   __ _| | ___ ___ | |__) |_ _| |"
echo " \___ \ / _\` | |/ _ / __||  ___/ _\` | |"
echo " ____) | (_| | |  __\__ \| |  | (_| | |"
echo "|_____/ \__,_|_|\___|___/|_|   \__,_|_|"
echo -e "${NC}"
echo -e "${BLUE}Starting SalesPal Application...${NC}"

# Start backend server with explicit PORT
echo -e "${GREEN}Starting Backend Server on port 5001...${NC}"
cd backend
PORT=5001 npm run dev &
BACKEND_PID=$!

# Start frontend server
echo -e "${GREEN}Starting Frontend Server...${NC}"
cd ../frontend
npm run dev &
FRONTEND_PID=$!

# Wait for servers to start
sleep 2

# Display information
echo -e "${GREEN}SalesPal is running!${NC}"
echo -e "${BLUE}Frontend:${NC} http://localhost:5173"
echo -e "${BLUE}Backend API:${NC} http://localhost:5001/api"
echo ""
echo -e "${GREEN}IMPORTANT:${NC} Always use the frontend URL (localhost:5173) in your browser"
echo ""
echo "Press Ctrl+C to stop both servers"

# Handle script termination gracefully
trap "kill $BACKEND_PID $FRONTEND_PID; exit" SIGINT SIGTERM

# Keep script running
wait