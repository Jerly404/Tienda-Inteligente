import { Body, Controller, Param, Patch, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { AdminGuard, AuthenticatedRequest, JwtAuthGuard } from '../../core/auth/jwt-auth.guard';
import { BusinessesService } from '../businesses/businesses.service';

class BusinessStatusDto {
  @IsIn(['VERIFIED', 'REJECTED', 'SUSPENDED', 'PENDING']) status!: 'VERIFIED' | 'REJECTED' | 'SUSPENDED' | 'PENDING';
  @IsOptional() @IsString() @MaxLength(500) reason?: string;
}
@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin/businesses')
export class AdminBusinessesController {
  constructor(private readonly businesses: BusinessesService) {}
  @Patch(':id/status') updateStatus(@Req() req: AuthenticatedRequest, @Param('id') id: string, @Body() dto: BusinessStatusDto) {
    return this.businesses.setStatus(req.user.sub, id, dto.status, dto.reason);
  }
}
