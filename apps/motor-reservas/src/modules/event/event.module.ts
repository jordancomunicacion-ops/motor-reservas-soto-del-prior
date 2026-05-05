import { Module } from '@nestjs/common';
import { EventService } from './event.service';
import { EventController } from './event.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { CrmModule } from '../crm/crm.module';

@Module({
  imports: [PrismaModule, CrmModule],
  controllers: [EventController],
  providers: [EventService],
  exports: [EventService],
})
export class EventModule {}
