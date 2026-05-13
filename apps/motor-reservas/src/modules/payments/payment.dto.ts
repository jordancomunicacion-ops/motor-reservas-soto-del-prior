import { IsString, IsEnum } from 'class-validator';

export class CreateSetupIntentDto {
  @IsString()
  entityId: string;

  @IsString()
  @IsEnum(['hotel', 'restaurant'])
  entityType: 'hotel' | 'restaurant';
}

export class AttachPaymentMethodDto {
  @IsString()
  paymentMethodId: string;

  @IsString()
  entityId: string;

  @IsString()
  @IsEnum(['hotel', 'restaurant'])
  entityType: 'hotel' | 'restaurant';
}

export class ChargeNoShowDto {
  @IsString()
  entityId: string;

  @IsString()
  @IsEnum(['hotel', 'restaurant'])
  entityType: 'hotel' | 'restaurant';
}
