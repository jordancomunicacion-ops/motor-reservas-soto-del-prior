#!/bin/bash
set -e

echo "Iniciando despliegue de Reservas SOTOdelPRIOR..."

# ============================================================
# GUARDIA: verificar espacio en disco antes del build
# ============================================================
ESPACIO_LIBRE_KB=$(df / | awk 'NR==2 {print $4}')
ESPACIO_LIBRE_GB=$(echo "scale=1; $ESPACIO_LIBRE_KB / 1048576" | bc)
MINIMO_KB=2097152  # 2 GB en KB

echo "Espacio libre en disco: ${ESPACIO_LIBRE_GB} GB"

if [ "$ESPACIO_LIBRE_KB" -lt "$MINIMO_KB" ]; then
  echo ""
  echo "ERROR: Espacio insuficiente en disco (${ESPACIO_LIBRE_GB} GB libres, minimo 2 GB)."
  echo "Ejecuta manualmente en el servidor:"
  echo "  docker system prune -af --volumes"
  echo "  journalctl --vacuum-size=100M"
  echo "  du -sh /* 2>/dev/null | sort -rh | head -20"
  exit 1
fi

# Asegurar permisos de ejecucion
chmod +x setup_remote.sh

# Cargar variables de entorno si existe .env
if [ -f .env ]; then
  export $(cat .env | sed 's/#.*//g' | xargs)
fi

# Construir e iniciar contenedores
echo "Levantando contenedores..."
if ! docker compose up -d --build; then
  echo ""
  echo "ERROR: Fallo al construir/levantar contenedores."
  echo "Espacio en disco actual:"
  df -h /
  echo "Imagenes Docker actuales:"
  docker images --format "{{.Size}}\t{{.Repository}}:{{.Tag}}" | sort -rh | head -10
  exit 1
fi

# Verificar que los contenedores esten corriendo
echo "Verificando contenedores..."
sleep 5
RUNNING=$(docker compose ps --status running --quiet | wc -l)
if [ "$RUNNING" -eq 0 ]; then
  echo "ERROR: Ningun contenedor esta corriendo tras el build."
  docker compose ps
  docker compose logs --tail=50
  exit 1
fi

# Aplicar esquema y seed
echo "Configurando base de datos..."
docker compose exec -T sotoreservas-api npx prisma db push --accept-data-loss
docker compose exec -T sotoreservas-web npx prisma generate
docker compose exec -T sotoreservas-web npx prisma db seed

# Verificar estado final
echo "Estado de los contenedores:"
docker compose ps

echo ""
echo "Despliegue finalizado exitosamente."
