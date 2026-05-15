FROM node:20-alpine

RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

# Copiar solo package.json del workspace
COPY package.json ./
RUN npm install

# Copiar código fuente
COPY . .

# Generar Prisma Client
RUN npx prisma generate --schema=./prisma/schema.prisma

# Build
RUN npm run build

# Usuario no-root
RUN addgroup -S -g 1001 nodejs && adduser -S -u 1001 -G nodejs nestjs \
    && chown -R nestjs:nodejs /app
USER nestjs

EXPOSE 3000

# Start
CMD ["node", "dist/main"]
