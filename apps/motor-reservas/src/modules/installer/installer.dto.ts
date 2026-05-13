import { IsString, IsEmail, MinLength, IsOptional, IsBoolean, IsNumber, Min } from 'class-validator';

export class ZoneDto {
  @IsString()
  name: string;

  @IsNumber()
  @Min(1)
  tables: number;
}

export class InstallerSetupDto {
  @IsString()
  hotelName: string;

  @IsString()
  currency: string;

  @IsEmail()
  adminEmail: string;

  @IsString()
  @MinLength(8)
  adminPassword: string;

  @IsOptional()
  @IsBoolean()
  createRestaurant?: boolean;

  @IsOptional()
  @IsString()
  restaurantName?: string;

  @IsOptional()
  zones?: ZoneDto[];
}
