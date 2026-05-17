import { CrmIntegrationService } from './crm-integration.service';
import { PrismaService } from '../../prisma/prisma.service';

type PrismaMock = {
    booking: { findUnique: jest.Mock };
    resBooking: { findUnique: jest.Mock; findMany: jest.Mock };
    eventBooking: { findUnique: jest.Mock };
    crmIntegration: { findUnique: jest.Mock; update: jest.Mock };
};

const makePrisma = (): PrismaMock => ({
    booking: { findUnique: jest.fn() },
    resBooking: { findUnique: jest.fn(), findMany: jest.fn() },
    eventBooking: { findUnique: jest.fn() },
    crmIntegration: { findUnique: jest.fn(), update: jest.fn() },
});

// Mock global fetch para que NO haga red real.
const fetchMock: jest.Mock = jest.fn();
beforeAll(() => {
    (globalThis as unknown as { fetch: jest.Mock }).fetch = fetchMock;
});
beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValue({ ok: true, status: 200, text: async () => '' });
});

const baseHotel = {
    id: 'h1',
    name: 'Hotel SOTO',
    integrations: null,
    crmIntegration: null,
    restaurant: null,
};

const baseHotelBooking = {
    id: 'b1',
    referenceCode: 'RES-1',
    guestName: 'Alice Smith',
    guestEmail: 'alice@x.com',
    guestPhone: '+34600000000',
    totalPrice: 240,
    checkInDate: new Date('2026-06-01'),
    checkOutDate: new Date('2026-06-03'),
    nights: 2,
    status: 'CONFIRMED',
    source: 'DIRECT',
    hotelId: 'h1',
    guest: null,
    hotel: baseHotel,
};

describe('CrmIntegrationService', () => {
    let prisma: PrismaMock;
    let service: CrmIntegrationService;

    beforeEach(() => {
        prisma = makePrisma();
        service = new CrmIntegrationService(prisma as unknown as PrismaService);
    });

    describe('syncHotelBooking', () => {
        it('silencioso si el booking no existe', async () => {
            prisma.booking.findUnique.mockResolvedValue(null);
            await service.syncHotelBooking('missing');
            expect(fetchMock).not.toHaveBeenCalled();
        });

        it('silencioso si el booking no tiene hotel asociado', async () => {
            prisma.booking.findUnique.mockResolvedValue({ ...baseHotelBooking, hotel: null });
            await service.syncHotelBooking('b1');
            expect(fetchMock).not.toHaveBeenCalled();
        });

        it('silencioso si no hay CRM configurado', async () => {
            prisma.booking.findUnique.mockResolvedValue(baseHotelBooking);
            await service.syncHotelBooking('b1');
            expect(fetchMock).not.toHaveBeenCalled();
        });

        it('silencioso si crmIntegration está disabled y no hay JSON fallback', async () => {
            prisma.booking.findUnique.mockResolvedValue({
                ...baseHotelBooking,
                hotel: { ...baseHotel, crmIntegration: { enabled: false, url: 'https://crm.x' } },
            });
            await service.syncHotelBooking('b1');
            expect(fetchMock).not.toHaveBeenCalled();
        });

        it('usa el CRM de la tabla crmIntegration cuando está enabled', async () => {
            prisma.booking.findUnique.mockResolvedValue({
                ...baseHotelBooking,
                hotel: {
                    ...baseHotel,
                    crmIntegration: { id: 'crm-1', enabled: true, url: 'https://crm.x/api', token: 'secret', sourceLabel: 'Hotel SOTO' },
                },
            });
            prisma.crmIntegration.update.mockResolvedValue({});
            await service.syncHotelBooking('b1', 'CREATED');
            expect(fetchMock).toHaveBeenCalledTimes(1);
            const [url, opts] = fetchMock.mock.calls[0];
            expect(url).toBe('https://crm.x/api');
            expect(opts.method).toBe('POST');
            expect(opts.headers.Authorization).toBe('Bearer secret');
            const body = JSON.parse(opts.body);
            expect(body.event).toBe('BOOKING_CREATED');
            expect(body.source).toBe('HOTEL_RESERVATIONS');
            expect(body.guest.email).toBe('alice@x.com');
            expect(body.guest.firstName).toBe('Alice');
            expect(body.guest.lastName).toBe('Smith');
            expect(body.data.id).toBe('b1');
            expect(body.data.total).toBe(240);
            expect(body.data.nights).toBe(2);
        });

        it('respeta el event override (CANCELLED)', async () => {
            prisma.booking.findUnique.mockResolvedValue({
                ...baseHotelBooking,
                hotel: { ...baseHotel, crmIntegration: { id: 'crm-1', enabled: true, url: 'https://crm.x', sourceLabel: 'x' } },
            });
            prisma.crmIntegration.update.mockResolvedValue({});
            await service.syncHotelBooking('b1', 'CANCELLED');
            const body = JSON.parse(fetchMock.mock.calls[0][1].body);
            expect(body.event).toBe('BOOKING_CANCELLED');
        });

        it('cae al JSON integrations.crm si la tabla crmIntegration está deshabilitada', async () => {
            prisma.booking.findUnique.mockResolvedValue({
                ...baseHotelBooking,
                hotel: {
                    ...baseHotel,
                    crmIntegration: { enabled: false, url: 'https://stale.x' },
                    integrations: { crm: { enabled: true, url: 'https://json-fallback.x', token: 't' } },
                },
            });
            await service.syncHotelBooking('b1');
            expect(fetchMock).toHaveBeenCalledTimes(1);
            expect(fetchMock.mock.calls[0][0]).toBe('https://json-fallback.x');
        });

        it('cae al CRM del restaurante en sinergia si el hotel no tiene CRM activo', async () => {
            prisma.booking.findUnique.mockResolvedValue({
                ...baseHotelBooking,
                hotel: {
                    ...baseHotel,
                    crmIntegration: null,
                    restaurant: { id: 'r1', integrations: null },
                },
            });
            prisma.crmIntegration.findUnique.mockResolvedValue({
                id: 'crm-rest',
                enabled: true,
                url: 'https://crm-restaurant.x',
                token: 'r-token',
            });
            await service.syncHotelBooking('b1');
            expect(prisma.crmIntegration.findUnique).toHaveBeenCalledWith({ where: { restaurantId: 'r1' } });
            expect(fetchMock.mock.calls[0][0]).toBe('https://crm-restaurant.x');
        });

        it('no lanza si fetch falla (catch interno)', async () => {
            prisma.booking.findUnique.mockResolvedValue({
                ...baseHotelBooking,
                hotel: { ...baseHotel, crmIntegration: { id: 'crm-1', enabled: true, url: 'https://crm.x', sourceLabel: 'x' } },
            });
            fetchMock.mockRejectedValue(new Error('Network down'));
            prisma.crmIntegration.update.mockResolvedValue({});
            await expect(service.syncHotelBooking('b1')).resolves.toBeUndefined();
        });

        it('registra failureCount cuando el CRM responde con error', async () => {
            prisma.booking.findUnique.mockResolvedValue({
                ...baseHotelBooking,
                hotel: { ...baseHotel, crmIntegration: { id: 'crm-1', enabled: true, url: 'https://crm.x', sourceLabel: 'x' } },
            });
            fetchMock.mockResolvedValue({ ok: false, status: 500, text: async () => 'server error' });
            prisma.crmIntegration.update.mockResolvedValue({});
            await service.syncHotelBooking('b1');
            expect(prisma.crmIntegration.update).toHaveBeenCalledWith({
                where: { id: 'crm-1' },
                data: expect.objectContaining({
                    failureCount: { increment: 1 },
                    lastError: expect.stringContaining('500'),
                }),
            });
        });

        it('registra lastSync y syncCount cuando el CRM responde 200', async () => {
            prisma.booking.findUnique.mockResolvedValue({
                ...baseHotelBooking,
                hotel: { ...baseHotel, crmIntegration: { id: 'crm-1', enabled: true, url: 'https://crm.x', sourceLabel: 'x' } },
            });
            prisma.crmIntegration.update.mockResolvedValue({});
            await service.syncHotelBooking('b1');
            expect(prisma.crmIntegration.update).toHaveBeenCalledWith({
                where: { id: 'crm-1' },
                data: expect.objectContaining({
                    syncCount: { increment: 1 },
                    lastError: null,
                }),
            });
        });

        it('parte el guestName en firstName y lastName aunque tenga solo una palabra', async () => {
            prisma.booking.findUnique.mockResolvedValue({
                ...baseHotelBooking,
                guestName: 'Madonna',
                hotel: { ...baseHotel, crmIntegration: { id: 'crm-1', enabled: true, url: 'https://crm.x', sourceLabel: 'x' } },
            });
            prisma.crmIntegration.update.mockResolvedValue({});
            await service.syncHotelBooking('b1');
            const body = JSON.parse(fetchMock.mock.calls[0][1].body);
            expect(body.guest.firstName).toBe('Madonna');
            expect(body.guest.lastName).toBe('');
            expect(body.guest.fullName).toBe('Madonna');
        });

        it('NO añade Authorization header si no hay token', async () => {
            prisma.booking.findUnique.mockResolvedValue({
                ...baseHotelBooking,
                hotel: { ...baseHotel, crmIntegration: { id: 'crm-1', enabled: true, url: 'https://crm.x', sourceLabel: 'x', token: null } },
            });
            prisma.crmIntegration.update.mockResolvedValue({});
            await service.syncHotelBooking('b1');
            const opts = fetchMock.mock.calls[0][1];
            expect(opts.headers.Authorization).toBeUndefined();
        });

        it('propaga tracking del CRM (trackingId, utm) al payload', async () => {
            prisma.booking.findUnique.mockResolvedValue({
                ...baseHotelBooking,
                hotel: {
                    ...baseHotel,
                    crmIntegration: {
                        id: 'crm-1',
                        enabled: true,
                        url: 'https://crm.x',
                        sourceLabel: 'Hotel SOTO',
                        trackingId: 'GA-123',
                        campaignSource: 'google',
                        campaignMedium: 'cpc',
                        campaignName: 'verano-2026',
                    },
                },
            });
            prisma.crmIntegration.update.mockResolvedValue({});
            await service.syncHotelBooking('b1');
            const body = JSON.parse(fetchMock.mock.calls[0][1].body);
            expect(body.tracking).toEqual({
                trackingId: 'GA-123',
                campaignSource: 'google',
                campaignMedium: 'cpc',
                campaignName: 'verano-2026',
            });
            expect(body.sourceLabel).toBe('Hotel SOTO');
        });
    });

    describe('syncRestaurantBooking', () => {
        const baseResBooking = {
            id: 'rb1',
            guestName: 'Bob Jones',
            guestEmail: 'bob@x.com',
            guestPhone: '+34611111111',
            pax: 4,
            date: new Date('2026-06-01T20:00:00Z'),
            status: 'CONFIRMED',
            origin: 'WIDGET',
            restaurantId: 'r1',
            isMealPlan: false,
            tags: null,
            notes: null,
            hotelBookingId: null,
            guestSurname2: null,
            guestAge: null,
            guestGender: null,
            guestWhatsapp: null,
            updatedAt: new Date(),
            restaurant: {
                id: 'r1',
                name: 'SOTO Resto',
                integrations: null,
                crmIntegration: null,
                hotel: null,
            },
        };

        it('skip si guestEmail y guestPhone son ambos null', async () => {
            prisma.resBooking.findUnique.mockResolvedValue({
                ...baseResBooking,
                guestEmail: null,
                guestPhone: null,
                restaurant: { ...baseResBooking.restaurant, crmIntegration: { enabled: true, url: 'https://crm.x' } },
            });
            await service.syncRestaurantBooking('rb1');
            expect(fetchMock).not.toHaveBeenCalled();
        });

        it('sincroniza con stats reales del guest', async () => {
            prisma.resBooking.findUnique.mockResolvedValue({
                ...baseResBooking,
                restaurant: {
                    ...baseResBooking.restaurant,
                    crmIntegration: { id: 'crm-1', enabled: true, url: 'https://crm.x', sourceLabel: 'SOTO Resto' },
                },
            });
            // 3 reservas previas: 2 SEATED, 1 CANCELLED
            prisma.resBooking.findMany.mockResolvedValue([
                { status: 'SEATED', date: new Date('2025-12-01') },
                { status: 'SEATED', date: new Date('2026-02-15') },
                { status: 'CANCELLED', date: new Date('2026-04-10') },
            ]);
            prisma.crmIntegration.update.mockResolvedValue({});
            await service.syncRestaurantBooking('rb1');
            const body = JSON.parse(fetchMock.mock.calls[0][1].body);
            expect(body.event).toBe('RESERVATION_CREATED');
            expect(body.source).toBe('RESTAURANT_RESERVATIONS');
            expect(body.data.visitCount).toBe(2);
            expect(body.data.cancelledCount).toBe(1);
            expect(body.data.totalBookings).toBe(3);
            expect(body.data.cancelledOrNoShowRate).toBe(33);
            // Tras JSON.stringify/parse las fechas viajan como string ISO.
            expect(body.data.firstReservationDate).toBe(new Date('2025-12-01').toISOString());
        });

        it('parsea tags JSON cuando empieza con [', async () => {
            prisma.resBooking.findUnique.mockResolvedValue({
                ...baseResBooking,
                tags: '["VIP", "ALLERGIES"]',
                restaurant: {
                    ...baseResBooking.restaurant,
                    crmIntegration: { id: 'crm-1', enabled: true, url: 'https://crm.x', sourceLabel: 'x' },
                },
            });
            prisma.resBooking.findMany.mockResolvedValue([]);
            prisma.crmIntegration.update.mockResolvedValue({});
            await service.syncRestaurantBooking('rb1');
            const body = JSON.parse(fetchMock.mock.calls[0][1].body);
            expect(body.guest.tags).toEqual(['VIP', 'ALLERGIES']);
        });

        it('tags como string CSV (no JSON) → array vacío (no lanza)', async () => {
            prisma.resBooking.findUnique.mockResolvedValue({
                ...baseResBooking,
                tags: 'VIP,ALLERGIES',
                restaurant: {
                    ...baseResBooking.restaurant,
                    crmIntegration: { id: 'crm-1', enabled: true, url: 'https://crm.x', sourceLabel: 'x' },
                },
            });
            prisma.resBooking.findMany.mockResolvedValue([]);
            prisma.crmIntegration.update.mockResolvedValue({});
            await service.syncRestaurantBooking('rb1');
            const body = JSON.parse(fetchMock.mock.calls[0][1].body);
            // tags CSV se descarta como guest.tags (queda []) pero permanece como data.tags string
            expect(body.guest.tags).toEqual([]);
            expect(body.data.tags).toBe('VIP,ALLERGIES');
        });
    });
});
