@echo off
REM Modo desenvolvimento: frontend com hot reload em http://localhost:5173 (dados no Supabase)
cd /d "%~dp0frontend"
if not exist node_modules call npm install
npm run dev
