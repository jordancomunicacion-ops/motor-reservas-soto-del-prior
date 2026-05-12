import { Module } from '@nestjs/common';
import { RestaurantService } from './restaurant.service';
import { RestaurantController } from './restaurant.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { MailModule } from '../mail/mail.module';
import { WaitlistService } from './waitlist.service';
import { CrmModule } from '../crm/crm.module';

@Module({
    imports: [PrismaModule, MailModule, CrmModule],
    providers: [RestaurantService, WaitlistService],
    controllers: [RestaurantController],
    exports: [RestaurantService, WaitlistService],
})
export class RestaurantModule { }
