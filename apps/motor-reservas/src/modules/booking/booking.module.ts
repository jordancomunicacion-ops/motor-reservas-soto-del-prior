import { Module } from '@nestjs/common';
import { BookingController } from './booking.controller';
import { BookingService } from './booking.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RatesModule } from '../rates/rates.module';
import { CrmModule } from '../crm/crm.module';
import { MailModule } from '../mail/mail.module';

@Module({
    imports: [RatesModule, CrmModule, MailModule],
    controllers: [BookingController],
    providers: [BookingService, PrismaService],
})
export class BookingModule { }
