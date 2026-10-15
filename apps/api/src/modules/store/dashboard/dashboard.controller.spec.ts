import { DashboardController } from './dashboard.controller';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

const variant = { id: 'rice', label: '50 kg', baseQuantity: 50, unitsPerPackage: 1, baseUnit: 'kg', product: { name: 'Arroz' } };
function offer(id: string, price: number, extra = {}) {
  return { id, businessId: id, variantId: 'rice', price, minimumPackages: 1, stockPackages: 10, business: { name: id }, variant, updatedAt: new Date(), priceHistory: [], ...extra };
}
function setup(items: unknown[], offers: unknown[]) {
  const prisma = { product: { findMany: jest.fn().mockResolvedValue([]) }, shoppingListItem: { findMany: jest.fn().mockResolvedValue(items) }, business: { findMany: jest.fn().mockResolvedValue([]) }, supplierOffer: { findMany: jest.fn().mockResolvedValue(offers) } };
  return { controller: new DashboardController(prisma as unknown as PrismaService), prisma };
}
const req = { headers: {}, user: { sub: 'store-a', role: 'OWNER' } };

describe('Store dashboard', () => {
  it('keeps a new store empty without inventing savings or monitored products', async () => {
    const { controller, prisma } = setup([], [offer('A', 180), offer('B', 200)]);
    const result = await controller.summary(req);
    expect(result.monitoredProducts).toBe(0);
    expect(result.estimatedSavings).toBeNull();
    expect(result.alerts).toEqual([]);
    expect(result.comparisons[0]).toMatchObject({ lowest: 180, highest: 200, monitored: false });
    expect(prisma.shoppingListItem.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { list: { ownerId: 'store-a' } } }));
  });
  it('uses planned quantities, minimum orders and sufficient stock when estimating savings', async () => {
    const { controller } = setup([{ variantId: 'rice', quantity: 100, unit: 'kg', variant }], [offer('A', 180), offer('B', 200), offer('C', 100, { minimumPackages: 5 }), offer('D', 1, { stockPackages: 1 })]);
    const result = await controller.summary(req);
    // A: 2 x 180 = 360; B: 2 x 200 = 400; C: 5 x 100 = 500; D lacks stock.
    expect(result.estimatedSavings).toBe(140);
    expect(result.comparableItems).toBe(1);
    expect(result.monitoredProducts).toBe(1);
  });
  it('only alerts on real recent price changes in monitored products', async () => {
    const history = (current: number, previous: number) => [{ price: current, recordedAt: new Date() }, { price: previous, recordedAt: new Date(Date.now() - 86400000) }];
    const { controller } = setup([{ variantId: 'rice', quantity: 50, unit: 'kg', variant }], [offer('A', 180, { priceHistory: history(180, 200) }), offer('B', 210, { priceHistory: history(210, 200) }), offer('C', 190, { variantId: 'other', priceHistory: history(190, 200) }), offer('D', 200, { priceHistory: history(200, 200) })]);
    const result = await controller.summary(req);
    expect(result.alerts).toHaveLength(2);
    expect(result.alerts).toEqual(expect.arrayContaining([expect.objectContaining({ id: 'A', direction: 'DOWN' }), expect.objectContaining({ id: 'B', direction: 'UP' })]));
  });
});
