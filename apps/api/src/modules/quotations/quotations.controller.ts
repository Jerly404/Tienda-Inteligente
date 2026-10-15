import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsDateString, IsInt, IsNumber, IsOptional, IsString, Length, Max, Min, ValidateNested } from 'class-validator';
import { AuthenticatedRequest, JwtAuthGuard } from '../../core/auth/jwt-auth.guard';
import { QuotationsService } from './quotations.service';

class QuotationItemDto {
  @IsString() variantId!: string;
  @IsNumber() @Min(0.001) @Max(1000000) quantity!: number;
  @IsString() @Length(1,20) unit!: string;
}
class CreateQuotationDto {
  @IsString() supplierBusinessId!: string;
  @IsOptional() @IsString() @Length(1,500) message?: string;
  @IsOptional() @IsDateString() expiresAt?: string;
  @ValidateNested({each:true}) @Type(()=>QuotationItemDto) @ArrayMinSize(1) items!: QuotationItemDto[];
}
class ResponseItemDto {
  @IsString() requestItemId!: string;
  @IsNumber() @Min(0.01) @Max(100000000) packagePrice!: number;
  @IsInt() @Min(1) @Max(100000) offeredPackages!: number;
  @IsOptional() @IsInt() @Min(0) @Max(100000) availablePackages?: number;
}
class CreateResponseDto {
  @IsOptional() @IsNumber() @Min(0) @Max(100000000) deliveryFee?: number;
  @IsOptional() @IsString() @Length(1,500) note?: string;
  @IsOptional() @IsDateString() expiresAt?: string;
  @ValidateNested({each:true}) @Type(()=>ResponseItemDto) @ArrayMinSize(1) items!: ResponseItemDto[];
}
class RejectDto { @IsString() @Length(3,500) reason!: string; }

@ApiTags('quotations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('quotations')
export class QuotationsController {
  constructor(private readonly quotations: QuotationsService) {}
  @Post() create(@Req() req:AuthenticatedRequest,@Body() dto:CreateQuotationDto){return this.quotations.create(req.user.sub,dto);}
  @Get() mine(@Req() req:AuthenticatedRequest){return this.quotations.mine(req.user.sub);}
  @Get('inbox') inbox(@Req() req:AuthenticatedRequest){return this.quotations.inbox(req.user.sub);}
  @Get(':id') get(@Req() req:AuthenticatedRequest,@Param('id') id:string){return this.quotations.getBuyerRequest(req.user.sub,id);}
  @Post(':id/responses') respond(@Req() req:AuthenticatedRequest,@Param('id') id:string,@Body() dto:CreateResponseDto){return this.quotations.respond(req.user.sub,id,dto);}
  @Patch(':id/reject') reject(@Req() req:AuthenticatedRequest,@Param('id') id:string,@Body() dto:RejectDto){return this.quotations.reject(req.user.sub,id,dto.reason);}
  @Patch(':id/accept/:responseId') accept(@Req() req:AuthenticatedRequest,@Param('id') id:string,@Param('responseId') responseId:string){return this.quotations.accept(req.user.sub,id,responseId);}
  @Patch(':id/cancel') cancel(@Req() req:AuthenticatedRequest,@Param('id') id:string){return this.quotations.cancel(req.user.sub,id);}
}
