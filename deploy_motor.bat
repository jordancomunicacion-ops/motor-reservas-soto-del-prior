@echo off
setlocal
set REMOTE_USER=root
set REMOTE_HOST=164.92.167.42
set REMOTE_PATH=/root/SOTOdelPRIOR/apps/reservas
echo [1/3] Construyendo imagen MOTOR-RESERVAS...
docker build --platform linux/amd64 -t sotoreservas-api:latest ./apps/motor-reservas
echo [2/3] Enviando imagen al servidor...
docker save sotoreservas-api:latest | ssh %REMOTE_USER%@%REMOTE_HOST% "docker load"
echo [3/3] Reiniciando servicios en el servidor...
ssh %REMOTE_USER%@%REMOTE_HOST% "cd %REMOTE_PATH% && docker compose up -d --no-deps --force-recreate sotoreservas-api sotoreservas-engine"
echo MOTOR DESPLEGADO.
pause
endlocal
