import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { BusinessesService } from './businesses.service';

describe('BusinessesService access boundaries', () => {
  it('does not let a non-member edit company details', async () => {
    const prisma = { businessMembership: { findUnique: jest.fn().mockResolvedValue(null) }, business: { update: jest.fn() } };
    const service = new BusinessesService(prisma as never);
    await expect(service.update('other-user', 'company', { name: 'Changed' })).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.business.update).not.toHaveBeenCalled();
  });
  it('does not let a read-only member edit company details', async () => {
    const prisma = { businessMembership: { findUnique: jest.fn().mockResolvedValue({ permission: 'VIEWER', business: { id: 'company' } }) }, business: { update: jest.fn() } };
    const service = new BusinessesService(prisma as never);
    await expect(service.update('viewer', 'company', { name: 'Changed' })).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.business.update).not.toHaveBeenCalled();
  });
  it('does not reveal or modify a business without membership', async () => {
    const prisma = { businessMembership: { findUnique: jest.fn().mockResolvedValue(null) }, business: { findMany: jest.fn().mockResolvedValue([]) }, branch: { create: jest.fn() } };
    const service = new BusinessesService(prisma as never);
    await expect(service.createBranch('user-a', 'business-owned-by-b', { name: 'Sucursal' })).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.branch.create).not.toHaveBeenCalled();
  });
  it('blocks store memberships from creating supplier offers', async () => {
    const prisma = { businessMembership: { findUnique: jest.fn().mockResolvedValue({ permission: 'OWNER', business: { id: 'store-1', type: 'STORE', status: 'PENDING' } }) }, supplierOffer: { create: jest.fn() } };
    const service = new BusinessesService(prisma as never);
    await expect(service.createOffer('owner', 'store-1', { branchId: 'b', variantId: 'v', price: 20 })).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.supplierOffer.create).not.toHaveBeenCalled();
  });
  it('updates coordinates only on a branch belonging to the member business', async () => {
    const prisma = {
      businessMembership: { findUnique: jest.fn().mockResolvedValue({ permission: 'OWNER', business: { id: 'supplier-1', type: 'SUPPLIER' } }) },
      branch: { findFirst: jest.fn().mockResolvedValue({ id: 'branch-1', businessId: 'supplier-1' }), update: jest.fn().mockResolvedValue({ id: 'branch-1', latitude: -7.16, longitude: -78.51 }) },
    };
    const service = new BusinessesService(prisma as never);
    await service.updateBranch('owner', 'supplier-1', 'branch-1', { latitude: -7.16, longitude: -78.51 });
    expect(prisma.branch.update).toHaveBeenCalledWith({ where: { id: 'branch-1' }, data: { name: undefined, address: undefined, latitude: -7.16, longitude: -78.51 } });
  });
});
