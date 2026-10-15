import { ShoppingListsService } from './shopping-lists.service';

describe('Shopping list sourcing strategies', () => {
  const variant1={id:'v1',label:'Bolsa 1 kg',baseQuantity:1,unitsPerPackage:1,baseUnit:'kg',product:{name:'Arroz'}};
  const variant2={id:'v2',label:'Bolsa 1 kg',baseQuantity:1,unitsPerPackage:1,baseUnit:'kg',product:{name:'Azúcar'}};
  const list={id:'list-1',items:[{id:'i1',variantId:'v1',quantity:1,unit:'kg',variant:variant1},{id:'i2',variantId:'v2',quantity:1,unit:'kg',variant:variant2}]};
  const offer=(id:string,variantId:string,supplier:string,price:number,fee:number)=>({id,variantId,businessId:supplier,price,minimumPackages:1,stockPackages:5,availability:'AVAILABLE',currency:'PEN',expiresAt:null,business:{name:supplier,status:'VERIFIED'},branchId:supplier,branch:{name:`Sucursal ${supplier}`,deliveryAvailable:true,deliveryFee:fee,minimumFreeDelivery:null}});
  function makeService() {
    const prisma={shoppingList:{findFirst:jest.fn().mockResolvedValue(list)},supplierOffer:{findMany:jest.fn().mockResolvedValue([offer('a1','v1','A',100,10),offer('a2','v2','A',100,10),offer('b1','v1','B',50,5),offer('b2','v2','B',120,5)])}};
    return new ShoppingListsService(prisma as never);
  }
  it('charges delivery once per selected branch and finds an exact split for small lists',async()=>{
    const result=await makeService().compare('owner','list-1',true);
    expect(result.singleSupplier?.total).toBe(175);
    expect(result.splitPurchase?.total).toBe(165);
    expect(result.splitPurchase?.optimal).toBe(true);
    expect(result.splitPurchase?.providers).toHaveLength(2);
    expect(result.splitPurchase?.assignments).toHaveLength(2);
    expect(result.splitPurchase?.assignments.map(item=>item.supplier)).toEqual(['B','A']);
    expect(result.singleSupplier?.assignments).toHaveLength(2);
    expect(result.comparison?.splitCanReduceTotal).toBe(true);
  });
});
