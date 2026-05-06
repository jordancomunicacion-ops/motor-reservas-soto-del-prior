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

EXPOSE 3000

# Start
CMD ["node", "dist/src/main"]
