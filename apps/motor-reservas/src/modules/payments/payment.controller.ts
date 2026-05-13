import { Controller, Post, Body, Param } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { Public } from '../../auth/public.decorator';
import { Roles } from '../../auth/roles.decorator';
import { CreateSetupIntentDto, AttachPaymentMethodDto, ChargeNoShowDto } from './payment.dto';

@Controller('payments')
export class PaymentController {
    constructor(private paymentService: PaymentService) { }

    @Public()
    @Post('setup-intent/:bookingId')
    async createSetupIntent(
        @Param('bookingId') bookingId: string,
        @Body() body: CreateSetupIntentDto
    ) {
        return this.paymentService.createSetupIntent(bookingId, body.entityId, body.entityType);
    }

    @Public()
    @Post('attach/:bookingId')
    async attachCard(
        @Param('bookingId') bookingId: string,
        @Body() body: AttachPaymentMethodDto
    ) {
        return this.paymentService.savePaymentMethod(bookingId, body.paymentMethodId, body.entityId, body.entityType);
    }

    @Roles('ADMIN')
    @Post('charge-no-show/:bookingId')
    async chargeNoShow(
        @Param('bookingId') bookingId: string,
        @Body() body: ChargeNoShowDto
    ) {
        return this.paymentService.chargeNoShowFee(bookingId, body.entityId, body.entityType);
    }
}
