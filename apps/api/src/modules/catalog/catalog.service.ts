import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';

type SupplierMapLocation = {
  supplierId: string; supplier: string; branchId: string; branch: string; address: string | null;
  latitude: number | null; longitude: number | null; distanceKm: number | null;
  distanceType: 'STRAIGHT_LINE' | null; status: 'UBICADA' | 'SIN_UBICACION';
};

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}
  search(q: string) {
    return this.prisma.product.findMany({
      where: { active: true, ...(q.trim() ? { OR: [{ name: { contains: q.trim(), mode: 'insensitive' } }, { brand: { name: { contains: q.trim(), mode: 'insensitive' } } }] } : {}) },
      include: { brand: true, category: true, variants: { orderBy: { label: 'asc' } } },
      take: 30, orderBy: { name: 'asc' },
    });
  }
  async globalSearch(q:string){
    const query=q.trim().slice(0,100);
    if(query.length<2)return {products:[],suppliers:[]};
    const [products,suppliers]=await Promise.all([
      this.prisma.product.findMany({where:{active:true,OR:[{name:{contains:query,mode:'insensitive'}},{brand:{name:{contains:query,mode:'insensitive'}}}]},include:{brand:true,category:true,variants:{take:3,orderBy:{label:'asc'}}},take:6,orderBy:{name:'asc'}}),
      this.prisma.business.findMany({where:{type:'SUPPLIER',status:'VERIFIED',OR:[{name:{contains:query,mode:'insensitive'}},{offers:{some:{active:true,availability:{in:['AVAILABLE','LIMITED']},variant:{product:{name:{contains:query,mode:'insensitive'}}}}}}]},select:{id:true,name:true,branches:{where:{latitude:{not:null},longitude:{not:null}},select:{name:true,address:true,latitude:true,longitude:true},take:1}},take:5,orderBy:{name:'asc'}}),
    ]);
    return {products:products.map(p=>({id:p.id,name:p.name,brand:p.brand?.name??null,category:p.category?.name??null,variants:p.variants})),suppliers:suppliers.map(s=>({id:s.id,name:s.name,branch:s.branches[0]?.name??null,address:s.branches[0]?.address??null,latitude:s.branches[0]?.latitude??null,longitude:s.branches[0]?.longitude??null}))};
  }
  offers(variantId?: string) {
    return this.prisma.supplierOffer.findMany({
      where: { active: true, ...(variantId ? { variantId } : {}), currency: 'PEN', availability: { in: ['AVAILABLE', 'LIMITED'] }, AND: [{ OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] }, { OR: [{ stockPackages: null }, { stockPackages: { gt: 0 } }] }], business: { type: 'SUPPLIER', status: 'VERIFIED' }, variant: { product: { active: true, category: { is: { active: true } } } } }, include: { business: true, branch: true, variant: { include: { product: { include: { brand: true } } } } },
      orderBy: { updatedAt: 'desc' }, take: 100,
    });
  }
  async supplierLocations(latitude?: number, longitude?: number) {
    const suppliers = await this.prisma.business.findMany({
      where: { type: 'SUPPLIER', status: 'VERIFIED' },
      select: { id: true, name: true, branches: { where: { latitude: { not: null }, longitude: { not: null } }, select: { id: true, name: true, address: true, latitude: true, longitude: true } } },
      orderBy: { name: 'asc' },
    });
    const locations: SupplierMapLocation[] = [];
    for (const supplier of suppliers) {
      if (!supplier.branches.length) {
        locations.push({ supplierId: supplier.id, supplier: supplier.name, branchId: supplier.id, branch: 'Sin sucursal ubicada', address: null, latitude: null, longitude: null, distanceKm: null, distanceType: null, status: 'SIN_UBICACION' });
        continue;
      }
      for (const branch of supplier.branches) {
        const lat = Number(branch.latitude);
        const lon = Number(branch.longitude);
        const distanceKm = latitude === undefined || longitude === undefined ? null : haversineKm(latitude, longitude, lat, lon);
        locations.push({ supplierId: supplier.id, supplier: supplier.name, branchId: branch.id, branch: branch.name, address: branch.address, latitude: lat, longitude: lon, distanceKm: distanceKm === null ? null : Number(distanceKm.toFixed(2)), distanceType: distanceKm === null ? null : 'STRAIGHT_LINE', status: 'UBICADA' });
      }
    }
    return locations;
  }
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const dLat = radians(lat2 - lat1);
  const dLon = radians(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(radians(lat1)) * Math.cos(radians(lat2)) * Math.sin(dLon / 2) ** 2;
  return 6371.0088 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
