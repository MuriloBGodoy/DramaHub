@echo off
REM Sobe o DramaHub (backend + frontend ja embutido) em http://localhost:8080
setlocal
REM Carrega variaveis do arquivo .env (KEY=VALUE por linha), se existir
if exist "%~dp0.env" for /f "usebackq eol=# tokens=1,* delims==" %%a in ("%~dp0.env") do set "%%a=%%b"
cd /d "%~dp0backend"
if not exist target\backend-0.0.1-SNAPSHOT.jar (
  echo Jar nao encontrado. Rodando build.bat primeiro...
  call "%~dp0build.bat" || exit /b 1
)
echo DramaHub em http://localhost:8080  (Ctrl+C para parar)
echo Para abrir no celular, use o IP deste PC na mesma rede Wi-Fi, ex: http://192.168.0.10:8080
start "" http://localhost:8080
java -jar target\backend-0.0.1-SNAPSHOT.jar
