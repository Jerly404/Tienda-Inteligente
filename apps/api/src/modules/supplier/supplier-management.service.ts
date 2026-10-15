import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { Prisma } from '@prisma/client';
import { parseDeliveryPolygon } from '../businesses/delivery-zone';
import { AuthenticatedRequest } from '../../core/auth/jwt-auth.guard';
import { CompanyDto, CoverageDto, OfferDto, PromotionDto, RequestProductDto } from './supplier-management.dto';
type Actor = AuthenticatedRequest['user'];
export function validatePromotion(dto: PromotionDto, reference: number) {
 const start = new Date(dto.startAt), end = new Date(dto.endAt);
 if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start || end <= new Date()) throw new BadRequestException('La vigencia de la promoción no es válida.');
 if (Math.round(dto.referencePrice * 100) !== Math.round(reference * 100)) throw new BadRequestException('El precio de referencia debe coincidir con el precio regular publicado.');
 if (dto.promotionalPrice >= dto.referencePrice) throw new BadRequestException('El precio promocional debe ser menor al precio regular.');
}
@Injectable()
export class SupplierManagementService {
 constructor(private readonly db: PrismaService) {}
 async owned(actor: Actor, businessId: string) {
  if (actor.role !== 'SUPPLIER') throw new ForbiddenException('Este espacio es exclusivo de proveedores.');
  const membership = await this.db.businessMembership.findUnique({where:{userId_businessId:{userId:actor.sub,businessId}},include:{business:true}});
  if (!membership || !['OWNER','MANAGER'].includes(membership.permission) || membership.business.type !== 'SUPPLIER') throw new ForbiddenException('No puedes administrar este proveedor.');
  if (['SUSPENDED','REJECTED'].includes(membership.business.status)) throw new ForbiddenException('El negocio no está habilitado para publicar.');
  return membership.business;
 }
 async overview(actor: Actor) {
  if(actor.role !== 'SUPPLIER') throw new ForbiddenException('Se requiere una cuenta de proveedor.');
  const businesses = await this.db.business.findMany({where:{type:'SUPPLIER',memberships:{some:{userId:actor.sub,permission:{in:['OWNER','MANAGER']}}}},include:{branches:true,offers:{include:{variant:{include:{product:{include:{category:true}}}},promotions:true},orderBy:{updatedAt:'desc'}}}});
  const requests = await this.db.productRequest.findMany({where:{userId:actor.sub},orderBy:{createdAt:'desc'},take:100});
  return {businesses,requests};
 }
 async saveCompany(actor: Actor, id:string,dto:CompanyDto) {await this.owned(actor,id);const {address,department,province,district,deliveryAvailable,deliveryZoneGeoJson,...businessData}=dto;const data={...businessData,...(deliveryZoneGeoJson!==undefined?{deliveryZoneGeoJson:deliveryZoneGeoJson?parseDeliveryPolygon(deliveryZoneGeoJson) as Prisma.InputJsonValue:Prisma.DbNull}:{})};return this.db.$transaction(async tx=>{const business=await tx.business.update({where:{id},data});if(address!==undefined||department!==undefined||province!==undefined||district!==undefined||deliveryAvailable!==undefined){const branch=await tx.branch.findFirst({where:{businessId:id},orderBy:{id:'asc'}});if(branch)await tx.branch.update({where:{id:branch.id},data:{...(address!==undefined?{address}:{}),...(department!==undefined?{department}:{}),...(province!==undefined?{province}:{}),...(district!==undefined?{district}:{}),...(deliveryAvailable!==undefined?{deliveryAvailable}:{})}});}return business;});}
 async coverage(actor:Actor,id:string,branchId:string,dto:CoverageDto) {
  await this.owned(actor,id);
  const branch=await this.db.branch.findFirst({where:{id:branchId,businessId:id}});
  if(!branch) throw new NotFoundException('Sucursal no encontrada.');
  return this.db.branch.update({where:{id:branchId},data:dto});
 }
 async saveOffer(actor:Actor,businessId:string,dto:OfferDto,id?:string) {
  await this.owned(actor,businessId);
  const branch=await this.db.branch.findFirst({where:{id:dto.branchId,businessId}});
  const variant=await this.db.productVariant.findFirst({where:{id:dto.variantId,product:{active:true}}});
  if(!branch || !variant) throw new BadRequestException('Selecciona una sucursal propia y un producto habilitado.');
  return this.db.$transaction(async tx=>{
   const previous=id?await tx.supplierOffer.findFirst({where:{id,businessId}}):null;
   if(id && !previous) throw new NotFoundException('Oferta no encontrada.');
   const duplicate=await tx.supplierOffer.findFirst({where:{businessId,branchId:dto.branchId,variantId:dto.variantId,...(id?{id:{not:id}}:{})}});
   if(duplicate) throw new BadRequestException('Ya tienes una oferta de esta presentación en la sucursal. Edítala para actualizar el precio.');
   const offer=id?await tx.supplierOffer.update({where:{id},data:dto}):await tx.supplierOffer.create({data:{...dto,businessId}});
   if(!previous || Number(previous.price)!==dto.price) {
    await tx.priceHistory.create({data:{offerId:offer.id,price:dto.price}});
    if(previous) await tx.promotion.updateMany({where:{offerId:offer.id,active:true},data:{active:false}});
   }
   return offer;
  });
 }
 async removeOffer(actor:Actor,businessId:string,offerId:string){await this.owned(actor,businessId);const offer=await this.db.supplierOffer.findFirst({where:{id:offerId,businessId}});if(!offer)throw new NotFoundException('Oferta no encontrada.');return this.db.supplierOffer.update({where:{id:offerId},data:{active:false,availability:'OUT_OF_STOCK'}});}
 async promotion(actor:Actor,businessId:string,dto:PromotionDto,id?:string) {
  await this.owned(actor,businessId);
  if(id && !dto.active) {
   const existing=await this.db.promotion.findFirst({where:{id,offer:{businessId}}});
   if(!existing) throw new NotFoundException('Promoción no encontrada.');
   return this.db.promotion.update({where:{id},data:{active:false}});
  }
  const offer=await this.db.supplierOffer.findFirst({where:{id:dto.offerId,businessId,active:true}});
  if(!offer) throw new NotFoundException('Selecciona una oferta propia activa.');
  validatePromotion(dto,Number(offer.price));
  if(dto.minimumPackages<offer.minimumPackages) throw new BadRequestException('La promoción debe respetar el pedido mínimo de la oferta.');
  if(id && !await this.db.promotion.findFirst({where:{id,offer:{businessId}}})) throw new NotFoundException('Promoción no encontrada.');
  const overlap=await this.db.promotion.findFirst({where:{offerId:offer.id,active:true,startAt:{lt:new Date(dto.endAt)},endAt:{gt:new Date(dto.startAt)},...(id?{id:{not:id}}:{})}});
  if(dto.active && overlap) throw new BadRequestException('Ya existe una promoción activa en esas fechas.');
  const data={...dto,startAt:new Date(dto.startAt),endAt:new Date(dto.endAt)};
  return id?this.db.promotion.update({where:{id},data}):this.db.promotion.create({data});
 }
 async request(actor:Actor,dto:RequestProductDto) {
  if(actor.role !== 'SUPPLIER') throw new ForbiddenException('Se requiere una cuenta de proveedor.');
  const membership=await this.db.businessMembership.findFirst({where:{userId:actor.sub,permission:{in:['OWNER','MANAGER']},business:{type:'SUPPLIER',status:{in:['PENDING','VERIFIED']}}}});
  if(!membership) throw new ForbiddenException('Registra un negocio de proveedor habilitado.');
  return this.db.productRequest.create({data:{...dto,userId:actor.sub}});
 }
}
