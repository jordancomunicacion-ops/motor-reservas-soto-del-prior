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

  @IsOptional()
  @IsString()
  guestName?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEmail()
  guestEmail?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  guestPhone?: string;

  @IsOptional()
  @IsString()
  phone?: string;

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

  @IsOptional()
  @IsString()
  guestSurname2?: string;

  @IsOptional()
  @IsString()
  surname2?: string;

  @IsOptional()
  @IsNumber()
  guestAge?: number;

  @IsOptional()
  @IsNumber()
  age?: number;

  @IsOptional()
  @IsString()
  guestGender?: string;

  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @IsString()
  guestWhatsapp?: string;

  @IsOptional()
  @IsString()
  whatsapp?: string;

  @IsOptional()
  @IsString()
  instagram?: string;

  @IsOptional()
  @IsString()
  facebook?: string;

  @IsOptional()
  @IsString()
  tiktok?: string;

  @IsOptional()
  @IsString()
  linkedin?: string;

  @IsOptional()
  @IsString()
  xTwitter?: string;

  @IsOptional()
  @IsString()
  paymentMethodId?: string;
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

export class CreateAccessProfileDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsEnum(UserRole)
  baseRole?: UserRole;

  @IsArray()
  permissions: string[];
}

export class UpdateAccessProfileDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(UserRole)
  baseRole?: UserRole;

  @IsOptional()
  @IsArray()
  permissions?: string[];
}
