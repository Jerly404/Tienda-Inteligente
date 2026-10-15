import { BadRequestException, Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { AdminGuard, AuthenticatedRequest, JwtAuthGuard } from '../../core/auth/jwt-auth.guard';
import { ActiveDto, CategoryDto, ReviewRequestDto } from './admin-management.dto';
@ApiTags('administration') @ApiBearerAuth() @UseGuards(JwtAuthGuard, AdminGuard) @Controller('management-admin')
export class AdminManagementController {
 constructor(private readonly db:PrismaService){}
 @Get() async overview(){
  const [users,businesses,categories,requests,offers,products]=await Promise.all([
   this.db.user.findMany({select:{id:true,name:true,email:true,role:true,active:true,createdAt:true},orderBy:{createdAt:'desc'},take:200}),
   this.db.business.findMany({include:{_count:{select:{offers:true}}},orderBy:{createdAt:'desc'},take:200}),
   this.db.category.findMany({orderBy:{name:'asc'}}),
   this.db.productRequest.findMany({include:{user:{select:{name:true,email:true}}},orderBy:{createdAt:'desc'},take:200}),
   this.db.supplierOffer.findMany({include:{business:{select:{name:true}},variant:{include:{product:true}}},orderBy:{updatedAt:'desc'},take:200}),
   this.db.product.findMany({include:{variants:true,category:true,brand:true},orderBy:{name:'asc'},take:500})]);
  return {users,businesses,categories,requests,offers,products};
 }
 @Patch('users/:id') async user(@Req() req:AuthenticatedRequest,@Param('id') id:string,@Body() dto:ActiveDto){
  if(req.user.sub===id && !dto.active) throw new BadRequestException('No puedes desactivar tu propia cuenta.');
  return this.db.user.update({where:{id},data:{active:dto.active,tokenVersion:{increment:1}},select:{id:true,active:true}});
 }
 @Post('categories') category(@Body() dto:CategoryDto){return this.db.category.create({data:dto});}
 @Patch('categories/:id') updateCategory(@Param('id') id:string,@Body() dto:CategoryDto){return this.db.category.update({where:{id},data:dto});}
 @Patch('requests/:id') request(@Param('id') id:string,@Body() dto:ReviewRequestDto){return this.db.productRequest.update({where:{id},data:dto});}
 @Patch('offers/:id') offer(@Param('id') id:string,@Body() dto:ActiveDto){return this.db.supplierOffer.update({where:{id},data:dto});}
 @Patch('products/:id') product(@Param('id') id:string,@Body() dto:ActiveDto){return this.db.product.update({where:{id},data:dto});}
}
