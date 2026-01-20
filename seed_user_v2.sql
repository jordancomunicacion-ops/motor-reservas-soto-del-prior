-- Rename passwordHash to password in User table
ALTER TABLE "User" RENAME COLUMN "passwordHash" TO "password";

-- Update or Insert gerencia user with the correct field name
-- Hash for "123456"
INSERT INTO "User" (id, email, name, "password", role)
VALUES (gen_random_uuid(), 'gerencia@sotodelprior.com', 'Gerencia', '$2a$10$b/EjrlZY/I0S.gl0do/mIeYcSEYnH4TKpYpaC9cgO5NlCm3mhkTYC', 'ADMIN')
ON CONFLICT (email) DO UPDATE SET "password" = EXCLUDED."password";

-- Verify
SELECT id, email, name, role FROM "User" WHERE email = 'gerencia@sotodelprior.com';
