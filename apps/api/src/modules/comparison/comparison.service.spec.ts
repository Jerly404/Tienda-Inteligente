import { BadRequestException } from '@nestjs/common';
import { ComparisonService } from './comparison.service';

describe('ComparisonService', () => {
  const variant = { id: 'rice-50', label: 'Saco 50 kg', baseQuantity: 50, baseUnit: 'kg', unitsPerPackage: 1, product: { id: 'rice', name: 'Arroz', brand: { name: 'Costeño' } } };
  const branch = (fee: number, latitude: number) => ({ name: 'Sucursal', latitude, longitude: -78.5, deliveryAvailable: true, deliveryFee: fee, minimumFreeDelivery: null });
  const offers: Array<Record<string, any>> = [
    { id: 'A', price: 185, currency: 'PEN', minimumPackages: 1, stockPackages: 10, availability: 'AVAILABLE', updatedAt: new Date(), expiresAt: null, business: { name: 'Proveedor A' }, branch: branch(15, -7.15) },
    { id: 'B', price: 178, currency: 'PEN', minimumPackages: 1, stockPackages: 10, availability: 'AVAILABLE', updatedAt: new Date(), expiresAt: null, business: { name: 'Proveedor B' }, branch: branch(10, -7.18) },
    { id: 'C', price: 180, currency: 'PEN', minimumPackages: 1, stockPackages: 10, availability: 'AVAILABLE', updatedAt: new Date(), expiresAt: null, business: { name: 'Proveedor C' }, branch: branch(25, -7.17) },
  ];
  function service(rows = offers) {
    const prisma = { productVariant: { findUnique: jest.fn().mockResolvedValue(variant) }, supplierOffer: { findMany: jest.fn().mockResolvedValue(rows) } };
    return new ComparisonService(prisma as never);
  }
  it('calculates product, delivery, nearest and lowest total separately', async () => {
    const result = await service().compare({ variantId: 'rice-50', quantity: 50, unit: 'kg', delivery: true, latitude: -7.15, longitude: -78.5, priceWeight: 65, distanceWeight: 35 });
    expect(result.offers.map((o) => o.totalCost)).toEqual([188, 200, 205]);
    expect(result.recommendations.lowestCost?.supplier).toBe('Proveedor B');
    expect(result.recommendations.closest?.supplier).toBe('Proveedor A');
    expect(result.offers[0].supplier).toBe(result.recommendations.balanced?.supplier);
    expect(result.offers.find((offer) => offer.offerId === 'A')?.distanceKm).toBe(0);
  });
  it('buys whole packages and reports surplus', async () => {
    const result = await service().compare({ variantId: 'rice-50', quantity: 60, unit: 'kg', delivery: false });
    expect(result.offers[0].packages).toBe(2);
    expect(result.offers[0].purchasedQuantity).toBe(100);
    expect(result.offers[0].surplus).toBe(40);
  });
  it('rejects an incompatible unit rather than silently converting', async () => {
    await expect(service().compare({ variantId: 'rice-50', quantity: 1, unit: 'sacos' })).rejects.toBeInstanceOf(BadRequestException);
  });
  it('does not rank offers that lack configured delivery cost as cheapest', async () => {
    const incomplete = [{ ...offers[0], branch: { ...offers[0].branch, deliveryFee: null } }];
    const result = await service(incomplete).compare({ variantId: 'rice-50', quantity: 50, unit: 'kg', delivery: true });
    expect(result.offers[0].totalCost).toBeNull();
    expect(result.recommendations.lowestCost).toBeNull();
  });
  it('keeps an offer with unknown delivery cost out of the convenience recommendation', async () => {
    const incomplete = { ...offers[1], branch: { ...offers[1].branch, latitude: -7.15, deliveryFee: null } };
    const result = await service([offers[0], incomplete]).compare({ variantId: 'rice-50', quantity: 50, unit: 'kg', delivery: true, latitude: -7.15, longitude: -78.5 });
    expect(result.recommendations.balanced?.supplier).toBe('Proveedor A');
    expect(result.offers.find((offer) => offer.supplier === 'Proveedor B')?.score).toBeNull();
  });
  it('compares requested packages without treating 20 packages as 20 kilograms', async () => {
    const result = await service([{...offers[0],stockPackages:30}]).compare({variantId:'rice-50',quantity:20,unit:'kg',quantityMode:'PACKAGES'});
    expect(result.offers[0].packages).toBe(20);
    expect(result.offers[0].purchasedQuantity).toBe(1000);
    expect(result.offers[0].surplus).toBe(0);
    expect(result.offers[0].productCost).toBe(3700);
  });
  it('explains insufficient stock, expired and disabled publications', async () => {
    const result = await service([{...offers[0],stockPackages:0},{...offers[1],active:false},{...offers[2],expiresAt:new Date('2020-01-01')}]).compare({variantId:'rice-50',quantity:50,unit:'kg'});
    expect(result.offers).toHaveLength(0);
    expect(result.excludedOffers).toHaveLength(3);
    expect(result.excludedOffers[0].reasons[0]).toContain('Stock insuficiente');
  });
  it('applies only eligible promotions with exact cent arithmetic', async () => {
    const promotion={id:'promo',active:true,startAt:new Date('2020-01-01'),endAt:new Date('2099-01-01'),minimumPackages:3,promotionalPrice:'0.10'};
    const row={...offers[0],price:'0.30',promotions:[promotion]};
    const before=await service([row]).compare({variantId:'rice-50',quantity:2,unit:'kg',quantityMode:'PACKAGES'});
    const after=await service([row]).compare({variantId:'rice-50',quantity:3,unit:'kg',quantityMode:'PACKAGES'});
    expect(before.offers[0].productCost).toBe(0.60);
    expect(after.offers[0].productCost).toBe(0.30);
    expect(after.offers[0].discount).toBe(0.60);
    expect(after.offers[0].promotionId).toBe('promo');
  });
  it('does not apply expired promotions or stack promotions', async () => {
    const base={active:true,startAt:new Date('2020-01-01'),endAt:new Date('2099-01-01'),minimumPackages:1};
    const result=await service([{...offers[0],promotions:[{...base,id:'expired',endAt:new Date('2020-02-01'),promotionalPrice:1},{...base,id:'valid',promotionalPrice:170},{...base,id:'other',promotionalPrice:175}]}]).compare({variantId:'rice-50',quantity:50,unit:'kg'});
    expect(result.offers[0].productCost).toBe(170);
    expect(result.offers[0].promotionId).toBe('valid');
  });

});
