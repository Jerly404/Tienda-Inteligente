import { BadRequestException, Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ArrayMaxSize, IsArray, IsIn, IsBoolean, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { ComparisonService } from './comparison.service';

class CompareDto {
  @IsOptional() @IsArray() @ArrayMaxSize(100) @IsString({ each: true }) supplierIds?: string[];
  @IsOptional() @IsIn(['BASE', 'PACKAGES']) quantityMode?: 'BASE' | 'PACKAGES';
  @IsString() variantId!: string;
  @IsNumber() @Min(0.001) @Max(100000) quantity!: number;
  @IsString() unit!: string;
  @IsOptional() @IsNumber() @Min(-90) @Max(90) latitude?: number;
  @IsOptional() @IsNumber() @Min(-180) @Max(180) longitude?: number;
  @IsOptional() @IsBoolean() delivery?: boolean;
  @IsOptional() @IsNumber() @Min(0) @Max(100) priceWeight?: number;
  @IsOptional() @IsNumber() @Min(0) @Max(100) distanceWeight?: number;
}
@ApiTags('comparison')
@Controller('comparison')
export class ComparisonController {
  constructor(private readonly comparison: ComparisonService) {}
  @Get('map-data') mapData() { return this.comparison.mapData(); }
  @Get('history/:variantId') history(@Param('variantId') variantId: string, @Query('days') days = '90') { const period = Number(days); if (!Number.isInteger(period) || period < 1 || period > 730) throw new BadRequestException('El período debe estar entre 1 y 730 días.'); return this.comparison.history(variantId, period); }
  @Post('product') compare(@Body() dto: CompareDto) { return this.comparison.compare(dto); }
}
