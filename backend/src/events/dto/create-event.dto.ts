import {
  IsString,
  IsOptional,
  IsDateString,
  IsInt,
  IsBoolean,
  IsEnum,
  Min,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';

export enum EventStatusDto {
  draft = 'draft',
  open = 'open',
  closed = 'closed',
}

export class CreateEventDto {
  @IsString()
  @MaxLength(100)
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsDateString()
  heldAt: string;

  @IsString()
  @MaxLength(200)
  location: string;

  @IsOptional()
  @IsString()
  locationUrl?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Transform(({ value }) => (value === null || value === '' ? null : Number(value)))
  capacity?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Transform(({ value }) => (value === null || value === '' ? null : Number(value)))
  capacityMale?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Transform(({ value }) => (value === null || value === '' ? null : Number(value)))
  capacityFemale?: number | null;

  @IsEnum(EventStatusDto)
  status: EventStatusDto;

  @IsInt()
  @Min(0)
  @Transform(({ value }) => Number(value))
  price: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Transform(({ value }) => (value === null || value === '' ? null : Number(value)))
  priceMale?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Transform(({ value }) => (value === null || value === '' ? null : Number(value)))
  priceFemale?: number | null;

  @IsBoolean()
  @Transform(({ value }) => Boolean(value))
  paymentRequired: boolean;

  @IsOptional()
  @IsString()
  paymentTiming?: string;

  @IsBoolean()
  @Transform(({ value }) => Boolean(value))
  notifyOnReserve: boolean;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => Boolean(value))
  notifyOnReserveApp?: boolean;

  @IsBoolean()
  @Transform(({ value }) => Boolean(value))
  remindEnabled: boolean;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => Boolean(value))
  remindApp?: boolean;

  @IsOptional()
  @IsDateString()
  remindAt?: string | null;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsString()
  iconUrl?: string;
}
