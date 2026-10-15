import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';

@Injectable()
export class BusinessesService {
  constructor(private readonly prisma: PrismaService) {}
  async create(userId: string, input: { name: string; type: 'STORE' | 'SUPPLIER'; taxId?: string; phone?: string }) {
    return this.prisma.business.create({ data: { name: input.name.trim(), type: input.type, taxId: input.taxId, phone: input.phone, memberships: { create: { userId, permission: 'OWNER' } } }, select: { id: true, name: true, type: true, status: true, createdAt: true } });
  }
  async update(userId: string, businessId: string, input: { name: string; phone?: string }) {
    await this.ensureMember(userId, businessId);
    return this.prisma.business.update({ where: { id: businessId }, data: { name: input.name.trim(), phone: input.phone?.trim() || null }, include: { branches: true } });
  }
  mine(userId: string) { return this.prisma.business.findMany({ where: { memberships: { some: { userId } } }, include: { branches: true }, orderBy: { createdAt: 'desc' } }); }
  async setStatus(actorId: string, businessId: string, status: 'VERIFIED' | 'REJECTED' | 'SUSPENDED' | 'PENDING', reason?: string) {
    const business = await this.prisma.business.findUnique({ where: { id: businessId } });
    if (!business) throw new NotFoundException('No se encontró el negocio.');
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.business.update({ where: { id: businessId }, data: { status } });
      await tx.auditLog.create({ data: { actorId, action: 'BUSINESS_STATUS_CHANGED', entityType: 'BUSINESS', entityId: businessId, details: { from: business.status, to: status, reason: reason ?? null } } });
      return updated;
    });
  }
  private async ensureMember(userId: string, businessId: string, requireSupplier = false) {
    const membership = await this.prisma.businessMembership.findUnique({ where: { userId_businessId: { userId, businessId } }, include: { business: true } });
    if (!membership) throw new NotFoundException('No se encontró el negocio.');
    if (requireSupplier && membership.business.type !== 'SUPPLIER') throw new ForbiddenException('Esta acción solo está disponible para proveedores.');
    if (membership.permission !== 'OWNER' && membership.permission !== 'MANAGER') throw new ForbiddenException('No tienes permiso para modificar este negocio.');
    return membership.business;
  }
  async createBranch(userId: string, businessId: string, input: { name: string; address?: string; latitude?: number; longitude?: number; deliveryFee?: number }) {
    await this.ensureMember(userId, businessId);
    if ((input.latitude === undefined) !== (input.longitude === undefined)) throw new BadRequestException('Configura latitud y longitud juntas.');
    return this.prisma.branch.create({ data: { businessId, name: input.name.trim(), address: input.address, latitude: input.latitude, longitude: input.longitude, deliveryAvailable: input.deliveryFee !== undefined, deliveryFee: input.deliveryFee } });
  }
  async updateBranch(userId: string, businessId: string, branchId: string, input: { name?: string; address?: string; latitude?: number; longitude?: number }) {
    await this.ensureMember(userId, businessId);
    if ((input.latitude === undefined) !== (input.longitude === undefined)) throw new BadRequestException('Configura latitud y longitud juntas.');
    const branch = await this.prisma.branch.findFirst({ where: { id: branchId, businessId } });
    if (!branch) throw new NotFoundException('No se encontró esta sucursal en el negocio.');
    return this.prisma.branch.update({ where: { id: branchId }, data: { name: input.name?.trim(), address: input.address, latitude: input.latitude, longitude: input.longitude } });
  }
  async createOffer(userId: string, businessId: string, input: { variantId: string; branchId: string; price: number; minimumPackages?: number; stockPackages?: number }) {
    const business = await this.ensureMember(userId, businessId, true);
    if (business.status === 'SUSPENDED' || business.status === 'REJECTED') throw new ForbiddenException('El estado del negocio no permite publicar ofertas.');
    const branch = await this.prisma.branch.findFirst({ where: { id: input.branchId, businessId } });
    if (!branch) throw new NotFoundException('La sucursal no pertenece a este negocio.');
    const variant = await this.prisma.productVariant.findUnique({ where: { id: input.variantId } });
    if (!variant) throw new NotFoundException('No se encontró la presentación de catálogo.');
    return this.prisma.$transaction(async (tx) => {
      const offer = await tx.supplierOffer.create({ data: { businessId, branchId: input.branchId, variantId: input.variantId, price: input.price.toFixed(2), minimumPackages: input.minimumPackages ?? 1, stockPackages: input.stockPackages, availability: input.stockPackages === 0 ? 'OUT_OF_STOCK' : 'AVAILABLE' } });
      await tx.priceHistory.create({ data: { offerId: offer.id, price: offer.price } });
      return offer;
    });
  }
}
