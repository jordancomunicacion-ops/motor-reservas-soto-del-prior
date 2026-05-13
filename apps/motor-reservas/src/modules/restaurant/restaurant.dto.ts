import { IsString, IsEmail, IsOptional, IsNumber, Min, Max, IsDateString, IsEnum, IsArray } from 'class-validator';
import { BookingStatus, UserRole } from '../../common/enums';

export class CreateRestaurantDto {
  @IsString()
  name: string;

  @IsString()
  currency: string;

  @IsOptional()
  @IsNumber()
  defaultDuration?: number;
}

export class CreateZoneDto {
  @IsString()
  restaurantId: string;

  @IsString()
  name: string;
}

export class CreateTableDto {
  @IsString()
  zoneId: string;

  @IsString()
  name: string;

  @IsNumber()
  @Min(1)
  @Max(50)
  capacity: number;
}

export class CreatePublicReservationDto {
  @IsString()
  restaurantId: string;

  @IsString()
  guestName: string;

  @IsEmail()
  guestEmail: string;

  @IsOptional()
  @IsString()
  guestPhone?: string;

  @IsDateString()
  date: string;

  @IsOptional()
  @IsString()
  time?: string;

  @IsNumber()
  @Min(1)
  @Max(20)
  pax: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateBookingStatusDto {
  @IsEnum(BookingStatus)
  status: BookingStatus;

  @IsOptional()
  @IsString()
  tableId?: string;
}

export class AuthorizeUserDto {
  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  password?: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @IsArray()
  permissions?: string[];
}
