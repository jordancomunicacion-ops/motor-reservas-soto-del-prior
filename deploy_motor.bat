@echo off
setlocal
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

echo [1/3] Construyendo imagen MOTOR-RESERVAS...
docker build --platform linux/amd64 -t sotoreservas-api:latest ./apps/motor-reservas
echo [2/3] Enviando imagen al servidor...
docker save sotoreservas-api:latest | ssh %REMOTE_USER%@%REMOTE_HOST% "docker load"
echo [3/3] Reiniciando servicios en el servidor...
ssh %REMOTE_USER%@%REMOTE_HOST% "cd %REMOTE_PATH% && docker compose up -d --no-deps --force-recreate sotoreservas-api sotoreservas-engine"
echo MOTOR DESPLEGADO.
pause
endlocal
