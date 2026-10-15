import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';

export type Input = { supplierIds?: string[]; quantityMode?: 'BASE' | 'PACKAGES'; variantId: string; quantity: number; unit: string; latitude?: number; longitude?: number; delivery?: boolean; priceWeight?: number; distanceWeight?: number };
const cents = (value: unknown) => Math.round(Number(value) * 100);
const exactCents = (value: unknown) => {
  const decimal = typeof value === 'number' ? value.toFixed(2) : String(value);
  const [whole, fraction = ''] = decimal.split('.');
  return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0').slice(0, 2));
};
const money = (value: number) => Number((value / 100).toFixed(2));
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const rad = (n: number) => n * Math.PI / 180;
  const dLat = rad(lat2 - lat1), dLon = rad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 6371.0088 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

@Injectable()
export class ComparisonService {
  constructor(private readonly prisma: PrismaService) {}
  mapData() { return this.prisma.supplierOffer.findMany({ where: { active: true, business: { status: 'VERIFIED' }, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] }, select: { branchId: true, variantId: true, price: true, stockPackages: true, availability: true, branch: { select: { deliveryAvailable: true } }, promotions: { where: { active: true, startAt: { lte: new Date() }, endAt: { gt: new Date() } }, select: { id: true } }, variant: { select: { label: true, product: { select: { name: true, category: { select: { name: true } } } } } } }, orderBy: { id: 'asc' }, take: 5000 }); }
  async history(variantId: string, days = 90) {
    const since = new Date(Date.now() - days * 86400000);
    const rows = await this.prisma.priceHistory.findMany({ where: { recordedAt: { gte: since }, offer: { variantId, business: { status: 'VERIFIED' } } }, include: { offer: { include: { business: true } } }, orderBy: { recordedAt: 'asc' }, take: 3000 });
    const points = rows.map(r => ({ offerId: r.offerId, supplier: r.offer.business.name, price: Number(r.price), date: r.recordedAt.toISOString() }));
    const prices = points.map(p => p.price);
    return { variantId, days, currency: 'PEN', metric: 'Precio por paquete', points, min: prices.length ? Math.min(...prices) : null, max: prices.length ? Math.max(...prices) : null, average: prices.length ? money(Math.round(prices.reduce((a,b)=>a+cents(b),0)/prices.length)) : null };
  }
  async compare(input: Input) {
    if ((input.latitude === undefined) !== (input.longitude === undefined)) throw new BadRequestException('Envía latitud y longitud juntas.');
    const variant = await this.prisma.productVariant.findUnique({ where: { id: input.variantId }, include: { product: { include: { brand: true } } } });
    if (!variant) throw new NotFoundException('No se encontró esta presentación.');
    if (variant.baseUnit.toLowerCase() !== input.unit.toLowerCase()) throw new BadRequestException(`La cantidad debe expresarse en ${variant.baseUnit}; no se aplican conversiones implícitas.`);
    const offers = await this.prisma.supplierOffer.findMany({ where: { variantId: input.variantId, currency: 'PEN', business: { status: 'VERIFIED' }, ...(input.supplierIds?.length ? { businessId: { in: input.supplierIds } } : {}) }, include: { business: true, branch: true, promotions: true } });
    const excludedOffers: Array<{ offerId: string; supplier: string; reasons: string[] }> = [];
    const choices = offers.flatMap((o) => {
      const perPackage = Number(variant.baseQuantity) * variant.unitsPerPackage;
      const requestedPackages = input.quantityMode === 'PACKAGES' ? Math.ceil(input.quantity) : Math.ceil(input.quantity / perPackage);
      const packagesNeeded = Math.max(Number(o.minimumPackages), requestedPackages);
      const reasons: string[] = [];
      if (o.active === false) reasons.push('Publicación desactivada.');
      if (!['AVAILABLE', 'LIMITED'].includes(o.availability)) reasons.push('Proveedor informa sin disponibilidad.');
      if (o.expiresAt && o.expiresAt <= new Date()) reasons.push('Publicación vencida.');
      if (o.stockPackages !== null && o.stockPackages < packagesNeeded) reasons.push(`Stock insuficiente: ${o.stockPackages} paquetes; se necesitan ${packagesNeeded}.`);
      if (reasons.length) { excludedOffers.push({ offerId: o.id, supplier: o.business.name, reasons }); return []; }
      const fulfilled = packagesNeeded * perPackage;

      const promotion = (o.promotions ?? []).filter(p => p.active && p.startAt <= new Date() && p.endAt > new Date() && packagesNeeded >= p.minimumPackages && cents(p.promotionalPrice) < cents(o.price)).sort((a,b) => cents(a.promotionalPrice)-cents(b.promotionalPrice))[0];
      const effectivePrice = promotion?.promotionalPrice ?? o.price;
      const productCentsBig = exactCents(effectivePrice) * BigInt(packagesNeeded);
      if (productCentsBig > BigInt(Number.MAX_SAFE_INTEGER)) throw new BadRequestException('El monto calculado supera el rango monetario permitido.');
      const productCents = Number(productCentsBig);
      const deliveryFeeCents = input.delivery && o.branch.deliveryAvailable && o.branch.deliveryFee !== null && (o.branch.minimumFreeDelivery === null || productCents < cents(o.branch.minimumFreeDelivery)) ? cents(o.branch.deliveryFee) : 0;
      if (productCents + deliveryFeeCents > Number.MAX_SAFE_INTEGER) throw new BadRequestException('El total supera el rango monetario permitido.');
      const deliveryKnown = !input.delivery || (o.branch.deliveryAvailable && o.branch.deliveryFee !== null);
      const lat = o.branch.latitude === null ? undefined : Number(o.branch.latitude);
      const lon = o.branch.longitude === null ? undefined : Number(o.branch.longitude);
      const distanceKm = input.latitude !== undefined && lat !== undefined && lon !== undefined ? haversineKm(input.latitude, input.longitude!, lat, lon) : null;
      const totalCents = productCents + deliveryFeeCents;
      return [{ offerId: o.id, supplierId: o.businessId, supplierPhone: o.business.phone, branchId: o.branchId, minimumPackages: o.minimumPackages, stockPackages: o.stockPackages, packagePrice: Number(effectivePrice), regularPackagePrice: Number(o.price), promotionId: promotion?.id ?? null, discount: money((cents(o.price)-cents(effectivePrice))*packagesNeeded), subtotal: money(cents(o.price)*packagesNeeded), minimumAdjusted: packagesNeeded > requestedPackages, supplier: o.business.name, branch: o.branch.name, product: variant.product.name, brand: variant.product.brand?.name ?? null, presentation: variant.label, requestedQuantity: input.quantity, purchasedQuantity: fulfilled, surplus: Number((fulfilled - (input.quantityMode === 'PACKAGES' ? input.quantity * perPackage : input.quantity)).toFixed(3)), packages: packagesNeeded, productCost: money(productCents), deliveryCost: deliveryKnown ? money(deliveryFeeCents) : null, totalCost: deliveryKnown ? money(totalCents) : null, totalStatus: deliveryKnown ? 'ESTIMATED' : 'PENDING_CONFIRMATION', unitPrice: money(Math.round(cents(effectivePrice) / perPackage)), distanceKm: distanceKm === null ? null : Number(distanceKm.toFixed(2)), distanceType: distanceKm === null ? null : 'STRAIGHT_LINE', availability: o.availability, lastUpdated: o.updatedAt.toISOString(), currency: 'PEN', _totalCents: deliveryKnown ? totalCents : null }];
    });
    const complete = choices.filter((x) => x._totalCents !== null);
    const minCost = complete.length ? Math.min(...complete.map((x) => x._totalCents!)) : null;
    const maxCost = complete.length ? Math.max(...complete.map((x) => x._totalCents!)) : null;
    const distances = choices.map((x) => x.distanceKm).filter((x): x is number => x !== null);
    const maxDistance = Math.max(0, ...distances);
    const rawPrice = input.priceWeight ?? 70, rawDistance = input.distanceWeight ?? (100 - rawPrice);
    if (rawPrice + rawDistance <= 0) throw new BadRequestException('Asigna peso a precio o distancia.');
    const pw = Number((rawPrice * 100 / (rawPrice + rawDistance)).toFixed(1));
    const dw = Number((100 - pw).toFixed(1));
    const ranked = choices.map((x) => {
      const priceScore = x._totalCents === null || minCost === null || maxCost === null ? null : maxCost === minCost ? 100 : 100 * (maxCost - x._totalCents) / (maxCost - minCost);
      const distanceScore = x.distanceKm === null ? null : maxDistance === 0 ? 100 : 100 * (maxDistance - x.distanceKm) / maxDistance;
      let numerator = 0, denominator = 0;
      if (priceScore !== null) { numerator += priceScore * pw; denominator += pw; }
      if (distanceScore !== null) { numerator += distanceScore * dw; denominator += dw; }
      const score = denominator && x._totalCents !== null ? Number((numerator / denominator).toFixed(1)) : null;
      return { ...x, score, explanation: x._totalCents === null ? 'Falta confirmar el costo de entrega; no participa en el ranking de costo total.' : `Costo de productos ${x.productCost.toFixed(2)} + entrega ${x.deliveryCost!.toFixed(2)}. Puntuación equilibrada calculada con peso ${pw}% precio y ${dw}% distancia.` };
    });
    const byCost = [...ranked].filter((x) => x._totalCents !== null).sort((a, b) => a._totalCents! - b._totalCents!);
    const byDistance = [...ranked].filter((x) => x.distanceKm !== null).sort((a, b) => a.distanceKm! - b.distanceKm!);
    const byBalance = [...ranked].filter((x) => x.score !== null).sort((a, b) => b.score! - a.score!);
    const publicChoice = (x: typeof ranked[number] | undefined) => x ? { offerId: x.offerId, supplier: x.supplier, totalCost: x.totalCost, distanceKm: x.distanceKm, score: x.score, explanation: x.explanation } : null;
    const ordered = [...ranked].sort((a,b) => (b.score ?? -1) - (a.score ?? -1));
    return { excludedOffers, product: { id: variant.product.id, name: variant.product.name, brand: variant.product.brand?.name ?? null, presentation: variant.label }, requested: { quantity: input.quantity, unit: input.unit, delivery: !!input.delivery, quantityMode: input.quantityMode ?? 'BASE' }, recommendations: { lowestCost: publicChoice(byCost[0]), closest: publicChoice(byDistance[0]), balanced: publicChoice(byBalance[0]) }, offers: ordered.map(({ _totalCents: _hidden, ...visible }) => visible), methodology: { weights: { price: pw, distance: dw }, priceScore: 'Normalización min-max entre ofertas con costo total conocido; menor costo = 100.', distanceScore: 'Normalización min-max entre ofertas con distancia en línea recta conocida; menor distancia = 100.', limitations: ['La distancia es geográfica en línea recta, no distancia por carretera.', 'El precio por unidad solo se calcula dentro de una misma unidad base.', 'No se calcula costo de recojo ni tiempo de viaje.'] } };
  }
}
