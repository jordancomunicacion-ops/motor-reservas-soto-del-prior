import { Controller, Post, Body } from '@nestjs/common';
import { MailService } from './mail.service';
import { Roles } from '../../auth/roles.decorator';

@Controller('mail')
export class MailController {
    constructor(private readonly mailService: MailService) {}

    @Roles('ADMIN')
    @Post('test')
    async sendTest(@Body() body: {
        to: string,
        entityId: string,
        entityType: 'hotel' | 'restaurant',
        templateType: string
    }) {
        const result: any = await this.mailService.sendTestEmail(body);
        if (!result) {
            return { success: false, message: 'No se pudo enviar el email. Revisa la configuración SMTP del restaurante/hotel y la conectividad.' };
        }
        return { success: true, message: 'Email enviado correctamente', messageId: result.messageId };
    }

    @Roles('ADMIN')
    @Post('test-connection')
    async testConnection(@Body() body: {
        host: string;
        port: number;
        user: string;
        pass: string;
        secure?: boolean;
    }) {
        return await this.mailService.verifyConnection(body);
    }

    @Roles('ADMIN')
    @Post('test-graph')
    async testGraph(@Body() body: {
        tenantId: string;
        clientId: string;
        clientSecret: string;
        senderEmail: string;
    }) {
        return await this.mailService.verifyGraphConfig(body);
    }
}
