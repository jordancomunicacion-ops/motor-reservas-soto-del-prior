INSERT INTO "User" (id, email, name, "password", role, "createdAt", "updatedAt")
VALUES (gen_random_uuid(), 'gerencia@sotodelprior.com', 'Gerencia', '$2a$10$b/EjrlZY/I0S.gl0do/mIeYcSEYnH4TKpYpaC9cgO5NlCm3mhkTYC', 'ADMIN', NOW(), NOW())
ON CONFLICT (email) DO UPDATE SET "password" = EXCLUDED."password", "updatedAt" = NOW();
