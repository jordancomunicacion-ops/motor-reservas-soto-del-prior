@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion
title SOTOdelPRIOR - Despliegue Reservas
cd /d "%~dp0"

set APP_NAME=Reservas
set COMPOSE=docker compose -f docker-compose.yml
set WEB=sotoreservas-web
set API=sotoreservas-api
set DB=sotoreservas-db
set DOMAIN=reservas.sotodelprior.com
set BACKUP_DIR=/backups/reservas

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
if "%REMOTE_PATH%"=="" set REMOTE_PATH=/root/SOTOdelPRIOR/apps/reservas
if "%REMOTE_HOST%"=="" (
    echo [ERROR] REMOTE_HOST no definido. Crea deploy.env con REMOTE_HOST=tu.servidor.com
    pause
    exit /b 1
)

:menu
cls
echo ============================================================
echo   DESPLIEGUE %APP_NAME% (SOTO DEL PRIOR)
echo   Servidor: %REMOTE_USER%@%REMOTE_HOST%
echo   Web:      https://%DOMAIN%
echo ============================================================
echo.
echo   1.  Deploy completo (git pull + rebuild + logs)
echo   2.  Update rapido (sin rebuild, solo pull + restart)
echo   3.  Ver logs en vivo
echo   4.  Reiniciar contenedor
echo   5.  Aplicar migraciones BD (prisma migrate deploy)
echo   6.  Re-sembrar datos (prisma seed) [PELIGROSO]
echo   7.  Estado de contenedores
echo   8.  Health check
echo   9.  Backup BD ahora
echo  10.  Abrir sesion SSH al VPS
echo.
echo   0.  Salir
echo.
set /p OPT="   Opcion: "

if "%OPT%"=="1"  goto deploy
if "%OPT%"=="2"  goto update
if "%OPT%"=="3"  goto logs
if "%OPT%"=="4"  goto restart
if "%OPT%"=="5"  goto migrate
if "%OPT%"=="6"  goto seed
if "%OPT%"=="7"  goto status
if "%OPT%"=="8"  goto health
if "%OPT%"=="9"  goto backup
if "%OPT%"=="10" goto sshvps
if "%OPT%"=="0"  exit /b 0
goto menu

:deploy
echo.
echo [1/3] git pull origin main...
ssh %REMOTE_USER%@%REMOTE_HOST% "cd %REMOTE_PATH% && git pull origin main"
if errorlevel 1 goto error
echo.
echo    Ultimo commit desplegado:
ssh %REMOTE_USER%@%REMOTE_HOST% "cd %REMOTE_PATH% && git log --oneline -1"
echo.
echo [2/3] docker compose up -d --build...
ssh %REMOTE_USER%@%REMOTE_HOST% "cd %REMOTE_PATH% && %COMPOSE% up -d --build --remove-orphans"
if errorlevel 1 goto error
echo.
echo [3/3] Aplicando migraciones (prisma migrate deploy)...
ssh %REMOTE_USER%@%REMOTE_HOST% "cd %REMOTE_PATH% && %COMPOSE% exec -T %API% npx prisma migrate deploy --schema=prisma/schema.prisma"
if errorlevel 1 goto error
echo.
echo ============================================================
echo   [OK] Deploy %APP_NAME% completado. Mostrando logs...
echo ============================================================
ssh %REMOTE_USER%@%REMOTE_HOST% "cd %REMOTE_PATH% && %COMPOSE% logs -f --tail=40 %WEB%"
goto end

:update
echo.
echo Pull + restart (sin rebuild)...
ssh %REMOTE_USER%@%REMOTE_HOST% "cd %REMOTE_PATH% && git pull origin main && %COMPOSE% restart %WEB% %API%"
if errorlevel 1 goto error
goto end

:logs
echo.
echo Logs en vivo (Ctrl+C para volver)...
ssh %REMOTE_USER%@%REMOTE_HOST% "cd %REMOTE_PATH% && %COMPOSE% logs -f --tail=80 %WEB%"
goto end

:restart
echo.
echo Reiniciando contenedores web + api...
ssh %REMOTE_USER%@%REMOTE_HOST% "cd %REMOTE_PATH% && %COMPOSE% restart %WEB% %API%"
if errorlevel 1 goto error
echo [OK] Reiniciado.
goto end

:migrate
echo.
echo Aplicando migraciones registradas (idempotente, no destructivo)...
ssh %REMOTE_USER%@%REMOTE_HOST% "cd %REMOTE_PATH% && %COMPOSE% exec -T %API% npx prisma migrate deploy --schema=prisma/schema.prisma"
if errorlevel 1 goto error
echo [OK] Migraciones aplicadas.
goto end

:seed
echo.
echo ============================================================
echo  [PELIGRO] El seed en produccion puede duplicar/sobrescribir.
echo  Usar solo en primer arranque o bases vacias.
echo ============================================================
set /p YN="   Escribe SEED para confirmar: "
if /i not "%YN%"=="SEED" (
    echo Cancelado.
    goto end
)
ssh %REMOTE_USER%@%REMOTE_HOST% "cd %REMOTE_PATH% && %COMPOSE% exec -T %WEB% npx prisma db seed"
if errorlevel 1 goto error
goto end

:status
echo.
ssh %REMOTE_USER%@%REMOTE_HOST% "cd %REMOTE_PATH% && %COMPOSE% ps"
echo.
echo --- Redes del contenedor web ---
ssh %REMOTE_USER%@%REMOTE_HOST% "docker inspect %WEB% --format '{{range $k, $v := .NetworkSettings.Networks}}{{$k}} {{end}}'"
goto end

:health
echo.
echo Health check interno...
ssh %REMOTE_USER%@%REMOTE_HOST% "cd %REMOTE_PATH% && %COMPOSE% exec -T %WEB% node -e \"fetch('http://127.0.0.1:3000/').then(r=>console.log('interno HTTP',r.status)).catch(e=>{console.log('interno ERROR',e.message);process.exit(1)})\""
echo.
echo Health check externo (HTTPS publico)...
ssh %REMOTE_USER%@%REMOTE_HOST% "curl -s -o /dev/null -w 'HTTP %%{http_code} - tiempo %%{time_total}s' https://%DOMAIN%/"
echo.
goto end

:backup
echo.
echo Generando backup en %BACKUP_DIR%/...
ssh %REMOTE_USER%@%REMOTE_HOST% "mkdir -p %BACKUP_DIR% && docker exec %DB% sh -c 'pg_dump -U $POSTGRES_USER $POSTGRES_DB' | gzip > %BACKUP_DIR%/db-manual-$(date +%%Y%%m%%d-%%H%%M%%S).sql.gz && ls -lh %BACKUP_DIR%/ | tail -5"
if errorlevel 1 goto error
echo [OK] Backup creado.
goto end

:sshvps
echo.
echo Abriendo sesion SSH (escribe 'exit' para volver al menu)...
ssh %REMOTE_USER%@%REMOTE_HOST%
goto end

:error
echo.
echo ============================================================
echo   [ERROR] Operacion fallida en %APP_NAME%. Revisa la salida.
echo.
echo   Si fallo el git pull: el servidor puede tener cambios
echo   locales. Entra por SSH (opcion 10) y ejecuta:
echo       cd %REMOTE_PATH% ^&^& git stash ^&^& git pull origin main
echo ============================================================
pause
goto menu

:end
echo.
pause
goto menu
