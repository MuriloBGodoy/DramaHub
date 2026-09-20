@echo off
REM Gera o app completo: frontend (Vite) -> backend/src/main/resources/static -> backend/target/*.jar
setlocal
cd /d "%~dp0frontend"
echo [1/3] Instalando dependencias do frontend...
call npm install || goto :err
echo [2/3] Build do frontend...
set VITE_OUT_DIR=
call npm run build || goto :err
cd /d "%~dp0backend"
echo [3/3] Empacotando backend (Spring Boot)...
call mvnw.cmd -q -B -DskipTests package || goto :err
echo.
echo Pronto! Rode start.bat para abrir o DramaHub.
exit /b 0
:err
echo.
echo Falhou. Veja o erro acima.
exit /b 1
