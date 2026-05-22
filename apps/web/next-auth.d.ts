import { DefaultSession, DefaultUser } from 'next-auth';
import { JWT, DefaultJWT } from 'next-auth/jwt';

declare module 'next-auth' {
    interface Session {
        user: {
            id: string;
            role: string;
            restaurantId: string | null;
            hotelId: string | null;
        } & DefaultSession['user'];
        accessToken?: string;
    }

    interface User extends DefaultUser {
        role: string;
        restaurantId?: string | null;
        hotelId?: string | null;
        accessToken?: string;
    }
}

declare module 'next-auth/jwt' {
    interface JWT extends DefaultJWT {
        role?: string;
        restaurantId?: string | null;
        hotelId?: string | null;
        accessToken?: string;
        accessTokenExpiresAt?: number;
    }
}
