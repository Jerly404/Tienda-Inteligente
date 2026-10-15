import { Routes } from '@angular/router';
import { authGuard } from '../../core/auth/auth.guard';
import { roleGuard } from '../../core/auth/role.guard';
import { SupplierPanelComponent } from './pages/supplier-panel.component';

export const supplierRoutes: Routes = [
  { path: '', component: SupplierPanelComponent, canActivate: [authGuard, roleGuard], data: { role: 'SUPPLIER' } }
];
