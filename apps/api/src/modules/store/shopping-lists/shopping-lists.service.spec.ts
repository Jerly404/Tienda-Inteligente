import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ShoppingListsService } from './shopping-lists.service';

describe('ShoppingListsService tenant isolation', () => {
  it('does not return a list owned by another user', async () => {
    const prisma = { shoppingList: { findFirst: jest.fn().mockResolvedValue(null) } };
    const lists = new ShoppingListsService(prisma as never);
    await expect(lists.get('user-a', 'list-of-user-b')).rejects.toBeInstanceOf(NotFoundException);
  });
  it('does not write an item to another user’s list', async () => {
    const prisma = { shoppingList: { findFirst: jest.fn().mockResolvedValue(null) }, productVariant: { findUnique: jest.fn() }, shoppingListItem: { upsert: jest.fn() } };
    const lists = new ShoppingListsService(prisma as never);
    await expect(lists.setItem('user-a', 'list-of-user-b', 'variant-1', 2)).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.productVariant.findUnique).not.toHaveBeenCalled();
    expect(prisma.shoppingListItem.upsert).not.toHaveBeenCalled();
  });
  it('rejects quantity in an incompatible unit', async () => {
    const list = { id: 'list-a', items: [] };
    const prisma = { shoppingList: { findFirst: jest.fn().mockResolvedValue(list) }, productVariant: { findUnique: jest.fn().mockResolvedValue({ id: 'v', baseUnit: 'kg' }) }, shoppingListItem: { upsert: jest.fn() } };
    const lists = new ShoppingListsService(prisma as never);
    await expect(lists.setItem('user-a', 'list-a', 'v', 5, 'saco')).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.shoppingListItem.upsert).not.toHaveBeenCalled();
  });
});
