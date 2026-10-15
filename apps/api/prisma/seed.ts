import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const suppliers = [
  { name: 'Proveedor A (DEMO)', fee: 15, latitude: -7.15, longitude: -78.5 },
  { name: 'Proveedor B (DEMO)', fee: 10, latitude: -7.18, longitude: -78.52 },
  { name: 'Proveedor C (DEMO)', fee: 25, latitude: -7.17, longitude: -78.49 },
  { name: 'Proveedor D (DEMO)', fee: 12, latitude: -7.142, longitude: -78.525 },
  { name: 'Proveedor E (DEMO)', fee: 18, latitude: -7.19, longitude: -78.5 },
  { name: 'Proveedor F (DEMO)', fee: 9, latitude: -7.135, longitude: -78.493 },
  { name: 'Proveedor G (DEMO)', fee: 20, latitude: -7.174, longitude: -78.541 },
  { name: 'Proveedor H (DEMO)', fee: 14, latitude: -7.16, longitude: -78.474 },
  { name: 'Proveedor I (DEMO)', fee: 16, latitude: -7.198, longitude: -78.527 },
  { name: 'Proveedor J (DEMO)', fee: 11, latitude: -7.128, longitude: -78.514 },
  { name: 'Proveedor K (DEMO)', fee: 22, latitude: -7.166, longitude: -78.505 },
];
const products = [
  { category: 'Abarrotes', name: 'Arroz (DEMO)', variant: 'Saco de 50 kg (DEMO)', quantity: 50, unit: 'kg', prices: [185, 178, 180], stock: 50 },
  { category: 'Abarrotes', name: 'Arroz extra (DEMO)', variant: 'Bolsa de 5 kg (DEMO)', quantity: 5, unit: 'kg', prices: [22.9, 21.8, 23.2], stock: 30 },
  { category: 'Abarrotes', name: 'Azúcar rubia (DEMO)', variant: 'Bolsa de 1 kg (DEMO)', quantity: 1, unit: 'kg', prices: [4.1, 4.4, 4.05], stock: 30 },
  { category: 'Abarrotes', name: 'Aceite vegetal (DEMO)', variant: 'Botella de 1 L (DEMO)', quantity: 1, unit: 'L', prices: [9.2, 8.9, 9.5], stock: 30 },
  { category: 'Abarrotes', name: 'Fideos spaghetti (DEMO)', variant: 'Paquete de 500 g (DEMO)', quantity: 0.5, unit: 'kg', prices: [2.6, 2.75, 2.55], stock: 30 },
  { category: 'Bebidas', name: 'Agua mineral (DEMO)', variant: 'Paquete de 6 botellas de 2 L (DEMO)', quantity: 12, unit: 'L', prices: [18.5, 16.9, 17.8], stock: 40 },
  { category: 'Abarrotes', name: 'Leche evaporada (DEMO)', variant: 'Lata de 400 g (DEMO)', quantity: 0.4, unit: 'kg', prices: [4.4, 4.2, 4.5], stock: 40 },
  { category: 'Abarrotes', name: 'Atún en conserva (DEMO)', variant: 'Lata de 170 g (DEMO)', quantity: 0.17, unit: 'kg', prices: [5.3, 4.9, 5.1], stock: 35 },
  { category: 'Abarrotes', name: 'Sal yodada (DEMO)', variant: 'Bolsa de 1 kg (DEMO)', quantity: 1, unit: 'kg', prices: [2.2, 2.0, 2.3], stock: 35 },
  { category: 'Abarrotes', name: 'Lentejas (DEMO)', variant: 'Bolsa de 1 kg (DEMO)', quantity: 1, unit: 'kg', prices: [5.8, 6.0, 5.5], stock: 30 },
  { category: 'Abarrotes', name: 'Frejol canario (DEMO)', variant: 'Bolsa de 1 kg (DEMO)', quantity: 1, unit: 'kg', prices: [6.5, 6.1, 6.7], stock: 30 },
  { category: 'Abarrotes', name: 'Harina sin preparar (DEMO)', variant: 'Bolsa de 1 kg (DEMO)', quantity: 1, unit: 'kg', prices: [4.0, 3.8, 4.1], stock: 25 },
  { category: 'Bebidas', name: 'Gaseosa familiar (DEMO)', variant: 'Botella de 3 L (DEMO)', quantity: 3, unit: 'L', prices: [8.5, 8.2, 8.7], stock: 25 },
  { category: 'Bebidas', name: 'Yogur bebible (DEMO)', variant: 'Botella de 1 L (DEMO)', quantity: 1, unit: 'L', prices: [6.5, 6.7, 6.2], stock: 20 },
  { category: 'Limpieza', name: 'Detergente para ropa (DEMO)', variant: 'Bolsa de 2 kg (DEMO)', quantity: 2, unit: 'kg', prices: [14.9, 14.5, 15.2], stock: 20 },
  { category: 'Limpieza', name: 'Lavavajilla líquido (DEMO)', variant: 'Botella de 750 ml (DEMO)', quantity: 0.75, unit: 'L', prices: [5.0, 4.8, 5.2], stock: 25 },
  { category: 'Limpieza', name: 'Lejía (DEMO)', variant: 'Botella de 1 L (DEMO)', quantity: 1, unit: 'L', prices: [4.2, 4.0, 4.1], stock: 25 },
  { category: 'Cuidado personal', name: 'Papel higiénico (DEMO)', variant: 'Paquete de 4 rollos (DEMO)', quantity: 4, unit: 'un', prices: [7.0, 6.8, 7.2], stock: 30 },
  { category: 'Cuidado personal', name: 'Jabón de tocador (DEMO)', variant: 'Paquete de 3 unidades (DEMO)', quantity: 3, unit: 'un', prices: [8.0, 8.4, 7.9], stock: 20 },
  { category: 'Snacks', name: 'Galletas de soda (DEMO)', variant: 'Paquete de 6 unidades (DEMO)', quantity: 6, unit: 'un', prices: [6.2, 6.0, 6.4], stock: 25 },
];

async function ensureProduct(input: (typeof products)[number], categoryId: string) {
  let product = await prisma.product.findFirst({ where: { name: input.name }, include: { variants: true } });
  if (!product) product = await prisma.product.create({ data: { name: input.name, categoryId, variants: { create: { label: input.variant, baseQuantity: input.quantity, baseUnit: input.unit } } }, include: { variants: true } });
  else if (product.categoryId !== categoryId) product = await prisma.product.update({ where: { id: product.id }, data: { categoryId }, include: { variants: true } });
  let variant = product.variants.find(item => item.label === input.variant);
  if (!variant) variant = await prisma.productVariant.create({ data: { productId: product.id, label: input.variant, baseQuantity: input.quantity, baseUnit: input.unit } });
  return { ...product, variants: [variant] };
}

async function main() {
  if (process.env.DEMO_SEED !== 'true') throw new Error('Seed de demostración desactivado. Configura DEMO_SEED=true de forma explícita. No utilizar en producción.');
  const categories = new Map<string,string>();
  for (const name of [...new Set(products.map(item => item.category))]) {
    const category = await prisma.category.upsert({ where: { name: `${name} (DEMO)` }, update: {}, create: { name: `${name} (DEMO)` } });
    categories.set(name, category.id);
  }
  const businesses = [];
  for (const item of suppliers) {
    let business = await prisma.business.findFirst({ where: { name: item.name, type: 'SUPPLIER' } });
    if (!business) business = await prisma.business.create({ data: { name: item.name, type: 'SUPPLIER', status: 'VERIFIED' } });
    else if (business.status !== 'VERIFIED') business = await prisma.business.update({ where: { id: business.id }, data: { status: 'VERIFIED' } });
    let branch = await prisma.branch.findFirst({ where: { businessId: business.id, name: 'Sucursal de prueba' } });
    const branchData = { address: 'Ubicación ficticia, Cajamarca (DEMO)', latitude: item.latitude, longitude: item.longitude, deliveryAvailable: true, deliveryFee: item.fee };
    if (!branch) branch = await prisma.branch.create({ data: { businessId: business.id, name: 'Sucursal de prueba', ...branchData } });
    else branch = await prisma.branch.update({ where: { id: branch.id }, data: branchData });
    businesses.push({ business, branch });
  }
  let offerCount = 0;
  for (const [productIndex, definition] of products.entries()) {
    const product = await ensureProduct(definition, categories.get(definition.category)!);
    const variant = product.variants[0];
    for (const [supplierIndex, supplier] of suppliers.entries()) {
      const { business, branch } = businesses[supplierIndex];
      const basePrice = definition.prices[supplierIndex % definition.prices.length];
      const variation = supplierIndex < 3 ? 1 : 0.96 + ((supplierIndex % 5) * 0.02) + ((productIndex % 3) * 0.002);
      const price = (basePrice * variation).toFixed(2);
      const existing = await prisma.supplierOffer.findFirst({ where: { businessId: business.id, variantId: variant.id } });
      if (!existing) {
        const offer = await prisma.supplierOffer.create({ data: { businessId: business.id, branchId: branch.id, variantId: variant.id, price, stockPackages: definition.stock, availability: 'AVAILABLE' } });
        await prisma.priceHistory.create({ data: { offerId: offer.id, price: offer.price } });
      } else if (existing.price.toFixed(2) !== price || existing.stockPackages !== definition.stock) {
        const offer = await prisma.supplierOffer.update({ where: { id: existing.id }, data: { branchId: branch.id, price, stockPackages: definition.stock, availability: 'AVAILABLE' } });
        await prisma.priceHistory.create({ data: { offerId: offer.id, price: offer.price } });
      }
      const seededOffer = await prisma.supplierOffer.findFirst({ where: { businessId: business.id, variantId: variant.id } });
      if (seededOffer) {
        const history = await prisma.priceHistory.findMany({ where: { offerId: seededOffer.id }, orderBy: { recordedAt: 'desc' }, take: 2 });
        if (history.length < 2) {
          const previousPrice = (Number(seededOffer.price) * 1.04).toFixed(2);
          const previousAt = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
          if (history[0]) await prisma.priceHistory.update({ where: { id: history[0].id }, data: { price: previousPrice, recordedAt: previousAt } });
          else await prisma.priceHistory.create({ data: { offerId: seededOffer.id, price: previousPrice, recordedAt: previousAt } });
          await prisma.priceHistory.create({ data: { offerId: seededOffer.id, price: seededOffer.price, recordedAt: new Date() } });
        }
      }
      offerCount++;
    }
  }
  console.info(`Seed DEMO listo: ${products.length} productos de ${categories.size} categorías y ${offerCount} ofertas en ${businesses.length} proveedores. Los nombres, ubicaciones y precios son ficticios.`);
}

main().finally(() => prisma.$disconnect());
