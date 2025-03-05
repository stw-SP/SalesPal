#!/bin/bash

echo "Checking for processes using ports 5000, 5001, 5005, and 8080..."

# Kill any process using port 5000
PORT_5000_PID=$(lsof -ti:5000)
if [ -n "$PORT_5000_PID" ]; then
  echo "Killing process using port 5000: $PORT_5000_PID"
  kill -9 $PORT_5000_PID
  echo "Process killed."
else
  echo "No process found using port 5000."
fi

# Kill any process using port 5001
PORT_5001_PID=$(lsof -ti:5001)
if [ -n "$PORT_5001_PID" ]; then
  echo "Killing process using port 5001: $PORT_5001_PID"
  kill -9 $PORT_5001_PID
  echo "Process killed."
else
  echo "No process found using port 5001."
fi

# Kill any process using port 5005
PORT_5005_PID=$(lsof -ti:5005)
if [ -n "$PORT_5005_PID" ]; then
  echo "Killing process using port 5005: $PORT_5005_PID"
  kill -9 $PORT_5005_PID
  echo "Process killed."
else
  echo "No process found using port 5005."
fi

# Kill any process using port 8080
PORT_8080_PID=$(lsof -ti:8080)
if [ -n "$PORT_8080_PID" ]; then
  echo "Killing process using port 8080: $PORT_8080_PID"
  kill -9 $PORT_8080_PID
  echo "Process killed."
else
  echo "No process found using port 8080."
fi

echo "Ports should be free now."