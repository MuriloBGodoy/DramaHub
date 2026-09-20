@echo off
REM Carrega variaveis do arquivo .env (KEY=VALUE por linha), se existir
if exist "%~dp0.env" for /f "usebackq eol=# tokens=1,* delims==" %%a in ("%~dp0.env") do set "%%a=%%b"
REM Modo desenvolvimento: backend na 8080 e frontend com hot reload na 5173 (duas janelas)
start "DramaHub backend" cmd /k "cd /d "%~dp0backend" && mvnw.cmd -q spring-boot:run"
start "DramaHub frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev"
echo Backend:  http://localhost:8080/api/series
echo Frontend: http://localhost:5173
