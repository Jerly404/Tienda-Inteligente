import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { parseDeliveryPolygon } from '../../modules/businesses/delivery-zone';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService, private readonly jwt: JwtService) {}
  async register(input: { email: string; name: string; password: string; role:'OWNER'|'SUPPLIER'; businessName:string; legalName:string; taxId:string; phone:string; address:string; department:string; province:string; district:string; businessDescription?:string; storeCategory?:string; deliveryZoneGeoJson?:string; minimumOrder?:number; businessHours?:string; paymentMethods?:string[]; deliveryAvailable:boolean }) {
    const email = input.email.trim().toLowerCase();
    const taxId=input.taxId.trim();
    if(!isValidPeruvianRuc(taxId)) throw new BadRequestException('El RUC no supera la validación de formato y dígito verificador. No se consulta SUNAT en línea.');
    if(input.role==='OWNER'&&!input.storeCategory?.trim())throw new BadRequestException('Selecciona el tipo de tienda.');
    if(input.role==='SUPPLIER'&&!input.businessDescription?.trim())throw new BadRequestException('Indica los rubros que distribuye tu empresa.');
    if(input.role==='SUPPLIER'&&(!input.paymentMethods||input.paymentMethods.length===0))throw new BadRequestException('Selecciona al menos un medio de pago.');
    const deliveryPolygon=input.role==='SUPPLIER'&&input.deliveryAvailable?parseDeliveryPolygon(input.deliveryZoneGeoJson):undefined;
    if (await this.prisma.user.findUnique({ where: { email } })) throw new ConflictException('Ya existe una cuenta con este correo.');
    if (await this.prisma.business.findUnique({ where: { taxId } })) throw new ConflictException('Ya existe un negocio registrado con este RUC.');
    let user;
    try {
      user=await this.prisma.user.create({ data: { email, name: input.name.trim(), role: input.role, passwordHash: await argon2.hash(input.password, { type: argon2.argon2id }), memberships:{create:{permission:'OWNER',business:{create:{name:input.businessName.trim(),legalName:input.legalName.trim(),taxId,type:input.role==='SUPPLIER'?'SUPPLIER':'STORE',status:'PENDING',phone:input.phone.trim(),description:input.role==='SUPPLIER'?input.businessDescription!.trim():`Tipo de comercio: ${input.storeCategory!.trim()}`,deliveryZones:deliveryPolygon?'Zona circular seleccionada en mapa':undefined,deliveryZoneGeoJson:deliveryPolygon as Prisma.InputJsonValue|undefined,minimumOrder:input.role==='SUPPLIER'&&input.minimumOrder!==undefined?input.minimumOrder:undefined,hours:input.role==='SUPPLIER'?input.businessHours?.trim()||undefined:undefined,paymentMethods:input.role==='SUPPLIER'?input.paymentMethods?.join(', ')||undefined:undefined,branches:{create:{name:input.businessName.trim(),address:input.address.trim(),department:input.department.trim(),province:input.province.trim(),district:input.district.trim(),deliveryAvailable:input.role==='SUPPLIER'&&input.deliveryAvailable}}}}}} }, select: { id: true, email: true, name: true, role: true, tokenVersion:true } });
    } catch(error) {
      if(typeof error==='object'&&error!==null&&'code' in error&&error.code==='P2002') throw new ConflictException('El correo o RUC ya está registrado.');
      throw error;
    }
    return { user:{id:user.id,email:user.email,name:user.name,role:user.role}, accessToken: await this.jwt.signAsync({ sub: user.id, role: user.role, ver:user.tokenVersion }) };
  }
  async login(emailInput: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email: emailInput.trim().toLowerCase() } });
    if (!user || !user.active || !(await argon2.verify(user.passwordHash, password))) throw new UnauthorizedException('Correo o contraseña incorrectos.');
    const { passwordHash: _secret, ...safeUser } = user;
    return { user: safeUser, accessToken: await this.jwt.signAsync({ sub: user.id, role: user.role, ver:user.tokenVersion }) };
  }
  async updateProfile(userId:string,input:{name:string;email:string;currentPassword?:string}) {
    const user=await this.prisma.user.findUnique({where:{id:userId}});if(!user)throw new UnauthorizedException('La cuenta ya no está disponible.');
    const email=input.email.trim().toLowerCase();
    if(email!==user.email){if(!input.currentPassword||!(await argon2.verify(user.passwordHash,input.currentPassword)))throw new UnauthorizedException('Confirma tu contraseña actual para cambiar el correo.');if(await this.prisma.user.findUnique({where:{email}}))throw new ConflictException('Ese correo ya está registrado.');}
    try {const updated=await this.prisma.user.update({where:{id:userId},data:{name:input.name.trim(),email},select:{id:true,email:true,name:true,role:true}});return {user:updated};}
    catch(error){if(typeof error==='object'&&error!==null&&'code'in error&&error.code==='P2002')throw new ConflictException('Ese correo ya está registrado.');throw error;}
  }
  async changePassword(userId:string,currentPassword:string,newPassword:string){const user=await this.prisma.user.findUnique({where:{id:userId}});if(!user||!(await argon2.verify(user.passwordHash,currentPassword)))throw new UnauthorizedException('La contraseña actual no es correcta.');if(currentPassword===newPassword)throw new BadRequestException('La nueva contraseña debe ser diferente.');await this.prisma.user.update({where:{id:userId},data:{passwordHash:await argon2.hash(newPassword,{type:argon2.argon2id}),tokenVersion:{increment:1}}});return {message:'Contraseña actualizada. Inicia sesión nuevamente.'};}
}

export function isValidPeruvianRuc(value:string):boolean {
  if(!/^\d{11}$/.test(value))return false;
  const weights=[5,4,3,2,7,6,5,4,3,2];
  const sum=weights.reduce((total,weight,index)=>total+Number(value[index])*weight,0);
  const check=11-(sum%11);
  const digit=check===10?0:check===11?1:check;
  return digit===Number(value[10]);
}
