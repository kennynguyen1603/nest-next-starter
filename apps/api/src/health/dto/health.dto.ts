import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { IsString } from 'class-validator';
import type { HealthCheckStatus } from '@nestjs/terminus';
import * as terminus from '@nestjs/terminus';

export class HealthCheckDto {
  @Expose()
  @ApiProperty()
  @IsString()
  status!: HealthCheckStatus;

  @Expose()
  @ApiProperty()
  details!: terminus.HealthIndicatorResult;
}
