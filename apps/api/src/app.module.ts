import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { PropertyModule } from './modules/property/property.module';
import { BookingModule } from './modules/booking/booking.module';
import { ChannelManagerModule } from './modules/channel-manager/channel-manager.module';
import { InstallerModule } from './modules/installer/installer.module';
import { RestaurantModule } from './modules/restaurant/restaurant.module';
import { WidgetConfigModule } from './modules/config/widget-config.module';
import { RatesModule } from './modules/rates/rates.module';
import { CrmModule } from './modules/crm/crm.module';
import { CampaignsModule } from './modules/campaigns/campaigns.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    PrismaModule,
    PropertyModule,
    BookingModule,
    ChannelManagerModule,
    InstallerModule,
    RestaurantModule,
    WidgetConfigModule,
    RestaurantModule,
    WidgetConfigModule,
    RatesModule,
    CrmModule,
    CampaignsModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
