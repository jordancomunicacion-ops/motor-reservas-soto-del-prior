import { Controller, Get, Post, Body } from '@nestjs/common';
import { InstallerService } from './installer.service';

@Controller('installer')
export class InstallerController {
    constructor(private readonly installerService: InstallerService) { }

    @Get('status')
    getStatus() {
        return this.installerService.getStatus();
    }

    @Post('setup')
    setup(@Body() body: any) {
        return this.installerService.setupSystem(body);
    }
}
