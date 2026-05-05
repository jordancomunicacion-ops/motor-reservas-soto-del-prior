import { Module } from '@nestjs/common';
import { RestaurantService } from './restaurant.service';
import { RestaurantController } from './restaurant.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { MailModule } from '../mail/mail.module';
import { WaitlistService } from './waitlist.service';

@Module({
    imports: [PrismaModule, MailModule],
    providers: [RestaurantService, WaitlistService],
    controllers: [RestaurantController],
    exports: [RestaurantService, WaitlistService],
})
export class RestaurantModule { }
