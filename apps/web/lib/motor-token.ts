import 'server-only';
import jwt from 'jsonwebtoken';

const JWT_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 días — alineado con sesión NextAuth

/**
 * Firma un JWT compatible con el motor-reservas (JwtStrategy espera { sub: userId }
 * firmado con JWT_SECRET, HS256). Se usa en NextAuth.authorize() y en el refresh.
 */
export function signMotorToken(userId: string): { token: string; expiresAt: number } {
    const secret = process.env.JWT_SECRET;
    if (!secret || secret.length < 32) {
        throw new Error('JWT_SECRET must be at least 32 characters');
    }
    const expiresAt = Math.floor(Date.now() / 1000) + JWT_TTL_SECONDS;
    const token = jwt.sign({ sub: userId }, secret, { expiresIn: JWT_TTL_SECONDS });
    return { token, expiresAt };
}
