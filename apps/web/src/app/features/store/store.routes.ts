import { Routes } from '@angular/router';
import { ComparisonComponent } from './pages/comparison/comparison.component';
import { AccountLocationComponent } from './pages/settings/account-location.component';
import { HomeComponent } from './pages/dashboard/home.component';
import { ShoppingListsComponent } from './pages/shopping-lists/shopping-lists.component';
import { SupplierMapComponent } from '../../shared/maps/supplier-map.component';
import { WorkspaceShellComponent } from './layout/store-shell.component';
import { AboutComponent } from '../../shared/pages/about.component';
import { StoreSectionComponent } from './pages/catalog/store-section.component';
import { authGuard } from '../../core/auth/auth.guard';
import { roleGuard } from '../../core/auth/role.guard';
import { BuyerToolsComponent } from './pages/tools/buyer-tools.component';

export const storeRoutes: Routes = [
  { path: '', component: WorkspaceShellComponent, canActivate:[authGuard,roleGuard],data:{role:'OWNER'},children: [
    { path: '', component: HomeComponent },
    { path: 'comparar', component: ComparisonComponent },
    { path: 'productos', component: StoreSectionComponent, data: {section: 'productos'} },
    { path: 'proveedores', component: StoreSectionComponent, data: {section: 'proveedores'} },
    { path: 'ofertas', component: StoreSectionComponent, data: {section: 'ofertas'} },
    { path: 'reportes', redirectTo: '', pathMatch: 'full' },
    { path: 'configuracion', component: AccountLocationComponent },
    { path: 'listas', component: ShoppingListsComponent },
    { path: 'favoritos', component: BuyerToolsComponent, data: {section: 'favorites'} },
    { path: 'compras', component: BuyerToolsComponent, data: {section: 'purchases'} },
    { path: 'cotizaciones', component: BuyerToolsComponent, data: {section: 'quotes', mode: 'cotizaciones'} },
    { path: 'notificaciones', component: BuyerToolsComponent, data: {section: 'notifications'} },
    { path: 'preferencias', component: BuyerToolsComponent, data: {section: 'preferences'} },
    { path: 'mapa', component: SupplierMapComponent },
    { path: 'sobre-nosotros', component: AboutComponent },
    { path: 'ubicacion', redirectTo: 'configuracion', pathMatch: 'full' },
  ] }
];
