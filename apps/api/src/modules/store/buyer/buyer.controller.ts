import { Body, CanActivate, Controller, Delete, ExecutionContext, ForbiddenException, Get, Header, Injectable, Param, Patch, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthenticatedRequest, JwtAuthGuard } from '../../../core/auth/jwt-auth.guard';
import { BuyerService } from './buyer.service';
import { FavoriteDto, PreferencesDto, PurchaseDto, ReportQueryDto, SaveComparisonDto } from './buyer.dto';
@Injectable()
export class BuyerGuard implements CanActivate {canActivate(context:ExecutionContext){if(context.switchToHttp().getRequest<AuthenticatedRequest>().user.role!=='OWNER')throw new ForbiddenException('Esta función pertenece al panel de tiendas.');return true;}}
@ApiTags('buyer') @ApiBearerAuth() @UseGuards(JwtAuthGuard,BuyerGuard) @Controller('buyer')
export class BuyerController {
 constructor(private readonly service:BuyerService){}
 @Get('options') options(){return this.service.options();}
 @Get('favorites') favorites(@Req() r:AuthenticatedRequest){return this.service.favorites(r.user.sub);}
 @Put('favorites') favorite(@Req() r:AuthenticatedRequest,@Body() dto:FavoriteDto){return this.service.favorite(r.user.sub,dto);}
 @Delete('favorites/:id') remove(@Req() r:AuthenticatedRequest,@Param('id') id:string){return this.service.removeFavorite(r.user.sub,id);}
 @Get('preferences') preferences(@Req() r:AuthenticatedRequest){return this.service.preferences(r.user.sub);}
 @Put('preferences') setPreferences(@Req() r:AuthenticatedRequest,@Body() dto:PreferencesDto){return this.service.setPreferences(r.user.sub,dto);}
 @Get('notifications') notifications(@Req() r:AuthenticatedRequest){return this.service.notifications(r.user.sub);}
 @Patch('notifications/:id/read') read(@Req() r:AuthenticatedRequest,@Param('id') id:string){return this.service.readNotification(r.user.sub,id);}
 @Get('comparisons') comparisons(@Req() r:AuthenticatedRequest){return this.service.comparisons(r.user.sub);}
 @Post('comparisons') saveComparison(@Req() r:AuthenticatedRequest,@Body() dto:SaveComparisonDto){return this.service.saveComparison(r.user.sub,dto);}
 @Post('purchases') purchase(@Req() r:AuthenticatedRequest,@Body() dto:PurchaseDto){return this.service.purchase(r.user.sub,dto);}
 @Get('reports') report(@Req() r:AuthenticatedRequest,@Query() query:ReportQueryDto){return this.service.report(r.user.sub,query);}
 @Get('reports.csv') @Header('Content-Type','text/csv; charset=utf-8') @Header('Content-Disposition','attachment; filename="tienda-reporte.csv"') csv(@Req() r:AuthenticatedRequest,@Query() query:ReportQueryDto){return this.service.csv(r.user.sub,query);}
}
