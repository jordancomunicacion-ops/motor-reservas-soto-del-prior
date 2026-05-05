import { Controller, Post, Body } from '@nestjs/common';
import { MailService } from './mail.service';

@Controller('mail')
export class MailController {
    constructor(private readonly mailService: MailService) {}

    @Post('test')
    async sendTest(@Body() body: {
        to: string,
        entityId: string,
        entityType: 'hotel' | 'restaurant',
        templateType: string
    }) {
        await this.mailService.sendTestEmail(body);
        return { success: true, message: 'Test email processed' };
    }
}
