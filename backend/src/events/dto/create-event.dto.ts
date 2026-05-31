import {
  IsString,
  IsOptional,
  IsDateString,
  IsInt,
  IsBoolean,
  IsEnum,
  IsArray,
  IsUrl,
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
  @MaxLength(5000)
  description?: string;

  @IsDateString()
  heldAt: string;

  @IsOptional()
  @IsDateString()
  endAt?: string | null;

  @IsString()
  @MaxLength(200)
  location: string;

  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @MaxLength(500)
  locationUrl?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Transform(({ value }) =>
    value === null || value === '' ? null : Number(value),
  )
  capacity?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Transform(({ value }) =>
    value === null || value === '' ? null : Number(value),
  )
  capacityMale?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Transform(({ value }) =>
    value === null || value === '' ? null : Number(value),
  )
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
  @Transform(({ value }) =>
    value === null || value === '' ? null : Number(value),
  )
  priceMale?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Transform(({ value }) =>
    value === null || value === '' ? null : Number(value),
  )
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
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @MaxLength(500)
  imageUrl?: string;

  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @MaxLength(500)
  iconUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  category?: string | null;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
