@echo off
chcp 65001 >nul
setlocal
title SOTOdelPRIOR - Test local Reservas
cd /d "%~dp0"

set APP_NAME=Reservas
set LOCAL_URL=http://localhost:3001/admin

echo ============================================================
echo   ENTORNO LOCAL %APP_NAME% (SOTO DEL PRIOR)
echo   Dashboard: %LOCAL_URL%
echo ============================================================
echo.

echo [1/3] Verificando Base de Datos...
docker compose stop sotoreservas-db >nul 2>&1
docker compose up -d --force-recreate sotoreservas-db
if errorlevel 1 (
    echo [ERROR] Docker no esta en ejecucion o problema con la DB.
    goto :error
)

echo.
echo [2/3] Abriendo el Panel de Control...
timeout /t 2 /nobreak >nul
start "" "%LOCAL_URL%"

echo.
echo ============================================================
echo   [OK] DB lista. Iniciando servidores (Web + API)
echo   Dashboard: %LOCAL_URL%
echo ============================================================
echo.

echo [3/3] Arrancando workspaces (npm run dev)...
npm run dev
if errorlevel 1 (
    echo.
    echo [ERROR] Fallo al iniciar. Asegurate de haber ejecutado "npm install".
    goto :error
)
pause
goto :eof

:error
pause
endlocal
exit /b 1
