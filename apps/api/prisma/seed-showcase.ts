import { Prisma, PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();
const DEMO_PASSWORD = 'TiendaDemo#2026';
const categories = [
  { name: 'Abarrotes', products: ['Arroz extra', 'Azúcar rubia', 'Aceite vegetal', 'Fideos spaghetti', 'Harina sin preparar', 'Sal yodada', 'Lenteja seleccionada', 'Frejol canario', 'Avena tradicional', 'Quinua perlada'] },
  { name: 'Lácteos', products: ['Leche evaporada', 'Leche UHT', 'Yogur natural', 'Queso fresco', 'Mantequilla con sal', 'Leche en polvo', 'Queso edam', 'Crema de leche', 'Yogur bebible', 'Queso mozzarella'] },
  { name: 'Bebidas', products: ['Agua sin gas', 'Agua con gas', 'Gaseosa cola', 'Gaseosa naranja', 'Jugo de durazno', 'Bebida energizante', 'Néctar de mango', 'Café instantáneo', 'Té filtrante', 'Refresco de cebada'] },
  { name: 'Limpieza', products: ['Detergente para ropa', 'Lavavajilla líquido', 'Lejía tradicional', 'Limpiador multiuso', 'Suavizante de ropa', 'Jabón para ropa', 'Desinfectante de pisos', 'Esponja multiuso', 'Limpiavidrios', 'Bolsas para residuos'] },
  { name: 'Conservas', products: ['Atún en agua', 'Atún en aceite', 'Sardina en tomate', 'Durazno en almíbar', 'Arveja en conserva', 'Choclo desgranado', 'Frejol en conserva', 'Leche de coco', 'Piña en rodajas', 'Champiñones laminados'] },
  { name: 'Cuidado personal', products: ['Papel higiénico', 'Jabón de tocador', 'Shampoo familiar', 'Pasta dental', 'Toallas higiénicas', 'Pañal infantil', 'Desodorante', 'Acondicionador', 'Cepillo dental', 'Papel toalla'] },
  { name: 'Snacks', products: ['Galletas de soda', 'Galletas dulces', 'Papas fritas', 'Chifles salados', 'Maní tostado', 'Caramelos surtidos', 'Chocolate de mesa', 'Wafer relleno', 'Palitos de maíz', 'Pasas seleccionadas'] },
  { name: 'Panadería', products: ['Premezcla para torta', 'Levadura seca', 'Harina pastelera', 'Cocoa en polvo', 'Grageas de colores', 'Esencia de vainilla', 'Polvo de hornear', 'Mermelada de fresa', 'Manjar blanco', 'Gelatina sin sabor'] },
  { name: 'Mascotas', products: ['Alimento para perro adulto', 'Alimento para gato adulto', 'Arena sanitaria', 'Alimento para cachorro', 'Alimento para gatito', 'Galletas para perro', 'Shampoo para mascotas', 'Comedero plástico', 'Alimento para aves', 'Snacks para gato'] },
  { name: 'Desechables', products: ['Vaso descartable', 'Plato descartable', 'Cubiertos descartables', 'Envase para alimentos', 'Papel aluminio', 'Film plástico', 'Servilletas', 'Bolsa camiseta', 'Guantes descartables', 'Tapa para vaso'] },
];
const packageOptions = [
  { label: 'Saco de 25 kg', quantity: 25, unit: 'kg' }, { label: 'Bolsa de 1 kg', quantity: 1, unit: 'kg' },
  { label: 'Botella de 1 L', quantity: 1, unit: 'L' }, { label: 'Paquete de 500 g', quantity: .5, unit: 'kg' },
  { label: 'Caja de 12 unidades', quantity: 12, unit: 'un' }, { label: 'Paquete de 6 unidades', quantity: 6, unit: 'un' },
  { label: 'Bolsa de 2 kg', quantity: 2, unit: 'kg' }, { label: 'Botella de 750 ml', quantity: .75, unit: 'L' },
  { label: 'Paquete de 4 unidades', quantity: 4, unit: 'un' }, { label: 'Caja de 24 unidades', quantity: 24, unit: 'un' },
];
const names = ['Andina', 'Sierra', 'Comercial', 'Norte', 'Cajamarca', 'Abastece', 'Mercantil', 'Valle', 'Central', 'Unión'];
const directions = ['Av. Atahualpa', 'Jr. Silva Santisteban', 'Av. Hoyos Rubio', 'Jr. Amalia Puga', 'Av. Vía de Evitamiento', 'Jr. Dos de Mayo', 'Av. Perú', 'Jr. Amazonas', 'Av. Independencia', 'Jr. Junín'];
const districts = ['Cajamarca', 'Baños del Inca', 'Llacanora', 'Jesús', 'La Encañada'];

function rucWithCheckDigit(firstTen: string) {
  const weights = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  const check = 11 - weights.reduce((sum, weight, i) => sum + Number(firstTen[i]) * weight, 0) % 11;
  return firstTen + String(check === 10 ? 0 : check === 11 ? 1 : check);
}

function assertDemoDatabase() {
  if (process.env.DEMO_SEED !== 'true') throw new Error('Operación cancelada: configura DEMO_SEED=true para habilitar la carga de demostración.');
  const url = new URL(process.env.DATABASE_URL ?? '');
  if (!['localhost', '127.0.0.1', '::1'].includes(url.hostname) || !['/tienda_inteligente', '/tienda_inteligente_demo'].includes(url.pathname)) {
    throw new Error('Operación cancelada: este seed solo puede ejecutarse en la base local tienda_inteligente.');
  }
}

async function main() {
  assertDemoDatabase();
  const passwordHash = await argon2.hash(DEMO_PASSWORD, { type: argon2.argon2id });
  const productCount = categories.reduce((total, category) => total + category.products.length, 0);

  await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`TRUNCATE TABLE "QuotationResponseItem", "QuotationResponse", "QuotationRequestItem", "QuotationRequest", "PurchaseItem", "Purchase", "SavedComparison", "Notification", "Favorite", "ShoppingListItem", "ShoppingList", "PriceHistory", "Promotion", "SupplierOffer", "ProductVariant", "Product", "Brand", "Category", "Branch", "BusinessMembership", "Business", "ProductRequest", "PasswordResetToken", "UserPreference", "AuditLog", "User" RESTART IDENTITY CASCADE`);

    const categoryRows = await Promise.all(categories.map((item) => tx.category.create({ data: { name: `${item.name} · DEMO`, description: 'Categoría con contenido ficticio para demostración.' } })));
    const brands = await Promise.all(Array.from({ length: 20 }, (_, i) => tx.brand.create({ data: { name: `Marca Demostrativa ${String(i + 1).padStart(2, '0')}` } })));
    const variants: Array<{ id: string; productName: string }> = [];
    for (const [categoryIndex, category] of categories.entries()) {
      for (const [itemIndex, item] of category.products.entries()) {
        const index = categoryIndex * 10 + itemIndex;
        const pack = packageOptions[index % packageOptions.length];
        const product = await tx.product.create({ data: {
          name: `${item} DEMO ${String(index + 1).padStart(3, '0')}`,
          description: 'Producto ficticio de catálogo para capturas y pruebas de Tienda Inteligente.',
          categoryId: categoryRows[categoryIndex].id,
          brandId: brands[index % brands.length].id,
          variants: { create: { label: `${pack.label} · DEMO`, baseQuantity: pack.quantity, baseUnit: pack.unit } },
        }, include: { variants: true } });
        variants.push({ id: product.variants[0].id, productName: product.name });
      }
    }

    const businesses: Array<{ id: string; branchId: string }> = [];
    const storeUser = await tx.user.create({ data: { email: 'bodega.demo@tiendainteligente.test', name: 'Administradora Bodega DEMO', passwordHash, role: 'OWNER' } });
    const store = await tx.business.create({ data: {
      name: 'Bodega Demo Cajamarca', legalName: 'Bodega Demo Cajamarca S.A.C. · DEMO', taxId: rucWithCheckDigit('2060000000'), type: 'STORE', status: 'VERIFIED', phone: '+51987654001', description: 'Tienda de demostración para capturas del proyecto académico.',
      memberships: { create: { userId: storeUser.id, permission: 'OWNER' } },
      branches: { create: { name: 'Bodega Demo Cajamarca', address: 'Jr. Comercio 123 · Ubicación DEMO', department: 'Cajamarca', province: 'Cajamarca', district: 'Cajamarca', latitude: -7.1617, longitude: -78.5128, deliveryAvailable: false } },
    } });
    await tx.userPreference.create({ data: { userId: storeUser.id, data: { radiusKm: 20, sort: 'price', pageSize: 20, currency: 'PEN', priceDrops: true, priceRises: true, promotions: true, expiringPromotions: true, availability: true } } });

    for (let i = 0; i < 50; i++) {
      const serial = String(i + 1).padStart(2, '0');
      const email = i === 0 ? 'distribuidora.demo@tiendainteligente.test' : `proveedor.demo.${serial}@tiendainteligente.test`;
      const owner = await tx.user.create({ data: { email, name: `Responsable Distribuidora DEMO ${serial}`, passwordHash, role: 'SUPPLIER' } });
      const firstTen = String(2060000001 + i).padStart(10, '0');
      const district = districts[i % districts.length];
      const latitude = -7.16 + ((i % 10) - 4.5) * .008 + Math.floor(i / 10) * .001;
      const longitude = -78.51 + (Math.floor(i / 10) - 2) * .009 + ((i % 5) - 2) * .001;
      const business = await tx.business.create({ data: {
        name: `Distribuidora ${names[i % names.length]} ${serial} · DEMO`, legalName: `Comercializadora Demo ${serial} S.A.C.`, taxId: rucWithCheckDigit(firstTen),
        type: 'SUPPLIER', status: 'VERIFIED', phone: `+5198${String(7000000 + i * 137).padStart(7, '0')}`,
        description: `Proveedor ficticio de abarrotes y productos de consumo para demostración (${serial}).`, hours: 'Lun–Sáb, 08:00–18:00',
        deliveryZones: `${district} y alrededores · DEMO`, paymentMethods: 'Efectivo, Transferencia, Yape, Plin', minimumOrder: (80 + (i % 9) * 25).toFixed(2),
        memberships: { create: { userId: owner.id, permission: 'OWNER' } },
        branches: { create: { name: `Local principal DEMO ${serial}`, address: `${directions[i % directions.length]} ${100 + i * 7} · ${district} · Ubicación DEMO`, department: 'Cajamarca', province: 'Cajamarca', district, latitude, longitude, deliveryAvailable: i % 7 !== 0, deliveryFee: (5 + (i % 8) * 1.75).toFixed(2), minimumFreeDelivery: (250 + (i % 5) * 50).toFixed(2) } },
      }, include: { branches: true } });
      businesses.push({ id: business.id, branchId: business.branches[0].id });
    }

    const offerRows: Prisma.SupplierOfferCreateManyInput[] = [];
    for (const [supplierIndex, supplier] of businesses.entries()) {
      for (const [productIndex, variant] of variants.entries()) {
        const baseline = 3.4 + (productIndex % 10) * 1.85 + Math.floor(productIndex / 10) * .62;
        const priceFactor = .82 + ((supplierIndex * 13 + productIndex * 7) % 37) / 100;
        offerRows.push({ businessId: supplier.id, branchId: supplier.branchId, variantId: variant.id, price: (baseline * priceFactor).toFixed(2), currency: 'PEN', minimumPackages: 1 + ((supplierIndex + productIndex) % 4 === 0 ? 1 : 0), stockPackages: 12 + ((supplierIndex * 17 + productIndex * 11) % 180), availability: (supplierIndex + productIndex) % 41 === 0 ? 'LIMITED' : 'AVAILABLE', active: true });
      }
    }
    await tx.supplierOffer.createMany({ data: offerRows });
    const offers = await tx.supplierOffer.findMany({ select: { id: true, businessId: true, variantId: true, price: true } });
    const now = Date.now();
    const histories: Prisma.PriceHistoryCreateManyInput[] = [];
    for (const [index, offer] of offers.entries()) {
      const current = Number(offer.price);
      const variation = ((index % 9) + 1) / 100;
      const previous = current * (index % 2 === 0 ? 1 + variation : 1 - variation);
      histories.push({ offerId: offer.id, price: previous.toFixed(2), recordedAt: new Date(now - (2 + index % 5) * 86400000) });
      histories.push({ offerId: offer.id, price: current.toFixed(2), recordedAt: new Date(now - (index % 6) * 60000) });
    }
    await tx.priceHistory.createMany({ data: histories });

    await tx.shoppingList.create({ data: { ownerId: storeUser.id, name: 'Compra semanal · DEMO', items: { create: variants.slice(0, 12).map((variant, i) => ({ variantId: variant.id, quantity: 6 + (i % 8) * 2, unit: packageOptions[i % packageOptions.length].unit })) } } });
    await tx.favorite.createMany({ data: variants.slice(0, 12).map((variant) => ({ userId: storeUser.id, variantId: variant.id })) });

    const promoOffers = offers.filter((_, i) => i % 20 === 0).slice(0, 240);
    await tx.promotion.createMany({ data: promoOffers.map((offer, i) => {
      const reference = Number(offer.price) * 1.12;
      return { offerId: offer.id, type: 'PERCENT', referencePrice: reference.toFixed(2), promotionalPrice: offer.price, minimumPackages: 2 + (i % 4), startAt: new Date(now - 86400000), endAt: new Date(now + (2 + i % 12) * 86400000), active: true, conditions: `Precio especial desde ${2 + (i % 4)} paquetes · promoción DEMO` };
    }) });

    const [userCount, businessCount, supplierCount, branchCount, categoryCount, brandCount, catalogCount, variantCount, offerCount, historyCount] = await Promise.all([
      tx.user.count(), tx.business.count(), tx.business.count({ where: { type: 'SUPPLIER' } }), tx.branch.count(), tx.category.count(), tx.brand.count(), tx.product.count(), tx.productVariant.count(), tx.supplierOffer.count(), tx.priceHistory.count(),
    ]);
    const actual = [userCount, businessCount, supplierCount, branchCount, categoryCount, brandCount, catalogCount, variantCount, offerCount, historyCount];
    const expected = [51, 51, 50, 51, 10, 20, productCount, productCount, 5000, 10000];
    if (actual.some((count, i) => count !== expected[i])) throw new Error(`Verificación DEMO fallida. Esperado ${expected.join(',')}; recibido ${actual.join(',')}. Se revertirá la transacción.`);
  }, { maxWait: 15000, timeout: 120000 });

  console.info('Base de datos de demostración preparada: 1 tienda, 50 proveedores, 100 productos y 5,000 ofertas. Todo el contenido comercial lleva identificación DEMO y es ficticio.');
  console.info(`Acceso tienda: bodega.demo@tiendainteligente.test / ${DEMO_PASSWORD}`);
  console.info(`Acceso proveedor 01: distribuidora.demo@tiendainteligente.test / ${DEMO_PASSWORD}`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
