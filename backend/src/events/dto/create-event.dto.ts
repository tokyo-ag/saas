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
  @IsInt()
  @Min(1)
  @Transform(({ value }) => (value === null || value === '' ? null : Number(value)))
  capacity?: number | null;

  @IsEnum(EventStatusDto)
  status: EventStatusDto;

  @IsInt()
  @Min(0)
  @Transform(({ value }) => Number(value))
  price: number;

  @IsBoolean()
  @Transform(({ value }) => Boolean(value))
  paymentRequired: boolean;

  @IsBoolean()
  @Transform(({ value }) => Boolean(value))
  notifyOnReserve: boolean;

  @IsBoolean()
  @Transform(({ value }) => Boolean(value))
  remindEnabled: boolean;

  @IsOptional()
  @IsDateString()
  remindAt?: string | null;
}
