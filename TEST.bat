@echo off
setlocal
title Reservas SOTO DEL PRIOR - Entorno Local

echo ===================================================
echo   LANZADOR ENTORNO LOCAL - RESERVAS SOTO DEL PRIOR
echo ===================================================
echo.

:: Asegurarse de que el directorio de trabajo es el del script
cd /d "%~dp0"

echo [1/3] Verificando Base de Datos...
:: Bajamos todo primero para asegurar que los cambios de red se aplican sin conflictos
docker compose stop sotoreservas-db >nul 2>&1
docker compose up -d --force-recreate sotoreservas-db
if %ERRORLEVEL% NEQ 0 (
    echo Error: Docker no esta en ejecucion o hay un problema con la DB.
    pause
    exit /b %ERRORLEVEL%
)

echo [2/3] Abriendo el Panel de Control...
:: Esperamos un segundo y abrimos el navegador
timeout /t 2 /nobreak > nul
start "" "http://localhost:3001/admin"

echo [3/3] Iniciando Servidores (Web y API)...
echo.
echo ---------------------------------------------------
echo   IMPORTANTE: El Dashboard estara en:
echo   http://localhost:3001/admin
echo ---------------------------------------------------
echo.

:: Ejecutamos el comando dev del root que lanza todos los workspaces
npm run dev

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Hubo un error al iniciar los servidores. 
    echo Asegurate de haber ejecutado "npm install" previamente.
    pause
)

pause
