# SOTO PMS - Lightweight Hotel Booking Engine

Property Management System (PMS) y motor de reservas multi-tenant para
hoteles y restaurantes. Construido con **NestJS**, **Next.js 16** y **PostgreSQL**.

## Stack

- **Backend**: NestJS + Prisma + PostgreSQL (`apps/motor-reservas`)
- **Frontend**: Next.js 16 + NextAuth + Tailwind v4 + Radix UI (`apps/web`)
- **Infra**: Docker Compose + Traefik

## Estructura

```
apps/
  motor-reservas/   API NestJS (puerto 4000 en local, 3000 en Docker)
  web/              Next.js admin + widget público (puerto 3001 en local)
  brain/            Workspace experimental (no se despliega)
docker-compose.yml  Stack de producción (web + api + engine + postgres)
DESPLEGAR.bat       Despliegue completo por scp + docker compose up
deploy_motor.bat    Despliegue rápido solo del motor (docker save | docker load)
```

## Setup local

### Requisitos
- Node.js 20+
- PostgreSQL 15
- Docker (opcional, para usar el stack completo)

### Variables de entorno
Copia `.env.example` a `.env` y rellena:
- `DB_PASS`, `JWT_SECRET`, `AUTH_SECRET` son **obligatorios** (sin fallback).
- `BOOTSTRAP_ADMIN_*` solo si necesitas un admin temporal antes del installer.

### Arranque
```bash
npm install
npx prisma generate --schema=apps/motor-reservas/prisma/schema.prisma
npx prisma generate --schema=apps/web/prisma/schema.prisma
npm run dev          # arranca web (3001) + motor-reservas (4000) en paralelo
```

### Installer
1. Abre `http://localhost:3001/install`.
2. Crea hotel/restaurante y primer usuario ADMIN.
3. Login en `http://localhost:3001/login` (solo rol ADMIN entra al panel).

## Despliegue

Los `.bat` de despliegue leen `REMOTE_USER`/`REMOTE_HOST`/`REMOTE_PATH` de
`deploy.env` (ignorado por git). Crea `deploy.env` con:
```
REMOTE_USER=root
REMOTE_HOST=tu.servidor.com
REMOTE_PATH=/root/SOTOdelPRIOR/apps/reservas
```
Luego:
- `DESPLEGAR.bat` — despliegue completo (web + motor + db).
- `deploy_motor.bat` — solo el motor (más rápido para hotfixes de API).

En el servidor, asegúrate de tener un `.env` junto al `docker-compose.yml`
con `DB_PASS`, `AUTH_SECRET` y `JWT_SECRET` (todos obligatorios).

## Tests E2E

```bash
npm run test:e2e        # Playwright headless
npm run test:e2e:ui     # con UI interactiva
```

## Licencia

Commercial License. Redistribution prohibited without authorization.
Copyright © SOTOdelPRIOR.
