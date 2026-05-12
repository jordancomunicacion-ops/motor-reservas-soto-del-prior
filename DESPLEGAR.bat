@echo off
echo ==========================================
echo   DESPLIEGUE RESERVAS (APP AUTONOMA)
echo ==========================================
echo.

cd /d "%~dp0"

echo [1/5] Empaquetando App Reservas...
tar --exclude="node_modules" --exclude=".next" --exclude=".git" --exclude=".idea" --exclude=".vscode" --exclude="dist" --exclude="build" --exclude="db_data" --exclude="pg_data" --exclude="*.log" --exclude="*.db" --exclude="*.db-journal" --exclude="deploy.tar.gz" -czvf deploy.tar.gz .

echo.
echo [2/5] Verificando espacio en disco del servidor...
echo * Te va a pedir la contrasena del servidor *
ssh root@164.92.167.42 "echo '--- Espacio disponible ---' && df -h / && echo '--- Limpiando Docker (imagenes, contenedores, cache) ---' && docker compose -f ~/SOTOdelPRIOR/apps/reservas/docker-compose.yml down --remove-orphans 2>/dev/null || true && docker system prune -af --volumes && echo '--- Limpiando logs de sistema ---' && journalctl --vacuum-size=100M 2>/dev/null || true && echo '--- Espacio tras limpieza ---' && df -h /"

echo.
echo [3/5] Limpiando archivos del despliegue anterior...
echo * Te va a pedir la contrasena otra vez *
ssh root@164.92.167.42 "mkdir -p ~/SOTOdelPRIOR/apps/reservas && cd ~/SOTOdelPRIOR/apps/reservas && find . -maxdepth 1 ! -name 'pg_data' ! -name 'db_data' ! -name '.' -exec rm -rf {} +"

echo.
echo [4/5] Subiendo al servidor (~/SOTOdelPRIOR/apps/reservas)...
echo * Te va a pedir la contrasena otra vez *
scp deploy.tar.gz root@164.92.167.42:/root/SOTOdelPRIOR/apps/reservas/deploy.tar.gz

echo.
echo [5/5] Instalando Reservas en el servidor...
echo * Te va a pedir la contrasena otra vez *
ssh root@164.92.167.42 "cd ~/SOTOdelPRIOR/apps/reservas && tar -xzvf deploy.tar.gz > /dev/null && sed -i 's/\r$//' setup_remote.sh && bash setup_remote.sh"

echo.
echo Limpiando local...
del deploy.tar.gz

echo.
echo ==========================================
echo    DESPLIEGUE RESERVAS COMPLETADO
echo ==========================================
pause
