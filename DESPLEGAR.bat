@echo off
setlocal

REM ===================================================
REM   Configuracion del servidor (sobreescribible)
REM   Crea deploy.env junto a este .bat con lineas:
REM     REMOTE_USER=root
REM     REMOTE_HOST=mi.servidor.com
REM     REMOTE_PATH=/root/SOTOdelPRIOR/apps/reservas
REM   (deploy.env esta ignorado por git)
REM ===================================================
cd /d "%~dp0"

if exist deploy.env (
    for /f "usebackq tokens=1,* delims==" %%A in ("deploy.env") do (
        if not "%%A"=="" set "%%A=%%B"
    )
)

if "%REMOTE_USER%"=="" set REMOTE_USER=root
if "%REMOTE_HOST%"=="" (
    echo ERROR: REMOTE_HOST no definido. Crea deploy.env con REMOTE_HOST=tu.servidor.com
    exit /b 1
)
if "%REMOTE_PATH%"=="" set REMOTE_PATH=/root/SOTOdelPRIOR/apps/reservas

REM Opciones SSH para evitar que el cliente se cuelgue si la conexion queda silenciosa
REM (tipico en fases largas como `docker system prune` o builds de imagen):
REM   - ServerAliveInterval=30  pinga cada 30s
REM   - ServerAliveCountMax=20  tolera 10 min sin respuesta antes de cortar
REM   - ConnectTimeout=30       falla rapido si el host no responde al inicio
set SSH_OPTS=-o ServerAliveInterval=30 -o ServerAliveCountMax=20 -o ConnectTimeout=30

echo ==========================================
echo   DESPLIEGUE RESERVAS (APP AUTONOMA)
echo   Servidor: %REMOTE_USER%@%REMOTE_HOST%
echo   Ruta:     %REMOTE_PATH%
echo ==========================================
echo.

echo [1/5] Empaquetando App Reservas...
tar --exclude="node_modules" --exclude=".next" --exclude=".git" --exclude=".idea" --exclude=".vscode" --exclude=".claude" --exclude="dist" --exclude="build" --exclude="db_data" --exclude="pg_data" --exclude="*.log" --exclude="*.db" --exclude="*.db-journal" --exclude="deploy.tar.gz" --exclude="deploy.env" -czvf deploy.tar.gz .

echo.
echo [2/5] Verificando espacio en disco del servidor...
ssh %SSH_OPTS% %REMOTE_USER%@%REMOTE_HOST% "echo '--- Espacio disponible ---' && df -h / && echo '--- Limpiando Docker (imagenes, contenedores, cache) ---' && docker compose -f %REMOTE_PATH%/docker-compose.yml down --remove-orphans 2>/dev/null || true && docker system prune -af --volumes && echo '--- Limpiando logs de sistema ---' && journalctl --vacuum-size=100M 2>/dev/null || true && echo '--- Espacio tras limpieza ---' && df -h /"

echo.
echo [3/5] Limpiando archivos del despliegue anterior...
ssh %SSH_OPTS% %REMOTE_USER%@%REMOTE_HOST% "mkdir -p %REMOTE_PATH% && cd %REMOTE_PATH% && find . -maxdepth 1 ! -name 'pg_data' ! -name 'db_data' ! -name '.env' ! -name '.' -exec rm -rf {} +"

echo.
echo [4/5] Subiendo al servidor (%REMOTE_PATH%)...
scp %SSH_OPTS% deploy.tar.gz %REMOTE_USER%@%REMOTE_HOST%:%REMOTE_PATH%/deploy.tar.gz

echo.
echo [5/5] Instalando Reservas en el servidor...
ssh %SSH_OPTS% %REMOTE_USER%@%REMOTE_HOST% "cd %REMOTE_PATH% && tar -xzvf deploy.tar.gz > /dev/null && sed -i 's/\r$//' setup_remote.sh && bash setup_remote.sh"

echo.
echo Limpiando local...
del deploy.tar.gz

echo.
echo ==========================================
echo    DESPLIEGUE RESERVAS COMPLETADO
echo ==========================================
pause
endlocal
