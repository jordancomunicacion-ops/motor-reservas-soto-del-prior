import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const hotelId = searchParams.get('hotelId') || undefined;
        const restaurantId = searchParams.get('restaurantId') || undefined;

        const where: any = { type: 'GOOGLE_ANALYTICS', enabled: true };

        if (hotelId) where.hotelId = hotelId;
        else if (restaurantId) where.restaurantId = restaurantId;

        let connection = await (prisma as any).integrationConnection.findFirst({
            where,
            orderBy: { updatedAt: 'desc' }
        });

        // Fallback: if no filter, return first active GA connection
        if (!connection && !hotelId && !restaurantId) {
            connection = await (prisma as any).integrationConnection.findFirst({
                where: { type: 'GOOGLE_ANALYTICS', enabled: true },
                orderBy: { updatedAt: 'desc' }
            });
        }

        if (!connection) {
            return NextResponse.json({ propertyId: null }, { status: 200 });
        }

        const credentials = connection.credentials as any;

        return NextResponse.json({
            propertyId: credentials?.propertyId || null,
            url: credentials?.url || null,
            name: connection.name
        });
    } catch (error) {
        console.error('Failed to fetch GA config:', error);
        return NextResponse.json({ propertyId: null, error: 'Failed to fetch' }, { status: 500 });
    }
}
