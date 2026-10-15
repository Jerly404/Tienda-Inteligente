import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';

const requestInclude={items:{include:{variant:{include:{product:{include:{brand:true}}}}}},responses:{include:{supplier:true,items:{include:{item:true}}}},supplier:true};
@Injectable()
export class QuotationsService {
  constructor(private readonly prisma:PrismaService){}
  async create(buyerId:string,input:{supplierBusinessId:string;message?:string;expiresAt?:string;items:Array<{variantId:string;quantity:number;unit:string}>}){
    const supplier=await this.prisma.business.findUnique({where:{id:input.supplierBusinessId}});
    if(!supplier||supplier.type!=='SUPPLIER'||supplier.status!=='VERIFIED')throw new NotFoundException('No se encontró un proveedor verificado.');
    if(new Set(input.items.map(x=>x.variantId)).size!==input.items.length)throw new BadRequestException('Cada presentación debe aparecer una sola vez en la cotización.');
    const variants=await this.prisma.productVariant.findMany({where:{id:{in:input.items.map(x=>x.variantId)}}});
    if(variants.length!==input.items.length)throw new NotFoundException('Una o más presentaciones no existen.');
    const byId=new Map(variants.map(v=>[v.id,v]));
    for(const item of input.items)if(byId.get(item.variantId)!.baseUnit.toLowerCase()!==item.unit.toLowerCase())throw new BadRequestException(`La unidad de la solicitud debe coincidir con ${byId.get(item.variantId)!.baseUnit}.`);
    const expiresAt=input.expiresAt?new Date(input.expiresAt):new Date(Date.now()+72*60*60*1000);
    if(expiresAt<=new Date())throw new BadRequestException('La vigencia debe ser futura.');
    return this.prisma.quotationRequest.create({data:{buyerId,supplierBusinessId:supplier.id,message:input.message,expiresAt,items:{create:input.items.map(x=>({variantId:x.variantId,quantity:x.quantity.toFixed(3),unit:x.unit}))}},include:requestInclude});
  }
  mine(buyerId:string){return this.prisma.quotationRequest.findMany({where:{buyerId},include:requestInclude,orderBy:{createdAt:'desc'}});}
  async inbox(userId:string){
    const memberships=await this.prisma.businessMembership.findMany({where:{userId,business:{type:'SUPPLIER'}},select:{businessId:true}});
    return this.prisma.quotationRequest.findMany({where:{supplierBusinessId:{in:memberships.map(x=>x.businessId)},status:{in:['SENT','RESPONDED']}},include:requestInclude,orderBy:{createdAt:'desc'}});
  }
  async getBuyerRequest(buyerId:string,id:string){const request=await this.prisma.quotationRequest.findFirst({where:{id,buyerId},include:requestInclude});if(!request)throw new NotFoundException('No se encontró la cotización.');return request;}
  private async supplierRequest(userId:string,id:string){
    const request=await this.prisma.quotationRequest.findUnique({where:{id},include:{items:true}});
    if(!request)throw new NotFoundException('No se encontró la solicitud.');
    const member=await this.prisma.businessMembership.findUnique({where:{userId_businessId:{userId,businessId:request.supplierBusinessId}},include:{business:true}});
    if(!member||member.permission==='VIEWER')throw new NotFoundException('No se encontró la solicitud.');
    return request;
  }
  async respond(userId:string,id:string,input:{deliveryFee?:number;note?:string;expiresAt?:string;items:Array<{requestItemId:string;packagePrice:number;offeredPackages:number;availablePackages?:number}>}){
    const request=await this.supplierRequest(userId,id);
    if(request.status!=='SENT')throw new ConflictException('Esta solicitud ya no acepta respuestas.');
    const now=new Date();if(request.expiresAt<=now)throw new ConflictException('La solicitud venció.');
    if(new Set(input.items.map(x=>x.requestItemId)).size!==input.items.length)throw new BadRequestException('No repitas productos en la respuesta.');
    const validIds=new Set(request.items.map(item=>item.id));
    if(input.items.some(item=>!validIds.has(item.requestItemId)))throw new BadRequestException('La respuesta contiene un producto ajeno a la solicitud.');
    for(const item of input.items)if(item.availablePackages!==undefined&&item.offeredPackages>item.availablePackages)throw new BadRequestException('Los paquetes ofrecidos superan la disponibilidad informada.');
    const expiresAt=input.expiresAt?new Date(input.expiresAt):new Date(Math.min(request.expiresAt.getTime(),now.getTime()+72*60*60*1000));
    if(expiresAt<=now)throw new BadRequestException('La vigencia de la respuesta debe ser futura.');
    return this.prisma.$transaction(async(tx)=>{
      const response=await tx.quotationResponse.create({data:{requestId:id,supplierBusinessId:request.supplierBusinessId,deliveryFee:input.deliveryFee?.toFixed(2),note:input.note,expiresAt,items:{create:input.items.map(item=>({item:{connect:{id:item.requestItemId}},packagePrice:item.packagePrice.toFixed(2),offeredPackages:item.offeredPackages,availablePackages:item.availablePackages}))}},include:{items:true}});
      await tx.quotationRequest.update({where:{id},data:{status:'RESPONDED'}});
      return response;
    });
  }
  async reject(userId:string,id:string,reason:string){
    const request=await this.supplierRequest(userId,id);
    if(request.status!=='SENT')throw new ConflictException('Esta solicitud ya no puede rechazarse.');
    return this.prisma.quotationRequest.update({where:{id},data:{status:'REJECTED',rejectionReason:reason},include:requestInclude});
  }
  async accept(buyerId:string,id:string,responseId:string){
    const request=await this.getBuyerRequest(buyerId,id);
    if(request.status!=='RESPONDED')throw new ConflictException('Solo puedes aceptar una cotización respondida.');
    const response=await this.prisma.quotationResponse.findFirst({where:{id:responseId,requestId:id}});
    if(!response)throw new NotFoundException('La respuesta no pertenece a esta solicitud.');
    const now=new Date();if(request.expiresAt<=now||response.expiresAt<=now)throw new ConflictException('La solicitud o la respuesta venció.');
    return this.prisma.$transaction(async(tx)=>{
      await tx.quotationResponse.update({where:{id:response.id},data:{status:'ACCEPTED'}});
      await tx.quotationRequest.update({where:{id},data:{status:'ACCEPTED',acceptedResponseId:response.id}});
      return tx.quotationRequest.findUnique({where:{id},include:requestInclude});
    });
  }
  async cancel(buyerId:string,id:string){
    const request=await this.getBuyerRequest(buyerId,id);
    if(!['SENT','RESPONDED'].includes(request.status))throw new ConflictException('Esta cotización ya no puede cancelarse.');
    return this.prisma.quotationRequest.update({where:{id},data:{status:'CANCELLED'},include:requestInclude});
  }
}
