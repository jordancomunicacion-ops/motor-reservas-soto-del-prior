@echo off
chcp 65001 >nul
setlocal
title SOTOdelPRIOR - Despliegue Reservas
cd /d "%~dp0"

set APP_NAME=Reservas

REM ===================================================
REM   Config sobreescribible via deploy.env (gitignored)
REM     REMOTE_USER=root
REM     REMOTE_HOST=mi.servidor.com
REM     REMOTE_PATH=/root/SOTOdelPRIOR/apps/reservas
REM ===================================================
if exist deploy.env (
    for /f "usebackq tokens=1,* delims==" %%A in ("deploy.env") do (
        if not "%%A"=="" set "%%A=%%B"
    )
)

if "%REMOTE_USER%"=="" set REMOTE_USER=root
if "%REMOTE_HOST%"=="" (
    echo [ERROR] REMOTE_HOST no definido. Crea deploy.env con REMOTE_HOST=tu.servidor.com
    pause
    exit /b 1
)
if "%REMOTE_PATH%"=="" set REMOTE_PATH=/root/SOTOdelPRIOR/apps/reservas

set ARCHIVE=deploy.tar.gz
REM SSH robusto frente a fases largas (prune, build)
set SSH_OPTS=-o ServerAliveInterval=30 -o ServerAliveCountMax=20 -o ConnectTimeout=30

echo ============================================================
echo   DESPLIEGUE %APP_NAME% (SOTO DEL PRIOR)
echo   Servidor: %REMOTE_USER%@%REMOTE_HOST%
echo   Ruta:     %REMOTE_PATH%
echo ============================================================
echo.

echo [1/5] Empaquetando %APP_NAME%...
REM .env vive solo en el servidor (DB_PASS, JWT, SMTP, ...). Lo preserva el paso 3.
tar --exclude="node_modules" --exclude=".next" --exclude=".git" --exclude=".idea" --exclude=".vscode" --exclude=".claude" --exclude="dist" --exclude="build" --exclude="db_data" --exclude="pg_data" --exclude="*.log" --exclude="*.db" --exclude="*.db-journal" --exclude="%ARCHIVE%" --exclude="deploy.env" --exclude="./.env" -czf %ARCHIVE% .
if errorlevel 1 goto :error

echo.
echo [2/5] Limpiando Docker y verificando espacio en el servidor...
ssh %SSH_OPTS% %REMOTE_USER%@%REMOTE_HOST% "df -h / && docker compose -f %REMOTE_PATH%/docker-compose.yml down --remove-orphans 2>/dev/null || true && docker system prune -af --volumes && journalctl --vacuum-size=100M 2>/dev/null || true && df -h /"
if errorlevel 1 goto :error

echo.
echo [3/5] Limpiando archivos del despliegue anterior (preserva DB y .env)...
ssh %SSH_OPTS% %REMOTE_USER%@%REMOTE_HOST% "mkdir -p %REMOTE_PATH% && cd %REMOTE_PATH% && find . -maxdepth 1 ! -name 'pg_data' ! -name 'db_data' ! -name '.env' ! -name '.' -exec rm -rf {} +"
if errorlevel 1 goto :error

echo.
echo [4/5] Subiendo paquete al servidor...
scp %SSH_OPTS% %ARCHIVE% %REMOTE_USER%@%REMOTE_HOST%:%REMOTE_PATH%/%ARCHIVE%
if errorlevel 1 goto :error

echo.
echo [5/5] Instalando %APP_NAME% en el servidor...
ssh %SSH_OPTS% %REMOTE_USER%@%REMOTE_HOST% "cd %REMOTE_PATH% && tar -xzf %ARCHIVE% > /dev/null && sed -i 's/\r$//' setup_remote.sh && bash setup_remote.sh"
if errorlevel 1 goto :error

echo.
echo Limpiando local...
del %ARCHIVE%

echo.
echo ============================================================
echo   [OK] DESPLIEGUE %APP_NAME% COMPLETADO
echo ============================================================
pause
endlocal
exit /b 0

:error
echo.
echo ============================================================
echo   [ERROR] El despliegue de %APP_NAME% ha fallado.
echo   Revisa el mensaje anterior.
echo ============================================================
if exist %ARCHIVE% del %ARCHIVE%
pause
endlocal
exit /b 1
