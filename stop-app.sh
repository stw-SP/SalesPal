#!/bin/bash

# Get script directory
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PID_FILE="$DIR/app.pid"

echo "Stopping SalesPal servers..."

if [ -f "$PID_FILE" ]; then
    # Read PIDs from file
    mapfile -t PIDS < "$PID_FILE"
    
    # Kill each process
    for PID in "${PIDS[@]}"; do
        if ps -p "$PID" > /dev/null; then
            echo "Killing process with PID: $PID"
            kill -15 "$PID" 2>/dev/null || kill -9 "$PID" 2>/dev/null
        else
            echo "Process with PID $PID is not running"
        fi
    done
    
    # Remove PID file
    rm "$PID_FILE"
    echo "SalesPal servers stopped"
else
    echo "No PID file found. Trying to find and kill processes manually..."
    
    # Try to find and kill any Node.js process running on ports 5173 and 5000
    NODE_PIDS=$(pgrep -f "node.*dev")
    for PID in $NODE_PIDS; do
        echo "Killing Node.js process with PID: $PID"
        kill -15 "$PID" 2>/dev/null || kill -9 "$PID" 2>/dev/null
    done
    
    echo "SalesPal servers should be stopped now"
fi