import {
    ArrayMinSize,
    ArrayNotEmpty,
    IsArray,
    IsBoolean,
    IsDateString,
    IsEmail,
    IsInt,
    IsOptional,
    IsString,
    IsUUID,
    Min,
} from 'class-validator';

export class CreateEventDto {
    @IsString()
    name: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsDateString()
    date: string;

    @IsInt()
    @Min(15)
    duration: number;

    @IsOptional()
    @IsInt()
    @Min(0)
    price?: number;

    @IsInt()
    @Min(1)
    capacity: number;

    @IsOptional()
    @IsBoolean()
    isActive?: boolean;

    @IsOptional()
    @IsUUID()
    hotelId?: string | null;

    @IsOptional()
    @IsUUID()
    restaurantId?: string | null;

    @IsArray()
    @ArrayNotEmpty({ message: 'Debe seleccionar al menos una zona/sala para el evento.' })
    @ArrayMinSize(1)
    @IsUUID('all', { each: true })
    zoneIds: string[];
}

export class UpdateEventDto {
    @IsOptional()
    @IsString()
    name?: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsDateString()
    date?: string;

    @IsOptional()
    @IsInt()
    @Min(15)
    duration?: number;

    @IsOptional()
    @IsInt()
    @Min(0)
    price?: number;

    @IsOptional()
    @IsInt()
    @Min(1)
    capacity?: number;

    @IsOptional()
    @IsBoolean()
    isActive?: boolean;

    @IsOptional()
    @IsUUID()
    hotelId?: string | null;

    @IsOptional()
    @IsUUID()
    restaurantId?: string | null;

    @IsOptional()
    @IsArray()
    @ArrayNotEmpty({ message: 'Si se envía zoneIds, debe contener al menos una zona.' })
    @ArrayMinSize(1)
    @IsUUID('all', { each: true })
    zoneIds?: string[];
}

export class CreateEventBookingDto {
    @IsString()
    guestName: string;

    @IsOptional()
    @IsEmail()
    guestEmail?: string;

    @IsOptional()
    @IsString()
    guestPhone?: string;

    @IsInt()
    @Min(1)
    pax: number;

    @IsOptional()
    @IsString()
    stripePaymentMethodId?: string;

    @IsOptional()
    @IsString()
    stripeCustomerId?: string;
}
