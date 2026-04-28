#!/bin/bash
echo "Iniciando despliegue de Reservas SOTOdelPRIOR..."

# Asegurar permisos de ejecucion
chmod +x setup_remote.sh

# Cargar variables de entorno si existe .env
if [ -f .env ]; then
  export $(cat .env | sed 's/#.*//g' | xargs)
fi

# Construir e iniciar contenedores
echo "Levantando contenedores..."
docker compose up -d --build

# Aplicar esquema y seed
echo "Configurando base de datos..."
# Usamos db push porque las migraciones actuales son para SQLite o no existen para PostgreSQL
docker compose exec -T sotoreservas-web npx prisma db push --accept-data-loss
docker compose exec -T sotoreservas-web npx prisma db seed

# Verificar estado
echo "Estado de los contenedores:"
docker compose ps

echo "Despliegue finalizado exitosamente."
