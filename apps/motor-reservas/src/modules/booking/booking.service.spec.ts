import { BadRequestException } from '@nestjs/common';
import { BookingService } from './booking.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RatesService } from '../rates/rates.service';
import { AvailabilityService } from '../rates/availability.service';
import { CrmIntegrationService } from '../crm/crm-integration.service';
import { MailService } from '../mail/mail.service';
import { BookingStatus, BookingSource } from '../../common/enums';

type PrismaMock = {
    ratePlan: { findFirst: jest.Mock };
    roomType: { findMany: jest.Mock };
    room: { findMany: jest.Mock };
    bookingRoom: { findFirst: jest.Mock };
    booking: {
        create: jest.Mock;
        update: jest.Mock;
        findMany: jest.Mock;
    };
};

const makePrisma = (): PrismaMock => ({
    ratePlan: { findFirst: jest.fn() },
    roomType: { findMany: jest.fn() },
    room: { findMany: jest.fn() },
    bookingRoom: { findFirst: jest.fn() },
    booking: {
        create: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
    },
});

const makeRates = (): jest.Mocked<Pick<RatesService, 'calculatePrice'>> => ({
    calculatePrice: jest.fn(),
});

const makeAvailability = (): jest.Mocked<Pick<AvailabilityService, 'checkAvailability'>> => ({
    checkAvailability: jest.fn(),
});

const makeCrm = (): jest.Mocked<Pick<CrmIntegrationService, 'syncHotelBooking'>> => ({
    syncHotelBooking: jest.fn(),
});

const makeMail = (): jest.Mocked<Pick<MailService, 'sendHotelNotification'>> => ({
    sendHotelNotification: jest.fn(),
});

const validInput = {
    hotelId: 'h1',
    guestName: 'Alice',
    checkInDate: '2026-06-01',
    checkOutDate: '2026-06-03',
    roomTypeId: 'rt1',
    pax: 2,
    guestEmail: 'a@x.com',
};

describe('BookingService', () => {
    let prisma: PrismaMock;
    let rates: ReturnType<typeof makeRates>;
    let availability: ReturnType<typeof makeAvailability>;
    let crm: ReturnType<typeof makeCrm>;
    let mail: ReturnType<typeof makeMail>;
    let service: BookingService;

    beforeEach(() => {
        prisma = makePrisma();
        rates = makeRates();
        availability = makeAvailability();
        crm = makeCrm();
        mail = makeMail();
        // Defaults para los fire-and-forget que toda la suite usa.
        crm.syncHotelBooking.mockResolvedValue(undefined);
        mail.sendHotelNotification.mockResolvedValue(undefined);
        service = new BookingService(
            prisma as unknown as PrismaService,
            rates as unknown as RatesService,
            availability as unknown as AvailabilityService,
            crm as unknown as CrmIntegrationService,
            mail as unknown as MailService,
        );
    });

    describe('createBooking', () => {
        beforeEach(() => {
            // Por defecto: rate plan default existe, availability ok, precio calculado, mesa libre.
            prisma.ratePlan.findFirst.mockResolvedValue({ id: 'rp-default', isDefault: true });
            availability.checkAvailability.mockResolvedValue(true);
            rates.calculatePrice.mockResolvedValue({ totalPrice: 240, breakdown: [{ date: '2026-06-01', price: 120 }] });
            prisma.room.findMany.mockResolvedValue([{ id: 'r1', isActive: true }]);
            prisma.bookingRoom.findFirst.mockResolvedValue(null);
            prisma.booking.create.mockImplementation(({ data }) => Promise.resolve({ id: 'b1', ...data, bookingRooms: [] }));
        });

        it('crea booking con default rate plan si no llega ratePlanId', async () => {
            const result = await service.createBooking(validInput);
            expect(prisma.ratePlan.findFirst).toHaveBeenCalledWith({ where: { hotelId: 'h1', isDefault: true } });
            expect(availability.checkAvailability).toHaveBeenCalledWith('h1', 'rt1', 'rp-default', expect.any(Date), expect.any(Date), 1);
            expect(prisma.booking.create).toHaveBeenCalledTimes(1);
            expect(result).toMatchObject({ id: 'b1', hotelId: 'h1', status: BookingStatus.CONFIRMED });
        });

        it('usa el ratePlanId del input cuando viene explícito', async () => {
            await service.createBooking({ ...validInput, ratePlanId: 'rp-custom' });
            expect(prisma.ratePlan.findFirst).not.toHaveBeenCalled();
            expect(availability.checkAvailability).toHaveBeenCalledWith('h1', 'rt1', 'rp-custom', expect.any(Date), expect.any(Date), 1);
        });

        it('cae al primer ratePlan disponible si no hay default', async () => {
            prisma.ratePlan.findFirst
                .mockResolvedValueOnce(null) // primer findFirst busca default
                .mockResolvedValueOnce({ id: 'rp-any' }); // segundo busca cualquiera
            await service.createBooking(validInput);
            expect(prisma.ratePlan.findFirst).toHaveBeenNthCalledWith(1, { where: { hotelId: 'h1', isDefault: true } });
            expect(prisma.ratePlan.findFirst).toHaveBeenNthCalledWith(2, { where: { hotelId: 'h1' } });
            expect(availability.checkAvailability).toHaveBeenCalledWith('h1', 'rt1', 'rp-any', expect.any(Date), expect.any(Date), 1);
        });

        it('lanza BadRequestException si no hay ningún rate plan', async () => {
            prisma.ratePlan.findFirst.mockResolvedValue(null);
            await expect(service.createBooking(validInput)).rejects.toThrow(BadRequestException);
            expect(prisma.booking.create).not.toHaveBeenCalled();
        });

        it('propaga el mensaje de availabilityService como BadRequestException', async () => {
            availability.checkAvailability.mockRejectedValue(new Error('No hay disponibilidad para esa fecha'));
            await expect(service.createBooking(validInput)).rejects.toThrow('No hay disponibilidad para esa fecha');
            expect(prisma.booking.create).not.toHaveBeenCalled();
        });

        it('falla si no encuentra ninguna habitación libre del tipo', async () => {
            prisma.room.findMany.mockResolvedValue([]);
            await expect(service.createBooking(validInput)).rejects.toThrow(/no physical room found/);
            expect(prisma.booking.create).not.toHaveBeenCalled();
        });

        it('calcula nights correctamente (ceil de la diferencia)', async () => {
            await service.createBooking(validInput); // 2026-06-01 → 2026-06-03 = 2 noches
            const arg = prisma.booking.create.mock.calls[0][0];
            expect(arg.data.nights).toBe(2);
        });

        it('graba el priceSnapshot en la bookingRoom usando el totalPrice calculado', async () => {
            rates.calculatePrice.mockResolvedValue({ totalPrice: 360, breakdown: [] });
            await service.createBooking(validInput);
            const arg = prisma.booking.create.mock.calls[0][0];
            expect(arg.data.totalPrice).toBe(360);
            expect(arg.data.bookingRooms.create[0].priceSnapshot).toBe(360);
        });

        it('genera referenceCode con prefijo RES-', async () => {
            await service.createBooking(validInput);
            const arg = prisma.booking.create.mock.calls[0][0];
            expect(arg.data.referenceCode).toMatch(/^RES-\d+$/);
        });

        it('marca source=DIRECT y status=CONFIRMED', async () => {
            await service.createBooking(validInput);
            const arg = prisma.booking.create.mock.calls[0][0];
            expect(arg.data.source).toBe(BookingSource.DIRECT);
            expect(arg.data.status).toBe(BookingStatus.CONFIRMED);
        });

        it('dispara sync CRM (fire-and-forget, no falla la reserva si el CRM se cae)', async () => {
            crm.syncHotelBooking.mockRejectedValue(new Error('CRM down'));
            const result = await service.createBooking(validInput);
            expect(result.id).toBe('b1');
            // Esperamos un tick para el .catch fire-and-forget
            await new Promise(resolve => setImmediate(resolve));
            expect(crm.syncHotelBooking).toHaveBeenCalledWith('b1');
        });

        it('envía email de confirmación si el guest tiene email', async () => {
            await service.createBooking(validInput);
            await new Promise(resolve => setImmediate(resolve));
            expect(mail.sendHotelNotification).toHaveBeenCalledWith(expect.objectContaining({ id: 'b1' }), 'created');
        });

        it('NO envía email si el guest no tiene email', async () => {
            await service.createBooking({ ...validInput, guestEmail: undefined });
            await new Promise(resolve => setImmediate(resolve));
            expect(mail.sendHotelNotification).not.toHaveBeenCalled();
        });

        it('no propaga fallos del email (fire-and-forget)', async () => {
            mail.sendHotelNotification.mockRejectedValue(new Error('SMTP timeout'));
            const result = await service.createBooking(validInput);
            expect(result.id).toBe('b1');
        });

        it('omite las rooms ya ocupadas en el rango y elige una libre', async () => {
            prisma.room.findMany.mockResolvedValue([
                { id: 'r1', isActive: true },
                { id: 'r2', isActive: true },
            ]);
            // r1 está ocupada (devuelve un bookingRoom), r2 no
            prisma.bookingRoom.findFirst
                .mockResolvedValueOnce({ id: 'br-old' }) // para r1
                .mockResolvedValueOnce(null);            // para r2
            await service.createBooking(validInput);
            const arg = prisma.booking.create.mock.calls[0][0];
            expect(arg.data.bookingRooms.create[0].roomId).toBe('r2');
        });
    });

    describe('cancelBooking', () => {
        it('marca la reserva como CANCELLED', async () => {
            prisma.booking.update.mockResolvedValue({ id: 'b1', status: BookingStatus.CANCELLED, guestEmail: 'a@x' });
            const result = await service.cancelBooking('b1');
            expect(prisma.booking.update).toHaveBeenCalledWith({
                where: { id: 'b1' },
                data: { status: BookingStatus.CANCELLED },
            });
            expect(result.status).toBe(BookingStatus.CANCELLED);
        });

        it('notifica al CRM con flag CANCELLED', async () => {
            prisma.booking.update.mockResolvedValue({ id: 'b1', status: BookingStatus.CANCELLED, guestEmail: 'a@x' });
            await service.cancelBooking('b1');
            await new Promise(resolve => setImmediate(resolve));
            expect(crm.syncHotelBooking).toHaveBeenCalledWith('b1', 'CANCELLED');
        });

        it('NO envía email de cancelación si no hay guestEmail', async () => {
            prisma.booking.update.mockResolvedValue({ id: 'b1', status: BookingStatus.CANCELLED, guestEmail: null });
            await service.cancelBooking('b1');
            await new Promise(resolve => setImmediate(resolve));
            expect(mail.sendHotelNotification).not.toHaveBeenCalled();
        });

        it('envía email de cancelación si hay guestEmail', async () => {
            prisma.booking.update.mockResolvedValue({ id: 'b1', status: BookingStatus.CANCELLED, guestEmail: 'a@x' });
            await service.cancelBooking('b1');
            await new Promise(resolve => setImmediate(resolve));
            expect(mail.sendHotelNotification).toHaveBeenCalledWith(expect.objectContaining({ id: 'b1' }), 'cancelled');
        });
    });

    describe('getBookings', () => {
        it('devuelve los bookings del hotel con bookingRooms.room incluido y orden desc', async () => {
            prisma.booking.findMany.mockResolvedValue([{ id: 'b1' }]);
            await service.getBookings('h1');
            expect(prisma.booking.findMany).toHaveBeenCalledWith({
                where: { hotelId: 'h1' },
                include: { bookingRooms: { include: { room: true } } },
                orderBy: { createdAt: 'desc' },
            });
        });
    });

    describe('checkAvailability', () => {
        it('devuelve [] cuando no hay default rate plan', async () => {
            prisma.roomType.findMany.mockResolvedValue([{ id: 'rt1', capacity: 4 }]);
            prisma.ratePlan.findFirst.mockResolvedValue(null);
            const result = await service.checkAvailability('h1', '2026-06-01', '2026-06-03', 2);
            expect(result).toEqual([]);
        });

        it('filtra por capacity >= pax', async () => {
            prisma.roomType.findMany.mockResolvedValue([]);
            prisma.ratePlan.findFirst.mockResolvedValue({ id: 'rp', name: 'Standard', isDefault: true });
            await service.checkAvailability('h1', '2026-06-01', '2026-06-03', 3);
            expect(prisma.roomType.findMany).toHaveBeenCalledWith({
                where: { hotelId: 'h1', capacity: { gte: 3 } },
            });
        });

        it('incluye solo los tipos disponibles (excluye los que tiran error)', async () => {
            prisma.roomType.findMany.mockResolvedValue([
                { id: 'rt1', name: 'Doble', capacity: 2 },
                { id: 'rt2', name: 'Suite', capacity: 4 },
            ]);
            prisma.ratePlan.findFirst.mockResolvedValue({ id: 'rp', name: 'Standard', isDefault: true });
            availability.checkAvailability
                .mockRejectedValueOnce(new Error('Stop sell para Doble'))
                .mockResolvedValueOnce(true);
            rates.calculatePrice.mockResolvedValue({ totalPrice: 300, breakdown: [] });

            const result = await service.checkAvailability('h1', '2026-06-01', '2026-06-03', 2);
            expect(result).toHaveLength(1);
            expect(result[0]).toMatchObject({ id: 'rt2', name: 'Suite', totalPrice: 300, ratePlan: 'Standard' });
        });
    });
});
