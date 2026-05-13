import { IsString, IsEmail, IsOptional, IsNumber, IsDateString, Min } from 'class-validator';

export class CreateHotelBookingDto {
  @IsString()
  hotelId: string;

  @IsString()
  roomTypeId: string;

  @IsDateString()
  checkInDate: string;

  @IsDateString()
  checkOutDate: string;

  @IsNumber()
  @Min(1)
  pax: number;

  @IsString()
  guestName: string;

  @IsEmail()
  guestEmail: string;

  @IsOptional()
  @IsString()
  guestPhone?: string;

  @IsOptional()
  @IsString()
  ratePlanId?: string;
}

export class CheckAvailabilityDto {
  @IsString()
  hotelId: string;

  @IsDateString()
  from: string;

  @IsDateString()
  to: string;

  @IsNumber()
  @Min(1)
  pax: number;
}

export class CancelBookingDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
