# SOTO PMS - Lightweight Hotel Booking Engine

A modern, full-stack Property Management System (PMS) and Booking Engine for small to medium hotels. 
Built with **NestJS**, **Next.js**, and **PostgreSQL**. Envato-ready architecture.

## 🚀 Features

- **Channel Manager**: Import/Export iCal feeds from Booking.com, Airbnb, etc.
- **Booking Engine**: Public-facing widget for direct reservations.
- **Admin Dashboard**: Manage rooms, rates, blocks, and reservations.
- **Inventory Management**: Flexible Room Types and Units configuration.
- **Installer Wizard**: Easy setup for new deployments.

## 🛠️ Stack

- **Backend**: NestJS (Node.js), Prisma (ORM), PostgreSQL.
- **Frontend**: Next.js 14, TailwindCSS, Radix UI.
- **Infrastructure**: Docker Ready (optional).

## 📦 Installation

### Prerequisites
- Node.js 18+
- PostgreSQL Database
- NPM or Yarn

### 1. Setup Backend (API)

```bash
cd apps/api
# Copy environment file
cp .env.example .env
# Update DATABASE_URL in .env
# ...

# Install Dependencies
npm install

# Run Migrations
npx prisma migrate deploy

# Start Server
npm run start
```

### 2. Setup Frontend (Web)

```bash
cd apps/web
# Install Dependencies
npm install

# Start Development Server (runs on Port 3001)
npm run dev
```

### 3. Run the Installer

1. Open `http://localhost:3001/install` in your browser.
2. Follow the wizard to create your Hotel Profile and Admin User.
3. You will be redirected to the Dashboard upon completion.

## 🔑 Default Ports

- **API**: `http://localhost:4000`
- **Web**: `http://localhost:3001`
- **Cocina (TPV)**: `http://localhost:3002`

## 📄 License

Commercial License. Redistribution prohibited without authorization.
Copyright © 2024 SOTOdelPRIOR.
