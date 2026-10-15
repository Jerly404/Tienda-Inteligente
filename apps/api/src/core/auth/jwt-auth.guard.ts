import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../infrastructure/database/prisma.service';
export type AuthenticatedRequest = { headers: { authorization?: string }; user: { sub: string; role: string } };
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService, private readonly prisma:PrismaService) {}
  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const [scheme, token] = (request.headers.authorization ?? '').split(' ');
    if (scheme !== 'Bearer' || !token) throw new UnauthorizedException('Inicia sesión para continuar.');
    try {
      const payload=await this.jwt.verifyAsync<{sub:string;role:string;ver?:number}>(token);
      const user=await this.prisma.user.findUnique({where:{id:payload.sub},select:{id:true,role:true,active:true,tokenVersion:true}});
      if(!user?.active||user.role!==payload.role||(payload.ver??0)!==user.tokenVersion)throw new Error('Revoked session');
      request.user={sub:user.id,role:user.role};
    }
    catch { throw new UnauthorizedException('La sesión no es válida o venció.'); }
    return true;
  }
}

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (request.user?.role !== 'ADMIN') throw new ForbiddenException('Se requiere el rol administrador.');
    return true;
  }
}
