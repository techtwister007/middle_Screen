@echo off
REM Double-click to run the WhatsApp bridge in a window (simple alternative to pm2).
cd /d "%~dp0"
if not exist node_modules call npm install
node index.mjs
pause
