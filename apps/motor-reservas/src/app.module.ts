import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { RolesGuard } from './auth/roles.guard';
import { PropertyModule } from './modules/property/property.module';
import { BookingModule } from './modules/booking/booking.module';
import { ChannelManagerModule } from './modules/channel-manager/channel-manager.module';
import { InstallerModule } from './modules/installer/installer.module';
import { RestaurantModule } from './modules/restaurant/restaurant.module';
import { WidgetConfigModule } from './modules/config/widget-config.module';
import { RatesModule } from './modules/rates/rates.module';
import { PaymentModule } from './modules/payments/payment.module';
import { CrmModule } from './modules/crm/crm.module';
import { CampaignsModule } from './modules/campaigns/campaigns.module';
import { GlobalModule } from './modules/global/global.module';
import { MailModule } from './modules/mail/mail.module';
import { EventModule } from './modules/event/event.module';
import { ConnectionsModule } from './modules/connections/connections.module';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    PropertyModule,
    BookingModule,
    ChannelManagerModule,
    InstallerModule,
    RestaurantModule,
    WidgetConfigModule,
    RatesModule,
    CrmModule,
    CampaignsModule,
    PaymentModule,
    MailModule,
    EventModule,
    ConnectionsModule,
    GlobalModule
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    // NOTE: Sprint 2 - JwtAuthGuard / RolesGuard estaban registrados globalmente
    // pero rompen el panel admin de Next.js (cross-domain cookies no funcionan).
    // Provisional hasta Sprint 3 (proxy serverside o JWT en headers desde la web):
    // los endpoints quedan abiertos como antes; las mutaciones criticas que se
    // quieran proteger se deben envolver con @UseGuards(JwtAuthGuard, RolesGuard).
    // Los decoradores @Public() y @Roles() se conservan para compatibilidad.
  ],
})
export class AppModule { }
