import { Controller, Post, Body, Param } from '@nestjs/common';
import { PaymentService } from './payment.service';

@Controller('payments')
export class PaymentController {
    constructor(private paymentService: PaymentService) { }

    @Post('setup-intent/:bookingId')
    async createSetupIntent(
        @Param('bookingId') bookingId: string,
        @Body('entityId') entityId: string,
        @Body('entityType') entityType: 'hotel' | 'restaurant'
    ) {
        return this.paymentService.createSetupIntent(bookingId, entityId, entityType);
    }

    @Post('attach/:bookingId')
    async attachCard(
        @Param('bookingId') bookingId: string,
        @Body('paymentMethodId') paymentMethodId: string,
        @Body('entityId') entityId: string,
        @Body('entityType') entityType: 'hotel' | 'restaurant'
    ) {
        return this.paymentService.savePaymentMethod(bookingId, paymentMethodId, entityId, entityType);
    }

    @Post('charge-no-show/:bookingId')
    async chargeNoShow(
        @Param('bookingId') bookingId: string,
        @Body('entityId') entityId: string,
        @Body('entityType') entityType: 'hotel' | 'restaurant'
    ) {
        return this.paymentService.chargeNoShowFee(bookingId, entityId, entityType);
    }
}
