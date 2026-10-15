import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { AuthenticatedRequest, JwtAuthGuard } from '../../../core/auth/jwt-auth.guard';

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async summary(@Req() req: AuthenticatedRequest) {
    const now = new Date();
    const [items, suppliers, offers, catalog] = await Promise.all([
      this.prisma.shoppingListItem.findMany({ where: { list: { ownerId: req.user.sub } }, include: { variant: true } }),
      this.prisma.business.findMany({ where: { type: 'SUPPLIER', status: 'VERIFIED' }, select: { id: true, name: true, createdAt: true, phone: true, branches: { select: { name: true, address: true, latitude: true, longitude: true } } }, orderBy: { name: 'asc' } }),
      this.prisma.supplierOffer.findMany({
        where: { active: true, currency: 'PEN', business: { type: 'SUPPLIER', status: 'VERIFIED' }, variant: { product: { active: true, category: { is: { active: true } } } }, availability: { in: ['AVAILABLE', 'LIMITED'] }, AND: [{ OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] }, { OR: [{ stockPackages: null }, { stockPackages: { gt: 0 } }] }] },
        include: { business: { select: { name: true } }, variant: { include: { product: { select: { name: true, imageUrl: true, category: { select: { name: true } } } } } }, priceHistory: { orderBy: { recordedAt: 'desc' }, take: 2 } },
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.product.findMany({ where: { active: true, category: { is: { active: true } } }, include: { category: true, brand: true, variants: true }, orderBy: { name: 'asc' } }),
    ]);
    const monitored = new Set(items.map(item => item.variantId));
    const available = offers.filter(o => o.stockPackages === null || Number(o.stockPackages) >= o.minimumPackages);
    const comparisons = [...new Set(available.map(o => o.variantId))].flatMap(variantId => {
      const choices = available.filter(o => o.variantId === variantId && o.minimumPackages <= 1).sort((a, b) => Number(a.price) - Number(b.price));
      if (new Set(choices.map(o => o.businessId)).size < 2) return [];
      const best = choices[0];
      return [{ variantId, product: best.variant.product.name, presentation: best.variant.label, supplier: best.business.name, lowest: Number(best.price), highest: Number(choices.at(-1)!.price), suppliers: new Set(choices.map(o => o.businessId)).size, monitored: monitored.has(variantId) }];
    }).sort((a, b) => Number(b.monitored) - Number(a.monitored) || (b.highest - b.lowest) - (a.highest - a.lowest));
    let savingsCents = 0;
    let comparableItems = 0;
    for (const item of items) {
      const content = Number(item.variant.baseQuantity) * item.variant.unitsPerPackage;
      if (content <= 0 || item.unit.toLowerCase() !== item.variant.baseUnit.toLowerCase()) continue;
      const choices = available.filter(o => o.variantId === item.variantId).flatMap(o => {
        const packages = Math.max(o.minimumPackages, Math.ceil(Number(item.quantity) / content));
        if (o.stockPackages !== null && o.stockPackages < packages) return [];
        return [{ supplier: o.businessId, cents: Math.round(Number(o.price) * 100) * packages }];
      });
      if (new Set(choices.map(o => o.supplier)).size < 2) continue;
      const costs = choices.map(o => o.cents);
      savingsCents += Math.max(...costs) - Math.min(...costs);
      comparableItems++;
    }
    const recent = now.getTime() - 7 * 24 * 60 * 60 * 1000;
    const alerts = available.filter(o => monitored.has(o.variantId)).flatMap(o => {
      const [current, previous] = o.priceHistory;
      if (!current || !previous || current.recordedAt.getTime() < recent || Number(current.price) === Number(previous.price)) return [];
      return [{ id: o.id, product: o.variant.product.name, presentation: o.variant.label, supplier: o.business.name, direction: Number(current.price) > Number(previous.price) ? 'UP' : 'DOWN', previous: Number(previous.price), current: Number(current.price), date: current.recordedAt.toISOString() }];
    }).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8);
    return {
      monitoredProducts: monitored.size, activeSuppliers: suppliers.length, currentOffers: available.length,
      estimatedSavings: comparableItems ? savingsCents / 100 : null, comparableItems, plannedItems: items.length,
      savingsBasis: 'Diferencia entre el mayor y el menor costo disponible por producto de tus listas, con cantidades, mínimos y stock. Sin entrega; no representa ahorro realizado. Cada lista se considera una compra independiente.',
      catalog, suppliers, comparisons, alerts,
      offers: available.map(o => ({ id: o.id, businessId: o.businessId, category: o.variant.product.category?.name ?? 'Sin categoría', imageUrl: o.variant.product.imageUrl, stock: o.stockPackages, availability: o.availability, expiresAt: o.expiresAt?.toISOString() ?? null, variantId: o.variantId, product: o.variant.product.name, presentation: o.variant.label, supplier: o.business.name, price: Number(o.price), minimumPackages: o.minimumPackages, updatedAt: o.updatedAt.toISOString() })),
    };
  }
}
