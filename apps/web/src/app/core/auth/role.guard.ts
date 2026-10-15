import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
export const roleGuard:CanActivateFn=(route)=>{const auth=inject(AuthService),router=inject(Router),expected=route.data['role'] as string;if(!auth.hasSession())return router.parseUrl('/login');if(auth.role()!==expected)return router.parseUrl(auth.role()==='ADMIN'?'/admin':auth.role()==='SUPPLIER'?'/proveedor':'/app');return true;};
