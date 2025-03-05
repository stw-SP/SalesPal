# Port 5000 Issue Fix

There was an issue with port 5000 being in use. This was resolved by:

1. Changing the backend port from 5000 to 5001 in `server.js`
2. Updating the Vite configuration in `frontend/vite.config.js` to proxy API requests to port 5001
3. Creating a new launch script `launch-app-fixed.sh` that:
   - Properly stops any existing processes
   - Explicitly sets the PORT environment variable to 5001
   - Launches both backend and frontend servers

## How to Use

To start SalesPal:

1. First ensure no processes are using the required ports:
   ```
   ./fix-ports.sh
   ```

2. Launch using the new fixed script:
   ```
   ./launch-app-fixed.sh
   ```

3. Access the application at:
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:5001/api

If you encounter issues:
1. Run `./stop-app.sh` to stop all processes
2. Run `./fix-ports.sh` to clear any processes using required ports
3. Try again with `./launch-app-fixed.sh`

## Changes Made

1. Fixed syntax errors in `server.js` (escaped exclamation marks)
2. Changed backend port from 5000 to 5001
3. Updated proxy configuration in frontend
4. Created new launch script with better port handling