import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { ComparisonService } from '../../comparison/comparison.service';
import { FavoriteDto, PreferencesDto, PurchaseDto, ReportQueryDto, SaveComparisonDto } from './buyer.dto';
import { amount, cents, csvCell, purchaseTotals } from './money';
const defaults={radiusKm:10,sort:'price',pageSize:20,currency:'PEN',categories:[],priceDrops:true,priceRises:true,promotions:true,expiringPromotions:true,availability:true};
const json=(value:unknown)=>JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
@Injectable()
export class BuyerService {
 constructor(private readonly db:PrismaService,private readonly comparison:ComparisonService){}
 async options(){const [categories,suppliers]=await Promise.all([this.db.category.findMany({select:{id:true,name:true},orderBy:{name:'asc'}}),this.db.business.findMany({where:{type:'SUPPLIER'},select:{id:true,name:true},orderBy:{name:'asc'}})]);return {categories,suppliers};}
 favorites(userId:string){return this.db.favorite.findMany({where:{userId},include:{variant:{include:{product:{include:{brand:true}}}},business:true},orderBy:{createdAt:'desc'}});}
 async favorite(userId:string,dto:FavoriteDto){
  if(!!dto.variantId===!!dto.businessId)throw new BadRequestException('Selecciona un producto o un proveedor.');
  if(dto.variantId){if(!await this.db.productVariant.findUnique({where:{id:dto.variantId}}))throw new NotFoundException('Producto no encontrado.');return this.db.favorite.upsert({where:{userId_variantId:{userId,variantId:dto.variantId}},create:{userId,...dto},update:{targetPrice:dto.targetPrice??null}});}
  if(!await this.db.business.findFirst({where:{id:dto.businessId,type:'SUPPLIER'}}))throw new NotFoundException('Proveedor no encontrado.');
  return this.db.favorite.upsert({where:{userId_businessId:{userId,businessId:dto.businessId!}},create:{userId,businessId:dto.businessId},update:{}});
 }
 async removeFavorite(userId:string,id:string){const result=await this.db.favorite.deleteMany({where:{userId,id}});if(!result.count)throw new NotFoundException();return {deleted:true};}
 async preferences(userId:string){const found=await this.db.userPreference.findUnique({where:{userId}});return {...defaults,...(found?.data as object??{})};}
 setPreferences(userId:string,dto:PreferencesDto){return this.db.userPreference.upsert({where:{userId},create:{userId,data:json(dto)},update:{data:json(dto)}});}
 async notifications(userId:string){
  const preferences=await this.preferences(userId);
  const favorites=await this.db.favorite.findMany({where:{userId,variantId:{not:null}},include:{variant:{include:{product:true,offers:{where:{business:{status:'VERIFIED'}},include:{priceHistory:{orderBy:{recordedAt:'desc'},take:2}}}}}}});
  for(const favorite of favorites)for(const offer of favorite.variant?.offers??[]){
   if(offer.updatedAt<favorite.createdAt)continue;
   const latest=offer.priceHistory[0],previous=offer.priceHistory[1];
   if(!latest||!previous)continue;
   const difference=Number(latest.price)-Number(previous.price);
   const target=favorite.targetPrice!==null&&Number(offer.price)<=Number(favorite.targetPrice);
   if(!(difference<0&&preferences.priceDrops||difference>0&&preferences.priceRises||target&&preferences.priceDrops))continue;
   const eventKey=`${userId}:${favorite.id}:${latest.id}`;
   await this.db.notification.upsert({where:{eventKey},update:{},create:{userId,eventKey,type:target?'TARGET_PRICE':difference<0?'PRICE_DROP':'PRICE_RISE',message:`${favorite.variant!.product.name} · ${favorite.variant!.label}: S/ ${Number(offer.price).toFixed(2)} por paquete${target?' (precio objetivo alcanzado)':''}.`,link:`/app/comparar?variantId=${offer.variantId}`}});
  }
  if(preferences.promotions||preferences.expiringPromotions){
   const ids=favorites.flatMap(f=>f.variantId?[f.variantId]:[]),now=new Date();
   const promotions=await this.db.promotion.findMany({where:{active:true,startAt:{lte:now},endAt:{gt:now},offer:{variantId:{in:ids},active:true,business:{status:'VERIFIED'}}},include:{offer:{include:{variant:{include:{product:true}}}}}});
   for(const promo of promotions){const favorite=favorites.find(f=>f.variantId===promo.offer.variantId)!;const expiring=promo.endAt.getTime()-now.getTime()<48*60*60*1000;const type=expiring?'PROMOTION_EXPIRING':'PROMOTION';if(expiring&&!preferences.expiringPromotions||!expiring&&(!preferences.promotions||promo.createdAt<favorite.createdAt))continue;const eventKey=`${userId}:${promo.id}:${type}`;await this.db.notification.upsert({where:{eventKey},update:{},create:{userId,eventKey,type,message:`${promo.offer.variant.product.name}: promoción S/ ${Number(promo.promotionalPrice).toFixed(2)} por paquete, mínimo ${promo.minimumPackages}. Vence ${promo.endAt.toLocaleDateString('es-PE')}.`,link:'/app/ofertas'}});}
  }
  return this.db.notification.findMany({where:{userId},orderBy:{createdAt:'desc'},take:100});
 }
 async readNotification(userId:string,id:string){const result=await this.db.notification.updateMany({where:{userId,id},data:{readAt:new Date()}});if(!result.count)throw new NotFoundException();return {read:true};}
 comparisons(userId:string){return this.db.savedComparison.findMany({where:{userId},orderBy:{createdAt:'desc'},take:100});}
 async saveComparison(userId:string,dto:SaveComparisonDto){const {title,...input}=dto;const result=await this.comparison.compare(input);return this.db.savedComparison.create({data:{userId,title,input:json(input),result:json(result)}});}
 async purchase(userId:string,dto:PurchaseDto){
  if(new Date(dto.purchasedAt)>new Date())throw new BadRequestException('La compra no puede tener fecha futura.');
  if(!await this.db.business.findFirst({where:{id:dto.businessId,type:'SUPPLIER'}}))throw new NotFoundException('Proveedor no encontrado.');
  if(new Set(dto.items.map(x=>x.variantId)).size!==dto.items.length)throw new BadRequestException('Agrupa los paquetes de la misma presentación.');
  const variants=await this.db.productVariant.findMany({where:{id:{in:dto.items.map(x=>x.variantId)}}});
  if(variants.length!==dto.items.length)throw new BadRequestException('Presentación no encontrada.');
  for(const item of dto.items){const variant=variants.find(v=>v.id===item.variantId)!;if(Number(variant.baseQuantity)*variant.unitsPerPackage*item.packages>999999999.999)throw new BadRequestException('La cantidad adquirida supera el límite permitido.');}
  const totals=purchaseTotals(dto.items,dto.deliveryCost);
  if(totals.total>9999999999.99)throw new BadRequestException('Monto fuera de rango.');
  let referenceTotal:number|null=null;
  if(dto.comparisonId){
   const saved=await this.db.savedComparison.findFirst({where:{id:dto.comparisonId,userId}});
   if(!saved)throw new NotFoundException('Comparación no encontrada.');
   const input=saved.input as {variantId:string;delivery?:boolean};
   const result=saved.result as {offers?:Array<{packages:number;totalCost:number|null;purchasedQuantity:number}>};
   if(dto.items.length!==1||dto.items[0].variantId!==input.variantId)throw new BadRequestException('La comparación debe corresponder a la misma presentación.');
   const alternatives=(result.offers??[]).filter(x=>x.packages===dto.items[0].packages&&x.totalCost!==null);
   if(alternatives.length>=2&&(input.delivery||dto.deliveryCost===0))referenceTotal=Math.max(...alternatives.map(x=>x.totalCost!));
  }
  return this.db.purchase.create({data:{userId,businessId:dto.businessId,purchasedAt:new Date(dto.purchasedAt),subtotal:totals.subtotal,deliveryCost:dto.deliveryCost,total:totals.total,referenceTotal,items:{create:dto.items.map((item,index)=>{const variant=variants.find(v=>v.id===item.variantId)!;return {...item,unit:variant.baseUnit,quantity:Number(variant.baseQuantity)*variant.unitsPerPackage*item.packages,total:totals.lines[index]};})}},include:{business:true,items:{include:{variant:{include:{product:true}}}}}});
 }
 async report(userId:string,query:ReportQueryDto){
  const from=query.from?new Date(query.from):undefined,to=query.to?new Date(query.to):undefined;
  if(to&&query.to?.length===10)to.setUTCHours(23,59,59,999);
  if(from&&to&&from>to)throw new BadRequestException('El inicio debe ser anterior al fin.');
  const rows=await this.db.purchase.findMany({where:{userId,businessId:query.businessId,purchasedAt:{gte:from,lte:to},...(query.categoryId?{items:{some:{variant:{product:{categoryId:query.categoryId}}}}}:{})},include:{business:{select:{id:true,name:true}},items:{include:{variant:{include:{product:{include:{category:true}}}}}}},orderBy:{purchasedAt:'desc'}});
  const purchases=rows.map(row=>{const items=row.items.filter(item=>!query.categoryId||item.variant.product.categoryId===query.categoryId);return {...row,items,filteredTotal:query.categoryId?amount(items.reduce((sum,item)=>sum+cents(Number(item.total)),0)):Number(row.total)};});
  const products=new Map<string,{name:string;quantity:number;unit:string;spent:number;count:number}>(),categories=new Map<string,number>(),suppliers=new Map<string,{name:string;spent:number;count:number}>(),periods=new Map<string,{spent:number;count:number}>();
  for(const purchase of purchases){const supplier=suppliers.get(purchase.businessId)??{name:purchase.business.name,spent:0,count:0};supplier.spent+=cents(purchase.filteredTotal);supplier.count++;suppliers.set(purchase.businessId,supplier);const key=purchase.purchasedAt.toISOString().slice(0,7),period=periods.get(key)??{spent:0,count:0};period.spent+=cents(purchase.filteredTotal);period.count++;periods.set(key,period);
   for(const item of purchase.items){const product=products.get(item.variantId)??{name:`${item.variant.product.name} · ${item.variant.label}`,quantity:0,unit:item.unit,spent:0,count:0};product.quantity+=Number(item.quantity);product.spent+=cents(Number(item.total));product.count++;products.set(item.variantId,product);const category=item.variant.product.category?.name??'Sin categoría';categories.set(category,(categories.get(category)??0)+cents(Number(item.total)));}}
  const references=query.categoryId?[]:purchases.filter(row=>row.referenceTotal!==null);
  const businesses=await this.db.business.findMany({where:{memberships:{some:{userId}},type:'STORE'},select:{name:true}});
  return {businessName:businesses[0]?.name??'Mi negocio',generatedAt:new Date().toISOString(),filters:query,metrics:{total:amount(purchases.reduce((sum,row)=>sum+cents(row.filteredTotal),0)),count:purchases.length,suppliers:suppliers.size,estimatedSavings:references.length?amount(references.reduce((sum,row)=>sum+Math.max(0,cents(Number(row.referenceTotal))-cents(Number(row.total))),0)):null,referencedPurchases:references.length},methodology:query.categoryId?'El filtro de categoría incluye solo productos de esa categoría; no distribuye gastos de entrega ni ahorro.':'Ahorro estimado frente a la alternativa comparable de mayor costo guardada al comparar; nunca equivale a ahorro auditado. Sin referencia válida se muestra sin datos.',purchases,products:[...products.values()].map(x=>({...x,spent:amount(x.spent)})).sort((a,b)=>b.spent-a.spent),categories:[...categories].map(([name,value])=>({name,spent:amount(value)})),suppliers:[...suppliers.values()].map(x=>({...x,spent:amount(x.spent)})),periods:[...periods].sort(([a],[b])=>a.localeCompare(b)).map(([period,x])=>({period,...x,spent:amount(x.spent)}))};
 }
 async csv(userId:string,query:ReportQueryDto){const report=await this.report(userId,query);const rows:unknown[][]=[['Negocio',report.businessName],['Generado',report.generatedAt],['Desde',query.from??'Todos'],['Hasta',query.to??'Todos'],['Proveedor',query.businessId??'Todos'],['Categoría',query.categoryId??'Todas'],['Total PEN',report.metrics.total],['Base de cálculo',report.methodology],[],['Fecha','Proveedor','Producto','Presentación','Paquetes','Precio paquete PEN','Total productos PEN']];for(const purchase of report.purchases)for(const item of purchase.items)rows.push([purchase.purchasedAt.toISOString(),purchase.business.name,item.variant.product.name,item.variant.label,item.packages,item.packagePrice,item.total]);return '\uFEFF'+rows.map(row=>row.map(csvCell).join(',')).join('\r\n');}
}
