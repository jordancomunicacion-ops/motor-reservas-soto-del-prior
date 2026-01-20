@echo off
echo ==========================================
echo   DESPLIEGUE RESERVAS (APP AUTONOMA)
echo ==========================================
echo.

cd /d "%~dp0"

echo [1/3] Empaquetando App Reservas...
tar --exclude="node_modules" --exclude=".next" --exclude=".git" --exclude=".idea" --exclude=".vscode" --exclude="dist" --exclude="build" --exclude="db_data" --exclude="pg_data" --exclude="*.log" --exclude="deploy.tar.gz" -czvf deploy.tar.gz .

echo.
echo [2/4] Limpiando despliegue anterior en el servidor...
echo * Te va a pedir la contrasena del servidor *
ssh root@164.92.167.42 "mkdir -p ~/SOTOdelPRIOR/apps/reservas && cd ~/SOTOdelPRIOR/apps/reservas && docker compose down --remove-orphans 2>/dev/null || true && rm -rf * && docker image prune -f && docker builder prune -f"

echo.
echo [3/4] Subiendo al servidor (~/SOTOdelPRIOR/apps/reservas)...
echo * Te va a pedir la contrasena otra vez *
scp deploy.tar.gz root@164.92.167.42:/root/SOTOdelPRIOR/apps/reservas/deploy.tar.gz

echo.
echo [4/4] Instalando Reservas en el servidor...
echo * Te va a pedir la contrasena otra vez *
ssh root@164.92.167.42 "cd ~/SOTOdelPRIOR/apps/reservas && tar -xzvf deploy.tar.gz > /dev/null && sed -i 's/\r$//' setup_remote.sh && bash setup_remote.sh"

echo.
echo Limpiando...
del deploy.tar.gz

echo.
echo ==========================================
echo    DESPLIEGUE RESERVAS COMPLETADO
echo ==========================================
pause
