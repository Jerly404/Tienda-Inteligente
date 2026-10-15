import { Body, Controller, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsIn, IsNumber, IsOptional, IsString, Length, Matches, Max, MaxLength, Min } from 'class-validator';
import { AdminCatalogService } from './admin-catalog.service';
import { AdminGuard, AuthenticatedRequest, JwtAuthGuard } from '../../core/auth/jwt-auth.guard';
import { Req } from '@nestjs/common';

class CreateProductDto {
  @IsString() @Length(2, 160) name!: string;
  @IsOptional() @IsString() @Length(2, 80) category?: string;
  @IsOptional() @IsString() @Length(1, 80) brand?: string;
  @IsString() @Length(2, 100) variantLabel!: string;
  @IsNumber() @Min(0.001) @Max(1000000) baseQuantity!: number;
  @IsIn(['kg', 'g', 'L', 'ml', 'unidad', 'paquete', 'caja']) baseUnit!: string;
  @IsOptional() @IsNumber() @Min(1) @Max(100000) unitsPerPackage?: number;
  @IsOptional() @IsString() @MaxLength(500) @Matches(/^(https?:\/\/\S+|\/images\/\S+)?$/i) imageUrl?: string;
}
class ProductImageDto {
  @IsOptional() @IsString() @MaxLength(500) @Matches(/^(https?:\/\/\S+|\/images\/\S+)?$/i) imageUrl?: string | null;
}
@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin/catalog')
export class AdminCatalogController {
  constructor(private readonly catalog: AdminCatalogService) {}
  @Post('products') createProduct(@Req() req: AuthenticatedRequest, @Body() dto: CreateProductDto) { return this.catalog.create(req.user.sub, dto); }
  @Patch('products/:id/image') image(@Req() req: AuthenticatedRequest, @Param('id') id: string, @Body() dto: ProductImageDto) { return this.catalog.setImage(req.user.sub, id, dto.imageUrl ?? null); }
}
