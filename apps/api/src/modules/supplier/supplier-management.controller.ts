import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthenticatedRequest, JwtAuthGuard } from '../../core/auth/jwt-auth.guard';
import { CompanyDto, CoverageDto, OfferDto, PromotionDto, RequestProductDto } from './supplier-management.dto';
import { SupplierManagementService } from './supplier-management.service';
@ApiTags('supplier-management') @ApiBearerAuth() @UseGuards(JwtAuthGuard) @Controller('supplier-panel')
export class SupplierManagementController {
 constructor(private readonly service:SupplierManagementService){}
 @Get() overview(@Req() req:AuthenticatedRequest){return this.service.overview(req.user);}
 @Patch(':id/company') company(@Req() req:AuthenticatedRequest,@Param('id') id:string,@Body() dto:CompanyDto){return this.service.saveCompany(req.user,id,dto);}
 @Patch(':id/branches/:branchId') coverage(@Req() req:AuthenticatedRequest,@Param('id') id:string,@Param('branchId') branchId:string,@Body() dto:CoverageDto){return this.service.coverage(req.user,id,branchId,dto);}
 @Post(':id/offers') createOffer(@Req() req:AuthenticatedRequest,@Param('id') id:string,@Body() dto:OfferDto){return this.service.saveOffer(req.user,id,dto);}
 @Patch(':id/offers/:offerId') offer(@Req() req:AuthenticatedRequest,@Param('id') id:string,@Param('offerId') offerId:string,@Body() dto:OfferDto){return this.service.saveOffer(req.user,id,dto,offerId);}
 @Delete(':id/offers/:offerId') removeOffer(@Req() req:AuthenticatedRequest,@Param('id') id:string,@Param('offerId') offerId:string){return this.service.removeOffer(req.user,id,offerId);}
 @Post(':id/promotions') createPromotion(@Req() req:AuthenticatedRequest,@Param('id') id:string,@Body() dto:PromotionDto){return this.service.promotion(req.user,id,dto);}
 @Patch(':id/promotions/:promotionId') promotion(@Req() req:AuthenticatedRequest,@Param('id') id:string,@Param('promotionId') promotionId:string,@Body() dto:PromotionDto){return this.service.promotion(req.user,id,dto,promotionId);}
 @Post('product-requests') request(@Req() req:AuthenticatedRequest,@Body() dto:RequestProductDto){return this.service.request(req.user,dto);}
}
