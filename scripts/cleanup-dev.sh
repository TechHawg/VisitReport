#!/bin/bash

# RSS Visit Report - Development Environment Cleanup Script
# Ensures clean development server startup by clearing conflicting processes

echo "🧹 Cleaning up development processes..."

# Kill any existing Vite processes
echo "   Stopping Vite processes..."
pkill -f "vite" 2>/dev/null || true

# Kill any node processes on development ports
echo "   Clearing development ports..."
for port in 3001 5173 5174; do
    pid=$(lsof -ti:$port 2>/dev/null)
    if [ ! -z "$pid" ]; then
        echo "   Stopping process on port $port (PID: $pid)"
        kill -9 $pid 2>/dev/null || true
    fi
done

# Wait for processes to clean up
sleep 1

# Verify cleanup
echo "   Verifying cleanup..."
vite_procs=$(ps aux | grep -c "[v]ite" || true)
if [ $vite_procs -eq 0 ]; then
    echo "✅ Development environment ready"
else
    echo "⚠️  Warning: Some Vite processes may still be running"
fi

echo "🚀 Ready to start development server"