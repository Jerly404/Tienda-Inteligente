import { ConflictException, NotFoundException } from '@nestjs/common';
import { QuotationsService } from './quotations.service';

describe('QuotationsService ownership and transitions',()=>{
  it('hides another buyer’s request',async()=>{
    const prisma={quotationRequest:{findFirst:jest.fn().mockResolvedValue(null)}};
    const service=new QuotationsService(prisma as never);
    await expect(service.getBuyerRequest('buyer-a','request-b')).rejects.toBeInstanceOf(NotFoundException);
  });
  it('does not let a non-member supplier answer a request',async()=>{
    const prisma={quotationRequest:{findUnique:jest.fn().mockResolvedValue({id:'request',supplierBusinessId:'supplier-b',items:[],status:'SENT'})},businessMembership:{findUnique:jest.fn().mockResolvedValue(null)}};
    const service=new QuotationsService(prisma as never);
    await expect(service.respond('user-a','request',{items:[{requestItemId:'item',packagePrice:10,offeredPackages:1}]})).rejects.toBeInstanceOf(NotFoundException);
  });
  it('only accepts a response after the supplier has replied',async()=>{
    const prisma={quotationRequest:{findFirst:jest.fn().mockResolvedValue({id:'request',buyerId:'buyer',status:'SENT'})},quotationResponse:{findFirst:jest.fn()}};
    const service=new QuotationsService(prisma as never);
    await expect(service.accept('buyer','request','response')).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.quotationResponse.findFirst).not.toHaveBeenCalled();
  });
});
