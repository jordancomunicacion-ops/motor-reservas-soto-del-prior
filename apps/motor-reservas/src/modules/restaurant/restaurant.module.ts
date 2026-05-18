import { Module } from '@nestjs/common';
import { RestaurantService } from './restaurant.service';
import { RestaurantController } from './restaurant.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { MailModule } from '../mail/mail.module';
import { WaitlistService } from './waitlist.service';
import { CrmModule } from '../crm/crm.module';
import { RestaurantAvailabilityService } from './restaurant-availability.service';
import { RestaurantAccessService } from './restaurant-access.service';
import { RestaurantReviewService } from './restaurant-review.service';

@Module({
    imports: [PrismaModule, MailModule, CrmModule],
    providers: [RestaurantService, WaitlistService, RestaurantAvailabilityService, RestaurantAccessService, RestaurantReviewService],
    controllers: [RestaurantController],
    exports: [RestaurantService, WaitlistService, RestaurantAvailabilityService, RestaurantAccessService, RestaurantReviewService],
})
export class RestaurantModule { }
