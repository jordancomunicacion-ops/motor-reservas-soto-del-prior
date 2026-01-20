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

# Verificar estado
echo "Estado de los contenedores:"
docker compose ps

echo "Despliegue finalizado exitosamente."
