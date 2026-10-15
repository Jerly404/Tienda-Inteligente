import { Routes } from '@angular/router';
import { authGuard } from '../../core/auth/auth.guard';
import { roleGuard } from '../../core/auth/role.guard';
import { AdminPanelComponent } from './pages/admin-panel.component';

export const adminRoutes: Routes = [
  { path: '', component: AdminPanelComponent, canActivate: [authGuard, roleGuard], data: { role: 'ADMIN' } }
];
