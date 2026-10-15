import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';

@Injectable()
export class AdminCatalogService {
  constructor(private readonly prisma: PrismaService) {}
  async create(actorId: string, input: { name: string; category?: string; brand?: string; variantLabel: string; baseQuantity: number; baseUnit: string; unitsPerPackage?: number; imageUrl?: string }) {
    return this.prisma.$transaction(async (tx) => {
      const category = input.category ? await tx.category.upsert({ where: { name: input.category.trim() }, update: {}, create: { name: input.category.trim() } }) : undefined;
      const brand = input.brand ? await tx.brand.upsert({ where: { name: input.brand.trim() }, update: {}, create: { name: input.brand.trim() } }) : undefined;
      const product = await tx.product.create({ data: { name: input.name.trim(), imageUrl: input.imageUrl?.trim() || null, categoryId: category?.id, brandId: brand?.id, variants: { create: { label: input.variantLabel.trim(), baseQuantity: input.baseQuantity.toFixed(3), baseUnit: input.baseUnit, unitsPerPackage: input.unitsPerPackage ?? 1 } } }, include: { category: true, brand: true, variants: true } });
      await tx.auditLog.create({ data: { actorId, action: 'MASTER_PRODUCT_CREATED', entityType: 'PRODUCT', entityId: product.id, details: { name: product.name, variantId: product.variants[0]?.id } } });
      return product;
    });
  }
  async setImage(actorId: string, productId: string, imageUrl: string | null) {
    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.update({ where: { id: productId }, data: { imageUrl: imageUrl?.trim() || null } });
      await tx.auditLog.create({ data: { actorId, action: 'MASTER_PRODUCT_IMAGE_UPDATED', entityType: 'PRODUCT', entityId: product.id, details: { imageUrl: product.imageUrl } } });
      return product;
    });
  }
}
