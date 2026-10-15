import {BadRequestException,ForbiddenException} from '@nestjs/common';
import {SupplierManagementService,validatePromotion} from './supplier-management.service';
import {PrismaService} from '../../infrastructure/database/prisma.service';
const promotion={offerId:'offer',referencePrice:10,promotionalPrice:8,minimumPackages:10,startAt:'2090-01-01T00:00:00Z',endAt:'2090-02-01T00:00:00Z',active:true};
describe('supplier publication boundaries',()=>{
 it('rejects buyer role before querying a business',async()=>{const findUnique=jest.fn();const service=new SupplierManagementService({businessMembership:{findUnique}} as unknown as PrismaService);await expect(service.owned({sub:'buyer',role:'OWNER'},'supplier')).rejects.toThrow(ForbiddenException);expect(findUnique).not.toHaveBeenCalled();});
 it('rejects a supplier without management permission',async()=>{const service=new SupplierManagementService({businessMembership:{findUnique:jest.fn().mockResolvedValue({permission:'VIEWER',business:{type:'SUPPLIER',status:'VERIFIED'}})}} as unknown as PrismaService);await expect(service.owned({sub:'supplier',role:'SUPPLIER'},'other')).rejects.toThrow(ForbiddenException);});
 it('rejects suspended company even for its owner',async()=>{const service=new SupplierManagementService({businessMembership:{findUnique:jest.fn().mockResolvedValue({permission:'OWNER',business:{type:'SUPPLIER',status:'SUSPENDED'}})}} as unknown as PrismaService);await expect(service.owned({sub:'supplier',role:'SUPPLIER'},'own')).rejects.toThrow(ForbiddenException);});
 it('accepts backed promotion and rejects fabricated discounts',()=>{expect(()=>validatePromotion(promotion,10)).not.toThrow();expect(()=>validatePromotion(promotion,9)).toThrow(BadRequestException);expect(()=>validatePromotion({...promotion,promotionalPrice:11},10)).toThrow(BadRequestException);});
 it('rejects reversed or expired dates',()=>{expect(()=>validatePromotion({...promotion,endAt:'2080-01-01T00:00:00Z'},10)).toThrow(BadRequestException);expect(()=>validatePromotion({...promotion,startAt:'2020-01-01T00:00:00Z',endAt:'2020-02-01T00:00:00Z'},10)).toThrow(BadRequestException);});
});
