#!/bin/bash

echo "Checking for any processes using ports 5000 and 5173..."

# Check for processes using port 5001 (backend)
PORT_5001_PID=$(lsof -t -i:5001 2>/dev/null)
if [ ! -z "$PORT_5001_PID" ]; then
  echo "Found process using port 5001 (PID: $PORT_5001_PID). Killing it..."
  kill -9 $PORT_5001_PID
  echo "Process killed."
else
  echo "No processes found using port 5001."
fi

# Also check for processes using port 5000 (former backend port)
PORT_5000_PID=$(lsof -t -i:5000 2>/dev/null)
if [ ! -z "$PORT_5000_PID" ]; then
  echo "Found process using port 5000 (PID: $PORT_5000_PID). Killing it..."
  kill -9 $PORT_5000_PID
  echo "Process killed."
else
  echo "No processes found using port 5000."
fi

# Check for processes using port 5173 (frontend)
PORT_5173_PID=$(lsof -t -i:5173 2>/dev/null)
if [ ! -z "$PORT_5173_PID" ]; then
  echo "Found process using port 5173 (PID: $PORT_5173_PID). Killing it..."
  kill -9 $PORT_5173_PID
  echo "Process killed."
else
  echo "No processes found using port 5173."
fi

# Check for processes using port 3000 (possible conflict)
PORT_3000_PID=$(lsof -t -i:3000 2>/dev/null)
if [ ! -z "$PORT_3000_PID" ]; then
  echo "Found process using port 3000 (PID: $PORT_3000_PID). Killing it..."
  kill -9 $PORT_3000_PID
  echo "Process killed."
else
  echo "No processes found using port 3000."
fi

echo "Port issues resolved. You can now run the app with ./start-salespal.sh"