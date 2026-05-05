import { Module } from '@nestjs/common';
import { RestaurantService } from './restaurant.service';
import { RestaurantController } from './restaurant.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { MailModule } from '../mail/mail.module';

@Module({
    imports: [PrismaModule, MailModule],
    providers: [RestaurantService],
    controllers: [RestaurantController],
    exports: [RestaurantService],
})
export class RestaurantModule { }
