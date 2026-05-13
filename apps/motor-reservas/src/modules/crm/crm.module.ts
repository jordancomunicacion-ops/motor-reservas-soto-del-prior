import { Module } from '@nestjs/common';
import { CrmService } from './crm.service';
import { CrmIntegrationService } from './crm-integration.service';
import { CrmConfigService } from './crm-config.service';
import { CrmController } from './crm.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [CrmController],
    providers: [CrmService, CrmIntegrationService, CrmConfigService],
    exports: [CrmService, CrmIntegrationService, CrmConfigService],
})
export class CrmModule { }
