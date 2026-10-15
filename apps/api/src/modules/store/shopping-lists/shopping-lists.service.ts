import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

const includeList = { items: { orderBy: { id: 'asc' as const }, include: { variant: { include: { product: { include: { brand: true } } } } } } };
type ListChoice = { itemId:string; product:string; presentation:string; requested:number; acquired:number; surplus:number; packages:number; productCents:number; businessId:string; supplier:string; branchId:string; branch:string; deliveryCents:number; freeDeliveryAt:number|null };
const money = (cents:number) => Number((cents/100).toFixed(2));
@Injectable()
export class ShoppingListsService {
  constructor(private readonly prisma: PrismaService) {}
  create(ownerId: string, name: string) { return this.prisma.shoppingList.create({ data: { ownerId, name: name.trim() }, include: includeList }); }
  mine(ownerId: string) { return this.prisma.shoppingList.findMany({ where: { ownerId }, include: includeList, orderBy: { updatedAt: 'desc' } }); }
  async get(ownerId: string, id: string) {
    const list = await this.prisma.shoppingList.findFirst({ where: { id, ownerId }, include: includeList });
    if (!list) throw new NotFoundException('No se encontró la lista.');
    return list;
  }
  async rename(ownerId: string, id: string, name: string) {
    await this.get(ownerId, id);
    return this.prisma.shoppingList.update({ where: { id }, data: { name: name.trim() }, include: includeList });
  }
  async setItem(ownerId: string, listId: string, variantId: string, quantity: number, unit?: string) {
    await this.get(ownerId, listId);
    const variant = await this.prisma.productVariant.findUnique({ where: { id: variantId } });
    if (!variant) throw new NotFoundException('No se encontró la presentación.');
    const selectedUnit = unit ?? variant.baseUnit;
    if (selectedUnit.toLowerCase() !== variant.baseUnit.toLowerCase()) throw new BadRequestException(`La cantidad debe expresarse en ${variant.baseUnit}.`);
    await this.prisma.shoppingListItem.upsert({ where: { listId_variantId: { listId, variantId } }, create: { listId, variantId, quantity: quantity.toFixed(3), unit: variant.baseUnit }, update: { quantity: quantity.toFixed(3), unit: variant.baseUnit } });
    await this.prisma.shoppingList.update({ where: { id: listId }, data: { updatedAt: new Date() } });
    return this.get(ownerId, listId);
  }
  async removeItem(ownerId: string, listId: string, itemId: string) {
    await this.get(ownerId, listId);
    const item = await this.prisma.shoppingListItem.findFirst({ where: { id: itemId, listId } });
    if (!item) throw new NotFoundException('No se encontró el producto en esta lista.');
    await this.prisma.shoppingListItem.delete({ where: { id: itemId } });
    return this.get(ownerId, listId);
  }
  async compare(ownerId: string, listId: string, delivery: boolean) {
    const list = await this.get(ownerId, listId);
    if (!list.items.length) return { listId, status: 'EMPTY', items: [], singleSupplier: null, splitPurchase: null };
    const variantIds = [...new Set(list.items.map((item) => item.variantId))];
    const offers = await this.prisma.supplierOffer.findMany({
      where: { active: true, variantId: { in: variantIds }, currency: 'PEN', business: { status: 'VERIFIED' }, availability: { in: ['AVAILABLE', 'LIMITED'] }, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
      include: { business: true, branch: true, promotions: true },
    });
    const byVariant = new Map<string, ListChoice[]>();
    for (const item of list.items) {
      const variant = item.variant;
      const quantity = Number(item.quantity);
      const packageContent = Number(variant.baseQuantity) * variant.unitsPerPackage;
      const choices = offers.flatMap((offer) => {
        if (offer.variantId !== item.variantId || item.unit.toLowerCase() !== variant.baseUnit.toLowerCase()) return [];
        const packages = Math.max(offer.minimumPackages, Math.ceil(quantity / packageContent));
        if (offer.stockPackages !== null && offer.stockPackages < packages) return [];
        if (delivery && (!offer.branch.deliveryAvailable || offer.branch.deliveryFee === null)) return [];
        const promotion = (offer.promotions ?? []).filter(p => p.active && p.startAt <= new Date() && p.endAt > new Date() && packages >= p.minimumPackages && Number(p.promotionalPrice) < Number(offer.price)).sort((a,b)=>Number(a.promotionalPrice)-Number(b.promotionalPrice))[0];
        const packageCents = Math.round(Number(promotion?.promotionalPrice ?? offer.price) * 100);
        const productCents = packageCents * packages;
        const feeCents = delivery ? Math.round(Number(offer.branch.deliveryFee) * 100) : 0;
        if (!Number.isSafeInteger(productCents) || !Number.isSafeInteger(productCents + feeCents)) return [];
        return [{ itemId:item.id, product:variant.product.name, presentation:variant.label, requested:quantity, acquired:packages*packageContent, surplus:Number((packages*packageContent-quantity).toFixed(3)), packages, productCents, businessId:offer.businessId, supplier:offer.business.name, branchId:offer.branchId, branch:offer.branch.name, deliveryCents:feeCents, freeDeliveryAt:offer.branch.minimumFreeDelivery===null?null:Math.round(Number(offer.branch.minimumFreeDelivery)*100) }];
      }).sort((a,b)=>a.productCents-b.productCents||a.supplier.localeCompare(b.supplier));
      byVariant.set(item.id, choices);
    }
    const missing = list.items.filter((item)=>!(byVariant.get(item.id)?.length)).map((item)=>({product:item.variant.product.name,presentation:item.variant.label,quantity:Number(item.quantity),unit:item.unit}));
    if (missing.length) return { listId, status:'INCOMPLETE', missing, items:list.items.length, singleSupplier:null, splitPurchase:null, explanation:'No todos los productos tienen ofertas vigentes, compatibles y con stock suficiente; la entrega debe estar configurada cuando se solicita.' };
    const itemIds = list.items.map((item)=>item.id);
    const evaluate = (assignment:ListChoice[]) => {
      const branches = new Map<string,{fee:number;freeAt:number|null;subtotal:number;businessId:string;supplier:string;branch:string}>();
      for (const choice of assignment) {
        const key=choice.branchId;
        const branch=branches.get(key)??{fee:choice.deliveryCents,freeAt:choice.freeDeliveryAt,subtotal:0,businessId:choice.businessId,supplier:choice.supplier,branch:choice.branch};
        branch.subtotal+=choice.productCents;branches.set(key,branch);
      }
      const productCents=assignment.reduce((sum,x)=>sum+x.productCents,0);
      const deliveryCents=[...branches.values()].reduce((sum,b)=>sum+(delivery&&!(b.freeAt!==null&&b.subtotal>=b.freeAt)?b.fee:0),0);
      const totalCents=productCents+deliveryCents;
      if(!Number.isSafeInteger(productCents)||!Number.isSafeInteger(totalCents)) throw new BadRequestException('El costo total supera el rango monetario permitido.');
      return {productCents,deliveryCents,totalCents,assignment:[...assignment],branches:[...branches.values()]};
    };
    const singles: Array<{result:ReturnType<typeof evaluate>;optimal:boolean}>=[];
    const groupKeys=new Set(offers.map((offer)=>`${offer.businessId}:${offer.branchId}`));
    for(const groupKey of groupKeys){
      const options=itemIds.map((itemId)=>(byVariant.get(itemId)??[]).filter((choice)=>`${choice.businessId}:${choice.branchId}`===groupKey));
      if(options.some((choices)=>!choices.length))continue;
      const combinations=options.reduce((count,choices)=>count*choices.length,1);
      const optimal=itemIds.length<=8&&combinations<=50000;
      let best:ReturnType<typeof evaluate>|null=null;
      if(optimal){
        const walk=(index:number,chosen:ListChoice[])=>{if(index===options.length){const result=evaluate(chosen);if(!best||result.totalCents<best.totalCents)best=result;return;}for(const choice of options[index]){chosen.push(choice);walk(index+1,chosen);chosen.pop();}};
        walk(0,[]);
      }else{
        best=evaluate(options.map((choices)=>[...choices].sort((a,b)=>a.productCents-b.productCents)[0]));
      }
      if(best)singles.push({result:best,optimal});
    }
    singles.sort((a,b)=>a.result.totalCents-b.result.totalCents);
    const combinationCount=(itemIds.map((id)=>byVariant.get(id)!.length).reduce((a,b)=>a*b,1));
    const exact=itemIds.length<=8&&combinationCount<=50000;
    let bestSplit:ReturnType<typeof evaluate>|null=null;
    if(exact){
      const walk=(index:number,chosen:ListChoice[])=>{if(index===itemIds.length){const result=evaluate(chosen);if(!bestSplit||result.totalCents<bestSplit.totalCents)bestSplit=result;return;}for(const choice of byVariant.get(itemIds[index])!){chosen.push(choice);walk(index+1,chosen);chosen.pop();}};
      walk(0,[]);
    } else {
      bestSplit=evaluate(itemIds.map((id)=>byVariant.get(id)![0]));
    }
    const present=(result:ReturnType<typeof evaluate>|null,optimal:boolean)=>result?({method:optimal?'EXACT':'GREEDY_APPROXIMATION',optimal,total:money(result.totalCents),productSubtotal:money(result.productCents),deliveryCost:money(result.deliveryCents),providers:result.branches.map((branch)=>({supplier:branch.supplier,branch:branch.branch})),assignments:result.assignment.map((choice)=>({product:choice.product,presentation:choice.presentation,supplier:choice.supplier,branch:choice.branch,packages:choice.packages,requestedQuantity:choice.requested,acquiredQuantity:Number(choice.acquired.toFixed(3)),surplus:choice.surplus,productCost:money(choice.productCents)}))}):null;
    return { listId, status:'COMPLETE', delivery, itemCount:list.items.length, singleSupplier:present(singles[0]?.result??null,singles[0]?.optimal??false), splitPurchase:present(bestSplit,exact), comparison:{splitCanReduceTotal:!!(singles[0]&&bestSplit&&bestSplit.totalCents<singles[0].result.totalCents),singleSupplierCount:singles.length,splitSearch:exact?'EXACT_ALL_ASSIGNMENTS':'GREEDY_APPROXIMATION'}, methodology:'Delivery is charged once per selected branch. Exhaustive search is used only at 8 items/50,000 combinations or less; otherwise a deterministic low-product-cost assignment is reported as approximate. No global optimality claim is made for approximate results.' };
  }
  async remove(ownerId: string, id: string) {
    await this.get(ownerId, id);
    await this.prisma.shoppingList.delete({ where: { id } });
    return { id, deleted: true };
  }
}
