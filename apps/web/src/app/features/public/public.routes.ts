import { Routes } from '@angular/router';
import { LandingComponent } from './pages/landing.component';
import { SupplierMapComponent } from '../../shared/maps/supplier-map.component';
import { PublicSiteShellComponent } from './layout/public-shell.component';
import { AboutComponent } from '../../shared/pages/about.component';
import { BenefitsComponent } from './pages/benefits.component';
import { HowItWorksComponent } from './pages/how-it-works.component';

export const publicRoutes: Routes = [
  { path: '', component: PublicSiteShellComponent, children: [
    { path: '', component: LandingComponent },
    { path: 'como-funciona', component: HowItWorksComponent },
    { path: 'beneficios', component: BenefitsComponent },
    { path: 'maps', component: SupplierMapComponent },
    { path: 'sobre-nosotros', component: AboutComponent },
  ] }
];
