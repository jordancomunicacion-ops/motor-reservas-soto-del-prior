@echo off
if not exist "docker-compose.yml" (
    echo Error: docker-compose.yml no encontrado en el directorio actual.
    pause
    exit /b 1
)

echo.
echo === Deteniendo contenedores previos (docker compose down) ===
docker compose down

echo.
echo === Levantando entorno (docker compose up --build) ===
docker compose up --build

echo.
echo === Proceso finalizado ===
pause
