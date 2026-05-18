import { Module } from '@nestjs/common';
import { PropertyController } from './property.controller';
import { PropertyService } from './property.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ConnectionsModule } from '../connections/connections.module';

@Module({
    imports: [ConnectionsModule],
    controllers: [PropertyController],
    providers: [PropertyService, PrismaService],
})
export class PropertyModule { }
