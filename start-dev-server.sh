#!/bin/bash
cd /home/jeolsen/projects/RSS_Visit_Report
npm run dev &
echo $! > /tmp/vite-server.pid
echo "Vite server started with PID $(cat /tmp/vite-server.pid)"
sleep 5
echo "Server should be ready at http://localhost:5173"