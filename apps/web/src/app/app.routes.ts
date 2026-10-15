import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', loadChildren: () => import('./features/public/public.routes').then(m => m.publicRoutes) },
  { path: 'login', loadChildren: () => import('./features/auth/auth.routes').then(m => m.authRoutes) },
  { path: 'app', loadChildren: () => import('./features/store/store.routes').then(m => m.storeRoutes) },
  { path: 'proveedor', loadChildren: () => import('./features/supplier/supplier.routes').then(m => m.supplierRoutes) },
  { path: 'admin', loadChildren: () => import('./features/admin/admin.routes').then(m => m.adminRoutes) },
  { path: 'panel', redirectTo: 'app' },
  { path: 'comparar', redirectTo: 'app/comparar' },
  { path: 'listas', redirectTo: 'app/listas' },
  { path: '**', redirectTo: '' },
];
