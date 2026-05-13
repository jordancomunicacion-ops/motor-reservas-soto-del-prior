import { Controller, Get, Post, Body } from '@nestjs/common';
import { InstallerService } from './installer.service';
import { Public } from '../../auth/public.decorator';
import { InstallerSetupDto } from './installer.dto';

@Controller('installer')
export class InstallerController {
    constructor(private readonly installerService: InstallerService) { }

    @Public()
    @Get('status')
    getStatus() {
        return this.installerService.getStatus();
    }

    @Public()
    @Post('setup')
    async setup(@Body() body: InstallerSetupDto) {
        return this.installerService.setupSystem(body);
    }
}
