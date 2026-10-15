import { BadRequestException, Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, Length, Matches, Max, MaxLength, Min, IsNumber } from 'class-validator';
import { BusinessesService } from './businesses.service';
import { AuthenticatedRequest, JwtAuthGuard } from '../../core/auth/jwt-auth.guard';

class CreateBusinessDto {
  @IsString() @Length(2, 120) name!: string;
  @IsIn(['STORE', 'SUPPLIER']) type!: 'STORE' | 'SUPPLIER';
  @IsOptional() @IsString() @Matches(/^\d{11}$/) taxId?: string;
  @IsOptional() @IsString() @MaxLength(24) phone?: string;
}
class UpdateBusinessDto {
  @IsString() @Length(2, 120) name!: string;
  @IsOptional() @IsString() @MaxLength(24) phone?: string;
}
class CreateBranchDto {
  @IsString() @Length(2, 100) name!: string;
  @IsOptional() @IsString() @MaxLength(240) address?: string;
  @IsOptional() @IsNumber() @Min(-90) @Max(90) latitude?: number;
  @IsOptional() @IsNumber() @Min(-180) @Max(180) longitude?: number;
  @IsOptional() @IsNumber() @Min(0) deliveryFee?: number;
}
class UpdateBranchDto {
  @IsOptional() @IsString() @Length(2, 100) name?: string;
  @IsOptional() @IsString() @MaxLength(240) address?: string;
  @IsOptional() @IsNumber() @Min(-90) @Max(90) latitude?: number;
  @IsOptional() @IsNumber() @Min(-180) @Max(180) longitude?: number;
}
class CreateOfferDto {
  @IsString() variantId!: string;
  @IsString() branchId!: string;
  @IsNumber() @Min(0.01) price!: number;
  @IsOptional() @IsNumber() @Min(1) minimumPackages?: number;
  @IsOptional() @IsNumber() @Min(0) stockPackages?: number;
}

@ApiTags('businesses')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('businesses')
export class BusinessesController {
  constructor(private readonly businesses: BusinessesService) {}
  @Post() create(@Req() req: AuthenticatedRequest, @Body() dto: CreateBusinessDto) { return this.businesses.create(req.user.sub, dto); }
  @Patch(':id') update(@Req() req: AuthenticatedRequest, @Param('id') id: string, @Body() dto: UpdateBusinessDto) { return this.businesses.update(req.user.sub, id, dto); }
  @Get('mine') mine(@Req() req: AuthenticatedRequest) { return this.businesses.mine(req.user.sub); }
  @Post(':id/branches') branch(@Req() req: AuthenticatedRequest, @Param('id') id: string, @Body() dto: CreateBranchDto) { return this.businesses.createBranch(req.user.sub, id, dto); }
  @Patch(':id/branches/:branchId') updateBranch(@Req() req: AuthenticatedRequest, @Param('id') id: string, @Param('branchId') branchId: string, @Body() dto: UpdateBranchDto) { return this.businesses.updateBranch(req.user.sub, id, branchId, dto); }
  @Post(':id/offers') offer(@Req() req: AuthenticatedRequest, @Param('id') id: string, @Body() dto: CreateOfferDto) { return this.businesses.createOffer(req.user.sub, id, dto); }
}
